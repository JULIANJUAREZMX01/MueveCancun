/**
 * src/pages/api/health.ts
 * Health check para Vercel — verifica conectividad Neon DB
 * GET /api/health → { status, db, latency_ms, ... }
 */
import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async () => {
  const start = Date.now();
  const dbProvider = process.env.DATABASE_PROVIDER ?? "neon";

  const status: Record<string, unknown> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "3.6.0",
    env: process.env.NODE_ENV ?? "unknown",
    db_provider: dbProvider,
    deploy: process.env.VERCEL_ENV ?? "local",
    region: process.env.VERCEL_REGION ?? "unknown",
  };

  // Ping a Neon DB
  if (dbProvider === "neon") {
    const url = process.env.DATABASE_URL;
    if (!url) {
      status.db = "error";
      status.db_error = "DATABASE_URL not set";
    } else {
      try {
        const { neon } = await import("@neondatabase/serverless");
        const sql = neon(url);
        await sql`SELECT 1`;
        status.db = "connected";
        status.db_latency_ms = Date.now() - start;
      } catch (e: any) {
        status.db = "error";
        status.db_error = e?.message ?? String(e);
      }
    }
  }

  const isOk = status.db !== "error";

  return new Response(JSON.stringify(status), {
    status: isOk ? 200 : 503,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};
