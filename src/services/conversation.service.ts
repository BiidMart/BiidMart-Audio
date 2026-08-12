// =============================================
// Conversation Service
// Lógica de negocio para persistencia del chat.
// =============================================
// Persiste mensajes en PostgreSQL y elimina el
// historial + archivos de forma definitiva cuando
// el admin borra una conversación.

import { conversationRepository } from "../repositories/conversation.repository";
import { supabaseStorage } from "./supabase-storage.service";
import { logger } from "../utils/logger";
import {
  ConversationListItem,
  ConversationMessageDto,
  UpsertMessageDto,
} from "../types/conversation.interface";

const IMAGE_EXT = /\.(jpg|jpeg|png|webp)($|\?)/i;
const VIDEO_EXT = /\.(mp4|mov)($|\?)/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|opus|aac)($|\?)/i;

const normalizeMimeToCategory = (mimeType: string): string | null => {
  const clean = mimeType.toLowerCase().split(";")[0].trim();
  if (clean.startsWith("audio/") || AUDIO_EXT.test(clean)) return "audio";
  if (clean.startsWith("image/") || IMAGE_EXT.test(clean)) return "image";
  if (clean.startsWith("video/") || VIDEO_EXT.test(clean)) return "video";
  if (clean.startsWith("text/")) return "file";
  if (clean === "application/pdf") return "file";
  return "file";
};

const inferMediaType = (
  mediaType: string | null | undefined,
  urlOrPath: string | null | undefined
): string | null => {
  // Si viene un MIME (ej: "audio/ogg"), normalizarlo a categoría ("audio").
  if (mediaType) return normalizeMimeToCategory(mediaType);
  if (!urlOrPath) return null;

  const haystack = urlOrPath.toLowerCase();
  if (AUDIO_EXT.test(haystack)) return "audio";
  if (IMAGE_EXT.test(haystack)) return "image";
  if (VIDEO_EXT.test(haystack)) return "video";
  return "file";
};

export const conversationService = {
  // ─── Persistencia ───

  /**
   * Guarda un mensaje de forma persistente.
   * No toca la memoria RAM del agente; es una capa paralela.
   */
  upsertMessage: async (dto: UpsertMessageDto): Promise<void> => {
    const conversation = await conversationRepository.findOrCreateByPhone(
      dto.phone
    );

    const createdAt = new Date().toISOString();
    const mediaType = inferMediaType(dto.mediaType, dto.mediaUrl ?? dto.mediaPath);

    await conversationRepository.addMessage(conversation.id, {
      role: dto.role,
      content: dto.content,
      mediaType,
      mediaUrl: dto.mediaUrl ?? null,
      mediaPath: dto.mediaPath ?? null,
      mediaExpiresAt: dto.mediaExpiresAt ?? null,
    });

    await conversationRepository.touchLastMessage(conversation.id, createdAt);
  },

  listConversations: async (): Promise<ConversationListItem[]> => {
    return conversationRepository.listConversations();
  },

  getMessages: async (
    phone: string
  ): Promise<ConversationMessageDto[] | null> => {
    const conversation = await conversationRepository.findByPhone(phone);
    if (!conversation) return null;

    const messages = await conversationRepository.getMessagesById(
      conversation.id
    );

    return messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      mediaType: m.media_type,
      mediaUrl: m.media_url,
      // Un media que ya perdió su ruta pero estaba asociado a un archivo
      // se considera expirado (el mensaje permanece).
      mediaExpired: m.media_url === null && m.media_path === null && m.media_type !== null,
      createdAt: m.created_at,
    }));
  },

  // ─── Eliminación definitiva ───

  /**
   * Elimina una conversación completa: registros en BD + archivos físicos.
   */
  deleteConversation: async (id: string): Promise<boolean> => {
    const paths = await conversationRepository.getMediaPaths(id);

    // Eliminar archivos físicos primero (idempotente, tolerante a fallos)
    for (const path of paths) {
      try {
        await supabaseStorage.deleteFile(path);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(
          `[Conversation] Failed to delete media file ${path}: ${msg}`
        );
      }
    }

    // Borrar filas en BD (mensajes se eliminan por ON DELETE CASCADE)
    return conversationRepository.deleteById(id);
  },

  linkClientIfMissing: async (phone: string, clientId: string): Promise<void> => {
    await conversationRepository.linkClient(phone, clientId);
  },
};