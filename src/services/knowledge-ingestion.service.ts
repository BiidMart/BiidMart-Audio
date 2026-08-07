// =============================================
// Knowledge Ingestion Service
// Convierte documentos de texto en fragmentos de
// conocimiento para el Motor (chunking + tags).
// =============================================

import { knowledgeRepository } from "../repositories/knowledge.repository";
import { documentParser, ParsedDocument } from "./document-parser.service";
import { logger } from "../utils/logger";

const MAX_CHUNK_WORDS = 500;
const CHUNK_OVERLAP_WORDS = 50;

// Palabras clave comunes del negocio para inferir tags automáticamente
const BUSINESS_KEYWORDS = [
  "precio", "costo", "USD", "pago", "producción", "mezcla", "mastering",
  "entrega", "proceso", "requisito", "género", "rock", "pop", "rap",
  "trap", "reggaeton", "promoción", "descuento", "contrato", "derechos",
  "revisión", "demo", "muestra", "audio", "acapella", "instrumental",
];

// =============================================
// HELPERS
// =============================================

/**
 * Divide un texto largo en chunks de ~500 palabras con solapamiento.
 */
const chunkText = (text: string, maxWords: number, overlap: number): string[] => {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  if (words.length <= maxWords) {
    return [text];
  }

  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    chunks.push(words.slice(start, end).join(" "));
    start += maxWords - overlap;
  }

  return chunks;
};

/**
 * Infiere tags basados en palabras clave del negocio.
 */
const inferTags = (text: string): string[] => {
  const lower = text.toLowerCase();
  return BUSINESS_KEYWORDS.filter((keyword) => lower.includes(keyword));
};

/**
 * Genera un título automático a partir del contenido.
 */
const generateTitle = (text: string, originalName: string): string => {
  // Usar las primeras 12 palabras del contenido como título
  const firstWords = text.split(/\s+/).slice(0, 12).join(" ");
  if (firstWords.length >= 20) {
    return firstWords.substring(0, 100) + "...";
  }
  // Fallback: usar el nombre del archivo sin extensión
  const nameWithoutExt = originalName.replace(/\.[^.]+$/, "");
  return nameWithoutExt.substring(0, 200);
};

// =============================================
// API PÚBLICA
// =============================================

export const knowledgeIngestion = {
  /**
   * Procesa un documento y crea fragmentos de conocimiento.
   * @param buffer Contenido binario del archivo
   * @param mimetype MIME type del archivo
   * @param originalName Nombre original del archivo
   * @param category Categoría para los fragmentos (default: "general")
   * @param customTags Tags adicionales definidos por el usuario
   * @returns IDs de los fragmentos creados
   */
  ingestDocument: async (
    buffer: Buffer,
    mimetype: string,
    originalName: string,
    category = "general",
    customTags: string[] = []
  ): Promise<{ fragmentsCreated: number; ids: string[] }> => {
    // Paso 1: Extraer texto del documento
    const parsed: ParsedDocument = await documentParser.parse(
      buffer,
      mimetype,
      originalName
    );

    // Paso 2: Dividir en chunks
    const chunks = chunkText(parsed.text, MAX_CHUNK_WORDS, CHUNK_OVERLAP_WORDS);
    logger.info(
      `[Ingestion] Document "${originalName}" → ${chunks.length} chunks`
    );

    // Paso 3: Crear fragmentos en la base de datos
    const ids: string[] = [];
    const autoTags = inferTags(parsed.text);
    const allTags = [...new Set([...autoTags, ...customTags])]; // sin duplicados

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const title =
        chunks.length === 1
          ? generateTitle(chunk, originalName)
          : `${generateTitle(chunk, originalName)} (parte ${i + 1}/${chunks.length})`;

      const knowledge = await knowledgeRepository.create({
        title: title.substring(0, 200),
        content: chunk,
        content_type: "text",
        category,
        tags: allTags,
        metadata: {
          source_document: originalName,
          source_type: parsed.metadata.source_type,
          chunk_index: i,
          total_chunks: chunks.length,
          extracted_from: originalName,
        },
      });

      ids.push(knowledge.id);
    }

    logger.info(
      `[Ingestion] Created ${ids.length} knowledge fragments from "${originalName}"`
    );

    return { fragmentsCreated: ids.length, ids };
  },
};