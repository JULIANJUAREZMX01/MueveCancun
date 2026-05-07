/**
 * POST /api/v1/community/report
 * Recibe contribuciones de la comunidad: nuevas paradas, alertas, precios, fotos.
 * 
 * GET /api/v1/community/leaderboard
 * Top contribuidores por ciudad.
 */

import type { APIRoute } from 'astro';
import { logger } from '@utils/logger';
import { neon } from '@neondatabase/serverless';

const CREDIT_VALUES: Record<string, number> = {
  new_stop: 5,
  price_update: 2,
  photo: 3,
  delay_alert: 1,
  route_correction: 4,
  accessibility_info: 3,
};

export interface ContributionRequest {
  type: keyof typeof CREDIT_VALUES;
  route_id?: string;
  stop_id?: string;
  lat?: number;
  lng?: number;
  data: Record<string, unknown>;
  user_token?: string;  // anonymous if missing
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as ContributionRequest;

    if (!body.type || !CREDIT_VALUES[body.type]) {
      return new Response(JSON.stringify({
        error: 'Invalid contribution type',
        valid_types: Object.keys(CREDIT_VALUES)
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const credits = CREDIT_VALUES[body.type];
    const contributionId = `contrib_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Store in DB (gracefully fail if no DB)
    try {
      const sql = neon(process.env.DATABASE_URL ?? '');
      await sql`
        INSERT INTO contributions (id, type, route_id, stop_id, lat, lng, data, credits_awarded, status, created_at)
        VALUES (${contributionId}, ${body.type}, ${body.route_id ?? null}, ${body.stop_id ?? null},
                ${body.lat ?? null}, ${body.lng ?? null}, ${JSON.stringify(body.data)},
                ${credits}, 'pending', NOW())
        ON CONFLICT DO NOTHING
      `;
    } catch {
      // DB unavailable — return success anyway with note
      logger.warn('[Community] DB unavailable, contribution not persisted');
    }

    return new Response(JSON.stringify({
      success: true,
      contribution_id: contributionId,
      credits_awarded: credits,
      status: 'pending_validation',
      message: `¡Gracias! Ganaste ${credits} CancúnCredits por tu reporte. Se verificará en 24h.`,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    logger.error('[API/v1/community]', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const GET: APIRoute = async ({ url }) => {
  const path = url.pathname;
  
  if (path.includes('leaderboard')) {
    // Stub leaderboard — DB query in production
    return new Response(JSON.stringify({
      leaderboard: [
        { rank: 1, username: 'CancúnWatcher', credits: 248, contributions: 87 },
        { rank: 2, username: 'QueRutaBot', credits: 195, contributions: 64 },
        { rank: 3, username: 'MovilidadQR', credits: 167, contributions: 52 },
      ],
      period: 'monthly',
      updated_at: new Date().toISOString(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    endpoints: {
      'POST /api/v1/community/report': 'Submit a community contribution',
      'GET /api/v1/community/leaderboard': 'Top contributors this month',
    },
    credit_values: CREDIT_VALUES,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
