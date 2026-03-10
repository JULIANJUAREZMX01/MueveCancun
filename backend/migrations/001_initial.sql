-- Mueve Reparto — Migración inicial

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT NOT NULL UNIQUE,
  plan        TEXT NOT NULL DEFAULT 'free',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stops (
  id           TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address      TEXT NOT NULL,
  client_name  TEXT,
  phone        TEXT,
  notes        TEXT,
  lat          FLOAT8,
  lng          FLOAT8,
  status       TEXT NOT NULL DEFAULT 'pending',
  income       FLOAT8,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stops_user_id ON stops (user_id);
CREATE INDEX IF NOT EXISTS idx_stops_status  ON stops (status);

CREATE TABLE IF NOT EXISTS daily_stats (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  deliveries   INTEGER NOT NULL DEFAULT 0,
  income       FLOAT8 NOT NULL DEFAULT 0.0,
  goal         FLOAT8,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_stats_user_date ON daily_stats (user_id, date DESC);
