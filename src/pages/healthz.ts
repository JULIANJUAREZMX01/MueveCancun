/**
 * GET /healthz — Build info + runtime health check
 * Used by Vercel, uptime monitors and CI smoke tests.
 */
import type { APIRoute } from 'astro';

import { APP_VERSION, BUILD_DATE, BUILD_ID, CACHE_VERSION, GIT_COMMIT, SHORT_COMMIT } from '../generated/buildInfo';

export const GET: APIRoute = async () => {
  const payload = {
    status:  'ok',
    service: 'muevecancun',
    version: APP_VERSION,
    built: BUILD_DATE,
    buildId: BUILD_ID,
    cacheVersion: CACHE_VERSION,
    commit: GIT_COMMIT,
    shortCommit: SHORT_COMMIT,
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
