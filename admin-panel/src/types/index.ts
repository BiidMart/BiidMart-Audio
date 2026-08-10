// =============================================
// Tipos del Panel Administrativo
// =============================================

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

export interface KnowledgeFormData {
  title: string;
  content: string;
  category: string;
  content_type?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export const CATEGORIES = [
  "pricing",
  "process",
  "examples",
  "payments",
  "faq",
  "general",
  "requirements",
  "delivery",
] as const;

export type Category = (typeof CATEGORIES)[number];