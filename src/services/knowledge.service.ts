import { knowledgeRepository } from "../repositories/knowledge.repository";
import { embeddingService } from "./embedding.service";
import { logger } from "../utils/logger";
import {
  Knowledge,
  CreateKnowledgeDto,
  UpdateKnowledgeDto,
  SearchKnowledgeDto,
  KnowledgeListResponse,
} from "../types/knowledge.interface";

// =============================================
// Knowledge Service
// Orquesta CRUD + generación automática de embeddings
// + búsqueda híbrida (semántica → fallback textual).
// =============================================

export const knowledgeService = {
  /**
   * Crea conocimiento. Si el servicio de embeddings está configurado,
   * genera automáticamente el embedding del contenido.
   */
  create: async (dto: CreateKnowledgeDto): Promise<Knowledge> => {
    let embedding: number[] | null = null;

    try {
      if (embeddingService.isConfigured()) {
        embedding = await embeddingService.generateEmbedding(dto.content);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[Knowledge] Failed to generate embedding on create: ${msg}. Saving without embedding.`);
    }

    return knowledgeRepository.create({
      ...dto,
      embedding,
    });
  },

  findAll: async (limit?: number, offset?: number, includeInactive = false): Promise<KnowledgeListResponse> => {
    return knowledgeRepository.findAll(limit, offset, includeInactive);
  },

  findById: async (id: string): Promise<Knowledge | null> => {
    return knowledgeRepository.findById(id);
  },

  /**
   * Actualiza conocimiento. Si el contenido cambió y el servicio de
   * embeddings está configurado, regenera automáticamente el embedding.
   */
  update: async (id: string, dto: UpdateKnowledgeDto): Promise<Knowledge | null> => {
    let embedding: number[] | null | undefined;

    if (dto.content !== undefined) {
      try {
        if (embeddingService.isConfigured()) {
          embedding = await embeddingService.generateEmbedding(dto.content);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`[Knowledge] Failed to regenerate embedding on update: ${msg}.`);
        // embedding permanece undefined → no se actualiza en BD
      }
    }

    if (embedding !== undefined) {
      (dto as UpdateKnowledgeDto).embedding = embedding;
    }

    return knowledgeRepository.update(id, dto);
  },

  delete: async (id: string): Promise<boolean> => {
    return knowledgeRepository.delete(id);
  },

  /**
   * Búsqueda híbrida: intenta búsqueda semántica primero.
   * Si no hay resultados o falla, cae a búsqueda textual (ILIKE).
   */
  search: async (dto: SearchKnowledgeDto): Promise<KnowledgeListResponse> => {
    const limit = dto.limit || 5;

    // --- INTENTO DE BÚSQUEDA SEMÁNTICA ---
    if (dto.query && embeddingService.isConfigured()) {
      try {
        const queryEmbedding = await embeddingService.generateEmbedding(dto.query);
        const semanticResult = await knowledgeRepository.searchSemantic(
          queryEmbedding,
          limit,
          0.5,
          dto.category  // Respetar filtro de categoría en búsqueda semántica
        );

        if (semanticResult.data.length > 0) {
          logger.info(
            `[Knowledge] Semantic search found ${semanticResult.data.length} results for: "${dto.query.substring(0, 60)}"`
          );
          return semanticResult;
        }

        logger.info(`[Knowledge] Semantic search returned 0 results. Falling back to text search.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`[Knowledge] Semantic search failed: ${msg}. Falling back to text search.`);
      }
    }

    // --- FALLBACK: BÚSQUEDA TEXTUAL (ILIKE) ---
    return knowledgeRepository.search({ ...dto, limit });
  },

  findByCategory: async (category: string): Promise<Knowledge[]> => {
    return knowledgeRepository.findByCategory(category);
  },

  findByContentType: async (contentType: string): Promise<Knowledge[]> => {
    return knowledgeRepository.findByContentType(contentType);
  },
};