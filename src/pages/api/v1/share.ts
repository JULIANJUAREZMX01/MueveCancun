import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';

export const prerender = false;

function getDb() {
  const url = process.env.DATABASE_URL || import.meta.env.DATABASE_URL;
  if (!url) throw new Error('No DATABASE_URL');
  return neon(url);
}

function genCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// POST — crear sesión de ubicación compartida
export const POST: APIRoute = async ({ request }) => {
  try {
    const { device_id, nickname = 'Viajero', lat, lng, route_id, trip_id, phase = 'idle', duration_min = 60 } = await request.json();
    if (!device_id) return new Response(JSON.stringify({ error: 'device_id required' }), { status: 400 });

    const sql = getDb();
    const share_id = genCode();
    const expires_at = new Date(Date.now() + duration_min * 60 * 1000).toISOString();

    await sql`
      INSERT INTO mc_shared_locations (share_id, device_id, nickname, lat, lng, route_id, trip_id, phase, expires_at)
      VALUES (${share_id}, ${device_id}, ${nickname}, ${lat || null}, ${lng || null},
              ${route_id || null}, ${trip_id || null}, ${phase}, ${expires_at})
    `;

    const shareUrl = \`https://mueve-cancun.vercel.app/share/\${share_id}\`;
    return new Response(JSON.stringify({ share_id, share_url: shareUrl, expires_at }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
};

// PATCH — actualizar posición de una sesión activa
export const PATCH: APIRoute = async ({ request }) => {
  try {
    const { share_id, device_id, lat, lng, phase, route_id } = await request.json();
    if (!share_id || !device_id) return new Response(JSON.stringify({ error: 'share_id, device_id required' }), { status: 400 });

    const sql = getDb();
    await sql`
      UPDATE mc_shared_locations SET
        lat = ${lat || null}, lng = ${lng || null},
        phase = ${phase || 'idle'}, route_id = ${route_id || null},
        updated_at = NOW()
      WHERE share_id = ${share_id} AND device_id = ${device_id}
        AND expires_at > NOW()
    `;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
};

// GET — obtener posición de alguien (por share_id)
export const GET: APIRoute = async ({ url }) => {
  try {
    const share_id = url.searchParams.get('id');
    if (!share_id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

    const sql = getDb();
    const rows = await sql`
      SELECT share_id, nickname, lat, lng, phase, route_id, expires_at, updated_at
      FROM mc_shared_locations
      WHERE share_id = ${share_id} AND expires_at > NOW()
    `;

    if (!rows.length) return new Response(JSON.stringify({ error: 'Not found or expired' }), { status: 404 });
    return new Response(JSON.stringify(rows[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
};
