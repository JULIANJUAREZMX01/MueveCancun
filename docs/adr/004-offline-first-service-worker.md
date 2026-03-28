# ADR-004: Cache-First Service Worker for Offline PWA

**Date:** 2026-01-20
**Status:** Accepted

## Context

Users in Cancún and the Riviera Maya experience intermittent connectivity, especially
in transit. The app must function completely without internet after the initial load.
This includes the WASM binary, route catalog, map tiles (cached via Leaflet), and all UI.

## Decision

Implement a cache-first Service Worker (`public/sw.js`) that pre-caches all critical
assets on install. Cache is versioned via `CACHE_VERSION` constant (currently `v3.2.0-ssg`).
On activation, old caches are purged. Fetch events serve from cache first, falling back
to network, falling back to `/offline` page.

Critical assets cached on install include:
- All route pages and the map page
- WASM binaries (route-calculator + spatial-index)
- master_routes.json route catalog
- Leaflet JS/CSS (vendored locally)
- All PWA icons and manifest

## Consequences

- Every release requires a `CACHE_VERSION` bump to force cache invalidation.
- WASM binaries (~2MB combined) are cached on first install, increasing install time.
- The full master_routes.json catalog is cached — size must be managed (chunking deferred to v3.5).
- No stale-while-revalidate strategy for /data/** yet (deferred to backlog).

## Alternatives Considered

- **Network-first**: Rejected — app is unusable without connectivity.
- **No Service Worker**: Rejected — violates offline-first PWA contract.
- **Workbox**: Rejected — adds ~30KB dependency; the SW is simple enough to manage manually.
