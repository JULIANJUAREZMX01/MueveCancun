# ARCH_MANIFEST — MueveCancun
> Version: 3.3 | Updated: 2026-03-28 | Protocol: KYNICOS Track B

## 1. SYSTEM TOPOLOGY

Four-layer architecture (Nexus Protocol):

| Layer | Name | Location | Responsibility |
|-------|------|----------|----------------|
| 1 | Data | public/data/master_routes.json | Route catalog, stops with coordinates |
| 2 | Processing | rust-wasm/route-calculator/src/lib.rs → public/wasm/ | WASM routing engine, transfer detection |
| 3 | Presentation | src/components/, src/pages/ | Astro SSG components, i18n, Leaflet map |
| 4 | Persistence | src/utils/db.ts | IndexedDB wallet with HMAC, favorites |

## 2. FFI BOUNDARY (TypeScript ↔ WASM)

Module path: `/wasm/route-calculator/route_calculator.js`
Loader: `src/utils/WasmLoader.ts` (singleton pattern)

Exported functions from route-calculator WASM:
| Function | Signature | Description |
|----------|-----------|-------------|
| `load_catalog_core` | `(json: string) → void` | Load JSON route catalog into WASM memory |
| `find_route_rs` | `(origin: string, dest: string) → string` | Returns JSON string of Journey[] results |

Spatial index module: `/wasm/spatial-index/spatial_index.js`

## 3. MODULE REGISTRY

### src/utils/
| Module | Responsibility |
|--------|---------------|
| WasmLoader.ts | Singleton lazy-loader for route-calculator WASM module |
| CoordinatesStore.ts | Stop coordinates DB (lowercase key → [lat,lng]), originalNames map |
| CoordinateFinder.ts | GPS → nearest stop (1km radius threshold) |
| RouteDrawer.ts | Draws route legs on Leaflet map, handles multi-leg journeys |
| routeRenderer.ts | Renders Journey HTML cards for results panel |
| SpatialHash.ts | Grid-based spatial index for fast proximity lookups |
| db.ts | IndexedDB wallet operations with HMAC integrity checks |
| geometry.ts | Haversine distance (getDistance, R=6371 km) |
| i18n.ts | getLangFromUrl / useTranslations (ES/EN) |
| Analytics.ts | Stub analytics (no real provider yet) |
| utils.ts | escapeHtml, safeJsonStringify and misc helpers |
| toast.ts | Toast notifications |
| leafletLoader.ts | Lazy loader for Leaflet library |
| geolocation.ts | GPS permission handling |
| routes.ts | Route catalog helpers |
| transport.ts | Transport type labels and icons |
| logger.ts | Structured logger |

### src/lib/ (legacy — pending deprecation)
| Module | Status |
|--------|--------|
| CoordinatesStore.ts | Legacy duplicate — migration pending |
| FavoritesStore.ts | Active |
| idb.ts | Active |
| sync.ts | Active |
| telemetry.ts | Active |
| transport.ts | Active |
| types.ts | Active |

## 4. DATA CONTRACTS

### master_routes.json top-level schema
```json
{
  "rutas": [RouteData]
}
```

### RouteData (required fields)
| Field | Type | Constraints |
|-------|------|-------------|
| id | string | Max 100 chars; format: RUTA_AREA_NNN |
| nombre | string | Descriptive name |
| tarifa | number | MXN; 12 (van/combi) or 15 (bus urbano) |
| tipo | string | e.g. "bus", "van", "combi" |
| paradas | Stop[] | Array of stops |

### Stop (required fields)
| Field | Type | Constraints |
|-------|------|-------------|
| nombre | string | Max 100 chars; include colonia/reference |
| lat | number | Real coordinate; not 0.0; range 20.5–21.5 |
| lng | number | Real coordinate; not 0.0; range -87.5 to -86.5 |

## 5. SECURITY PERIMETER

| Control | Location | Description |
|---------|----------|-------------|
| XSS prevention | src/utils/utils.ts:escapeHtml() | All user-supplied strings must pass through escapeHtml() before innerHTML insertion |
| HMAC wallet | src/utils/db.ts | HMAC integrity check on IndexedDB balance; deterrent, not cryptographic guarantee |
| DoS — WASM ops | rust-wasm/route-calculator/src/lib.rs | Circuit breaker at 10,000,000 ops per search |
| DoS — catalog size | lib.rs PREFERRED_HUBS logic | Max 5,000 routes, 500 stops per route |
| DoS — payload | WasmLoader | Max 10MB JSON payload to load_catalog_core |
| Prototype pollution | CoordinatesStore | Uses Map<> not plain objects for catalog data |
| Secrets | .env in .gitignore | Never in source; CodeQL workflow scans each push |

## 6. CI/CD MATRIX

| Workflow | File | Trigger | Actions |
|----------|------|---------|---------|
| Tests | .github/workflows/test.yml | Push / PR | Rust unit tests + Vitest + validate-routes + Astro build |
| Build WASM | .github/workflows/build-wasm.yml | Push to rust-wasm/** | wasm-pack compile → public/wasm/, auto-commit |
| Validate Data | .github/workflows/validate-data.yml | Push to public/data/** | JSON schema validation of master_routes.json |
| Auto-curative | .github/workflows/autocurative.yml | Monday 06:00 UTC | Weekly health check, recompile, auto-fix |
| CodeQL | .github/workflows/codeql.yml | Push | Static security analysis |
| Claude Delegation | .github/workflows/claude-delegation.yml | Manual | Long-horizon AI tasks (requires ANTHROPIC_API_KEY secret) |

## 7. DOM EVENT PROTOCOL

Components communicate via CustomEvent (no shared state, no React):

| Event | Emitter | Receiver | Payload |
|-------|---------|----------|---------|
| MAP_SET_STOP | InteractiveMap.astro | RouteCalculator.astro | `{ type: 'origin'\|'dest', name: string }` |
| SHOW_ROUTE_ON_MAP | RouteCalculator.astro | InteractiveMap.astro | `{ journey: Journey }` |
| BALANCE_UPDATED | wallet.astro | RouteCalculator.astro | `{}` |

localStorage key: `pending_route` (Journey JSON, drawn on map load)

## 8. KNOWN TECHNICAL DEBT

See ROADMAP.md Backlog for full inventory.

Priority items:
- 🔴 master_routes.json: catalog has incomplete/placeholder coords — not production-ready
- 🟡 Analytics.ts: stub, no real provider integrated
- 🟡 src/lib/CoordinatesStore.ts: legacy duplicate of src/utils/CoordinatesStore.ts
- 🟡 Stale-while-revalidate policy missing from Service Worker for /data/**
- 🟢 /healthz endpoint not implemented
- 🟢 docs/BRIDGE_WASM.md contract document not yet written
