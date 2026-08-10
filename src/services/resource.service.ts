// =============================================
// Resource Service
// Lógica de negocio para recursos y archivos.
// Integración con Supabase Storage.
// =============================================

import { resourceRepository } from "../repositories/resource.repository";
import { supabaseStorage } from "./supabase-storage.service";
import { logger } from "../utils/logger";
import {
  Resource,
  ResourceFile,
  ResourceSearchResult,
  CreateResourceDto,
  UpdateResourceDto,
  ResourceListResponse,
} from "../types/resource.interface";

export const resourceService = {
  // ─── CRUD ───

  create: async (dto: CreateResourceDto): Promise<Resource> => {
    return resourceRepository.create(dto);
  },

  findAll: async (includeInactive = false): Promise<ResourceListResponse> => {
    return resourceRepository.findAll(includeInactive);
  },

  findById: async (id: string): Promise<Resource | null> => {
    const resource = await resourceRepository.findById(id);
    if (resource) {
      resource.files = await resourceRepository.getFiles(id);
    }
    return resource;
  },

  update: async (id: string, dto: UpdateResourceDto): Promise<Resource | null> => {
    return resourceRepository.update(id, dto);
  },

  delete: async (id: string): Promise<boolean> => {
    // Obtener archivos para eliminar de Supabase Storage
    const files = await resourceRepository.getFiles(id);
    for (const file of files) {
      try {
        await supabaseStorage.deleteFile(file.file_path);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`[Resource] Failed to delete file from storage: ${msg}`);
      }
    }
    return resourceRepository.delete(id);
  },

  // ─── Archivos ───

  uploadFile: async (
    resourceId: string,
    fileBuffer: Buffer,
    originalName: string,
    mimetype: string,
    displayName: string,
    role = "file",
    sortOrder = 0
  ): Promise<ResourceFile> => {
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const folder = getStorageFolder(mimetype);
    const filePath = `${folder}/${Date.now()}-${safeName}`;

    // Subir a Supabase Storage
    const uploaded = await supabaseStorage.uploadFile(
      filePath,
      fileBuffer,
      mimetype
    );

    // Guardar referencia en BD
    return resourceRepository.addFile(resourceId, {
      file_url: uploaded.url,
      file_path: uploaded.path,
      file_type: mimetype,
      file_size: fileBuffer.length,
      display_name: displayName || originalName,
      sort_order: sortOrder,
      role,
    });
  },

  getFiles: async (resourceId: string): Promise<ResourceFile[]> => {
    return resourceRepository.getFiles(resourceId);
  },

  deleteFile: async (fileId: string): Promise<boolean> => {
    return resourceRepository.deleteFile(fileId);
  },

  // ─── Búsqueda para el agente ───

  search: async (params: {
    category?: string;
    tags?: string[];
    limit?: number;
  }): Promise<ResourceSearchResult[]> => {
    return resourceRepository.search(params);
  },
};

// ─── Helpers ───

const getStorageFolder = (mimetype: string): string => {
  if (mimetype.startsWith("audio/")) return "audio/resources";
  if (mimetype.startsWith("image/")) return "images/resources";
  if (mimetype.startsWith("video/")) return "videos/resources";
  return "documents/resources";
};