# [KYNICOS] ARCH_MANIFEST.md - Nexus Transfer Engine v3.3+

## 1. TOPOLOGY
- **Presentation**: Astro 5 (Zero JS by Default / SSG)
- **Engine**: Rust / WebAssembly (WASM)
- **Data Persistence**: IndexedDB (via `idb` library) + `master_routes.json`
- **Styling**: Vanilla CSS (Post-Tailwind Migration) + CSS Custom Properties
- **Build System**: `scripts/build-wasm.mjs` (multi-module) + Render (CI/CD)

## 2. FFI BOUNDARY (WASM Interface)
The interface between TypeScript and Rust is strictly typed to ensure memory safety and zero panics.

### Data Structures (Rust -> TS)

#### `RouteCatalog`
```typescript
interface RouteCatalog {
  version: string;
  rutas: Route[];
}
```

#### `Route`
```typescript
interface Route {
  id: string;
  nombre: string;
  tarifa: number;
  tipo: string;
  empresa?: string;
  frecuencia_minutos?: number;
  horario?: {
    inicio?: string;
    fin?: string;
    guardia_nocturna?: string;
  };
  paradas: Stop[];
  social_alerts: string[];
  last_updated: string;
}
```

#### `Stop`
```typescript
interface Stop {
  id?: string;
  nombre: string;
  lat: number;
  lng: number;
  orden: number;
  landmarks: string;
}
```

#### `Journey` (Search Result)
```typescript
interface Journey {
  type: "Direct" | "Transfer" | "Transfer2";
  legs: Route[];
  transfer_point: string | null;
  total_price: number;
  geo_transfer: boolean;
  is_forward: boolean;
}
```

### Exported Functions
- `load_catalog(json_payload: string): void`: Injects the JSON catalog into the WASM engine.
- `find_route(origin: string, dest: string): Journey[]`: Calculates the optimal path(s).
- `calculate_trip_cost(distance: number, seats: number, is_tourist: boolean): number`: Financial logic.

## 3. WASM MODULES
- `route-calculator`: Core routing logic, transfer detection, and price calculation.
- `spatial-index`: Geographic proximity search and nearest-stop resolution.

## 4. DATA CONTRACTS
- **Source of Truth**: `public/data/master_routes.json`
- **Validation**: `scripts/validate-routes.mjs` enforces the schema.
- **Constraints**:
  - Max payload: 10MB
  - Max routes: 5000
  - Max stops per route: 500
  - DoS Protection: `MAX_OPS` limit in search algorithm.

## 5. SECURITY & HARDENING
- **XSS Prevention**: Input sanitization via `escapeHtml()` and safe JSON stringification.
- **WASM Safety**: No `unwrap()` calls; bounds checking for all array access.
- **FFI Security**: `execFileSync` in build scripts to prevent shell injection.
- **Environment**: Pinned dependencies and frozen lockfiles.

## 6. CI/CD & DEPLOYMENT
- **Provider**: Render (Static Site)
- **Workflow**: `.github/workflows/build-wasm.yml`
- **Auto-Commit**: WASM artifacts are automatically committed post-build via CI.

## 7. DOM EVENTS & INTERACTION
- Uses native Popover API and CSS `:has()` for interactive states.
- Zero client-side framework dependency (No React, No Vue).

## 8. TECHNICAL DEBT & ROADMAP
- [x] WASM Data Decoupling
- [x] CSS Migration
- [x] Social Intelligence Scraper
- [ ] Advanced PWA Sync
- [ ] Offline Map Tiles
