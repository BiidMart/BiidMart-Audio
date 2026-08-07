-- =============================================
-- BiidMart Audio - Motor de Conocimiento v2
-- Migración: 002_redesign_knowledge
-- Descripción: Rediseño completo del Motor de Conocimiento
--              orientado a Agente IA + RAG + pgvector
-- =============================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Eliminar tabla anterior (CRUD de FAQs)
DROP TABLE IF EXISTS knowledge CASCADE;

-- Nueva tabla: knowledge (v2)
CREATE TABLE knowledge (
    -- Identidad
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(200) NOT NULL,
    content         TEXT NOT NULL,
    content_type    VARCHAR(50) NOT NULL DEFAULT 'text',

    -- Categorización
    category        VARCHAR(100) NOT NULL,
    tags            TEXT[] NOT NULL DEFAULT '{}',

    -- Búsqueda semántica (pgvector)
    embedding       vector(1536),

    -- Extensibilidad sin migraciones
    metadata        JSONB NOT NULL DEFAULT '{}',

    -- Ciclo de vida
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_knowledge_category     ON knowledge (category);
CREATE INDEX IF NOT EXISTS idx_knowledge_active       ON knowledge (is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags         ON knowledge USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_content_type ON knowledge (content_type);

-- Comentarios
COMMENT ON TABLE  knowledge IS 'Motor de Conocimiento v2. Fuente oficial para el Agente IA. Preparado para RAG, pgvector y multimedia.';
COMMENT ON COLUMN knowledge.id           IS 'Identificador único universal';
COMMENT ON COLUMN knowledge.title        IS 'Título descriptivo del fragmento de conocimiento';
COMMENT ON COLUMN knowledge.content      IS 'Contenido del conocimiento. Lo que el Agente IA recupera y comunica.';
COMMENT ON COLUMN knowledge.content_type IS 'Tipo de contenido: text, audio_sample, image, video, file';
COMMENT ON COLUMN knowledge.category     IS 'Categoría: pricing, process, examples, payments, faq, requirements, delivery, general';
COMMENT ON COLUMN knowledge.tags         IS 'Palabras clave para búsqueda por intersección (GIN)';
COMMENT ON COLUMN knowledge.embedding    IS 'Vector embedding (1536 dims) para búsqueda semántica con pgvector';
COMMENT ON COLUMN knowledge.metadata     IS 'Metadatos extensibles en JSONB: precios, URLs, pasos, géneros, duraciones, etc.';
COMMENT ON COLUMN knowledge.is_active    IS 'Soft delete. false = conocimiento desactivado.';
COMMENT ON COLUMN knowledge.created_at   IS 'Fecha de creación';
COMMENT ON COLUMN knowledge.updated_at   IS 'Fecha de última actualización';