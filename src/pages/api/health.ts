/**
 * src/pages/api/health.ts
 * Health check endpoint para Render/Render.
 * Verifica conectividad con Neon DB (default) o Supabase según DATABASE_PROVIDER.
 */
import type { APIRoute } from 'astro';
import { getDbProvider } from '../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async () => {
  const dbProvider = getDbProvider();

  const status: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '3.6.2',
    env: process.env.NODE_ENV ?? 'unknown',
    db_provider: dbProvider,
  };

  if (dbProvider === 'supabase') {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      try {
        const { getSupabaseClient } = await import('../../lib/supabase');
        const sb = getSupabaseClient();
        const { error } = await sb.from('guardians').select('stripe_customer_id').limit(1);
        status.db = error ? 'error' : 'connected';
        if (error) status.db_error = 'DB query failed';
      } catch (e) {
        status.db = 'error';
        status.db_error = e instanceof Error ? e.message : 'DB connection failed';
      }
    } else {
      status.db = 'not_configured';
    }
  } else {
    if (process.env.DATABASE_URL) {
      try {
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(process.env.DATABASE_URL);
        await sql`SELECT 1`;
        status.db = 'connected';
      } catch (e) {
        status.db = 'error';
        status.db_error = e instanceof Error ? e.message : 'DB connection failed';
      }
    } else {
      status.db = 'not_configured';
    }
  }

  const isHealthy = status.db !== 'error';

  return new Response(
    JSON.stringify(status),
    {
      status: isHealthy ? 200 : 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};
