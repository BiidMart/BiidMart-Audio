-- =============================================
-- BiidMart Audio — Chat de Conversaciones (persistencia)
-- Migración: 006_create_conversations
-- Descripción: Tabla maestra de conversaciones.
-- =============================================

CREATE TABLE IF NOT EXISTS conversations (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone            VARCHAR(30) NOT NULL UNIQUE,
    client_id        UUID REFERENCES clients(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations (phone);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations (last_message_at DESC);

COMMENT ON TABLE conversations IS 'Conversaciones persistentes del canal (WhatsApp). Fuente de verdad para el Chat del Admin.';
COMMENT ON COLUMN conversations.phone IS 'Número de teléfono único que identifica la conversación (sessionId del agente).';
COMMENT ON COLUMN conversations.client_id IS 'Relación opcional con el cliente registrado en BD.';
COMMENT ON COLUMN conversations.last_message_at IS 'Fecha del último mensaje para ordenar la lista del Admin.';