-- Mueve Reparto — Migración inicial
-- Usa FLOAT8 en vez de NUMERIC para compatibilidad directa con tipos f64 de Rust/sqlx

-- Tabla de dispositivos (identificación sin auth en P3)
CREATE TABLE IF NOT EXISTS devices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de paradas
CREATE TABLE IF NOT EXISTS stops (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id    TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  -- client_id = ID local del stop en IDB del cliente; único por dispositivo
  client_id    TEXT NOT NULL,
  address      TEXT NOT NULL,
  lat          FLOAT8,
  lng          FLOAT8,
  priority     TEXT NOT NULL CHECK (priority IN ('normal', 'urgent')) DEFAULT 'normal',
  status       TEXT NOT NULL CHECK (status IN ('pending', 'in_transit', 'completed', 'failed')) DEFAULT 'pending',
  note         TEXT,
  income       FLOAT8,
  client_name  TEXT,
  client_phone TEXT,
  stop_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notified     BOOLEAN NOT NULL DEFAULT FALSE,
  synced_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (device_id, client_id)  -- evita duplicados en batch sync
);

CREATE INDEX IF NOT EXISTS idx_stops_device_id ON stops (device_id);
CREATE INDEX IF NOT EXISTS idx_stops_status    ON stops (status);
CREATE INDEX IF NOT EXISTS idx_stops_created   ON stops (created_at DESC);

-- Tabla de estadísticas diarias
CREATE TABLE IF NOT EXISTS daily_stats (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id    TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  stat_date    DATE NOT NULL,
  completed    INTEGER NOT NULL DEFAULT 0,
  total        INTEGER NOT NULL DEFAULT 0,
  income       FLOAT8  NOT NULL DEFAULT 0.0,
  distance_km  FLOAT8,
  duration_min INTEGER,
  UNIQUE (device_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_stats_device_date ON daily_stats (device_id, stat_date DESC);
