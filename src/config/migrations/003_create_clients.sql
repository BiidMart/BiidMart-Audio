-- =============================================
-- BiidMart Audio - MVP
-- Migración: 003_create_clients
-- Descripción: Registro persistente de clientes
-- =============================================

CREATE TABLE IF NOT EXISTS clients (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone           VARCHAR(20) NOT NULL UNIQUE,
    name            VARCHAR(200),
    source          VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients (phone);

COMMENT ON TABLE clients IS 'Clientes registrados desde WhatsApp. La IA registra automáticamente los datos durante la conversación.';
COMMENT ON COLUMN clients.phone IS 'Número de teléfono único (PK lógico)';
COMMENT ON COLUMN clients.name IS 'Nombre del cliente (obtenido por la IA)';
COMMENT ON COLUMN clients.source IS 'Canal de origen: whatsapp, instagram, referral, etc.';
COMMENT ON COLUMN clients.notes IS 'Notas adicionales sobre el cliente';
COMMENT ON COLUMN clients.last_interaction_at IS 'Fecha de última interacción';