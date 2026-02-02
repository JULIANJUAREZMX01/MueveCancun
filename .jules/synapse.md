# Synapse's Journal

## Critical Architectural Discoveries

- **WASM Location Mismatch**: Real WASM binary found in `public/wasm/route-calculator/` and `rust-wasm/target/`, but `src/wasm/route_calculator/` contained a 0-byte placeholder. Moving to `src/` to satisfy Vite module imports and standardizing on underscore naming.
- **Missing Navigation**: The application is currently a single-page app with no routing, causing 404s for expected routes like `/mapa`, `/rutas`, and `/contribuir`.
- **Static Balance**: The driver balance is currently not persisted or checked against the $180 MXN gatekeeper.
- **Mock Logic**: `src/wasm/route_calculator/route_calculator.js` was a mock implementation.

## A2A Log Protocol

### 2025-01-31 08:32
- **Status**: Integration Sweep Complete.
- **WASM**: Real binary moved to `src/wasm/route_calculator/`. Verified loading with `pnpm build`.
- **DB**: `idb` integration successful. Driver Wallet initialized with $180.00 MXN.
- **Routes**: `react-router-dom` implemented. All 404 dead ends (/mapa, /rutas, /contribuir) resolved with functional pages.
- **SW**: Service Worker updated with optimized caching for WASM and Data.
- **Verification**: `pnpm build` passed. `pnpm vitest run` passed with 4/4 tests.

### 2025-05-20 12:00
- **Status**: Logic/Integration Fix - Unified WASM Routing Engine.
- **WASM**: Renamed `calculate_route` to `find_route` and added `routes_val` parameter to `rust-wasm/src/lib.rs`.
- **Integration**: Updated `src/App.tsx` to fetch `master_routes.json` and pass it to `find_route`.
- **Type Safety**: Replaced `any` with `unknown` for `masterRoutes` state to satisfy ESLint.
- **Verification**: `pnpm run lint`, `pnpm exec vitest run`, and `pnpm build` all passed.
- **Log**: SYNAPSE: WASM connected. 404s resolved. Ready for local UI testing.
