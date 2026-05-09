/**
 * GET /healthz — Build info + runtime health check
 * Used by Vercel, uptime monitors and CI smoke tests.
 */
import type { APIRoute } from 'astro';

// Injected at build time by astro.config.ts (vite.define)
declare const __APP_VERSION__: string;
declare const __BUILD_DATE__: string;
declare const __GIT_COMMIT__: string;

export const GET: APIRoute = async () => {
  const version  = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
  const built    = typeof __BUILD_DATE__  !== 'undefined' ? __BUILD_DATE__  : new Date().toISOString();
  const commit   = typeof __GIT_COMMIT__  !== 'undefined' ? __GIT_COMMIT__  : 'unknown';

  const payload = {
    status:  'ok',
    service: 'muevecancun',
    version,
    built,
    commit,
    uptime:  process.uptime?.() ?? null,
    ts:      new Date().toISOString(),
    env:     import.meta.env.MODE,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type':  'application/json',
      'Cache-Control': 'no-store',
      'X-Robots-Tag':  'noindex',
    },
  });
};
