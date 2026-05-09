import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Solo accesible con token secreto
  const auth = request.headers.get('x-setup-key');
  if (auth !== (process.env.GITHUB_ISSUES_TOKEN || import.meta.env.GITHUB_ISSUES_TOKEN)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const url = process.env.DATABASE_URL || import.meta.env.DATABASE_URL;
  if (!url) return new Response(JSON.stringify({ error: 'No DATABASE_URL' }), { status: 500 });

  const sql = neon(url);

  const queries = [
    `CREATE TABLE IF NOT EXISTS mc_users (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      device_id TEXT UNIQUE NOT NULL,
      name TEXT,
      avatar_emoji TEXT DEFAULT '🚌',
      lang TEXT DEFAULT 'es',
      notifications BOOLEAN DEFAULT true,
      share_location BOOLEAN DEFAULT false,
      preferred_routes TEXT[] DEFAULT '{}',
      total_trips INT DEFAULT 0,
      total_km FLOAT DEFAULT 0,
      co2_saved_g INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_seen TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS mc_telemetry (
      id BIGSERIAL PRIMARY KEY,
      device_id TEXT NOT NULL,
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      accuracy FLOAT,
      route_id TEXT,
      trip_id TEXT,
      phase TEXT DEFAULT 'idle',
      nearest_stop TEXT,
      speed_kmh FLOAT DEFAULT 0,
      heading INT DEFAULT 0,
      ts TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_telem_ts ON mc_telemetry(ts DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_telem_device ON mc_telemetry(device_id)`,
    `CREATE INDEX IF NOT EXISTS idx_telem_stop ON mc_telemetry(nearest_stop) WHERE nearest_stop IS NOT NULL`,
    `CREATE TABLE IF NOT EXISTS mc_stop_demand (
      stop_id TEXT PRIMARY KEY,
      stop_name TEXT,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      route_ids TEXT[] DEFAULT '{}',
      waiting_count INT DEFAULT 0,
      boarding_count INT DEFAULT 0,
      avg_wait_min FLOAT DEFAULT 0,
      demand_level TEXT DEFAULT 'low',
      last_activity TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS mc_trips (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      device_id TEXT NOT NULL,
      route_id TEXT NOT NULL,
      origin_stop TEXT,
      dest_stop TEXT,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      boarded_at TIMESTAMPTZ,
      arrived_at TIMESTAMPTZ,
      status TEXT DEFAULT 'waiting',
      bus_unit_id TEXT,
      occupancy INT DEFAULT 0,
      path_points JSONB DEFAULT '[]',
      notifications_sent TEXT[] DEFAULT '{}'
    )`,
    `CREATE INDEX IF NOT EXISTS idx_trips_device ON mc_trips(device_id)`,
    `CREATE INDEX IF NOT EXISTS idx_trips_status ON mc_trips(status) WHERE status NOT IN ('arrived','cancelled')`,
    `CREATE TABLE IF NOT EXISTS mc_bus_occupancy (
      id BIGSERIAL PRIMARY KEY,
      unit_id TEXT NOT NULL,
      route_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      occupancy_pct INT NOT NULL,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      ts TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_occ_unit ON mc_bus_occupancy(unit_id, ts DESC)`,
    `CREATE TABLE IF NOT EXISTS mc_shared_locations (
      share_id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      nickname TEXT DEFAULT 'Viajero',
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      route_id TEXT,
      trip_id TEXT,
      phase TEXT DEFAULT 'idle',
      expires_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_shared_exp ON mc_shared_locations(expires_at)`,
    `CREATE TABLE IF NOT EXISTS mc_push_subs (
      id BIGSERIAL PRIMARY KEY,
      device_id TEXT NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth_key TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_push_dev ON mc_push_subs(device_id)`,
    `CREATE TABLE IF NOT EXISTS mc_heatmap_cache (
      id BIGSERIAL PRIMARY KEY,
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      weight FLOAT NOT NULL DEFAULT 1.0,
      stop_id TEXT,
      hour_bucket INT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`
  ];

  const results: Array<{ ok: boolean; q: string; err?: string }> = [];
  for (const q of queries) {
    try {
      await sql(q as TemplateStringsArray & string);
      results.push({ ok: true, q: q.slice(0, 60) });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ ok: false, q: q.slice(0, 60), err: msg });
    }
  }

  const ok = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  return new Response(JSON.stringify({ ok, fail, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
