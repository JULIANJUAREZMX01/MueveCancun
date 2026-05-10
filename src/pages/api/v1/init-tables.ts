import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';

export const prerender = false;

export const GET: APIRoute = async () => {
  const url = process.env.DATABASE_URL || import.meta.env.DATABASE_URL;
  if (!url) return new Response(JSON.stringify({ error: 'No DATABASE_URL' }), { status: 500 });

  // Debug: mostrar prefix de la URL (sin credenciales)
  const urlObj = new URL(url);
  const dbInfo = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;

  const sql = neon(url);
  const results: string[] = [];

  const ddl = [
    `CREATE TABLE IF NOT EXISTS mc_users (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      device_id TEXT UNIQUE NOT NULL,
      name TEXT,
      avatar_emoji TEXT DEFAULT '🚌',
      lang TEXT DEFAULT 'es',
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
    `CREATE TABLE IF NOT EXISTS mc_trips (
      trip_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      device_id TEXT NOT NULL,
      route_id TEXT,
      origin_stop TEXT,
      dest_stop TEXT,
      bus_unit_id TEXT,
      occupancy INT DEFAULT 0,
      status TEXT DEFAULT 'active',
      started_at TIMESTAMPTZ DEFAULT NOW(),
      ended_at TIMESTAMPTZ,
      distance_km FLOAT DEFAULT 0
    )`,
    `CREATE INDEX IF NOT EXISTS idx_trips_device ON mc_trips(device_id)`,
    `CREATE TABLE IF NOT EXISTS mc_community_posts (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      device_id TEXT NOT NULL,
      type TEXT DEFAULT 'report',
      route_id TEXT,
      stop_id TEXT,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      text TEXT,
      tags TEXT[] DEFAULT '{}',
      votes_up INT DEFAULT 0,
      votes_down INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_community_ts ON mc_community_posts(created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS mc_push_subs (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      device_id TEXT NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS mc_stop_demand (
      stop_id TEXT PRIMARY KEY,
      stop_name TEXT,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      waiting_count INT DEFAULT 0,
      demand_level TEXT DEFAULT 'low',
      last_activity TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_stop_demand_activity ON mc_stop_demand(last_activity DESC)`,
  ];

  for (const q of ddl) {
    try {
      await sql.unsafe(q);
      results.push('OK: ' + q.slice(0, 60).replace(/\n/g, ' ').trim());
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      results.push('ERR: ' + err.slice(0, 120));
    }
  }

  return new Response(JSON.stringify({ done: true, db: dbInfo, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
