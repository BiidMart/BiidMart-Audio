-- =============================================
-- BiidMart Audio - Motor de Conocimiento
-- Migración: 001_create_knowledge
-- Descripción: Tabla principal del motor de conocimiento del negocio
-- =============================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla: knowledge
CREATE TABLE IF NOT EXISTS knowledge (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category        VARCHAR(100) NOT NULL,
    question        TEXT NOT NULL,
    answer          TEXT NOT NULL,
    keywords        TEXT[] NOT NULL DEFAULT '{}',
    priority        INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge (category);
CREATE INDEX IF NOT EXISTS idx_knowledge_active ON knowledge (is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_keywords ON knowledge USING GIN (keywords);
CREATE INDEX IF NOT EXISTS idx_knowledge_priority ON knowledge (priority DESC);

-- Comentarios de columna
COMMENT ON TABLE knowledge IS 'Motor de conocimiento del negocio. Fuente oficial de información para el Agente IA.';
COMMENT ON COLUMN knowledge.id IS 'Identificador único universal';
COMMENT ON COLUMN knowledge.category IS 'Categoría del conocimiento (pricing, process, examples, payments, faq, etc.)';
COMMENT ON COLUMN knowledge.question IS 'Pregunta, tema o clave de búsqueda';
COMMENT ON COLUMN knowledge.answer IS 'Respuesta, contenido o definición';
COMMENT ON COLUMN knowledge.keywords IS 'Palabras clave para búsqueda semántica y matching';
COMMENT ON COLUMN knowledge.priority IS 'Prioridad. Mayor valor = mayor relevancia';
COMMENT ON COLUMN knowledge.is_active IS 'Indica si el registro está activo';
COMMENT ON COLUMN knowledge.created_at IS 'Fecha de creación';
COMMENT ON COLUMN knowledge.updated_at IS 'Fecha de última actualización';