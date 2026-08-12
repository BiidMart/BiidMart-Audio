// =============================================
// Controlador del Admin — Chat de Conversaciones
// =============================================
// Lee y escribe en PostgreSQL (fuente de verdad).
// La memoria RAM del agente queda intacta; solo se
// refleja también ahí para mantener la vista del agente.

import { Request, Response, NextFunction } from "express";
import { conversationMemory } from "../agent/memory/conversation-memory";
import { whatsappService } from "../services/whatsapp.service";
import { conversationService } from "../services/conversation.service";
import { logger } from "../utils/logger";

// GET /api/admin/conversations
// Lista conversaciones persistentes desde PostgreSQL.
export const listConversations = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const conversations = await conversationService.listConversations();
    res.json({ conversations });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/conversations/:phone/messages
// Devuelve los mensajes persistentes de una conversación.
export const getMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const phone = req.params.phone as string;
    const messages = await conversationService.getMessages(phone);

    if (messages === null) {
      res.status(404).json({ message: "Conversation not found" });
      return;
    }

    res.json({ phone, messages });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/conversations/:phone/reply
// Envía una respuesta manual vía WhatsApp y la persiste.
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

    const cleanMessage = message.trim();

    // 1. Enviar el mensaje al cliente vía WhatsApp
    const sent = await whatsappService.sendText(phone, cleanMessage);

    if (!sent) {
      res.status(502).json({
        error: { message: "Failed to send message via WhatsApp" },
      });
      return;
    }

    const now = new Date().toISOString();

    // 2. Persistir en PostgreSQL (fuente de verdad)
    await conversationService.upsertMessage({
      phone,
      role: "admin",
      content: cleanMessage,
    });

    // 3. Reflejar también en memoria RAM para consistencia con la vista del agente
    const context = conversationMemory.getOrCreate(phone, phone);
    conversationMemory.addMessage(context.sessionId, {
      role: "admin",
      content: cleanMessage,
      timestamp: now,
    });

    logger.info(`[Admin] Manual reply sent to ${phone}`);

    res.json({
      success: true,
      phone,
      message: {
        role: "admin" as const,
        content: cleanMessage,
        timestamp: now,
      },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/conversations/:id
// Elimina la conversación de forma definitiva: BD + archivos físicos.
export const deleteConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const deleted = await conversationService.deleteConversation(id);

    if (!deleted) {
      res.status(404).json({ message: "Conversation not found" });
      return;
    }

    res.json({ success: true, id });
  } catch (error) {
    next(error);
  }
};