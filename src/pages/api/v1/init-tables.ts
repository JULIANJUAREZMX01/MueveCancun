import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';

export const prerender = false;

export const GET: APIRoute = async ({ url: reqUrl }) => {
  const dbUrl = process.env.DATABASE_URL || import.meta.env.DATABASE_URL;
  if (!dbUrl) return new Response(JSON.stringify({ error: 'No DATABASE_URL' }), { status: 500 });

  const urlObj = new URL(dbUrl);
  const dbHost = urlObj.hostname;
  const sql = neon(dbUrl);

  const action = reqUrl.searchParams.get('action') || 'check';

  if (action === 'check') {
    try {
      const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
      return new Response(JSON.stringify({
        host: dbHost,
        tables: tables.map((t: Record<string, unknown>) => t['tablename'])
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
    }
  }

  if (action === 'setup') {
    const results: string[] = [];
    const stmts = [
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
      `CREATE TABLE IF NOT EXISTS mc_users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        device_id TEXT UNIQUE NOT NULL,
        total_trips INT DEFAULT 0,
        total_km FLOAT DEFAULT 0,
        co2_saved_g INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_seen TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS mc_trips (
        trip_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        device_id TEXT NOT NULL,
        route_id TEXT,
        origin_stop TEXT,
        dest_stop TEXT,
        bus_unit_id TEXT,
        occupancy INT DEFAULT 0,
        status TEXT DEFAULT 'waiting',
        started_at TIMESTAMPTZ DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        distance_km FLOAT DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS mc_community_posts (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        device_id TEXT NOT NULL,
        type TEXT DEFAULT 'report',
        route_id TEXT,
        stop_id TEXT,
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        text TEXT,
        votes_up INT DEFAULT 0,
        votes_down INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
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
        boarding_count INT DEFAULT 0,
        demand_level TEXT DEFAULT 'low',
        last_activity TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_telem_ts ON mc_telemetry(ts DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_telem_device ON mc_telemetry(device_id)`,
      `CREATE INDEX IF NOT EXISTS idx_trips_device ON mc_trips(device_id)`,
      `CREATE INDEX IF NOT EXISTS idx_comm_ts ON mc_community_posts(created_at DESC)`,
    ];

    for (const stmt of stmts) {
      try {
        await sql.unsafe(stmt);
        results.push('OK: ' + stmt.slice(0, 50).replace(/\s+/g, ' ').trim());
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push('ERR: ' + msg.slice(0, 150));
      }
    }

    return new Response(JSON.stringify({ host: dbHost, done: true, results }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ error: 'use ?action=check|setup' }), { status: 400 });
};
