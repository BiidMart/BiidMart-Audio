// =============================================
// Servicio Supabase Storage
// Único punto de acceso a Supabase Storage.
// Usa anon key para lectura pública y service_role
// key para operaciones de escritura (upload/delete).
// =============================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";
import { logger } from "../utils/logger";

let anonClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

const getAnonClient = (): SupabaseClient => {
  if (!anonClient) {
    anonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }
  return anonClient;
};

const getServiceClient = (): SupabaseClient => {
  if (!serviceClient) {
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for write operations");
    }
    serviceClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return serviceClient;
};

export const supabaseStorage = {
  /**
   * Obtiene la URL pública de un archivo.
   */
  getPublicUrl: (filePath: string): string => {
    const bucket = env.SUPABASE_STORAGE_BUCKET;
    const { data } = getAnonClient().storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  },

  /**
   * Verifica si un archivo existe en el bucket (lectura anónima).
   */
  fileExists: async (filePath: string): Promise<boolean> => {
    try {
      const bucket = env.SUPABASE_STORAGE_BUCKET;
      const { data, error } = await getAnonClient()
        .storage
        .from(bucket)
        .list("", { search: filePath, limit: 1 });

      if (error) return false;
      return data?.some((f) => f.name === filePath.split("/").pop()) || false;
    } catch {
      return false;
    }
  },

  /**
   * Obtiene información de un archivo vía HEAD request (lectura pública).
   */
  getFileInfo: async (filePath: string): Promise<{
    exists: boolean;
    url: string;
    size?: number;
    mimeType?: string;
  }> => {
    try {
      const url = supabaseStorage.getPublicUrl(filePath);
      const response = await fetch(url, { method: "HEAD" });

      if (!response.ok) return { exists: false, url };

      return {
        exists: true,
        url,
        size: parseInt(response.headers.get("content-length") || "0", 10),
        mimeType: response.headers.get("content-type") || undefined,
      };
    } catch {
      return { exists: false, url: supabaseStorage.getPublicUrl(filePath) };
    }
  },

  /**
   * Sube un archivo al bucket usando service_role (bypass RLS).
   */
  uploadFile: async (
    filePath: string,
    fileBuffer: Buffer,
    contentType: string
  ): Promise<{ url: string; path: string }> => {
    const bucket = env.SUPABASE_STORAGE_BUCKET;

    const { error } = await getServiceClient()
      .storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      logger.error(`[Storage] Upload failed: ${error.message}`);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    const url = supabaseStorage.getPublicUrl(filePath);
    logger.info(`[Storage] File uploaded: ${filePath}`);

    return { url, path: filePath };
  },

  /**
   * Elimina un archivo del bucket usando service_role (bypass RLS).
   */
  deleteFile: async (filePath: string): Promise<void> => {
    const bucket = env.SUPABASE_STORAGE_BUCKET;

    const { error } = await getServiceClient()
      .storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      logger.error(`[Storage] Delete failed: ${error.message}`);
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    logger.info(`[Storage] File deleted: ${filePath}`);
  },
};