-- =============================================
-- BiidMart Audio - MVP
-- Migración: 004_create_payments
-- Descripción: Registro manual de pagos
-- =============================================

CREATE TABLE IF NOT EXISTS payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
    amount          DECIMAL(10, 2) NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    method          VARCHAR(50) NOT NULL DEFAULT 'manual',
    status          VARCHAR(30) NOT NULL DEFAULT 'completed',
    notes           TEXT,
    paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_client ON payments (client_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);

COMMENT ON TABLE payments IS 'Registro manual de pagos. Sin pasarela integrada.';
COMMENT ON COLUMN payments.amount IS 'Monto del pago';
COMMENT ON COLUMN payments.method IS 'Método: manual, transferencia, efectivo, etc.';
COMMENT ON COLUMN payments.status IS 'Estado: completed, pending, refunded';