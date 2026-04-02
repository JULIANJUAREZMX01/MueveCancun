import { defineMiddleware } from 'astro:middleware';

/**
 * NEXUS v3.3.1 - Passive Middleware
 * In 'output: static' mode, middleware runs ONLY at build-time.
 * We avoid dynamic redirects here to prevent infinite loop artifacts in index.html.
 * All routing logic is migrated to client-side scripts in src/utils/auth.ts.
 */

export const onRequest = defineMiddleware(async ({ request: _request, redirect, cookies, url }, next) => {
  // Pass through all requests in static mode.
  // Routing logic is now handled in MainLayout.astro and index.astro via JS.
  return next();
});
