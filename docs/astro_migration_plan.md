# Astro Migration Plan: CancúnMueve

## 📋 Status: Phase 1 (Planning)
**Analyzed Structure:**
- **Roots**: `App.tsx` (Needs decomposition into Layouts + Pages).
- **Interactive Components**: `Map.tsx`, `RouteSearch.tsx` (Candidates for Islands).
- **Data**: `master_routes.json` (Static source, perfect for SSG).
- **WASM**: `src/wasm/route_calculator` (Needs to be kept external to Vite optimization or properly aliased).

## 🏗️ Proposed File Structure (Astro 5.0)
```
src-astro/
├── pages/
│   ├── index.astro           (Home - uses RouteSearch Island)
│   ├── mapa.astro            (Full Map View - uses Map Island)
│   ├── ruta/
│   │   └── [id].astro        (Dynamic Route Details - SSG)
│   └── 404.astro
├── layouts/
│   └── MainLayout.astro      (Header, Footer, Meta tags)
├── components/               (Static Astro Components)
│   ├── Header.astro
│   ├── Footer.astro
│   └── RouteCard.astro
├── islands/                  (React Interactive Components)
│   ├── RouteCalculator.tsx   (Refactored from RouteSearch.tsx)
│   ├── InteractiveMap.tsx    (Refactored from Map.tsx)
│   └── CustomMarkers.tsx     (Dependency of Map)
└── styles/
    └── global.css            (Tailwind v4 imports)
```

## 🪜 Migration Steps

### 1. Initialization (Parallel)
- Create new Astro project in `temp-astro`.
- Move configs (`astro.config.mjs`, `tailwind.config.mjs`) to root.
- Merge `dependencies` in `package.json`.

### 2. Layouts & Static Shell
- Implement `MainLayout.astro` with "Sunny Mode" colors.
- Migrate `Header` and `Footer` to pure HTML/Astro components to reduce JS.

### 3. Islands Migration (Critical)
- **Map.tsx**: Convert to `InteractiveMap.tsx`.
    - Constraint: Must load Mapbox GL JS only when visible (`client:visible`).
    - Fix: Ensure `mapbox-gl.css` is loaded globally or in the island.
- **RouteSearch.tsx**: Convert to `RouteCalculator.tsx`.
    - Constraint: Must load WASM module dynamically to avoid blocking main thread.
    - Strategy: `client:idle` hydration.

### 4. WASM Integration strategy
- Keep `src/wasm` where it is.
- In `astro.config.mjs`, configure `vite` to exclude WASM from optimization if needed, or ensure `wasm-pack output` is compatible with Vite's WASM plugin.
- Use explicit imports: `import init, { calculate_route } from '/src/wasm/route_calculator/route_calculator.js'`.

### 5. Routing & SSG
- Generate `src/pages/ruta/[id].astro` by fetching `master_routes.json` at build time (`getStaticPaths`).
- This ensures all route pages are pre-rendered for SEO (Google crawling).

## 🛑 Blockers & Risks
- **Supabase**: Not available. Crowdsourcing features will be UI-only (mocked) for now.
- **WASM Pathing**: Vite in Astro might handle public assets differently. Need to verify `public/wasm` vs `src/wasm` valid paths.

## ✅ Success Criteria
- [ ] No `App.tsx` remaining.
- [ ] Routes R1, R2, R10 accessible via distinct URLs (`/ruta/R1`).
- [ ] Lighthouse Performance > 90.
