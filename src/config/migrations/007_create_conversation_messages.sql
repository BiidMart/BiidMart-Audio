-- =============================================
-- BiidMart Audio — Chat de Conversaciones (persistencia)
-- Migración: 007_create_conversation_messages
-- Descripción: Mensajes persistentes por conversación.
-- =============================================

CREATE TABLE IF NOT EXISTS conversation_messages (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role              VARCHAR(20) NOT NULL,
    content           TEXT NOT NULL DEFAULT '',
    media_type        VARCHAR(50),
    media_url         TEXT,
    media_path        TEXT,
    media_expires_at  TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON conversation_messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_expires ON conversation_messages (media_expires_at);

COMMENT ON TABLE conversation_messages IS 'Mensajes persistentes de una conversación (cliente, agente, admin).';
COMMENT ON COLUMN conversation_messages.role IS 'Rol del autor: client, agent o admin.';
COMMENT ON COLUMN conversation_messages.media_type IS 'Tipo de media asociado (audio, image, video, document).';
COMMENT ON COLUMN conversation_messages.media_url IS 'URL pública del archivo (puede quedar nula tras expirar).';
COMMENT ON COLUMN conversation_messages.media_path IS 'Ruta en Supabase Storage (para poder eliminar el archivo).';
COMMENT ON COLUMN conversation_messages.media_expires_at IS 'Fecha de expiración para eliminación automática del archivo físico.';