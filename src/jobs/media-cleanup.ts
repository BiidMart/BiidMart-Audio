// =============================================
// Job de limpieza de media expirado
// =============================================
// Elimina el archivo físico de Supabase Storage cuando
// media_expires_at ya pasó, pero conserva el mensaje en
// el historial (solo deja media_url y media_path en NULL).
// El mensaje permanece y en el Admin se muestra "expirado".

import { conversationRepository } from "../repositories/conversation.repository";
import { supabaseStorage } from "../services/supabase-storage.service";
import { logger } from "../utils/logger";

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // cada 10 minutos

let started = false;

const runCleanup = async (): Promise<void> => {
  try {
    const now = new Date().toISOString();

    // Rutas pendientes de eliminar
    const paths = await conversationRepository.findExpiredMediaPaths(now);

    let deleted = 0;
    for (const path of paths) {
      try {
        await supabaseStorage.deleteFile(path);
        deleted++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`[MediaCleanup] Failed to delete ${path}: ${msg}`);
      }
    }

    // Marcar como expirado en BD (conserva el mensaje)
    const cleared = await conversationRepository.clearExpiredMedia(now);

    if (deleted > 0 || cleared > 0) {
      logger.info(
        `[MediaCleanup] Deleted ${deleted} files, cleared ${cleared} messages`
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[MediaCleanup] runCleanup failed: ${msg}`);
  }
};

/**
 * Inicia el job de limpieza periódica.
 * Se invoca una vez al arrancar el servidor.
 */
export const startMediaCleanupJob = (): void => {
  if (started) return;
  started = true;

  runCleanup(); // primera pasada inmediata
  setInterval(runCleanup, CLEANUP_INTERVAL_MS);
  logger.info("[MediaCleanup] Job started (every 10 min)");
};