// =============================================
// Tipos del Sistema de Recursos
// =============================================

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  knowledge_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  files?: ResourceFile[];
}

export interface ResourceFile {
  id: string;
  resource_id: string;
  file_url: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  display_name: string;
  sort_order: number;
  role: string;
  created_at: string;
}

export interface CreateResourceDto {
  title: string;
  description?: string;
  category: string;
  tags?: string[];
  knowledge_id?: string | null;
}

export interface UpdateResourceDto {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  knowledge_id?: string | null;
  is_active?: boolean;
}

export interface ResourceListResponse {
  data: Resource[];
  total: number;
}

// Resultado de búsqueda de recursos con archivos (JOIN resource_files)
export interface ResourceSearchResult extends Resource {
  file_url: string;
  file_type: string;
  display_name: string;
  role: string;
  sort_order: number;
}
