# 📋 Lista de Tareas - MueveCancun PWA v3.0

## ✅ COMPLETADO (Sprint 1 & 2)

### 1. Mapa y Navegación

- [x] **Marcadores A/B Premium**: Implementados iconos personalizados para Inicio, Fin y Transbordos.
- [x] **Animación de Ruta**: Efecto "marching ants" en polylines.
- [x] **Navegación Unificada**: Creado componente `<BottomNav />` y aplicado en toda la app.
- [x] **Footer Completo**: Incluye Inicio, Rutas, Mapa, Mi Tarjeta, Comunidad.
- [x] **Unificación Wallet/Driver**: Eliminado `/driver`, estandarizado en `/wallet`.

### 2. PWA y Offline

- [x] **Service Worker**: Actualizado a `v3.0.1-ssg` con todas las rutas críticas (`/wallet`, `/community`, etc.).
- [x] **SSG**: Configurado `output: 'static'` para generación estática.
- [x] **Islands**: Ajustado `InteractiveMap` (script inline) y `RouteCalculator`.

---

## 🟡 PENDIENTE (Sprint 3 - Polish & Features)

### 1. Mejoras de UI/UX

- [x] **Geolocalización**: Botón para centrar mapa en ubicación del usuario.
- [x] **Favoritos**: Guardar rutas frecuentes (localStorage).
- [x] **Modo Oscuro**: Implementar toggle de tema.
- [] **Transiciones**: Agregar `astro:transitions` o View Transitions API para navegación suave.

---

## ✅ COMPLETADO (Sprint 4 - Predictive Search & UI Polish)

### 1. Funcionalidad Core

- [x] **Buscador Predictivo**: Implementado `CoordinateFinder` con lógica fuzzy, normalización de acentos y búsqueda multi-token.
- [x] **Integración WASM**: Conectado selección de paradas con `find_route` usando `findBestMatch`.

### 2. Estética Premium (UI/UX)

- [x] **Input Redesign**: Reemplazado `datalist` nativo con dropdown personalizado (Glassmorphism + backdrop-blur).
- [x] **Animaciones**: Transiciones suaves fade-in/out en dropdown de sugerencias.
- [x] **Feedback Visual**: Mejorados estados de carga, errores con toast notifications, y navegación por teclado.

---

## ✅ COMPLETADO (Sprint 5 - Technical Refinements & Recovery)

**Status**: � **COMPLETE** (with recovery notes)

### Achievements

- [x] **Aesthetic Refinement**: Tropical color palette (turquoise, coral, sunset, ocean, sand) + enhanced glassmorphism
- [x] **CSS Migration (Partial)**: `BottomNav.astro` and `Header.astro` migrated to Vanilla CSS
- [x] **Bug Fixes**: Resolved Astro 500 errors, restored Community tab (5 tabs total), fixed route calculation
- [x] **WASM Verification**: Confirmed Jules' engine intact and operational
- [x] **TypeScript Strategy**: Created incremental hardening plan (strict mode reverted)
- [x] **Documentation**: Comprehensive recovery reports and best practices guides

> **Recovery Note**: TypeScript strict mode broke Astro routing (500 errors). All issues resolved. App 100% functional. See `MASTER_ROADMAP.md` in artifacts for complete details.

---

## 🔴 EN PROGRESO (Phase 1: WASM Data Decoupling - Frontend Prep)

**Priority**: P0 CRITICAL  
**Goal**: Prepare data layer for Jules' WASM refactor

### 1. Data Layer Genesis ✅

- [x] **Verify master_routes.json**: File exists at `public/data/master_routes.json`
  - Size: 152KB, 5414 lines
  - Comprehensive route data (R-1, Playa Express, Saturmex, etc.)
  - Schema: `id`, `nombre`, `tarifa`, `tipo`, `paradas[]`

### 2. Frontend Logic Preparation 🔄

- [ ] **RouteCalculator.astro Refactor**:
  - [ ] Add `fetchData()` function (runs on client mount)
  - [ ] Implement loading state UI
  - [ ] Pass JSON string to WASM `load_catalog()` (once Jules updates binary)
  - [ ] Error handling (fetch failure, parse error)

### 3. Integration Testing

- [ ] Verify JSON loads successfully
- [ ] Confirm WASM receives catalog
- [ ] Test route calculation with dynamic data
- [ ] No regressions in existing features

**Blocker**: Waiting for Jules' WASM binary update with `load_catalog()` function

---

## 🟡 PENDIENTE (Sprint 5 Cleanup)

### 1. Complete CSS Migration

- [ ] **RouteCalculator.astro**: Migrate from Tailwind to Vanilla CSS
- [ ] **Input.astro**: Verify no Tailwind dependencies
- [ ] **Remove Tailwind**: Uninstall dependencies after migration complete

### 2. Technical Debt

- [ ] **Audit Dead Code**: Verify if `saturmex_routes.json` (175KB) is used
- [ ] **TypeScript Incremental**: Enable safe options one-by-one (see `typescript_best_practices.md`)

---

## 🛠️ INDICACIONES Y MANTENIMIENTO (Para Usuarios/Agentes)

### 1. Sincronización de Datos

Cada vez que se modifique `src/data/routes.json`, se **DEBE** ejecutar:

```bash
node scripts/sync-routes.mjs
```

Esto asegura que el catálogo y las páginas individuales reflejen los cambios.

### 2. Despliegue (Build)

Para una compilación limpia de producción:

```bash
pnpm run build
```

Esto incluye la compilación de WASM, la verificación de binarios y la generación estática de Astro.

### 3. Telemetría y Analíticas

Los eventos se guardan en el `localStorage` del navegador bajo la clave `muevecancun_telemetry_queue`. Se sincronizan automáticamente al detectar conexión a internet (`navigator.onLine`).

### 4. Modo Selección (Picker)

Si necesitas habilitar la selección de paradas desde el mapa para otros componentes, usa el parámetro de URL `?picker=destination`. El mapa emitirá la selección y redirigirá con `selected_stop` a la raíz.

---

## 🚀 PRÓXIMOS PASOS (Sprint 6 - Social Intelligence & SEO)

**Prerequisites**: Sprint 5 cleanup complete

### 1. The Listener (Social Media Scraper)

- [ ] **Route Extraction**: Extract route info from Facebook groups
- [ ] **Data Ingestion**: Feed into `master_routes.json`
- [ ] **Automated Sync**: Pipeline for continuous updates
- [ ] **Owner**: Jules

### 2. Programmatic SEO

- [ ] **Dynamic Routes**: Create `/rutas/[id]` template
- [ ] **Sitemap Generation**: Auto-generate for all routes
- [ ] **Meta Tags**: Optimize for search engines
- [ ] **Owner**: Antigravity

### 3. UX Polish

- [ ] **GPS Auto-Center**: Connect nearest-match to map view
- [ ] **Local Favorites**: Persistent favorites in localStorage
- [ ] **Share Routes**: Social sharing functionality
- [ ] **Offline Fallback**: Custom `offline.html` page
- [ ] **Lazy Loading**: Apply to images in `community.astro`
- [ ] **Lighthouse Audit**: Target Performance > 90

### 4. PWA Enhancements

- [ ] **Manifest Verification**: High-res splash screens, theme consistency
- [ ] **Screenshots**: Add to manifest for rich install experience
- [ ] **Modo Oscuro Avanzado**: Refine transitions between islands

---

## 📚 MASTER DOCUMENTATION

**See**: `C:\Users\QUINTANA\.gemini\antigravity\brain\736e1bd5-1686-478c-a910-22572c734f30\MASTER_ROADMAP.md`

Complete consolidated roadmap with:

- Sprint 1-5 progress tracking (75% overall completion)
- Technical debt inventory (7 prioritized items)
- Clear delegation (Jules vs Antigravity tasks)
- All code fragments preserved
- Success metrics and testing strategies

---

## 🔧 Comandos Útiles

```bash
# Build & Preview
npm run build && npm run preview -- --host

# Limpiar cache de Astro
Remove-Item -Path "node_modules\.astro" -Recurse -Force
```

## 📊 Estado Actual

**Versión:** v3.0.1-ssg
**Páginas:** 18 rutas estáticas
**Navegación:** BottomNav (5 items)
**Mapa:** Leaflet sin React (Script Inline)
