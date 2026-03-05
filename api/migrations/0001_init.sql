-- Mueve Reparto — esquema inicial
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS deliveries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID,
    address         TEXT NOT NULL,
    lat             DOUBLE PRECISION,
    lng             DOUBLE PRECISION,
    status          TEXT NOT NULL DEFAULT 'pending',
    priority        TEXT NOT NULL DEFAULT 'normal',
    sequence        INTEGER,
    tracking_token  TEXT,
    recipient_phone TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracking (
    id          BIGSERIAL PRIMARY KEY,
    stop_id     UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    heading     DOUBLE PRECISION,
    speed       DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deliveries_created ON deliveries (created_at::date);
CREATE INDEX idx_tracking_stop ON tracking (stop_id);
