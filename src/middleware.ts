import { defineMiddleware } from 'astro:middleware';

/**
 * MueveCancun Nexus v3.3+ (Static Architecture)
 *
 * NOTE: Since 'output: static' is used, this middleware ONLY runs during build time.
 * Dynamic runtime redirects (based on cookies or headers) MUST be handled client-side
 * in index.astro, MainLayout.astro, or 404.astro.
 */
export const onRequest = defineMiddleware((context, next) => {
  // We bypass all build-time redirects to ensure that all localized
  // pages are correctly pre-rendered as HTML instead of redirect files.
  return next();
});
