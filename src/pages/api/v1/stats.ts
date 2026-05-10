import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';

export const prerender = false;

function getDb() {
  const url = process.env.DATABASE_URL || import.meta.env.DATABASE_URL;
  if (!url) throw new Error('No DATABASE_URL');
  return neon(url);
}

// GET /api/v1/stats — stats globales para el dashboard en vivo
export const GET: APIRoute = async () => {
  try {
    const sql = getDb();

    const [usersNow, reportsToday, tripsToday, topRoutes] = await Promise.all([
      // Usuarios activos (últimos 5 min)
      sql`SELECT COUNT(DISTINCT device_id)::int AS count FROM mc_telemetry WHERE ts > NOW() - INTERVAL '5 minutes'`,

      // Reportes ciudadanos hoy
      sql`SELECT COUNT(*)::int AS count FROM mc_community_posts WHERE created_at > CURRENT_DATE`,

      // Viajes iniciados hoy
      sql`SELECT COUNT(DISTINCT trip_id)::int AS count FROM mc_telemetry WHERE trip_id IS NOT NULL AND ts > CURRENT_DATE`,

      // Top 3 rutas más activas (última hora)
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
      top_routes: topRoutes.map((r: Record<string, unknown>) => ({ id: r["route_id"], users: r["users"] })),
      ts: Date.now(),
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (e) {
    console.error('[stats GET]', e);
    // Retornar fallback para no romper el UI
    return new Response(JSON.stringify({
      users_now: 0, reports_today: 0, trips_today: 0, top_routes: [],
      ts: Date.now(), fallback: true,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }
};
