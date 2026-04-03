# 📋 AGENT_TRACKING.md — Historial de PRs y Decisiones Multi-Agente

<!--
  OBJETO DE ESTUDIO
  =================
  Este archivo es el registro central de colaboración entre agentes IA en el proyecto
  MueveCancun. Cada agente (@jules, @copilot, @claude) deja aquí un rastro auditado de:
  - PRs creados, conflictos resueltos, decisiones de arquitectura.
  - Lecciones aprendidas relevantes para el siguiente agente que trabaje en el repo.
  - Contexto necesario para retomar cualquier tarea sin perder información.

  PROTOCOLO DE ACTUALIZACIÓN:
  Al crear un PR, el agente responsable debe agregar una entrada en la sección
  "Historial de PRs" con: número, título, agente, fecha, archivos clave, decisiones.
-->

## Registro de Agentes Activos

| Agente | Plataforma | Branch pattern | Especialidad |
|--------|-----------|----------------|-------------|
| `@jules` (`sistemascancunjefe-ai`) | Jules (Google) | `fix/build-wasm-*` | Arquitectura, WASM, long-running tasks |
| `@copilot` | GitHub Copilot | `copilot/*` | Resolución de conflictos, revisión de código |
| `@claude` (`claude-code`) | Anthropic Claude | `claude/*`, `docs/*` | Features, fixes, refactors, documentación |
| `autocurative` | GitHub Actions | — | Health check semanal (lunes 06:00 UTC) |

---

## Historial de PRs (cronológico)

### PR #365 — Nexus Transfer Engine v3.3+ Architecture Hardening
- **Agente:** @jules (`sistemascancunjefe-ai`)
- **Fecha:** 2026-03-28
- **Branch:** `fix/build-wasm-and-imports-021125-5653149475236142762-2416678267437297055`
- **Estado:** ✅ Mergeado (vía `copilot/fix-pr-365-conflicts`)
- **Descripción:** Hardening de arquitectura — política "Zero Any" en TypeScript/WASM FFI,
  migración de scripts cliente de `public/js/*.js` → `src/scripts/*.ts`, migración de
  Service Worker de `public/sw.js` → `src/sw.ts`, eliminación de `src/lib/CoordinatesStore.ts`
  (duplicado), tipos consolidados en `src/types.ts`.
- **Archivos clave modificados:**
  - `src/utils/WasmLoader.ts` — Añade `RouteCalculatorModule` interface
  - `src/utils/RouteDrawer.ts` — Tipos locales de Leaflet
  - `src/utils/routeRenderer.ts` — Usa `Journey` interface
  - `src/types.ts` — Fuente única de tipos: Journey, RouteLeg, RouteStop
  - `src/sw.ts` — Service Worker TypeScript (nuevo)
  - `src/scripts/*.ts` — Scripts cliente tipados (nuevo)
  - `src/layouts/MainLayout.astro` — Importa scripts desde `src/scripts/`
  - `astro.config.mjs` — Bundling de sw.ts → dist/sw.js
  - `docs/adr/003-typescript-strict-ffi.md` — ADR de la decisión FFI
  - `ARCH_MANIFEST.md` — Actualizado con nueva arquitectura
- **Conflictos que generó (resueltos en PR siguiente):**
  - `scripts/build-wasm.mjs` — Variable `wasmPackCmd` sin usar en main
  - `rust-wasm/spatial-index/Cargo.toml` — Versión rstar (0.11 vs 0.12)
  - `public/wasm/route-calculator/*.{js,d.ts,wasm}` — Artefactos en .gitignore
  - `public/data/*.json` — Drift de timestamps en archivos auto-generados

---

### PR copilot/fix-pr-365-conflicts — Resolución de conflictos PR #365
- **Agente:** @copilot (GitHub Copilot)
- **Fecha:** 2026-03-28
- **Branch:** `copilot/fix-pr-365-conflicts`
- **Estado:** ✅ Mergeado a `main`
- **Descripción:** Integración de PR #365 al branch principal. 9 archivos en conflicto
  resueltos mediante merge de `origin/pr-365` en `copilot/fix-pr-365-conflicts`
  (que estaba en paridad con main).
- **Decisiones de resolución:**

  | Archivo | Tipo conflicto | Resolución |
  |---------|---------------|-----------|
  | `scripts/build-wasm.mjs` | Contenido (UU) | PR #365 — sin `wasmPackCmd` sin usar |
  | `rust-wasm/spatial-index/Cargo.toml` | Doble add (AA) | main — rstar 0.12 |
  | `public/wasm/route-calculator/*.wasm` | Delete/modify (DU) | Eliminar — en .gitignore |
  | `public/data/master_routes.json` | Contenido (UU) | PR #365 — timestamp más reciente |
  | `public/data/master_routes.optimized.json` | Contenido (UU) | PR #365 — timestamp más reciente |
  | `public/data/routes-index.json` | Contenido (UU) | PR #365 — timestamp más reciente |

- **Tests post-merge:** 112/112 ✅

---

### PR docs/agent-context-tracking — Documentación de contexto multi-agente
- **Agente:** @claude (`claude-code`)
- **Fecha:** 2026-03-28
- **Branch:** `docs/agent-context-tracking`
- **Estado:** ✅ En revisión
- **Descripción:** Agrega comentarios de contexto y objeto de estudio a todos los archivos
  de instrucciones de agentes: `AGENTS.md`, `CLAUDE.md`, `ARCH_MANIFEST.md`, `.Jules/speedy.md`.
  Crea este archivo `docs/AGENT_TRACKING.md` como registro central.
- **Archivos modificados:**
  - `AGENTS.md` — Bloque de contexto, colaboración cronológica, flujo multi-agente
  - `CLAUDE.md` — Contexto actual post-PR #365, tabla de archivos críticos actualizada,
    nota sobre src/sw.ts (reemplaza public/sw.js)
  - `ARCH_MANIFEST.md` — Encabezado con objeto de estudio y registro de cambios
  - `.Jules/speedy.md` — 2 nuevas entradas de aprendizaje (PR #365 y conflictos de timestamps)
  - `docs/AGENT_TRACKING.md` — Este archivo (nuevo)

---

## Estado del Proyecto (snapshot 2026-03-28)

| Área | Estado |
|------|--------|
| Motor WASM (Nexus Transfer Engine v3.3+) | ✅ Hardened — Zero Any policy |
| Service Worker | ✅ Migrado a TypeScript (`src/sw.ts`) |
| Scripts cliente | ✅ Migrados a `src/scripts/*.ts` |
| CoordinatesStore | ✅ Consolidado en `src/utils/` (duplicado eliminado) |
| Tipos TS/WASM FFI | ✅ `RouteCalculatorModule` + `Journey`/`RouteLeg` en `src/types.ts` |
| WASM artifacts en git | ✅ Excluidos (`.gitignore`) |
| Tests | ✅ 112/112 pasan |

---

## Protocolo Para Próximos Agentes

Antes de iniciar cualquier tarea en este repositorio, leer en orden:

1. **`AGENTS.md`** — Qué agentes existen y cómo se comunican.
2. **`CLAUDE.md`** — Comandos esenciales, archivos críticos, diagnóstico de fallos.
3. **`ARCH_MANIFEST.md`** — Arquitectura vigente y decisiones activas.
4. **Este archivo** — Contexto de PRs recientes para no repetir trabajo.
5. **`docs/adr/`** — ADRs específicos antes de modificar FFI o estructura de tipos.

Si vas a crear un PR nuevo, agrega una entrada en la sección "Historial de PRs" de este archivo.
