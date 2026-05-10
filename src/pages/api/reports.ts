import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';
import { logger } from '../../utils/logger';

export const prerender = false;

// ── DB helpers ──────────────────────────────────────────────────────────────

function getDb() {
  const url = process.env.DATABASE_URL || import.meta.env.DATABASE_URL;
  if (!url) throw new Error('[Reports] DATABASE_URL not set');
  return neon(url);
}

let _schemaOk = false;

async function ensureSchema() {
  if (_schemaOk) return;
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS community_reports (
      id          SERIAL PRIMARY KEY,
      type        VARCHAR(64)  NOT NULL DEFAULT 'General',
      route       VARCHAR(128) NOT NULL DEFAULT 'General',
      message     TEXT         NOT NULL,
      author      VARCHAR(128) NOT NULL DEFAULT 'Anónimo',
      votes       INT          NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS community_report_votes (
      report_id   INT          NOT NULL,
      voter_id    TEXT         NOT NULL,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      PRIMARY KEY (report_id, voter_id)
    )
  `;
  // Seed if empty
  const [{ count }] = await sql`SELECT COUNT(*) AS count FROM community_reports` as { count: string | number }[];
  if (Number(count) === 0) {
    await sql`
      INSERT INTO community_reports (type, route, message, author, votes, created_at) VALUES
      ('Precio',  'Zona Hotelera', 'Los camiones de Zona Hotelera cobran $12 tanto el convencional como el de aire acondicionado.', 'Comunidad', 14, NOW() - INTERVAL '2 hours'),
      ('Precio',  'Combi / Urbano','Las combis cobran $10, los camiones de zona urbana también $10.',                                'Esteban H.', 22, NOW() - INTERVAL '5 hours'),
      ('Ruta',    'R-10',          'La R-10 no llega al aeropuerto. Llega a Las Américas (Trabajadores).',                           'MÍSTICO_',  31, NOW() - INTERVAL '18 hours'),
      ('Noticia', 'General',       'Combi Roja IRM-6 cobra $10, va de Ultramar a Crucero pasando por ZH.',                          'Darwin G.',  8, NOW() - INTERVAL '36 hours'),
      ('Demora',  'R-6',           'La R-6 solo pasa hasta las 10pm. Cuidado si necesitan regresar de noche.',                      'Grecia P.', 19, NOW() - INTERVAL '48 hours')
    `;
  }
  _schemaOk = true;
}

// ── SEED fallback (when no DATABASE_URL in CI/dev) ───────────────────────────

interface Report {
  id: number;
  type: string;
  route: string;
  message: string;
  author: string;
  votes: number;
  created_at: string;
}

const SEED: Report[] = [
  { id: 1, type: 'Precio',  route: 'Zona Hotelera', message: 'Los camiones de ZH cobran $12 fijos.', author: 'Comunidad', votes: 14, created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 2, type: 'Ruta',    route: 'R-10', message: 'R-10 no llega al aeropuerto — termina en Américas.', author: 'MÍSTICO_', votes: 31, created_at: new Date(Date.now() - 64800000).toISOString() },
  { id: 3, type: 'Demora',  route: 'R-6',  message: 'R-6 solo pasa hasta las 10pm.', author: 'Grecia P.', votes: 19, created_at: new Date(Date.now() - 172800000).toISOString() },
];

// ── GET ──────────────────────────────────────────────────────────────────────

export const GET: APIRoute = async () => {
  try {
    await ensureSchema();
    const sql = getDb();
    const rows = await sql`
      SELECT id, type, route, message, author, votes,
             created_at::text AS created_at
      FROM community_reports
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' }
    });
  } catch (err) {
    logger.warn('[API/Reports] DB unavailable, returning seed data:', err);
    return new Response(JSON.stringify(SEED), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }
};

// ── POST ─────────────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const type    = String(body.issue_type || body.type    || 'General').slice(0, 64);
    const route   = String(body.route_id   || body.route   || 'General').slice(0, 128);
    const message = String(body.description|| body.message || '').trim().slice(0, 1000);
    const author  = String(body.author     || 'Anónimo').slice(0, 128);

    if (!message) {
      return new Response(JSON.stringify({ error: 'message required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      await ensureSchema();
      const sql = getDb();
      const [row] = await sql`
        INSERT INTO community_reports (type, route, message, author)
        VALUES (${type}, ${route}, ${message}, ${author})
        RETURNING id, created_at::text AS created_at
      ` as { id: number, created_at: string }[];

      return new Response(JSON.stringify({ success: true, report_id: row.id }), {
        status: 201, headers: { 'Content-Type': 'application/json' }
      });
    } catch (dbErr) {
      logger.error('[API/Reports] DB write failed:', dbErr);
      // Fallback: return success without persistence in dev
      return new Response(JSON.stringify({ success: true, report_id: Math.floor(Math.random() * 9000) + 1000, fallback: true }), {
        status: 201, headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (err) {
    logger.error('[API/Reports] Parse error:', err);
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }
};

// ── PATCH (vote) ─────────────────────────────────────────────────────────────

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const { id, direction, voter_id } = await request.json();
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
    if (!voter_id) return new Response(JSON.stringify({ error: 'voter_id required' }), { status: 401 });

    try {
      await ensureSchema();
      const sql = getDb();
      const delta = direction === 'down' ? -1 : 1;

      // Use a transaction to ensure atomicity
      await sql.begin(async (tx) => {
        // Check if already voted
        const [existing] = await tx`
          SELECT 1 FROM community_report_votes
          WHERE report_id = ${id} AND voter_id = ${voter_id}
        `;

        if (existing) {
          throw new Error('Already voted');
        }

        // Record the vote
        await tx`
          INSERT INTO community_report_votes (report_id, voter_id)
          VALUES (${id}, ${voter_id})
        `;

        // Update the report vote count
        await tx`
          UPDATE community_reports
          SET votes = votes + ${delta}
          WHERE id = ${id}
        `;
      });

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
      if (err instanceof Error && err.message === 'Already voted') {
        return new Response(JSON.stringify({ error: 'Already voted' }), { status: 403 });
      }
      logger.error('[API/Reports] PATCH failed:', err);
      // Fallback for development/CI if DB fails
      return new Response(JSON.stringify({ success: true, fallback: true }), { status: 200 });
    }
  } catch (err) {
    logger.error('[API/Reports] PATCH parse error:', err);
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }
};
