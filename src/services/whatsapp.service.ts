// =============================================
// Servicio WhatsApp Cloud API
// Único punto de comunicación con Meta Graph API.
// Encapsula: envío de mensajes, webhook, reintentos.
// =============================================

import { env } from "../config/env";
import { logger } from "../utils/logger";
import {
  WhatsAppIncomingMessage,
  WhatsAppWebhookPayload,
  ParsedIncomingMessage,
} from "../types/whatsapp.types";

const API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

// Cache de messageIds procesados para deduplicación (TTL: 10 min)
const processedMessages = new Map<string, number>();

const cleanProcessedMessages = () => {
  const now = Date.now();
  const TTL = 10 * 60 * 1000; // 10 minutos
  for (const [id, timestamp] of processedMessages.entries()) {
    if (now - timestamp > TTL) {
      processedMessages.delete(id);
    }
  }
};

// Limpieza cada 5 minutos
setInterval(cleanProcessedMessages, 5 * 60 * 1000);

// =============================================
// HELPERS INTERNOS
// =============================================

const sendRequest = async (
  payload: Record<string, unknown>,
  retries = 3
): Promise<boolean> => {
  const url = `${BASE_URL}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as Record<string, unknown>;

      if (response.ok) {
        logger.info(
          `[WhatsApp] Message sent: ${data.messaging_product || "ok"}`
        );
        return true;
      }

      const error = (data as { error?: { message?: string; code?: number } }).error;
      logger.error(
        `[WhatsApp] API error (attempt ${attempt}/${retries}): ${error?.message || "Unknown"}`
      );

      if (attempt === retries) return false;

      // Backoff exponencial: 1s, 2s, 4s
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[WhatsApp] Network error (attempt ${attempt}/${retries}): ${msg}`);

      if (attempt === retries) return false;

      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
      );
    }
  }

  return false;
};

// =============================================
// API PÚBLICA
// =============================================

export const whatsappService = {
  // ========== ENVÍO DE MENSAJES ==========

  sendText: async (to: string, text: string): Promise<boolean> => {
    logger.info(`[WhatsApp] Sending text to ${to}`);
    return sendRequest({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text, preview_url: false },
    });
  },

  sendAudio: async (to: string, audioUrl: string): Promise<boolean> => {
    logger.info(`[WhatsApp] Sending audio to ${to}`);
    return sendRequest({
      messaging_product: "whatsapp",
      to,
      type: "audio",
      audio: { link: audioUrl },
    });
  },

  sendImage: async (
    to: string,
    imageUrl: string,
    caption?: string
  ): Promise<boolean> => {
    logger.info(`[WhatsApp] Sending image to ${to}`);
    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to,
      type: "image",
      image: { link: imageUrl },
    };
    if (caption) {
      (payload.image as Record<string, unknown>).caption = caption;
    }
    return sendRequest(payload);
  },

  sendVideo: async (
    to: string,
    videoUrl: string,
    caption?: string
  ): Promise<boolean> => {
    logger.info(`[WhatsApp] Sending video to ${to}`);
    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to,
      type: "video",
      video: { link: videoUrl },
    };
    if (caption) {
      (payload.video as Record<string, unknown>).caption = caption;
    }
    return sendRequest(payload);
  },

  sendDocument: async (
    to: string,
    documentUrl: string,
    filename: string,
    caption?: string
  ): Promise<boolean> => {
    logger.info(`[WhatsApp] Sending document to ${to}`);
    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to,
      type: "document",
      document: { link: documentUrl, filename },
    };
    if (caption) {
      (payload.document as Record<string, unknown>).caption = caption;
    }
    return sendRequest(payload);
  },

  // ========== WEBHOOK ==========

  verifyWebhook: (
    mode: string,
    token: string,
    challenge: string
  ): string | null => {
    if (
      mode === "subscribe" &&
      token === env.WHATSAPP_VERIFY_TOKEN
    ) {
      logger.info("[WhatsApp] Webhook verified successfully");
      return challenge;
    }

    logger.warn("[WhatsApp] Webhook verification failed");
    return null;
  },

  parseIncomingMessage: (
    body: unknown
  ): ParsedIncomingMessage | null => {
    try {
      const payload = body as WhatsAppWebhookPayload;

      if (!payload.entry || payload.entry.length === 0) return null;

      const entry = payload.entry[0];
      if (!entry.changes || entry.changes.length === 0) return null;

      const change = entry.changes[0];
      const value = change.value;

      // Ignorar statuses (notificaciones de entrega, leído, etc.)
      if (!value.messages || value.messages.length === 0) return null;

      const msg: WhatsAppIncomingMessage = value.messages[0];

      // Extraer texto del mensaje
      let messageText = "";
      const mediaId =
        msg.audio?.id || msg.image?.id || msg.video?.id || msg.document?.id || null;
      const mimeType =
        msg.audio?.mime_type ||
        msg.image?.mime_type ||
        msg.video?.mime_type ||
        msg.document?.mime_type ||
        null;

      switch (msg.type) {
        case "text":
          messageText = msg.text?.body || "";
          break;
        case "audio":
          messageText = "[Audio]";
          break;
        case "image":
          messageText = msg.image?.caption || "[Imagen]";
          break;
        case "video":
          messageText = msg.video ? "[Video]" : "";
          break;
        case "document":
          messageText = "[Documento]";
          break;
        default:
          messageText = "[Mensaje no soportado]";
      }

      return {
        phone: msg.from,
        message: messageText,
        messageId: msg.id,
        type: msg.type,
        mediaId,
        mimeType,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error(`[WhatsApp] Failed to parse incoming message: ${errorMsg}`);
      return null;
    }
  },

  isDuplicate: (messageId: string): boolean => {
    cleanProcessedMessages();
    if (processedMessages.has(messageId)) {
      logger.warn(`[WhatsApp] Duplicate message ignored: ${messageId}`);
      return true;
    }
    processedMessages.set(messageId, Date.now());
    return false;
  },
};