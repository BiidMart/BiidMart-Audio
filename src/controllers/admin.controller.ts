// =============================================
// Controlador del Admin — Chat de Conversaciones
// =============================================
// Expone las conversaciones activas de la memoria
// y permite responder manualmente vía WhatsApp.
//
// NO reimplementa lógica del agente: solo lee la memoria
// y usa whatsappService.sendText() directamente.

import { Request, Response, NextFunction } from "express";
import { conversationMemory } from "../agent/memory/conversation-memory";
import { whatsappService } from "../services/whatsapp.service";
import { clientService } from "../services/client.service";
import { logger } from "../utils/logger";

// GET /api/admin/conversations
// Devuelve las sesiones activas con el último mensaje y el nombre
// del cliente (si existe en BD, si no, usa el teléfono).
export const listConversations = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessions = conversationMemory.getAll();

    // Enriquecer con nombre del cliente persistido en BD
    const enriched = await Promise.all(
      sessions.map(async (session) => {
        let name: string | null = null;
        try {
          const client = await clientService.findByPhone(session.clientPhone);
          name = client?.name || null;
        } catch (err) {
          logger.warn(
            `[Admin] Failed to fetch client name for ${session.clientPhone}: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }

        return {
          phone: session.sessionId,
          name: name || session.clientPhone,
          lastMessage: session.lastMessage,
          lastActivity: session.lastActivity,
        };
      })
    );

    res.json({ conversations: enriched });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/conversations/:phone/messages
// Devuelve los mensajes de una sesión activa.
export const getMessages = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const phone = req.params.phone as string;
    const context = conversationMemory.get(phone);

    if (!context) {
      res.status(404).json({ message: "Conversation not found" });
      return;
    }

    res.json({
      phone: context.sessionId,
      messages: context.messages,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/conversations/:phone/reply
// Envía una respuesta manual vía WhatsApp y la registra en memoria.
export const sendReply = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const phone = req.params.phone as string;
    const { message } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({
        error: { message: "message is required and must be a non-empty string" },
      });
      return;
    }

    // Enviar el mensaje al cliente vía WhatsApp
    const sent = await whatsappService.sendText(phone, message.trim());

    if (!sent) {
      res.status(502).json({
        error: { message: "Failed to send message via WhatsApp" },
      });
      return;
    }

    // Registrar la respuesta del admin en la conversación
    // (getOrCreate garantiza que exista una entrada; no altera el agente)
    const context = conversationMemory.getOrCreate(phone, phone);
    conversationMemory.addMessage(context.sessionId, {
      role: "admin",
      content: message.trim(),
      timestamp: new Date().toISOString(),
    });

    logger.info(`[Admin] Manual reply sent to ${phone}`);

    res.json({
      success: true,
      phone,
      message: {
        role: "admin",
        content: message.trim(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};