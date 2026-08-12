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

// Decodificador Ogg Opus (WASM empaquetado en el tarball npm, sin binarios
// externos ni postinstall). Se importa dinámicamente porque es ESM-only.
const importDecoder = (): Promise<{
  OggOpusDecoder: new () => {
    ready: Promise<void>;
    decodeFile: (data: Uint8Array) => Promise<{
      channelData: Float32Array[];
      samplesDecoded: number;
      sampleRate: number;
    }>;
    free: () => void;
  };
}> => import("ogg-opus-decoder");

const cleanMimeType = (mimeType: string): string =>
  mimeType.toLowerCase().split(";")[0].trim();

/**
 * Transcodifica audio Ogg Opus a WAV PCM (mono/estéreo, 48kHz).
 * Devuelve el buffer WAV o null si no es Ogg Opus o falla la decodificación.
 */
const transcodeOpusToWav = async (
  input: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; contentType: string; extension: string } | null> => {
  const clean = cleanMimeType(mimeType);
  const isOpusContainer = clean === "audio/ogg" || clean === "audio/opus";

  if (!isOpusContainer) return null;

  try {
    const { OggOpusDecoder } = await importDecoder();
    const decoder = new OggOpusDecoder();
    await decoder.ready;
    const decoded = await decoder.decodeFile(new Uint8Array(input));

    const numChannels = decoded.channelData.length;
    const sampleRate = decoded.sampleRate;
    const samples = decoded.samplesDecoded;
    const bytesPerSample = 2;
    const dataSize = samples * numChannels * bytesPerSample;
    const wav = Buffer.alloc(44 + dataSize);

    wav.write("RIFF", 0, "ascii");
    wav.writeUInt32LE(36 + dataSize, 4);
    wav.write("WAVE", 8, "ascii");
    wav.write("fmt ", 12, "ascii");
    wav.writeUInt32LE(16, 16); // tamaño del chunk fmt
    wav.writeUInt16LE(1, 20); // PCM lineal
    wav.writeUInt16LE(numChannels, 22);
    wav.writeUInt32LE(sampleRate, 24);
    wav.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
    wav.writeUInt16LE(numChannels * bytesPerSample, 32);
    wav.writeUInt16LE(16, 34); // bits por muestra
    wav.write("data", 36, "ascii");
    wav.writeUInt32LE(dataSize, 40);

    let offset = 44;
    for (let i = 0; i < samples; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const v = decoded.channelData[ch][i];
        const clipped = Math.max(-1, Math.min(1, v));
        wav.writeInt16LE((clipped * 32767) | 0, offset);
        offset += bytesPerSample;
      }
    }

    decoder.free();

    return {
      buffer: wav,
      contentType: "audio/wav",
      extension: "wav",
    };
  } catch (err) {
    logger.warn(
      `[Media] Failed to transcode Opus to WAV: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return null;
  }
};

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

      const rawBuffer = Buffer.from(await fileResponse.arrayBuffer());

      // Si es un audio Ogg Opus, transcodificarlo a WAV PCM para que se
      // reproduzca en cualquier navegador (el Ogg Opus no es universal).
      const transcoded = await transcodeOpusToWav(rawBuffer, resolvedMime);

      const finalBuffer = transcoded ? transcoded.buffer : rawBuffer;
      const finalContentType = transcoded
        ? transcoded.contentType
        : resolvedMime;
      const ext = transcoded ? transcoded.extension : toSafeExt(resolvedMime);

      const folder = finalContentType.startsWith("audio/")
        ? "chat/audio"
        : finalContentType.startsWith("image/")
          ? "chat/images"
          : finalContentType.startsWith("video/")
            ? "chat/videos"
            : "chat/documents";

      const filePath = `${folder}/${Date.now()}-${mediaId}.${ext}`;

      // 3. Subir a Supabase Storage
      const uploaded = await supabaseStorage.uploadFile(
        filePath,
        finalBuffer,
        finalContentType
      );

      logger.info(`[Media] Stored incoming media at ${filePath}`);

      return {
        url: uploaded.url,
        path: uploaded.path,
        mimeType: finalContentType,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[Media] downloadAndStore failed: ${msg}`);
      return null;
    }
  },
};