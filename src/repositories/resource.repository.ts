// =============================================
// Resource Repository
// Acceso a datos de resources y resource_files.
// =============================================

import { getPool } from "../config/database";
import {
  Resource,
  ResourceSearchResult,
  CreateResourceDto,
  UpdateResourceDto,
  ResourceListResponse,
  ResourceFile,
} from "../types/resource.interface";

export const resourceRepository = {
  // ─── Resources CRUD ───

  create: async (dto: CreateResourceDto): Promise<Resource> => {
    const { rows } = await getPool().query(
      `INSERT INTO resources (title, description, category, tags, knowledge_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        dto.title,
        dto.description || null,
        dto.category,
        dto.tags || [],
        dto.knowledge_id || null,
      ]
    );
    return rows[0];
  },

  findAll: async (includeInactive = false): Promise<ResourceListResponse> => {
    const filter = includeInactive ? "" : "WHERE is_active = true";
    const { rows: data } = await getPool().query(
      `SELECT * FROM resources ${filter} ORDER BY updated_at DESC`
    );
    return { data, total: data.length };
  },

  findById: async (id: string): Promise<Resource | null> => {
    const { rows } = await getPool().query(
      "SELECT * FROM resources WHERE id = $1",
      [id]
    );
    return rows[0] || null;
  },

  update: async (id: string, dto: UpdateResourceDto): Promise<Resource | null> => {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.title !== undefined) { sets.push(`title = $${idx++}`); values.push(dto.title); }
    if (dto.description !== undefined) { sets.push(`description = $${idx++}`); values.push(dto.description); }
    if (dto.category !== undefined) { sets.push(`category = $${idx++}`); values.push(dto.category); }
    if (dto.tags !== undefined) { sets.push(`tags = $${idx++}`); values.push(dto.tags); }
    if (dto.knowledge_id !== undefined) { sets.push(`knowledge_id = $${idx++}`); values.push(dto.knowledge_id); }
    if (dto.is_active !== undefined) { sets.push(`is_active = $${idx++}`); values.push(dto.is_active); }

    if (sets.length === 0) return resourceRepository.findById(id);

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await getPool().query(
      `UPDATE resources SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  delete: async (id: string): Promise<boolean> => {
    const { rowCount } = await getPool().query(
      "DELETE FROM resources WHERE id = $1",
      [id]
    );
    return (rowCount ?? 0) > 0;
  },

  // ─── Resource Files CRUD ───

  addFile: async (
    resourceId: string,
    file: Omit<ResourceFile, "id" | "resource_id" | "created_at">
  ): Promise<ResourceFile> => {
    const { rows } = await getPool().query(
      `INSERT INTO resource_files (resource_id, file_url, file_path, file_type, file_size, display_name, sort_order, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        resourceId,
        file.file_url,
        file.file_path,
        file.file_type,
        file.file_size,
        file.display_name,
        file.sort_order,
        file.role,
      ]
    );
    return rows[0];
  },

  getFiles: async (resourceId: string): Promise<ResourceFile[]> => {
    const { rows } = await getPool().query(
      "SELECT * FROM resource_files WHERE resource_id = $1 ORDER BY sort_order ASC",
      [resourceId]
    );
    return rows;
  },

  deleteFile: async (fileId: string): Promise<boolean> => {
    const { rowCount } = await getPool().query(
      "DELETE FROM resource_files WHERE id = $1",
      [fileId]
    );
    return (rowCount ?? 0) > 0;
  },

  // ─── Búsqueda para el agente ───

  search: async (params: {
    category?: string;
    tags?: string[];
    limit?: number;
  }): Promise<ResourceSearchResult[]> => {
    const conditions: string[] = ["r.is_active = true"];
    const values: unknown[] = [];
    let idx = 1;

    if (params.category) {
      conditions.push(`r.category = $${idx++}`);
      values.push(params.category);
    }
    if (params.tags && params.tags.length > 0) {
      conditions.push(`r.tags && $${idx++}::text[]`);
      values.push(params.tags);
    }

    const where = conditions.join(" AND ");
    const limit = params.limit || 10;

    const { rows } = await getPool().query(
      `SELECT r.*, rf.file_url, rf.file_type, rf.display_name, rf.role, rf.sort_order
       FROM resources r
       JOIN resource_files rf ON rf.resource_id = r.id
       WHERE ${where}
       ORDER BY r.updated_at DESC, rf.sort_order ASC
       LIMIT $${idx}`,
      [...values, limit]
    );
    return rows;
  },
};