// =============================================
// Herramienta: get_multimedia
// Recupera archivos multimedia desde el Motor de
// Conocimiento y Supabase Storage para el Agente IA.
// =============================================

import { knowledgeService } from "../../services/knowledge.service";
import { supabaseStorage } from "../../services/supabase-storage.service";
import { logger } from "../../utils/logger";
import {
  ToolDefinition,
  GetMultimediaInput,
  GetMultimediaOutput,
} from "../tool.types";

export const getMultimediaTool: ToolDefinition<
  GetMultimediaInput,
  GetMultimediaOutput
> = {
  name: "get_multimedia",
  description:
    "Obtiene archivos multimedia (audio, imágenes, videos, documentos) para compartir con el cliente. Úsala cuando el cliente pida escuchar ejemplos, ver trabajos anteriores, muestras o cualquier material audiovisual.",
  inputSchema: {
    type: "object",
    properties: {
      content_type: {
        type: "string",
        description: "Tipo de multimedia: audio_sample, image, video, file",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Tags para filtrar (género musical, tipo de proyecto, etc.)",
      },
    },
    required: ["content_type"],
  },

  execute: async (input: GetMultimediaInput): Promise<GetMultimediaOutput> => {
    logger.info(
      `[Multimedia] Searching: content_type=${input.content_type}, tags=${input.tags?.join(",") || "none"}`
    );

    // PASO 1: Consultar el Motor de Conocimiento
    const result = await knowledgeService.search({
      content_type: input.content_type,
      tags: input.tags,
      limit: 5,
    });

    if (result.data.length === 0) {
      logger.info("[Multimedia] No results found in Knowledge Motor");
      return { files: [] };
    }

    // PASO 2: Para cada resultado, validar existencia en Supabase Storage
    // y obtener URLs públicas
    const files: GetMultimediaOutput["files"] = [];

    for (const item of result.data) {
      const filePath = item.metadata?.file_path as string | undefined;

      if (!filePath) {
        logger.warn(`[Multimedia] No file_path in metadata for: ${item.title}`);
        continue;
      }

      // Obtener URL pública y validar existencia
      const fileInfo = await supabaseStorage.getFileInfo(filePath);
      const url = fileInfo.url;

      files.push({
        url,
        type: item.content_type,
        title: item.title,
      });

      logger.info(`[Multimedia] File validated: ${filePath}`);
    }

    logger.info(`[Multimedia] Returning ${files.length} files`);
    return { files };
  },
};