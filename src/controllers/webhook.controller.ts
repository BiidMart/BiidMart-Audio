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

const sendAgentResponse = (
  phone: string,
  result: { response: string; attachments?: string[] }
): void => {
  // Enviar texto principal
  whatsappService
    .sendText(phone, result.response)
    .catch((err) => logger.error(`[Webhook] Failed to send text: ${err.message}`));

  // Enviar archivos adjuntos
  if (result.attachments && result.attachments.length > 0) {
    for (const url of result.attachments) {
      // Determinar tipo por extensión
      if (url.match(/\.(mp3|wav|ogg|m4a)($|\?)/i)) {
        whatsappService
          .sendAudio(phone, url)
          .catch((err) => logger.error(`[Webhook] Failed to send audio: ${err.message}`));
      } else if (url.match(/\.(jpg|jpeg|png|webp)($|\?)/i)) {
        whatsappService
          .sendImage(phone, url)
          .catch((err) => logger.error(`[Webhook] Failed to send image: ${err.message}`));
      } else if (url.match(/\.(mp4|mov)($|\?)/i)) {
        whatsappService
          .sendVideo(phone, url)
          .catch((err) => logger.error(`[Webhook] Failed to send video: ${err.message}`));
      } else {
        whatsappService
          .sendDocument(phone, url, "archivo")
          .catch((err) => logger.error(`[Webhook] Failed to send document: ${err.message}`));
      }
    }
  }
};