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
    await sql.unsafe(`CREATE TABLE IF NOT EXISTS mc_users (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      device_id TEXT UNIQUE NOT NULL,
      total_trips INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_seen TIMESTAMPTZ DEFAULT NOW()
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
  } catch (_) { /* already exist */ }
}

// POST — el cliente envía su posición anónima
export const POST: APIRoute = async ({ request }) => {
  try {
    const sql = getDb();
    await ensureTables(sql);
    const body = await request.json();
    const { device_id, lat, lng, accuracy, route_id, trip_id, phase, nearest_stop, speed_kmh = 0, heading = 0 } = body;

    if (!device_id || lat == null || lng == null) {
      return new Response(JSON.stringify({ error: 'device_id, lat, lng required' }), { status: 400 });
    }

    // Insertar telemetría (retener últimas 24h, purgar automáticamente)
    await sql`
      INSERT INTO mc_telemetry (device_id, lat, lng, accuracy, route_id, trip_id, phase, nearest_stop, speed_kmh, heading)
      VALUES (${device_id}, ${lat}, ${lng}, ${accuracy || null}, ${route_id || null},
              ${trip_id || null}, ${phase || 'idle'}, ${nearest_stop || null}, ${speed_kmh}, ${heading})
    `;

    // Actualizar last_seen del usuario
    await sql`
      INSERT INTO mc_users (device_id, last_seen) VALUES (${device_id}, NOW())
      ON CONFLICT (device_id) DO UPDATE SET last_seen = NOW()
    `;

    // Si phase=waiting y nearest_stop, incrementar waiting_count del paradero
    if (phase === 'waiting' && nearest_stop) {
      await sql`
        INSERT INTO mc_stop_demand (stop_id, stop_name, lat, lng, waiting_count, last_activity, updated_at)
        VALUES (${nearest_stop}, ${nearest_stop}, ${lat}, ${lng}, 1, NOW(), NOW())
        ON CONFLICT (stop_id) DO UPDATE SET
          waiting_count = mc_stop_demand.waiting_count + 1,
          last_activity = NOW(),
          updated_at = NOW(),
          demand_level = CASE
            WHEN mc_stop_demand.waiting_count + 1 >= 10 THEN 'critical'
            WHEN mc_stop_demand.waiting_count + 1 >= 5  THEN 'high'
            WHEN mc_stop_demand.waiting_count + 1 >= 2  THEN 'medium'
            ELSE 'low'
          END
      `;
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('[telemetry POST]', e);
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
};

// GET — retorna datos para heatmap y paraderos con demanda
export const GET: APIRoute = async ({ url }) => {
  try {
    const sql = getDb();
    const type = url.searchParams.get('type') || 'heatmap';

    if (type === 'heatmap') {
      // Posiciones de últimos 30 minutos para heatmap
      const points = await sql`
        SELECT lat, lng, COUNT(*) as weight
        FROM mc_telemetry
        WHERE ts > NOW() - INTERVAL '30 minutes'
        GROUP BY ROUND(lat::numeric,4), ROUND(lng::numeric,4), lat, lng
        LIMIT 500
      `;
      return new Response(JSON.stringify(points), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }

    if (type === 'stops') {
      // Paraderos con demanda activa (últimos 15 minutos)
      const stops = await sql`
        SELECT sd.*,
          (SELECT COUNT(DISTINCT device_id) FROM mc_telemetry
           WHERE nearest_stop = sd.stop_id AND phase = 'waiting'
           AND ts > NOW() - INTERVAL '15 minutes') AS live_waiting
        FROM mc_stop_demand sd
        WHERE sd.last_activity > NOW() - INTERVAL '1 hour'
        ORDER BY sd.waiting_count DESC
        LIMIT 100
      `;
      return new Response(JSON.stringify(stops), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }

    if (type === 'users') {
      // Usuarios activos ahora en el mapa (anónimos)
      const users = await sql`
        SELECT DISTINCT ON (device_id) lat, lng, phase, route_id, nearest_stop, heading
        FROM mc_telemetry
        WHERE ts > NOW() - INTERVAL '5 minutes'
        ORDER BY device_id, ts DESC
        LIMIT 200
      `;
      return new Response(JSON.stringify(users), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }

    return new Response(JSON.stringify({ error: 'type must be: heatmap|stops|users' }), { status: 400 });
  } catch (e) {
    console.error('[telemetry GET]', e);
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
