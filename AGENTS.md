# AGENTS.md — Sistema Multi-Agente de MueveCancun

<!--
  OBJETO DE ESTUDIO / CONTEXTO DE AGENTES
  =========================================
  Este archivo define el protocolo de comunicación y responsabilidades de cada agente IA
  que opera sobre el repositorio MueveCancun. Cada agente tiene un rol único y usa ramas
  con prefijos específicos. El seguimiento de PRs y decisiones se mantiene en:
  → docs/AGENT_TRACKING.md

  REGISTRO DE COLABORACIÓN (ordenado cronológicamente):
  - 2026-03-28 @jules (sistemascancunjefe-ai): PR #365 — Nexus Transfer Engine v3.3+
      Hardening de arquitectura: tipo estricto TS/WASM, migración JS→TS, eliminación de CoordinatesStore duplicado.
  - 2026-03-28 @copilot: PR copilot/fix-pr-365-conflicts — Resolución de conflictos de PR #365
      9 archivos en conflicto resueltos (scripts/build-wasm.mjs, Cargo.toml, datos JSON, artefactos WASM).
  - 2026-03-28 @claude (claude-code): docs/agent-context-tracking — Documentación de contexto y seguimiento multi-agente.

  FLUJO DE TRABAJO MULTI-AGENTE:
  1. @jules genera PRs de largo plazo (Nexus Protocol, arquitectura, datos).
  2. @copilot resuelve conflictos y revisa código en PRs activos.
  3. @claude-code implementa features/fixes/docs en ramas claude/*.
  4. autocurative corre checks de salud cada lunes 06:00 UTC.

  Para agregar un nuevo agente: seguir el patrón de esta sección y actualizar
  docs/AGENT_TRACKING.md con el historial de PRs correspondiente.
-->

**Misión**: PWA offline-first de transporte público en Cancún. Motor de ruteo en WebAssembly (Rust), sin backend.

---

## Agentes Disponibles

### 1. `claude-code` (Agente Principal)
- **Rol**: Features, fixes, refactors, documentación.
- **Branch pattern**: `claude/descripcion-XXXXX`, `docs/descripcion` (nunca push a `main`).
- **Ver**: `CLAUDE.md` para instrucciones detalladas de desarrollo.

### 2. `jules` / `sistemascancunjefe-ai` (Agente de Arquitectura)
- **Rol**: Tareas de largo plazo — arquitectura, hardening, datos, integración WASM.
- **Plataforma**: Jules (Google).
- **Branch pattern**: `fix/build-wasm-*`, `feat/*`.
- **Aprendizajes**: `.Jules/speedy.md`

### 3. `copilot` (Agente de Resolución de Conflictos)
- **Rol**: Resolución de conflictos de merge, revisión de código, integración de PRs.
- **Plataforma**: GitHub Copilot.
- **Branch pattern**: `copilot/*`.

### 4. `claude-delegation` (Workflow Autónomo)
- **Rol**: Tareas de largo plazo vía `.github/workflows/claude-delegation.yml`.
- **Trigger**: Workflow manual en ramas no protegidas.
- **Requiere**: Secreto `ANTHROPIC_API_KEY`.

### 5. `autocurative` (Auto-sanador Semanal)
- **Rol**: Health check — recompila WASM, valida datos, corre tests, auto-commitea fixes.
- **Schedule**: Lunes 06:00 UTC.
- **Archivo**: `.github/workflows/autocurative.yml`

---

## Seguimiento de PRs

> Historial completo en [`docs/AGENT_TRACKING.md`](docs/AGENT_TRACKING.md).

| PR / Branch | Agente | Fecha | Estado | Descripción |
|-------------|--------|-------|--------|-------------|
| PR #365 | @jules | 2026-03-28 | ✅ | Nexus v3.3+ Architecture Hardening (Zero Any, sw.ts, scripts.ts) |
| `copilot/fix-pr-365-conflicts` | @copilot | 2026-03-28 | ✅ | Resolución de 9 conflictos de PR #365 |
| `docs/agent-context-tracking` | @claude | 2026-03-28 | ✅ | Documentación de contexto y tracking multi-agente |

---

## Protocolo de Comunicación (DOM Events)

Los componentes se comunican mediante `CustomEvent` en el browser:

| Evento | Emisor | Receptor | Payload |
|--------|--------|----------|---------|
| `MAP_SET_STOP` | `InteractiveMap.astro` | `RouteCalculator.astro` | `{ type: 'origin'\|'dest', name: string }` |
| `SHOW_ROUTE_ON_MAP` | `RouteCalculator.astro` | `InteractiveMap.astro` | `{ journey: Journey }` |
| `BALANCE_UPDATED` | `wallet.astro` | `RouteCalculator.astro` | `{}` |

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

---

## Flujo de PR

```
rama claude/* (o jules/*, copilot/*) → tests pasan → PR a main → CI verde → merge
```

Cada PR debe incluir: descripción del problema, fix implementado, tests que lo prueban.

El agente que crea el PR debe agregar una entrada en [`docs/AGENT_TRACKING.md`](docs/AGENT_TRACKING.md).
