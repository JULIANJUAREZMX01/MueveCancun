import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';

export const prerender = false;

function getDb() {
  const url = process.env.DATABASE_URL || import.meta.env.DATABASE_URL;
  if (!url) throw new Error('No DATABASE_URL');
  return neon(url);
}

function getDbDirect() {
  // Para DDL: usar connection sin pooler si está disponible
  const url = process.env.DATABASE_URL_UNPOOLED
    || process.env.POSTGRES_URL_NON_POOLING
    || process.env.DATABASE_URL
    || import.meta.env.DATABASE_URL;
  if (!url) throw new Error('No DATABASE_URL');
  return neon(url);
}

// POST — gestionar viajes
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, device_id, route_id, origin_stop, dest_stop, trip_id } = body;

    if (!device_id) {
      return new Response(JSON.stringify({ error: 'device_id required' }), { status: 400 });
    }

    const sql = getDb();
    const sqlDDL = getDbDirect();

    // Auto-migrate usando conexión directa (sin pooler)
    try {
      await sqlDDL.unsafe(`CREATE TABLE IF NOT EXISTS mc_trips (
        trip_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        device_id TEXT NOT NULL,
        route_id TEXT,
        origin_stop TEXT,
        dest_stop TEXT,
        status TEXT DEFAULT 'waiting',
        started_at TIMESTAMPTZ DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        distance_km FLOAT DEFAULT 0
      )`);
      await sqlDDL.unsafe(`CREATE TABLE IF NOT EXISTS mc_users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        device_id TEXT UNIQUE NOT NULL,
        total_trips INT DEFAULT 0,
        co2_saved_g INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_seen TIMESTAMPTZ DEFAULT NOW()
      )`);
    } catch (_) { /* may already exist or pooler limitation */ }

    if (action === 'start') {
      const result = await sql`
        INSERT INTO mc_trips (device_id, route_id, origin_stop, dest_stop, status)
        VALUES (${device_id}, ${route_id || null}, ${origin_stop || null}, ${dest_stop || null}, 'waiting')
        RETURNING trip_id
      `;
      try {
        await sql`
          INSERT INTO mc_users (device_id, last_seen) VALUES (${device_id}, NOW())
          ON CONFLICT (device_id) DO UPDATE SET last_seen = NOW()
        `;
      } catch (_) { /* ignore */ }
      return new Response(JSON.stringify({ trip_id: result[0]?.trip_id }), { status: 201 });
    }

    if (action === 'end' && trip_id) {
      await sql`UPDATE mc_trips SET status='completed', ended_at=NOW() WHERE trip_id=${trip_id} AND device_id=${device_id}`;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'action must be: start|end' }), { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const sql = getDb();
    const device_id = url.searchParams.get('device_id');
    if (!device_id) return new Response(JSON.stringify({ error: 'device_id required' }), { status: 400 });
    const trips = await sql`SELECT * FROM mc_trips WHERE device_id=${device_id} ORDER BY started_at DESC LIMIT 20`;
    return new Response(JSON.stringify(trips), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
};
