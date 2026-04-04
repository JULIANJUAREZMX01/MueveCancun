-- ============================================================
-- MueveCancun — Supabase Migration 001: Initial Schema
-- ============================================================
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- O via CLI: supabase db push
--
-- Equivalente al esquema en guardians.ts (Neon).
-- ============================================================

-- Extensión para UUIDs (opcional, payments usa TEXT primary key)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Tabla: guardians ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS guardians (
  stripe_customer_id  TEXT PRIMARY KEY,
  email               TEXT NOT NULL DEFAULT 'unknown',
  tier                TEXT CHECK (tier IN ('shield', 'architect')),
  amount_monthly      NUMERIC(10, 2),
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'cancelled', 'failed')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para búsqueda por email
CREATE INDEX IF NOT EXISTS idx_guardians_email
  ON guardians(email);

-- ─── Tabla: payments ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                  TEXT PRIMARY KEY,
  stripe_customer_id  TEXT NOT NULL REFERENCES guardians(stripe_customer_id)
                        ON DELETE CASCADE,
  amount              NUMERIC(10, 2),
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'success', 'failed')),
  stripe_payment_id   TEXT UNIQUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para búsqueda por customer
CREATE INDEX IF NOT EXISTS idx_payments_customer
  ON payments(stripe_customer_id);

-- ─── Row Level Security (RLS) ────────────────────────────────
-- Usar service_role key en el servidor (bypass RLS).
-- La anon key NO debe tener acceso a estas tablas.

ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments  ENABLE ROW LEVEL SECURITY;

-- Solo el service_role tiene acceso (bypass automático).
-- No se crean políticas de anon para mantener datos privados.

-- ─── Trigger: auto-update updated_at ────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_guardians_updated_at ON guardians;
CREATE TRIGGER set_guardians_updated_at
  BEFORE UPDATE ON guardians
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── Vista de estadísticas (opcional) ───────────────────────
CREATE OR REPLACE VIEW guardian_stats AS
SELECT
  COUNT(*)::int                            AS guardian_count,
  COALESCE(SUM(amount_monthly), 0)::float  AS monthly_revenue
FROM guardians
WHERE status = 'active';
