// =============================================
// Herramienta: get_multimedia
// Recupera archivos multimedia desde el Motor de
// Conocimiento y Supabase Storage para el Agente IA.
// =============================================

import { knowledgeService } from "../../services/knowledge.service";
import { resourceService } from "../../services/resource.service";
import { supabaseStorage } from "../../services/supabase-storage.service";
import { logger } from "../../utils/logger";
import { ResourceSearchResult } from "../../types/resource.interface";
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

    const files: GetMultimediaOutput["files"] = [];

    // PASO 1: Buscar en la tabla de recursos (resources + resource_files)
    try {
      const resources = await resourceService.search({
        category: input.content_type
          ? mapContentTypeToCategory(input.content_type)
          : undefined,
        tags: input.tags,
        limit: 10,
      });

      for (const res of resources as ResourceSearchResult[]) {
        if (res.file_url) {
          files.push({
            url: res.file_url,
            type: res.file_type,
            title: res.display_name || res.title,
            display_name: res.display_name || res.title,
          });
        }
      }

      if (files.length > 0) {
        logger.info(`[Multimedia] Found ${files.length} files in resources`);
        // Extraer la descripción del primer recurso encontrado
        const description = (resources[0] as ResourceSearchResult)?.description || null;
        return { description, files };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[Multimedia] Resource search failed, falling back to knowledge: ${msg}`);
    }

    // PASO 2: Fallback — buscar en knowledge (comportamiento anterior)
    const result = await knowledgeService.search({
      content_type: input.content_type,
      tags: input.tags,
      limit: 5,
    });

    for (const item of result.data) {
      const filePath = item.metadata?.file_path as string | undefined;
      if (!filePath) continue;
      try {
        const fileInfo = await supabaseStorage.getFileInfo(filePath);
        files.push({
          url: fileInfo.url,
          type: item.content_type,
          title: item.title,
          display_name: item.title,
        });
      } catch {
        logger.warn(`[Multimedia] File not found in storage: ${filePath}`);
      }
    }

    logger.info(`[Multimedia] Returning ${files.length} files`);
    return { description: null, files };
  },
};

// Mapea content_type (audio_sample, image, video) → categoría de resources
const mapContentTypeToCategory = (contentType?: string): string | undefined => {
  if (!contentType) return undefined;
  if (contentType.startsWith("audio")) return "examples";
  if (contentType.startsWith("image")) return "examples";
  if (contentType.startsWith("video")) return "examples";
  return "general";
};
