import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';

export const prerender = false;

function getDb() {
  const url = process.env.DATABASE_URL || import.meta.env.DATABASE_URL;
  if (!url) throw new Error('No DATABASE_URL');
  return neon(url);
}

// POST — crear/actualizar viaje
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, device_id, route_id, origin_stop, dest_stop, trip_id, bus_unit_id, occupancy } = body;

    if (!device_id) return new Response(JSON.stringify({ error: 'device_id required' }), { status: 400 });

    const sql = getDb();

    if (action === 'start') {
      // Crear nuevo viaje
      const result = await sql`
        INSERT INTO mc_trips (device_id, route_id, origin_stop, dest_stop, status)
        VALUES (${device_id}, ${route_id}, ${origin_stop || null}, ${dest_stop || null}, 'waiting')
        RETURNING id
      `;
      return new Response(JSON.stringify({ trip_id: result[0]?.id }), { status: 201 });
    }

    if (action === 'board' && trip_id) {
      await sql`
        UPDATE mc_trips SET
          status = 'on_bus',
          boarded_at = NOW(),
          bus_unit_id = ${bus_unit_id || null}
        WHERE id = ${trip_id} AND device_id = ${device_id}
      `;
      // Decrementar waiting, incrementar boarding del paradero
      await sql`
        UPDATE mc_stop_demand SET
          waiting_count = GREATEST(0, waiting_count - 1),
          boarding_count = boarding_count + 1,
          updated_at = NOW()
        WHERE stop_id = ${origin_stop}
      `;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (action === 'arrive' && trip_id) {
      await sql`
        UPDATE mc_trips SET
          status = 'arrived',
          arrived_at = NOW()
        WHERE id = ${trip_id} AND device_id = ${device_id}
      `;
      // Incrementar stats del usuario
      await sql`
        UPDATE mc_users SET
          total_trips = total_trips + 1,
          last_seen = NOW()
        WHERE device_id = ${device_id}
      `;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (action === 'occupancy' && trip_id) {
      // Reportar ocupación del bus
      await sql`
        INSERT INTO mc_bus_occupancy (unit_id, route_id, device_id, occupancy_pct)
        VALUES (${bus_unit_id || trip_id}, ${route_id}, ${device_id}, ${occupancy || 0})
      `;
      await sql`
        UPDATE mc_trips SET occupancy = ${occupancy || 0} WHERE id = ${trip_id}
      `;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
  } catch (e) {
    console.error('[trips POST]', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
};

// GET — viajes activos por ruta (para mostrar buses con ocupación en mapa)
export const GET: APIRoute = async ({ url }) => {
  try {
    const sql = getDb();
    const route_id = url.searchParams.get('route_id');

    if (route_id) {
      const trips = await sql`
        SELECT t.id, t.route_id, t.status, t.bus_unit_id, t.occupancy,
               t.started_at, t.boarded_at,
               o.occupancy_pct as latest_occupancy
        FROM mc_trips t
        LEFT JOIN LATERAL (
          SELECT occupancy_pct FROM mc_bus_occupancy
          WHERE unit_id = t.bus_unit_id OR (unit_id = t.id)
          ORDER BY ts DESC LIMIT 1
        ) o ON true
        WHERE t.route_id = ${route_id}
          AND t.status = 'on_bus'
          AND t.boarded_at > NOW() - INTERVAL '3 hours'
        LIMIT 50
      `;
      return new Response(JSON.stringify(trips), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }

    // Resumen de ocupación por ruta
    const summary = await sql`
      SELECT route_id, AVG(occupancy_pct)::int as avg_occupancy,
             COUNT(*) as active_passengers
      FROM mc_bus_occupancy
      WHERE ts > NOW() - INTERVAL '30 minutes'
      GROUP BY route_id
    `;
    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  } catch {
    return new Response(JSON.stringify([]), { status: 200 });
  }
};
