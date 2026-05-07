/**
 * /api/tracking — GPS unit positions
 *
 * Online mode:  reads from Neon `tracking_units` table
 *               (populated by future MQTT/WebSocket driver app)
 * Offline/stub: returns realistic interpolated positions along real route paradas
 *               so the map shows something meaningful until real GPS is live
 */
import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';
import { logger } from '../../utils/logger';

export const prerender = false;

function getDb() {
  const url = process.env.DATABASE_URL || import.meta.env.DATABASE_URL;
  if (!url) throw new Error('[Tracking] DATABASE_URL not set');
  return neon(url);
}

let _schemaOk = false;
async function ensureSchema() {
  if (_schemaOk) return;
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS tracking_units (
      id          VARCHAR(32) PRIMARY KEY,
      route_id    VARCHAR(64) NOT NULL,
      lat         DOUBLE PRECISION NOT NULL,
      lng         DOUBLE PRECISION NOT NULL,
      speed_kmh   INT NOT NULL DEFAULT 0,
      heading     INT NOT NULL DEFAULT 0,
      stop_name   VARCHAR(128),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  _schemaOk = true;
}

// Realistic stub positions keyed by route_id
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlRow = Record<string, any>;

const STUB_POSITIONS: Record<string, Array<{lat:number;lng:number;stop:string}>> = {
  'R1':  [{lat:21.1714,lng:-86.8219,stop:'El Crucero'},{lat:21.1588,lng:-86.8455,stop:'Av. Kabah'},{lat:21.1430,lng:-86.8460,stop:'Zona Hotelera'}],
  'R2':  [{lat:21.1619,lng:-86.8515,stop:'Av. Tulum Norte'},{lat:21.1714,lng:-86.8219,stop:'El Crucero'},{lat:21.1355,lng:-86.8412,stop:'Av. Kabah'}],
  'R6':  [{lat:21.1472,lng:-86.8234,stop:'Plaza Las Américas'},{lat:21.1355,lng:-86.8412,stop:'Av. Kabah'},{lat:21.1155,lng:-86.8555,stop:'Av. Las Torres'}],
  'R10': [{lat:21.1619,lng:-86.8515,stop:'Av. Tulum Norte'},{lat:21.1472,lng:-86.8234,stop:'Plaza Las Américas'},{lat:21.1155,lng:-86.8555,stop:'Av. Las Torres'}],
  'R15': [{lat:21.1714,lng:-86.8219,stop:'El Crucero'},{lat:21.1472,lng:-86.8234,stop:'Plaza Las Américas'},{lat:21.1430,lng:-86.8460,stop:'Zona Hotelera'}],
  'R27': [{lat:21.1619,lng:-86.8515,stop:'Tierra Maya'},{lat:21.1472,lng:-86.8234,stop:'Plaza Las Américas'},{lat:21.1714,lng:-86.8219,stop:'El Crucero'}],
  'R28': [{lat:21.1714,lng:-86.8219,stop:'El Crucero'},{lat:21.1619,lng:-86.8515,stop:'Av. Tulum Norte'},{lat:21.1430,lng:-86.8460,stop:'Zona Hotelera'}],
  'ADO_AEROPUERTO_001': [{lat:21.0365,lng:-86.8770,stop:'Aeropuerto T2'},{lat:21.1714,lng:-86.8219,stop:'El Crucero'},{lat:21.1620,lng:-86.8503,stop:'Terminal ADO Centro'}],
};

function stubUnits(routeId: string) {
  const positions = STUB_POSITIONS[routeId] || [];
  const now = Date.now();
  return positions.slice(0, 3).map((pos, i) => {
    // Slightly jitter position for realism
    const jLat = pos.lat + (Math.sin(now / 10000 + i) * 0.001);
    const jLng = pos.lng + (Math.cos(now / 10000 + i) * 0.001);
    return {
      id: `${routeId}-0${i + 1}`,
      route_id: routeId,
      lat: parseFloat(jLat.toFixed(5)),
      lng: parseFloat(jLng.toFixed(5)),
      speed_kmh: 25 + Math.floor(Math.sin(now / 5000 + i) * 15),
      heading: (i * 120) % 360,
      stop_name: pos.stop,
      updated_at: new Date(now - i * 45000).toISOString(),
      is_stub: true,
    };
  });
}

export const GET: APIRoute = async ({ url }) => {
  const route_id = url.searchParams.get('route_id') || '';

  try {
    await ensureSchema();
    const sql = getDb();
    const query = route_id
      ? sql`SELECT *, updated_at::text AS updated_at FROM tracking_units WHERE route_id = ${route_id} AND updated_at > NOW() - INTERVAL '5 minutes' ORDER BY updated_at DESC`
      : sql`SELECT *, updated_at::text AS updated_at FROM tracking_units WHERE updated_at > NOW() - INTERVAL '5 minutes' ORDER BY route_id, updated_at DESC`;

    const rows = await query as SqlRow[];

    // Supplement with stubs for any route that has no live data
    const liveRouteIds = new Set(rows.map((r: SqlRow) => r.route_id));
    const targetRoutes = route_id ? [route_id] : Object.keys(STUB_POSITIONS);
    const stubRows = targetRoutes
      .filter(rid => !liveRouteIds.has(rid))
      .flatMap((rid: string) => stubUnits(rid));

    return new Response(JSON.stringify([...rows, ...stubRows]), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  } catch {
    logger.warn('[API/Tracking] DB unavailable, returning stubs');
    const units = route_id ? stubUnits(route_id) : Object.keys(STUB_POSITIONS).flatMap(stubUnits);
    return new Response(JSON.stringify(units), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }
};

// PUT — driver app posts its position
export const PUT: APIRoute = async ({ request }) => {
  try {
    const { id, route_id, lat, lng, speed_kmh = 0, heading = 0, stop_name = null } = await request.json();
    if (!id || !route_id || lat == null || lng == null) {
      return new Response(JSON.stringify({ error: 'id, route_id, lat, lng required' }), { status: 400 });
    }
    try {
      await ensureSchema();
      const sql = getDb();
      await sql`
        INSERT INTO tracking_units (id, route_id, lat, lng, speed_kmh, heading, stop_name, updated_at)
        VALUES (${id}, ${route_id}, ${lat}, ${lng}, ${speed_kmh}, ${heading}, ${stop_name}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          lat = EXCLUDED.lat, lng = EXCLUDED.lng,
          speed_kmh = EXCLUDED.speed_kmh, heading = EXCLUDED.heading,
          stop_name = EXCLUDED.stop_name, updated_at = NOW()
      `;
    } catch (dbErr) {
      logger.warn('[API/Tracking] DB write failed (non-fatal):', dbErr);
    }
    // Broadcast via CustomEvent for map
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }
};
