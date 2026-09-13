export const prerender = true;
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({
    status: 'degraded',
    mode: 'static-shell',
    capabilities: {
      offline_shell: true,
      route_catalog: true,
      live_tracking: 'requires runtime health check and real units',
      telemetry: 'requires DATABASE_URL and GPS consent',
    },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
