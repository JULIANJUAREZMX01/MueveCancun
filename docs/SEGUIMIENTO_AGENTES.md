# 📋 Seguimiento de Agentes — MueveCancun

> **Objeto de estudio:** Registro cronológico de cada intervención de agente IA en el
> proyecto, sus objetivos, resultados y lecciones aprendidas. Sirve como bitácora
> de toma de decisiones y guía de contexto para futuros agentes.

_Última actualización: 29 de Marzo, 2026 (rebased onto main con cambios del 28-Mar)_

---

## ¿Por qué existe este archivo?

MueveCancun es construido activamente por un equipo humano + múltiples agentes IA
(Jules/GitHub Copilot, Claude, `autocurative`). Sin una bitácora centralizada es
difícil saber:
- **Qué** cambió en cada PR.
- **Por qué** se tomó cada decisión técnica.
- **Cuál** es el estado actual del sistema.

Este documento responde esas preguntas en orden cronológico.

---

## Índice de PRs y Cambios

| # | Fecha | Rama / PR | Agente | Tipo | Resumen |
|---|-------|-----------|--------|------|---------|
| 1 | 2026-02-03 | (inicial) | Jules + Copilot | feat | PWA V2.2 "Inmortal" — offline mode completo |
| 2 | 2026-02-18 | `copilot/fix-errors-in-pwa-development` | Copilot | fix/chore | Cleanup repo, WASM build fix, docs |
| 3 | 2026-03-10 | (múltiples) | Claude | feat | Nexus Prime v3.3 — i18n, GPS fix, CI/CD |
| 4 | 2026-03-28 | `#347` | Copilot | perf | CoordinateFinder — eliminate redundant toLowerCase |
| 5 | 2026-03-28 | `#354` | Copilot | test | formatDate unit tests in utils.test.ts |
| 6 | 2026-03-28 | `#359` | Copilot | chore | Consolidate utilities src/lib → src/utils |
| 7 | 2026-03-28 | `#372` | Copilot | feat | Citizen Reporting System (Nexus Protocol Tier 1) |
| 8 | 2026-03-28 | `#375` | Copilot | fix | Make JSON generation idempotent (CI dirty-tree) |
| 9 | 2026-03-28 | `copilot/seo-audit-report-muevecancun` (#367) | Copilot | feat | Auditoría SEO completa |
| 10 | 2026-03-29 | `claude/docs-agents-tracking-*` | Claude | docs | Esta bitácora + docs de agentes (rebased) |

---

## Detalle por PR

### PR 1 — PWA V2.2 "Inmortal" (2026-02-03)

**Agente:** Jules (Google) + GitHub Copilot  
**Objetivo:** Hacer la app funcional 100% sin internet.

**Cambios técnicos:**
- Service Worker con Cache-First para tiles OSM (zoom 12–16, área Cancún).
- Pre-carga de binario WASM y `coordinates.json` en activos críticos.
- "Skip Waiting" con banner de nueva versión en `MainLayout.astro`.
- UI de fallback en `RouteCalculator.astro` cuando WASM falla (texto exacto: "Modo Offline Limitado").
- `InteractiveMap.astro`: `maxBounds` para la zona de Cancún.

**Lección aprendida (de BITACORA_APRENDIZAJE.md):**
> "Jules hace los cambios sobre la misma rama si no se abre nueva conversación."
> Diferencia entre `Update branch` (sincroniza desde main → rama) vs
> `Merge pull request` (rama → main, cierra la tarea).
> Estrategias de merge: `Create merge commit` (historia exacta) vs
> `Squash and merge` (historial limpio — recomendado para commits de agentes).

---

### PR 2 — Cleanup & WASM Build Fix (2026-02-18)

**Agente:** GitHub Copilot (`copilot-swe-agent`)  
**Objetivo:** Resolver errores de deploy, organizar repositorio.

**Cambios técnicos:**
- Fix `.github/workflows/build-wasm.yml`: salida a `public/wasm/` (antes intentaba `src/wasm/` que no existía).
- Eliminación de 40+ archivos temporales (~2.5 MB reducción).
- `.gitignore` mejorado: excluye AI agent dirs, snapshots, `src/wasm/`.
- `scripts/build-wasm.mjs`: single output location.
- Organización de tests en `/tests/integration/` y `/tests/verification/`.
- Documentación nueva: `ANALISIS_COMPLETO.md`, `docs/BEST_PRACTICES.md`, `docs/CLEANUP_REPORT.md`.
- `TECH_DEBT.md`: inventario completo de deuda técnica.

**Resolución de conflictos:**
- Merge con `--allow-unrelated-histories` (branch era "grafted").
- 10 conflictos resueltos: versión PR para workflows/scripts, versión main para WASM binarios y componentes.

**Resultado:** Commit `2217c37` en `main`.

---

### PR 3 — Nexus Prime v3.3 (2026-03-10)

**Agente:** Claude (`claude-code`)  
**Objetivo:** Completar funcionalidades core del motor de rutas.

**Cambios técnicos principales:**
- **Motor WASM**: Transbordos por nombre exacto (Pass 1) y proximidad geográfica ≤350m (Pass 2).
- **CoordinatesStore**: Índice espacial (`SpatialHash`) para búsqueda O(1) de paradas cercanas.
  - `findNearest()` retorna nombre en casing original (via `originalNames` Map).
  - `findNearestWithDistance()` retorna `{ name, distanceKm }`.
- **GPS Fix**: Antes retornaba `"lat, lng"` como texto al input → WASM no encontraba nada.
  Ahora resuelve coordenadas a nombre de parada vía `CoordinatesStore`.
- **i18n**: Middleware Astro, helpers en `src/utils/i18n.ts`.
- **Páginas**: `src/pages/[lang]/` con prefijo de idioma en URL.
- **CI/CD**: 6 workflows activos (tests, build-wasm, validate-data, CodeQL, autocurative, deploy).
- **Tipo safety**: Interfaces `RouteData`, `Stop`, `RoutesCatalog` en `src/types.ts`.
- **WasmLoader**: Singleton en `src/utils/WasmLoader.ts` — previene race conditions.
- **Geometría**: `getDistance()` movida a `src/utils/geometry.ts`.

**Tests (Vitest):**
- 99 tests, 0 fallos. 1 test skipped (motor WASM — requiere compilación Rust).
- Suite cubre: CoordinatesStore, CoordinateFinder, RouteDrawer, db (HMAC), i18n, SpatialHash, FavoritesStore, toast, transport, health.

---

### PR 4 — Auditoría SEO (2026-03-28) — `copilot/seo-audit-report-muevecancun` (#367)

**Agente:** GitHub Copilot (`copilot-swe-agent`)  
**Rama:** `copilot/seo-audit-report-muevecancun`  
**PR:** #367 (estado: draft, abierto)  
**Objetivo:** Corregir deficiencias de SEO detectadas en auditoría.

**Problemas encontrados:**
| Problema | Estado anterior | Fix aplicado |
|----------|----------------|--------------|
| OG image placeholder | 157 bytes (imagen rota) | PNG real 1200×630px (~42KB) |
| Sitemap incompleto | Solo páginas estáticas base | + localizadas + todas las rutas |
| Sin Search Console | Sin soporte | Verification tags condicionales |
| README sin métricas | Sección vacía | Stats auto-actualizables |

**Archivos modificados:**
- `public/og-image.png` — 1200×630px RGB real.
- `src/layouts/MainLayout.astro` — meta tags `google-site-verification` y `msvalidate.01` condicionales (solo si las env vars están definidas).
- `src/pages/sitemap.xml.ts` — sitemap dinámico con `getAllRoutes()` en build time.
- `scripts/generate_og_image.mjs` — generador Sharp SVG→PNG (reproducible, sin Python).
- `scripts/update-stats.mjs` — actualiza `README.md` con commit count y LOC Rust (Node.js puro, sin shell injection).
- `README.md` — sección `📊 Estadísticas`.

**Validación pre-merge:**
- ✅ 99/99 tests Vitest pasando.
- ✅ ESLint sin errores.
- ✅ OG image verificada: 1200×630px, RGB, ~42KB.
- ✅ Sitemap incluye `/es/`, `/en/` + `/es/ruta/:id`, `/en/ruta/:id`.
- ✅ Verification tags solo renderizan cuando la env var está definida.
- ✅ `update-stats.mjs` produce output correcto en README.

**CI GitHub:** `action_required` — esto NO es un fallo. Es la protección estándar de
GitHub para workflows ejecutados por bots/agentes externos. El owner debe aprobarlos
manualmente. Los jobs en sí no fallaron (sin jobs registrados = no ejecutaron aún).

**Post-merge para activar SEO completo:**
1. En Render → Environment Variables:
   - `PUBLIC_GOOGLE_SITE_VERIFICATION=<token-de-google-search-console>`
   - `PUBLIC_BING_SITE_VERIFICATION=<token-de-bing-webmaster>`
2. Registrar en [Google Search Console](https://search.google.com/search-console).
3. Importar en [Bing Webmaster Tools](https://www.bing.com/webmasters) desde GSC.
4. Submittear: `https://querutamellevacancun.onrender.com/sitemap.xml`

---

### PR 5 — Documentación de Agentes y Seguimiento (2026-03-28)

**Agente:** Claude (`claude-code`)  
**Rama:** `claude/docs-agents-tracking-*`  
**Objetivo:** Documentar objetos de estudio, agregar contexto a todos los MD de agentes
y consolidar la bitácora del proyecto.

**Cambios:**
- `AGENTS.md` — Header con tabla de historial de PRs, sección para `copilot-swe-agent`,
  guía de tarea SEO, flujo de PR actualizado para ramas `copilot/*`, tabla de env vars.
- `CLAUDE.md` — Header con objeto de estudio, scripts SEO en sección de comandos,
  sección SEO y metadatos con contexto de PR #367, nota de seguridad en `update-stats.mjs`.
- `docs/SEGUIMIENTO_AGENTES.md` — Este archivo (nuevo).
- `docs/PROJECT_STATUS.md` — Actualizado con estado al 28-Mar-2026.

---

## Estado del Sistema al 28-Mar-2026

```
Versión:          1.0.0 — Nexus Prime v3.3 (+SEO pending merge)
Tests:            99/99 Vitest ✅ | Rust tests: compilación local OK
CI/CD:            6 workflows activos
PRs abiertos:     #367 (SEO, draft — listo para merge)
Rama principal:   main
Deploy:           https://querutamellevacancun.onrender.com
```

### Componentes del Stack

| Capa | Tecnología | Estado |
|------|-----------|--------|
| Motor de ruteo | Rust + WebAssembly | ✅ Funcional |
| Frontend | Astro SSG + Tailwind | ✅ Funcional |
| Mapa | Leaflet | ✅ Funcional |
| Wallet | IndexedDB + HMAC | ✅ Funcional |
| GPS → Parada | CoordinatesStore + SpatialHash | ✅ Funcional |
| i18n | Astro middleware | ✅ ES + EN |
| PWA offline | Service Worker | ✅ Funcional |
| SEO | OG image + sitemap + verification | ⏳ Pending merge #367 |
| Catálogo datos | master_routes.json | ⚠️ Datos parciales (v3.4 pendiente) |

---

## Próximos Pasos (Roadmap Resumido)

Ver `ROADMAP.md` para detalle completo. En resumen:

**v3.4 — Catálogo Completo** (prioridad alta):
- Completar `public/data/master_routes.json` con rutas reales de Cancún.
- Agregar `lat`/`lng` a todas las paradas.
- Cubrir hubs: El Crucero, ADO, Plaza Las Américas, Mercado 23/28, Puerto Juárez.

**v3.5 — Crowdsourcing**:
- Formulario de reportes offline con Background Sync API.

**v3.6 — UX / Accesibilidad**:
- Navegación por teclado completa.
- ARIA en controles del mapa.

---

## Notas para Futuros Agentes

1. **Nunca** modificar el límite de 10M ops del circuit breaker WASM.
2. **Siempre** usar `escapeHtml()` antes de interpolación en `innerHTML`.
3. Los tests Vitest deben estar en **verde antes de cada commit**.
4. Los workflows de GitHub para ramas `copilot/*` requieren aprobación manual del owner — esto es normal, no es un error.
5. `CoordinatesStore.findNearest()` retorna el nombre en casing original (no lowercase).
6. `getDistance()` vive en `src/utils/geometry.ts`, no en `src/utils/utils.ts`.

---

_Mantenido por el equipo de agentes IA de MueveCancun._
_Actualizar este archivo en cada PR que modifique la arquitectura o flujo de trabajo._
