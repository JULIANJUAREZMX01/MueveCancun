/**
 * src/pages/api/health.ts
 * Health check endpoint para Render.
 * Verifica conectividad con Neon DB si DATABASE_URL está configurada.
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const status: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '3.5.0',
    env: process.env.NODE_ENV ?? 'unknown',
  };

  // Ping rápido a Neon si está configurado
  if (process.env.DATABASE_URL) {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(process.env.DATABASE_URL);
      await sql`SELECT 1`;
      status.db = 'connected';
    } catch (e) {
      status.db = 'error';
      status.db_error = e instanceof Error ? e.message : String(e);
    }
  } else {
    status.db = 'not_configured';
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
