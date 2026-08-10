import { getPool } from "../config/database";
import {
  Knowledge,
  CreateKnowledgeDto,
  UpdateKnowledgeDto,
  SearchKnowledgeDto,
  KnowledgeListResponse,
} from "../types/knowledge.interface";

export const knowledgeRepository = {
  create: async (dto: CreateKnowledgeDto): Promise<Knowledge> => {
    const hasEmbedding = dto.embedding && dto.embedding.length > 0;
    const { rows } = await getPool().query(
      `INSERT INTO knowledge (title, content, content_type, category, tags, metadata${
        hasEmbedding ? ", embedding" : ""
      })
       VALUES ($1, $2, $3, $4, $5, $6${hasEmbedding ? ", $7::vector" : ""})
       RETURNING *`,
      hasEmbedding
        ? [
            dto.title,
            dto.content,
            dto.content_type || "text",
            dto.category,
            dto.tags || [],
            JSON.stringify(dto.metadata || {}),
            JSON.stringify(dto.embedding),
          ]
        : [
            dto.title,
            dto.content,
            dto.content_type || "text",
            dto.category,
            dto.tags || [],
            JSON.stringify(dto.metadata || {}),
          ]
    );
    return rows[0];
  },

  findAll: async (
    limit = 50,
    offset = 0,
    includeInactive = false
  ): Promise<KnowledgeListResponse> => {
    const activeFilter = includeInactive ? "" : "WHERE is_active = true";
    const { rows: data } = await getPool().query(
      `SELECT * FROM knowledge ${activeFilter} ORDER BY updated_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const { rows: count } = await getPool().query(
      `SELECT COUNT(*)::int AS total FROM knowledge ${activeFilter}`
    );
    return { data, total: count[0].total, limit, offset };
  },

  findById: async (id: string): Promise<Knowledge | null> => {
    const { rows } = await getPool().query(
      "SELECT * FROM knowledge WHERE id = $1",
      [id]
    );
    return rows[0] || null;
  },

  update: async (id: string, dto: UpdateKnowledgeDto): Promise<Knowledge | null> => {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.title !== undefined) {
      sets.push(`title = $${paramIndex++}`);
      values.push(dto.title);
    }
    if (dto.content !== undefined) {
      sets.push(`content = $${paramIndex++}`);
      values.push(dto.content);
    }
    if (dto.content_type !== undefined) {
      sets.push(`content_type = $${paramIndex++}`);
      values.push(dto.content_type);
    }
    if (dto.category !== undefined) {
      sets.push(`category = $${paramIndex++}`);
      values.push(dto.category);
    }
    if (dto.tags !== undefined) {
      sets.push(`tags = $${paramIndex++}`);
      values.push(dto.tags);
    }
    if (dto.embedding !== undefined) {
      sets.push(`embedding = $${paramIndex++}::vector`);
      values.push(
        dto.embedding ? JSON.stringify(dto.embedding) : null
      );
    }
    if (dto.metadata !== undefined) {
      sets.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(dto.metadata));
    }
    if (dto.is_active !== undefined) {
      sets.push(`is_active = $${paramIndex++}`);
      values.push(dto.is_active);
    }

    if (sets.length === 0) {
      return knowledgeRepository.findById(id);
    }

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await getPool().query(
      `UPDATE knowledge SET ${sets.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  delete: async (id: string): Promise<boolean> => {
    const { rowCount } = await getPool().query(
      "DELETE FROM knowledge WHERE id = $1",
      [id]
    );
    return (rowCount ?? 0) > 0;
  },

  search: async (dto: SearchKnowledgeDto): Promise<KnowledgeListResponse> => {
    const conditions: string[] = ["is_active = true"];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Búsqueda por texto en title y content
    if (dto.query) {
      conditions.push(
        `(title ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`
      );
      values.push(`%${dto.query}%`);
      paramIndex++;
    }

    // Filtro por categoría
    if (dto.category) {
      conditions.push(`category = $${paramIndex}`);
      values.push(dto.category);
      paramIndex++;
    }

    // Filtro por content_type
    if (dto.content_type) {
      conditions.push(`content_type = $${paramIndex}`);
      values.push(dto.content_type);
      paramIndex++;
    }

    // Búsqueda por tags (intersección con array)
    if (dto.tags && dto.tags.length > 0) {
      conditions.push(`tags && $${paramIndex}::text[]`);
      values.push(dto.tags);
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");
    const limit = dto.limit || 50;
    const offset = dto.offset || 0;

    const { rows: data } = await getPool().query(
      `SELECT * FROM knowledge WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    const { rows: count } = await getPool().query(
      `SELECT COUNT(*)::int AS total FROM knowledge WHERE ${whereClause}`,
      values
    );

    return { data, total: count[0].total, limit, offset };
  },

  findByCategory: async (category: string): Promise<Knowledge[]> => {
    const { rows } = await getPool().query(
      "SELECT * FROM knowledge WHERE category = $1 AND is_active = true ORDER BY created_at DESC",
      [category]
    );
    return rows;
  },

  findByContentType: async (contentType: string): Promise<Knowledge[]> => {
    const { rows } = await getPool().query(
      "SELECT * FROM knowledge WHERE content_type = $1 AND is_active = true ORDER BY created_at DESC",
      [contentType]
    );
    return rows;
  },

  /**
   * Búsqueda semántica usando pgvector cosine distance (<=>).
   * @param queryEmbedding Vector de la pregunta del cliente
   * @param limit Máximo de resultados
   * @param threshold Distancia máxima (menor = más similar). Default: 0.5
   */
  searchSemantic: async (
    queryEmbedding: number[],
    limit = 5,
    threshold = 0.5
  ): Promise<KnowledgeListResponse> => {
    const embeddingStr = JSON.stringify(queryEmbedding);
    const { rows: data } = await getPool().query(
      `SELECT *, embedding <=> $1::vector AS _distance
       FROM knowledge
       WHERE is_active = true
         AND embedding IS NOT NULL
         AND embedding <=> $1::vector < $2
       ORDER BY _distance ASC
       LIMIT $3`,
      [embeddingStr, threshold, limit]
    );
    return { data, total: data.length, limit, offset: 0 };
  },
};
