import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';

export const prerender = false;

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('No DATABASE_URL');
  return neon(url);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { device_id, endpoint, p256dh, auth } = await request.json();
    if (!device_id || !endpoint) return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });

    const sql = getDb();
    await sql`
      INSERT INTO mc_push_subs (device_id, endpoint, p256dh, auth_key)
      VALUES (${device_id}, ${endpoint}, ${p256dh}, ${auth})
      ON CONFLICT (endpoint) DO UPDATE SET device_id = ${device_id}, p256dh = ${p256dh}, auth_key = ${auth}
    `;

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error('[push-sub]', e);
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
};
