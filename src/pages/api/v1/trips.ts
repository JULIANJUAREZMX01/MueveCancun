import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';

export const prerender = false;

function getDb() {
  const url = process.env.DATABASE_URL || import.meta.env.DATABASE_URL;
  if (!url) throw new Error('No DATABASE_URL');
  return neon(url);
}

async function ensureTables(sql: ReturnType<typeof neon>) {
  try {
    await sql.unsafe(`CREATE TABLE IF NOT EXISTS mc_trips (
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
    )`);
    await sql.unsafe(`CREATE TABLE IF NOT EXISTS mc_users (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      device_id TEXT UNIQUE NOT NULL,
      total_trips INT DEFAULT 0,
      total_km FLOAT DEFAULT 0,
      co2_saved_g INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_seen TIMESTAMPTZ DEFAULT NOW()
    )`);
    await sql.unsafe(`CREATE TABLE IF NOT EXISTS mc_telemetry (
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
    )`);
    await sql.unsafe(`CREATE TABLE IF NOT EXISTS mc_stop_demand (
      stop_id TEXT PRIMARY KEY,
      stop_name TEXT,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      waiting_count INT DEFAULT 0,
      boarding_count INT DEFAULT 0,
      demand_level TEXT DEFAULT 'low',
      last_activity TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await sql.unsafe(`CREATE TABLE IF NOT EXISTS mc_community_posts (
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
    )`);
    await sql.unsafe(`CREATE TABLE IF NOT EXISTS mc_push_subs (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      device_id TEXT NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_telem_ts ON mc_telemetry(ts DESC)`);
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_trips_device ON mc_trips(device_id)`);
  } catch (_) { /* tables already exist */ }
}

// POST — gestionar viajes (start, board, arrive, end)
export const POST: APIRoute = async ({ request }) => {
  try {
    const sql = getDb();
    await ensureTables(sql);
    const body = await request.json();
    const { action, device_id, route_id, origin_stop, dest_stop, trip_id } = body;

    if (!device_id) {
      return new Response(JSON.stringify({ error: 'device_id required' }), { status: 400 });
    }

    if (action === 'start') {
      const result = await sql`
        INSERT INTO mc_trips (device_id, route_id, origin_stop, dest_stop, status)
        VALUES (${device_id}, ${route_id || null}, ${origin_stop || null}, ${dest_stop || null}, 'waiting')
        RETURNING trip_id
      `;
      // Upsert usuario
      await sql`
        INSERT INTO mc_users (device_id, last_seen) VALUES (${device_id}, NOW())
        ON CONFLICT (device_id) DO UPDATE SET last_seen = NOW(), total_trips = mc_users.total_trips + 1
      `;
      return new Response(JSON.stringify({ trip_id: result[0]?.trip_id }), { status: 201 });
    }

    if (action === 'board' && trip_id) {
      await sql`
        UPDATE mc_trips SET status = 'on_bus' WHERE trip_id = ${trip_id} AND device_id = ${device_id}
      `;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (action === 'end' && trip_id) {
      await sql`
        UPDATE mc_trips SET status = 'completed', ended_at = NOW() WHERE trip_id = ${trip_id} AND device_id = ${device_id}
      `;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use: start|board|end' }), { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[trips POST]', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};

// GET — historial de viajes del dispositivo
export const GET: APIRoute = async ({ url }) => {
  try {
    const sql = getDb();
    await ensureTables(sql);
    const device_id = url.searchParams.get('device_id');
    if (!device_id) {
      return new Response(JSON.stringify({ error: 'device_id required' }), { status: 400 });
    }
    const trips = await sql`
      SELECT * FROM mc_trips WHERE device_id = ${device_id}
      ORDER BY started_at DESC LIMIT 20
    `;
    return new Response(JSON.stringify(trips), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
