-- Mueve Reparto — Migración P5: Auth OTP + Suscripciones
-- Depende de 001_initial.sql

-- Tabla de usuarios (identificados por número de teléfono)
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT NOT NULL UNIQUE,            -- +521234567890
  plan        TEXT NOT NULL DEFAULT 'free'
                CHECK (plan IN ('free', 'pro')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);

-- Vincular devices a users (opcional, permite asociar dispositivos a cuenta)
ALTER TABLE devices ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices (user_id);

-- Tabla de intentos OTP (para rate-limiting y verificación)
CREATE TABLE IF NOT EXISTS otp_attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,                   -- SHA-256 del código de 6 dígitos
  expires_at  TIMESTAMPTZ NOT NULL,            -- NOW() + 10 minutos
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone_created ON otp_attempts (phone, created_at DESC);

-- Limpiar intentos expirados automáticamente (política: guardar hasta 24h)
-- (se limpian vía DELETE WHERE expires_at < NOW() en el handler)

-- Tabla de suscripciones (historial de pagos)
CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL DEFAULT 'pro'
                    CHECK (plan IN ('free', 'pro')),
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'cancelled', 'expired')),
  -- Proveedor de pago: 'conekta' | 'manual' | null (para testing)
  provider        TEXT,
  provider_ref    TEXT,                        -- ID de pago externo
  amount_mxn      INTEGER,                     -- centavos MXN
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,                 -- NULL = sin fecha de expiración
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subs_user_id  ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subs_status   ON subscriptions (status);
