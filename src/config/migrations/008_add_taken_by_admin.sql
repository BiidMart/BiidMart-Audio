-- =============================================
-- BiidMart Audio — Chat de Conversaciones
-- Migración: 008_add_taken_by_admin
-- Descripción: Permite que un administrador "tome" el
-- control de una conversación para que el agente
-- automático deje de responder solo a esa conversación.
-- =============================================

ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS taken_by_admin BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN conversations.taken_by_admin IS
    'Si es true, el agente automático no responde a esta conversación (el admin la tiene tomada).';