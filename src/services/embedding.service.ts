// =============================================
// Embedding Service
// Genera embeddings vectoriales para búsqueda semántica.
// Soporta múltiples proveedores configurados vía env.
// Actualmente: OpenAI text-embedding-3-small (1536 dims).
// =============================================

import OpenAI from "openai";
import { env } from "../config/env";
import { logger } from "../utils/logger";

let embeddingClient: OpenAI | null = null;

const getEmbeddingClient = (): OpenAI => {
  if (!embeddingClient) {
    if (env.EMBEDDING_PROVIDER === "openai") {
      if (!env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is required for OpenAI embeddings");
      }
      embeddingClient = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
        maxRetries: 2,
        timeout: 15000,
      });
    } else {
      throw new Error(
        `Unsupported embedding provider: ${env.EMBEDDING_PROVIDER}`
      );
    }
  }
  return embeddingClient;
};

/**
 * Genera un embedding vectorial para un texto dado.
 * @param text Texto a vectorizar (contenido de knowledge o pregunta del cliente)
 * @returns Array de números (1536 dimensiones para text-embedding-3-small)
 */
const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const client = getEmbeddingClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await (client as any).embeddings.create({
      model: env.EMBEDDING_MODEL,
      input: text,
    })) as { data: { embedding: number[] }[] };

    const embedding = response.data[0]?.embedding;

    if (!embedding || embedding.length === 0) {
      throw new Error("Empty embedding returned from provider");
    }

    logger.info(
      `[Embedding] Generated ${embedding.length}-dim vector for text (${text.length} chars)`
    );

    return embedding;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[Embedding] Failed to generate embedding: ${message}`);
    throw error;
  }
};

export const embeddingService = {
  generateEmbedding,

  /**
   * Verifica si el servicio de embeddings está configurado correctamente.
   */
  isConfigured: (): boolean => {
    try {
      getEmbeddingClient();
      return true;
    } catch {
      return false;
    }
  },
};