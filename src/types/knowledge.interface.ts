export interface Knowledge {
  id: string;
  title: string;
  content: string;
  content_type: string;
  category: string;
  tags: string[];
  embedding: number[] | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateKnowledgeDto {
  title: string;
  content: string;
  content_type?: string;
  category: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateKnowledgeDto {
  title?: string;
  content?: string;
  content_type?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  is_active?: boolean;
}

export interface SearchKnowledgeDto {
  query?: string;
  category?: string;
  content_type?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface KnowledgeListResponse {
  data: Knowledge[];
  total: number;
  limit: number;
  offset: number;
}