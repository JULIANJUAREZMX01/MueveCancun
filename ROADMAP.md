# 🗺️ MueveCancún — Roadmap

> Última actualización: 2026-04-02 · Versión actual: **1.2.4 (Nexus Prime v3.3.6)**
> App en producción: [querutamellevacancun.onrender.com](https://querutamellevacancun.onrender.com)

---

## Estado Actual — v3.3 ✅

El núcleo funcional está terminado y desplegado:

- **Motor WASM (Rust)** — Búsqueda de rutas con detección de transbordos exactos y por proximidad geográfica (≤ 350 m).
- **PWA offline-first** — Service Worker activo; la app funciona sin conexión a internet.
- **GPS → parada** — `CoordinatesStore` resuelve coordenadas a la parada más cercana (radio 1 km).
- **Mapa interactivo** — Leaflet con popups "Salgo de aquí / Voy aquí".
- **Wallet IndexedDB** — Balance unificado con firma HMAC, sin backend.
- **i18n Español / Inglés** — Middleware Astro.
- **CI/CD completo** — 6 workflows (tests, build-wasm, validación de datos, CodeQL, autocurative).

---

## v3.4 — Catálogo de Rutas Completo
**Objetivo:** Hacer el catálogo de datos apto para producción.  
**Estimado:** 2–3 semanas

### Tareas
- [ ] Completar y depurar `public/data/master_routes.json` con rutas reales de Cancún (actualmente contiene un catálogo parcial en la clave `rutas`, con datos incompletos).
- [ ] Agregar coordenadas (`lat`/`lng`) a todas las paradas del catálogo.
- [ ] Ejecutar `node scripts/validate-routes.mjs` y corregir todos los errores.
- [ ] Ejecutar `node scripts/optimize-json.mjs` para regenerar la versión optimizada.
- [ ] Verificar que `WASM load_catalog()` carga el catálogo sin errores.
- [ ] Agregar tests de integración para al menos 5 rutas conocidas de la ciudad.
- [ ] Cubrir los hubs principales: El Crucero, ADO, Plaza Las Américas, Mercado 23/28, Puerto Juárez.
- [ ] Documentar fuentes de datos y proceso de actualización del catálogo.

---

## v3.5 — Crowdsourcing y Formularios Offline
**Objetivo:** Permitir que los usuarios reporten rutas y alertas desde el campo.  
**Estado:** Parcialmente completado (v3.3.3)

### Tareas
- [x] Formulario de reporte de incidentes con validación client-side.
- [x] Cola offline para envíos pendientes (Custom IDB Queue + `online` event).
- [x] UI de confirmación de envío (toast + feedback visual).
- [ ] Moderación básica de reportes (flags de spam/repetición).
- [ ] Feature flag vía variable de entorno (`CROWDSOURCE_ENABLED`).
- [x] Tests unitarios y de integración para la cola offline.

---

## v3.6 — Experiencia de Usuario y Accesibilidad
**Objetivo:** Pulir la UX para usuarios en dispositivos de gama media/baja.  
**Estimado:** 2 semanas

### Tareas
- [ ] Navegación por teclado completa en `RouteCalculator.astro`.
- [ ] Etiquetas ARIA en todos los controles del mapa.
- [ ] UX de permisos de geolocalización (prompt suave + reintento).
- [ ] Botón de recentrar mapa con pulsación larga para auto-seguir.
- [ ] Scroll virtualizado en lista de rutas con muchos resultados.
- [ ] Auditoria Lighthouse PWA en CI (mínimo 90/100 en cada categoría).
- [ ] Presupuesto de performance: TTI < 3 s en dispositivo de gama media.

---

## v4.0 — Multi-ciudad y Analytics Real
**Objetivo:** Expandir a Playa del Carmen y Tulum; integrar métricas reales.  
**Estimado:** 6–8 semanas

### Tareas
- [ ] Selector de ciudad en la UI (Cancún / Playa del Carmen / Tulum).
- [ ] Catálogos independientes por ciudad (`master_routes_playa.json`, etc.).
- [ ] Integrar analytics real (Plausible o GA4) en reemplazo del stub actual.
- [ ] Dashboard de métricas: rutas más buscadas, hubs más usados.
- [ ] Política de privacidad bilingüe actualizada.
- [ ] Despliegue blue-green en Render para releases sin downtime.

---

## Backlog Técnico (sin sprint asignado)

Estas tareas están identificadas pero aún no tienen sprint asignado. Se irán priorizando según el impacto:

| Prioridad | Tarea |
|-----------|-------|
| 🔴 | Limpiar artefactos de desarrollo de la raíz (`full_script.ts`, `patch*.diff`, `*.bak`, `*.new`) |
| 🔴 | Cachear artefactos `wasm-bindgen` / `binaryen` en CI para builds rápidos |
| 🟡 | Política stale-while-revalidate en Service Worker para `/data/**` |
| 🟡 | Carga progresiva del catálogo (chunks) en lugar de un JSON único |
| 🟡 | Deduplicar paradas duplicadas en `CoordinatesStore` |
| 🟡 | Reemplazar `any` en `Analytics.ts` con interfaz tipada |
| 🟡 | Índice espacial con tamaño de celda configurable (`SpatialHash`) |
| 🟢 | Generador de datasets sintéticos para pruebas de carga |
| 🟢 | Página de healthcheck con info de build (`/healthz`) |
| 🟢 | Plantilla de post-mortem para incidentes |
| 🟢 | Documentar contrato de datos WASM en `docs/BRIDGE_WASM.md` |

---

## Historial de Versiones

| Versión | Fecha | Cambios principales |
|---------|-------|---------------------|
| v3.3.3 | 2026-04-02 | Tier 1 Reporting: Migrated to client-side GitHub API; Added offline queuing with IndexedDB v4; Resolved Render deploy failure |
| v3.3.2 | 2026-04-02 | Fix infinite redirect loop in static build; remove build-time middleware redirects; client-side tutorial enforcement |
| v3.3.1 | 2026-03-29 | Strictly Static Stabilization; Client-side redirects for CDN compatibility; Localization utility implementation |
| v3.3 | 2026-03-10 | Nexus Transfer Engine; GPS → parada; mapa interactivo con popups; balance IndexedDB unificado; 11 test files; 6 workflows CI/CD |
| v3.2 | 2026-02-19 | WasmLoader singleton; SpatialHash; CoordinateFinder 2.1× más rápido; type-safety mejorada |
| v3.1 | 2026-02-18 | Triple balance system; IndexedDB DataError resuelto; `src/lib/` → `src/utils/` |
| v3.0 | 2026-02-17 | Consolidación de 12 PRs; arquitectura Nexus establecida |

---

## Guía de Contribución

1. Crear rama: `claude/descripcion-XXXXX` (nunca push directo a `main`).
2. Para cambios al motor: `cargo test --lib` → `node scripts/build-wasm.mjs` → `pnpm test`.
3. Para cambios al catálogo: `node scripts/validate-routes.mjs` → `node scripts/optimize-json.mjs`.
4. Todo PR debe incluir: descripción del problema, solución implementada y tests que la validan.

Ver `CLAUDE.md` para instrucciones detalladas por tipo de tarea.
