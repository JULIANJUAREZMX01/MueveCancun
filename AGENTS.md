

**Misión**: PWA offline-first de transporte público en Cancún. Motor de ruteo en WebAssembly (Rust), sin backend.

---

## Agentes Disponibles

### 1. `claude-code` (Agente Principal)
- **Rol**: Features, fixes, refactors, documentación.
- **Branch pattern**: `claude/descripcion-XXXXX` (nunca push a `main`).
- **Ver**: `CLAUDE.md` para instrucciones detalladas de desarrollo.

### 2. `claude-delegation` (Workflow Autónomo)
- **Rol**: Tareas de largo plazo vía `.github/workflows/claude-delegation.yml`.
- **Trigger**: Workflow manual en ramas no protegidas.
- **Requiere**: Secreto `ANTHROPIC_API_KEY`.

### 3. `autocurative` (Auto-sanador Semanal)
- **Rol**: Health check — recompila WASM, valida datos, corre tests, auto-commitea fixes.
- **Schedule**: Lunes 06:00 UTC.
- **Archivo**: `.github/workflows/autocurative.yml`

### Cambios Clave:
1. **Wallet Prime**: Saldo inicial de $0.00 MXN. Funcionalidad de búsqueda abierta para todos.
2. **Conductor Registration**: Nuevo flujo para que conductores reciban un bono de $180.00 MXN.
3. **Promotional Codes**: Sistema de códigos de descuento (e.g., 'MUEVECANCUN2026').
4. **Nexus Transfer Engine**: Motor WASM optimizado para transbordos geográficos y de nombre.

### 4. `jules` (Agente de Codificación Gemini — Google Jules)
- **Rol**: Corrección autónoma de errores CI, resolución de Issues, asistencia en PRs, tareas delegadas de codificación iterativa.
- **Trigger automático**:
  - Label `jules` en un Issue → `.github/workflows/jules-issue-handler.yml`
  - CI falla en rama activa → `.github/workflows/jules-ci-fixer.yml`
  - Comentario `/jules <tarea>` en un PR → `.github/workflows/jules-pr-assistant.yml`
  - Invocación manual → `.github/workflows/jules-delegation.yml`
- **Requiere**: Secreto `JULES_API_KEY` (Configurar en Settings → Secrets → Actions).
- **API**: `https://jules.googleapis.com/v1alpha/sessions`
- **CLI**: `@google/jules` — `jules remote new`, `jules list` (ver: https://jules.google/docs/cli/reference)
- **Capacidades clave**:
  - CI Fixer: detecta, corrige, hace commit y reenvía reparaciones automáticamente.
  - Abre PRs directamente con los cambios aplicados.
  - Entornos "repoless" para tareas efímeras (Node, Python, Rust, Bun preinstalados).
  - Conexión MCP: Vercel, Supabase, Stitch, Context7.
  - Hasta 5 tareas simultáneas con `--parallel`.
  - Planning Critic interno para reducir tasas de fallo.
- **Scripts de orquestación**:
  - `scripts/jules-api.mjs` — cliente REST compartido
  - `scripts/jules-ci-fix.mjs` — payload builder para fallas CI
  - `scripts/jules-issue.mjs` — bridge Issue → Jules
  - `scripts/jules-pr.mjs` — bridge comentario PR → Jules
- **Modos de autoría**: `JULES`, `CO_AUTHORED`, `USER_ONLY` (default: `CO_AUTHORED`)
- **Branch pattern**: Jules crea ramas `jules/fix-*` o `jules/task-*` automáticamente.
### 4. `copilot-swe-agent` (Agente de GitHub Copilot)
<!-- Agente externo de GitHub — opera en ramas `copilot/*`. Genera PRs con cambios de
     features puntuales. Sus ramas requieren aprobación manual de CI antes de ejecutar
     workflows (protección estándar de GitHub para bots). -->
- **Rol**: Features específicas solicitadas por el owner vía issues/tareas.
- **Branch pattern**: `copilot/descripcion-tarea`
- **CI**: Sus workflows aparecen como `action_required` hasta aprobación manual del owner.
- **Ejemplo**: PR #367 — Auditoría SEO, OG image, sitemap dinámico.

---

## Módulos `src/lib/` (Capa 5 — Lib)

| Módulo | Propósito |
|--------|-----------|
| `transport.ts` | Etiquetas legibles por tipo de vehículo (`getTransportLabel`) |
| `idb.ts` | Abstracción IndexedDB con caché LRU y expiración TTL |
| `sync.ts` | Cola offline — encola operaciones fallidas y las reintenta con backoff |
| `telemetry.ts` | Métricas ligeras de uso (errores, rutas buscadas) — no envía datos externos |
| `types.ts` | Interfaces TypeScript compartidas entre WASM y UI |
| `SpatialHash.ts` | Índice espacial para búsqueda O(1) de paradas cercanas |
| `FavoritesStore.ts` | Rutas favoritas persistidas en IndexedDB |
| `CoordinatesStore.ts` | Base de datos de coordenadas de paradas; resuelve GPS → nombre |

---

## Módulos `src/utils/`

| Módulo | Propósito |
|--------|-----------|
| `coordinateFinder.ts` | Búsqueda fuzzy de paradas por tokens de nombre |
| `logger.ts` | `logger.info()` / `logger.error()` — silenciado en producción |
| `db.ts` | HMAC wallet en IndexedDB (balance del usuario) |

---

## Protocolo de Comunicación (DOM Events)

Los componentes se comunican mediante `CustomEvent` en el browser:

| Evento | Emisor | Receptor | Payload |
|--------|--------|----------|---------|
| `MAP_SET_STOP` | `InteractiveMap.astro` | `RouteCalculator.astro` | `{ type: 'origin'\|'dest', name: string }` |
| `SHOW_ROUTE_ON_MAP` | `RouteCalculator.astro` | `InteractiveMap.astro` | `{ journey: Journey }` |
| `BALANCE_UPDATED` | `wallet.astro` | `RouteCalculator.astro` | `{}` |

---

## Guía de Desarrollo
localStorage: `pending_route` (Journey JSON para dibujar al cargar el mapa).

---

## Guía de Tareas por Agente

### Fix de routing WASM:
1. Editar `rust-wasm/route-calculator/src/lib.rs`
2. Agregar tests en `#[cfg(test)]`
3. `cargo test --lib`
4. `node scripts/build-wasm.mjs`
5. `pnpm test`
6. Commit + PR

### Agregar nueva ruta al catálogo:
1. Editar `public/data/master_routes.json`
2. `node scripts/validate-routes.mjs`
3. `node scripts/optimize-json.mjs`
4. Commit: `feat(data): add route [ID]`

### Modificar UI:
1. Leer el archivo completo antes de editar.
2. Usar `escapeHtml()` para toda interpolación de usuario en innerHTML.
3. Verificar Dark Mode (`dark:*` clases Tailwind).

### SEO / Metadatos:
<!-- Scripts de soporte SEO agregados en PR #367 (2026-03-28). Migrados a TS en PR #397. -->
1. `node --experimental-strip-types scripts/generate_og_image.ts` — Regenera `public/og-image.png` (1200×630px).
2. `node --experimental-strip-types scripts/update-stats.ts` — Actualiza contadores en `README.md` (commits + LOC Rust).
3. Variables de entorno opcionales en Vercel: `PUBLIC_GOOGLE_SITE_VERIFICATION`, `PUBLIC_BING_SITE_VERIFICATION`.
4. Sitemap dinámico generado en build: `src/pages/sitemap.xml.ts` (incluye `/es/ruta/:id`, `/en/ruta/:id`).

---

## Límites del Sistema

| Límite | Valor | Razón |
|--------|-------|-------|
| Max rutas en catálogo | 5,000 | DoS WASM |
| Max paradas por ruta | 500 | DoS loop |
| Max payload WASM | 10 MB | Memoria |
| Max ops por búsqueda | 10,000,000 | Circuit breaker |
| Umbral geo-transfer | 350 m | Caminata aceptable |
| Radio GPS → parada | 1,000 m | UX aceptable |

---

## Contexto de Cancún

- **Zona geográfica**: `lat: 20.5–21.5, lng: -87.5 a -86.5`
- **Tarifa estándar**: 15 MXN (Bus Urbano), 12 MXN (Van/Combi)
- **Hubs conocidos**: El Crucero, ADO Centro, Plaza Las Américas, Mercado 23, Mercado 28, Puerto Juárez
- **Idioma catálogo**: Español
- **Formato ID ruta**: `[RUTA]_[ZONA]_[NNN]` (e.g., `R1_ZONA_HOTELERA_001`)

---

## Error Patterns

| Error | Causa | Fix |
|-------|-------|-----|
| `ERROR: Catalog not loaded` | WASM sin inicializar | Verificar `load_catalog()` |
| `JSON Parse Error` | JSON inválido | `node scripts/validate-routes.mjs` |
| `DB Lock Poisoned` | Panic en Rust | Recarga de página |
| GPS sin paradas cercanas | Radio > 1km | Toast de aviso, input manual |
| Transbordos no encontrados | Nombres sin match | Revisar hubs en `lib.rs` |
| Mapa stuck en "CARGANDO MAPA..." | `requestIdleCallback` sin timeout | Verificar `{ timeout: 2000 }` en `scheduleInit()` de `InteractiveMap.astro` |
| Leaflet no carga offline | No estaba en CRITICAL_ASSETS | Verificar `/vendor/leaflet/leaflet.js` en `public/sw.js` |

---

## Flujo de PR

### Data Update:
1. Editar `public/data/master_routes.json`.
2. Ejecutar `pnpm run prepare-data` (merge + optimize).

### Deployment:
El sistema está configurado para Vercel (SSG). El middleware maneja redirecciones de idioma y completitud de tutorial.
```
rama claude/* → tests pasan → PR a main → CI verde → merge
rama jules/*  → PR abierto por Jules → revisión → merge
rama copilot/* → CI action_required → owner aprueba → CI verde → merge
```

Cada PR debe incluir: descripción del problema, fix implementado, tests que lo prueban.
--
## 🔗 Mapa de Inter-comunicación entre Archivos de Agentes

<!-- CROSS-REFERENCES: actualizar al agregar nuevos agentes o archivos de seguimiento -->
| Archivo | Propósito | Referencia cruzada |
|---------|-----------|-------------------|
| `AGENTS.md` (este archivo) | Registro maestro de agentes, protocolos, historial de PRs | → `CLAUDE.md`, `docs/TRACKING.md`, `.Jules/speedy.md` |
| `CLAUDE.md` | Instrucciones de desarrollo para claude-code | → `AGENTS.md` §Agentes Disponibles, `docs/TRACKING.md` |
| `docs/TRACKING.md` | Bitácora unificada multi-agente | → Todos los MDs, `docs/adr/` |
| `.Jules/speedy.md` | Optimizaciones y reglas de oro de speedy | → `AGENTS.md` §Historial, `docs/TRACKING.md` |
| `docs/adr/ADR-2026-002.md` | Decisión de arquitectura Astro+WASM+Lit | → `docs/TRACKING.md`, `CLAUDE.md` |
| `docs/adr/ADR-2026-003.md` | CI hardening, test isolation, limpieza de artefactos | → Este archivo §Historial, `docs/TRACKING.md` |


---

## Mandato de Seguridad CI (v3.5.2+)
- **OBLIGATORIO**: Todas las GitHub Actions deben estar pineadas a un hash de commit completo (40 caracteres). No se permiten tags de versión (ej. @v4) para prevenir ataques de supply chain.

---

## Survival & Isolation Audit
Every significant change must pass the network isolation audit to ensure offline survival.
- **Command**: `pnpm audit:survival`
- **Mandate**: 0 external runtime dependencies (CDNs, Google Fonts, Maps APIs).
