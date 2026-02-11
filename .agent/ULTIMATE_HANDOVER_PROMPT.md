# 🚀 ULTIMATE PROJECT COMPLETION PROMPT: MUEVECANCUN PWA

**TO**: Jules (Lead Full Stack Developer)
**PURPOSE**: Final execution of MueveCancun PWA v3.x until production release.
**CONTEXT**: The application is stable and functional. Phase 1 of data decoupling is prepped on the frontend.

---

## 1. 🧬 VISION & ARCHITECTURAL NORTH STAR

Transform a static route calculation prototype into a **dynamic, data-driven B2B platform** for urban mobility.

- **WASM FIRST**: Logic resides in Rust/WASM for performance and cross-platform portability.
- **ISLANDS ARCHITECTURE**: High performance via Astro SSG with localized interactivity.
- **ZERO RE-COMPILATION**: Route data is decoupled from binary code.
- **TROPICAL PREMIUM**: Modern, high-end glassmorphism aesthetic reflecting Cancún's essence.

---

## 2. 🔴 PHASE P0: WASM DATA DECOUPLING (THE "LOBOTOMY")

The hardcoded catalog in `lib.rs` must be removed to allow real-time updates without recompiles.

### Backend (Rust/WASM)

- **Implement `load_catalog(json: &str)`**: Parse a JSON buffer into a dynamic `DB` (use `RwLock` + `Lazy<RwLock<AppState>>`).
- **Optimize Storage**:
  - `Vec<Route>` for fuzzy/sequential matching.
  - `HashMap<String, Route>` for O(1) direct lookups (essential for SEO pages).
- **Hardened Serde**: Match `public/data/master_routes.json` exactly. Use `Option<T>` for nullable fields (empresa, horario).
- **API Surface**:
  - `find_route(origin, dest)`
  - `get_route_by_id(id)`
  - `get_all_routes()`

### Frontend Integration

- **Boot Sequence**: `RouteCalculator.astro` must `fetch()` the JSON catalog and inject it into WASM before any search is allowed.
- **Sync Logic**: Ensure the coordinate system in WASM stays in sync with `CoordinateFinder.ts`.

---

## 3. 🟡 PHASE P1: FRONTEND REFINEMENT & TAILWIND REMOVAL

Eliminate Tailwind CSS to reduce bundle size and enforce the custom design system.

- **Component Migration**:
  - `RouteCalculator.astro`: Convert all remaining utility classes to Vanilla CSS classes defined in the `<style>` block.
  - `Input.astro`: Redesign using pure CSS tokens.
- **Design Tokens**: Use variables from `index.css`:
  - Tropical Palette: `--color-turquoise`, `--color-coral`, `--color-sunset`.
  - Gradients: `--gradient-main`, `--gradient-tropical`.
  - Glassmorphism: `--glass-blur`, `--glass-opacity`, `--glass-border`.

---

## 4. 🔵 PHASE P2: SPRINT 6 - SOCIAL INTELLIGENCE & SEO

This phase expands the reach and data freshness of the app.

### "The Listener" (Social Scraper Pipeline)

- Integrate the scraper logic to parse Facebook/Social Media group info.
- Automate the ingestion into `master_routes.json`.
- Implement a "Last Updated" badge on route cards based on social data.

### Programmatic SEO

- **Dynamic Routing**: Implement `[id].astro` for routes using `getStaticPaths`.
- **Metadata**: Unique titles/descriptions for every route (e.g., "Ruta R-1: Centro a Zona Hotelera - MueveCancun").
- **Auto-Sitemap**: Ensure `sitemap-index.xml` includes all route pages.

---

## 5. 🟢 PHASE P3: UX POLISH & FINAL DELIVERY

### UI/UX Additions

- **Favorites**: Persistence of "Favorite Routes" in `localStorage`.
- **GPS Auto-Center**: When the app opens, center the map on the user IF permission is granted.
- **View Transitions**: Implement smooth page transitions between tabs using `astro:transitions`.

### Performance & PWA Audit

- **Lighthouse**: Reach 95+ in all categories.
- **Lazy Loading**: Ensure all images use `loading="lazy"`.
- **Manifest Audit**: Verify that splash screens and icons are high-res and correctly mapped for iOS/Android.

---

## ⚠️ CRITICAL CONSTRAINTS & RULES

1. **PROHIBIDO PANIC**: En Rust/WASM, nunca uses `.unwrap()`. Devuelve `Result<T, JsValue>` descriptivos para mostrar en el frontend.
2. **ASTRO TYPE SAFETY**: No actives `strict: true` en TypeScript de forma global; rompe la inferencia de Astro. Usa `strict: false` y habilita opciones seguras una por una.
3. **DESIGN CONSISTENCY**: Si un elemento no parece "Premium" o "State-of-the-Art", refactóralo. Usa sombras profundas, desenfoques vítreos y animaciones sutiles.
4. **NO PLACEHOLDERS**: Usa imágenes reales o generadas. Si falta un dato de parada, adviértelo en consola pero no detengas la renderización.

---

## 🔧 COMANDOS DE SUPERVIVENCIA

```bash
# Build Completo (Datos + WASM + Astro)
npm run build

# Prueba de Producción Local
npm run preview -- --host

# Sincronización de Catálogo
node scripts/sync-routes.mjs

# Limpieza Profunda de Astro (Si hay errores 500 fantasmas)
Remove-Item -Path "node_modules\.astro" -Recurse -Force
```

---

**ESTADO FINAL DESEADO**: Una aplicación extremadamente rápida, instalable, con datos de rutas actualizados diariamente vía Social Intelligence, y con una interfaz que sea referente de modernidad en Cancún.

**JULES, TU TIENES EL TIMÓN.** 🚢🌴
