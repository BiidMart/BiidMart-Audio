// =============================================
// Webhook Controller
// Maneja las peticiones GET (verificación) y
// POST (mensajes entrantes) de WhatsApp.
// =============================================

import { Request, Response } from "express";
import { whatsappService } from "../services/whatsapp.service";
import { orchestrator } from "../agent/orchestrator";
import { clientService } from "../services/client.service";
import { logger } from "../utils/logger";

export const verifyWebhook = (req: Request, res: Response): void => {
  const mode = (req.query["hub.mode"] as string) || "";
  const token = (req.query["hub.verify_token"] as string) || "";
  const challenge = (req.query["hub.challenge"] as string) || "";

  const result = whatsappService.verifyWebhook(mode, token, challenge);

  if (result) {
    res.status(200).send(result);
  } else {
    res.status(403).json({ error: "Verification failed" });
  }
};

export const receiveMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Validar que sea un webhook de WhatsApp
    if (req.body?.object !== "whatsapp_business_account") {
      res.status(200).send("ok");
      return;
    }

    // Parsear el mensaje entrante
    const parsed = whatsappService.parseIncomingMessage(req.body);

    if (!parsed) {
      // Puede ser un status update (delivered, read, etc.)
      res.status(200).send("ok");
      return;
    }

    // Verificar duplicados
    if (whatsappService.isDuplicate(parsed.messageId)) {
      res.status(200).send("ok");
      return;
    }

    logger.info(
      `[Webhook] Message from ${parsed.phone}: "${parsed.message.substring(0, 80)}..."`
    );

    // Persistir cliente automáticamente en PostgreSQL (no solo en memoria)
    clientService.getOrCreate(parsed.phone).catch((err) =>
      logger.error(`[Webhook] Failed to persist client: ${err.message}`)
    );

    // Procesar con el Agente IA (asíncrono - no bloqueamos la respuesta a Meta)
    orchestrator
      .processMessage(parsed.phone, parsed.phone, parsed.message)
      .then((result) => {
        logger.info(
          `[Webhook] Agent response for ${parsed.phone}: ${result.toolUsed || "none"}`
        );

        // Enviar respuesta vía WhatsApp según el resultado
        sendAgentResponse(parsed.phone, result);
      })
      .catch((err) => {
        logger.error(
          `[Webhook] Agent error for ${parsed.phone}: ${err.message}`
        );
      });

    // Responder 200 OK a Meta inmediatamente (Meta espera respuesta < 20s)
    res.status(200).send("ok");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[Webhook] Error: ${msg}`);
    res.status(200).send("ok"); // Siempre responder 200 a Meta
  }
};

// =============================================
// Helper: Envía la respuesta del Agente vía WhatsApp
// =============================================

/**
 * Limpia el mensaje antes de enviarlo a WhatsApp:
 * - Elimina URLs duplicadas (misma URL repetida como texto y como link)
 * - Convierte asteriscos Markdown en formato simple para WhatsApp
 */
const cleanWhatsAppMessage = (text: string): string => {
  // 1. Eliminar URLs duplicadas: [url](url) → url
  let cleaned = text.replace(/\[(https?:\/\/[^\]]+)\]\(\1\)/g, "$1");

  // 2. Eliminar asteriscos Markdown que no son realmente necesarios
  //    Reemplazar **texto** → texto (WhatsApp tiene su propio formateo de bold)
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, "$1");
  //    Reemplazar *texto* → texto
  cleaned = cleaned.replace(/\*(.+?)\*/g, "$1");

  // 3. Eliminar líneas duplicadas (misma URL en dos líneas consecutivas)
  const lines = cleaned.split("\n");
  const uniqueLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && uniqueLines.length > 0) {
      const lastTrimmed = uniqueLines[uniqueLines.length - 1].trim();
      if (trimmed === lastTrimmed) continue; // saltar duplicado consecutivo
    }
    uniqueLines.push(line);
  }
  cleaned = uniqueLines.join("\n");

  return cleaned;
};

const sendAgentResponse = (
  phone: string,
  result: { response: string; description?: string | null; attachments?: { url: string; display_name: string }[] }
): void => {
  const sendAll = async () => {
    // 1. Enviar mensaje principal del agente PRIMERO
    const cleanedResponse = cleanWhatsAppMessage(result.response);
    const textSent = await whatsappService.sendText(phone, cleanedResponse);
    if (!textSent) {
      logger.warn(`[Webhook] sendText returned false for main message`);
    }

    // 2. Enviar descripción del recurso DESPUÉS (si existe)
    if (result.description) {
      const desc = cleanWhatsAppMessage(result.description);
      await whatsappService.sendText(phone, desc);
    }

    // 3. Enviar archivos: solo los audios/imágenes/videos en su orden original.
    // La descripción del recurso ya contextualiza lo que el cliente recibirá.
    if (result.attachments && result.attachments.length > 0) {
      for (const att of result.attachments) {
        const url = att.url;
        let fileSent = false;
        if (url.match(/\.(mp3|wav|ogg|m4a)($|\?)/i)) {
          fileSent = await whatsappService.sendAudio(phone, url);
        } else if (url.match(/\.(jpg|jpeg|png|webp)($|\?)/i)) {
          fileSent = await whatsappService.sendImage(phone, url);
        } else if (url.match(/\.(mp4|mov)($|\?)/i)) {
          fileSent = await whatsappService.sendVideo(phone, url);
        } else {
          fileSent = await whatsappService.sendDocument(phone, url, att.display_name || "archivo");
        }
        if (!fileSent) {
          logger.error(`[Webhook] Failed to send file: ${url} (display_name: "${att.display_name}")`);
        }
      }
    }

    logger.info(`[Webhook] All messages sent to ${phone}`);
  };

  sendAll().catch((err) =>
    logger.error(`[Webhook] sendAll failed: ${err instanceof Error ? err.message : String(err)}`)
  );
};
