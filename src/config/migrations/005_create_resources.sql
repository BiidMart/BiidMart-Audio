-- =============================================
-- BiidMart Audio — Sistema de Recursos
-- Migración: 005_create_resources
-- Descripción: Tablas para recursos/archivos
--              entregables por el agente
-- =============================================

-- Tabla: resources
CREATE TABLE IF NOT EXISTS resources (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    category        VARCHAR(100) NOT NULL,
    tags            TEXT[] NOT NULL DEFAULT '{}',
    knowledge_id    UUID REFERENCES knowledge(id) ON DELETE SET NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: resource_files
CREATE TABLE IF NOT EXISTS resource_files (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id     UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    file_url        TEXT NOT NULL,
    file_path       TEXT NOT NULL,
    file_type       VARCHAR(100) NOT NULL,
    file_size       INTEGER,
    display_name    VARCHAR(200) NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    role            VARCHAR(50) NOT NULL DEFAULT 'file',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_resources_category   ON resources (category);
CREATE INDEX IF NOT EXISTS idx_resources_active     ON resources (is_active);
CREATE INDEX IF NOT EXISTS idx_resources_knowledge  ON resources (knowledge_id);
CREATE INDEX IF NOT EXISTS idx_resources_tags       ON resources USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_resource_files_res   ON resource_files (resource_id);

-- Comentarios
COMMENT ON TABLE resources IS 'Recursos multimedia y archivos entregables por el agente. Genérico para cualquier tipo de servicio.';
COMMENT ON TABLE resource_files IS 'Archivos asociados a un recurso. Un recurso puede tener múltiples archivos (original, resultado, demo, etc.).';
COMMENT ON COLUMN resource_files.role IS 'Rol del archivo: original, result, demo, document, reference, etc.';
COMMENT ON COLUMN resource_files.display_name IS 'Nombre descriptivo para mostrar al cliente (ej: "Audio Original", "Audio Procesado Final").';