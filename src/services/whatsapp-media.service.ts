// =============================================
// WhatsApp Media Service
// Descarga media entrante desde Graph API y lo
// almacena en Supabase Storage.
// =============================================
// Las URLs de media de Meta caducan, por eso es
// obligatorio bajar el archivo y guardarlo localmente
// para poder reproducirlo después desde el Admin.

import { env } from "../config/env";
import { supabaseStorage } from "./supabase-storage.service";
import { logger } from "../utils/logger";

const API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

export interface StoredMedia {
  url: string;
  path: string;
  mimeType: string;
}

const cleanMimeType = (mimeType: string): string =>
  mimeType.toLowerCase().split(";")[0].trim();

const toSafeExt = (mimeType: string): string => {
  const clean = cleanMimeType(mimeType);
  const map: Record<string, string> = {
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav",
    "audio/aac": "aac",
    "audio/amr": "amr",
    "audio/opus": "ogg",
    "audio/webm": "webm",
    "application/ogg": "ogg",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "application/pdf": "pdf",
  };
  const ext = map[clean];
  if (ext) return ext;

  const subtype = clean.split("/")[1];
  return subtype || "bin";
};

/**
 * Descarga el media desde Graph API y lo sube a Supabase Storage.
 * Devuelve la referencia (url pública + path) o null si falla.
 */
export const whatsappMediaService = {
  downloadAndStore: async (
    mediaId: string,
    mimeType: string
  ): Promise<StoredMedia | null> => {
    try {
      // 1. Obtener la URL temporal del media
      const metaResponse = await fetch(`${BASE_URL}/${mediaId}`, {
        headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
      });

      if (!metaResponse.ok) {
        logger.warn(
          `[Media] Failed to resolve media ${mediaId}: ${metaResponse.status}`
        );
        return null;
      }

      const meta = (await metaResponse.json()) as {
        url?: string;
        mime_type?: string;
      };

      const downloadUrl = meta.url;
      if (!downloadUrl) {
        logger.warn(`[Media] No URL returned for media ${mediaId}`);
        return null;
      }

      const resolvedMime = cleanMimeType(meta.mime_type || mimeType);

      // 2. Descargar el binario (con token, porque Meta lo exige)
      const fileResponse = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
      });

      if (!fileResponse.ok) {
        logger.warn(
          `[Media] Failed to download media ${mediaId}: ${fileResponse.status}`
        );
        return null;
      }

      const buffer = Buffer.from(await fileResponse.arrayBuffer());
      const ext = toSafeExt(resolvedMime);
      const folder = resolvedMime.startsWith("audio/")
        ? "chat/audio"
        : resolvedMime.startsWith("image/")
          ? "chat/images"
          : resolvedMime.startsWith("video/")
            ? "chat/videos"
            : "chat/documents";

      const filePath = `${folder}/${Date.now()}-${mediaId}.${ext}`;

      // 3. Subir a Supabase Storage
      const uploaded = await supabaseStorage.uploadFile(
        filePath,
        buffer,
        resolvedMime
      );

      logger.info(`[Media] Stored incoming media at ${filePath}`);

      return {
        url: uploaded.url,
        path: uploaded.path,
        mimeType: resolvedMime,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[Media] downloadAndStore failed: ${msg}`);
      return null;
    }
  },
};