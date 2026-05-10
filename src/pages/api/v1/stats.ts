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
      route_id TEXT,
      trip_id TEXT,
      phase TEXT DEFAULT 'idle',
      nearest_stop TEXT,
      speed_kmh FLOAT DEFAULT 0,
      heading INT DEFAULT 0,
      ts TIMESTAMPTZ DEFAULT NOW()
    )`);
    await sql.unsafe(`CREATE TABLE IF NOT EXISTS mc_community_posts (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      device_id TEXT NOT NULL,
      type TEXT DEFAULT 'report',
      route_id TEXT,
      text TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await sql.unsafe(`CREATE TABLE IF NOT EXISTS mc_trips (
      trip_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      device_id TEXT NOT NULL,
      route_id TEXT,
      status TEXT DEFAULT 'active',
      started_at TIMESTAMPTZ DEFAULT NOW(),
      ended_at TIMESTAMPTZ
    )`);
  } catch (_) { /* already exist */ }
}

// GET /api/v1/stats
export const GET: APIRoute = async () => {
  try {
    const sql = getDb();
    await ensureTables(sql);

    const [usersNow, reportsToday, tripsToday, topRoutes] = await Promise.all([
      sql`SELECT COUNT(DISTINCT device_id)::int AS count FROM mc_telemetry WHERE ts > NOW() - INTERVAL '5 minutes'`,
      sql`SELECT COUNT(*)::int AS count FROM mc_community_posts WHERE created_at > CURRENT_DATE`,
      sql`SELECT COUNT(DISTINCT trip_id)::int AS count FROM mc_telemetry WHERE trip_id IS NOT NULL AND ts > CURRENT_DATE`,
      sql`
        SELECT route_id, COUNT(DISTINCT device_id)::int AS users
        FROM mc_telemetry
        WHERE route_id IS NOT NULL AND ts > NOW() - INTERVAL '1 hour'
        GROUP BY route_id ORDER BY users DESC LIMIT 3
      `,
    ]);

    return new Response(JSON.stringify({
      users_now: usersNow[0]?.count ?? 0,
      reports_today: reportsToday[0]?.count ?? 0,
      trips_today: tripsToday[0]?.count ?? 0,
      top_routes: topRoutes.map((r: Record<string, unknown>) => ({ id: r['route_id'], users: r['users'] })),
      ts: Date.now(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    console.error('[stats GET]', e);
    return new Response(JSON.stringify({
      users_now: 0, reports_today: 0, trips_today: 0, top_routes: [],
      ts: Date.now(), fallback: true,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }
};
