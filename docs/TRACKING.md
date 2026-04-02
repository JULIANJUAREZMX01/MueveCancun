# TRACKING.md — Bitácora Unificada de Seguimiento entre Agentes

<!--
  OBJETO DE ESTUDIO GENERAL
  ==========================
  MueveCancun es un proyecto de aprendizaje real con impacto social.
  Julián Alexander Juárez Alvarado construye esta app para aprender:
  - Desarrollo full-stack moderno (Rust, TypeScript, Astro, WASM)
  - Arquitectura PWA offline-first
  - CI/CD con GitHub Actions
  - Seguridad web (XSS, DoS, prototype pollution)
  - Gestión de proyectos con Git (ramas, PRs, merges)

  Este archivo consolida el seguimiento de todos los agentes en un solo lugar.
-->

> Última actualización: 2026-03-28 · Versión: 1.0.0 (Nexus Prime v3.3)

---

## 📋 Registro Cronológico de Cambios por Agente

| Fecha      | Agente         | Área            | Descripción                                    | Estado   |
|------------|----------------|-----------------|------------------------------------------------|----------|
| 2025-03-02 | speedy         | WASM/Rust       | Optimización match_stop O(N)→O(1) — 36,480×   | ✅ Done  |
| 2026-02-18 | claude-code    | Limpieza        | Análisis completo, 40+ archivos removidos      | ✅ Done  |
| 2026-03-02 | speedy         | TypeScript      | Dedup rutas O(N²)→O(1) con Set                 | ✅ Done  |
| 2026-03-04 | speedy         | UI/Assets       | Inline SVGs vía Icon.astro                     | ✅ Done  |
| 2026-03-10 | claude-code    | PWA             | Nexus Prime v3.3 — producción estable          | ✅ Done  |
| 2026-03-28 | claude-code    | Fix/Review      | Revisiones Copilot PR #366 corregidas          | ✅ Done  |
| 2026-03-28 | claude-code    | Documentación   | Objetos de estudio en MDs de agentes           | ✅ Done  |
| 2026-03-28 | copilot        | CI/Docs         | Test isolation (vi.stubGlobal), Tailwind docs corregidos, scripts temporales eliminados, spatial-index build fix — ver [ADR-2026-003](adr/ADR-2026-003.md) | ⏳ En merge |

---

## 🎯 Objeto de Estudio por Módulo

### Módulo 1 — Rust/WASM (Motor de Ruteo)
- **Objetivo**: Entender cómo compilar Rust a WebAssembly y exponerlo al browser.
- **Archivos clave**: `rust-wasm/route-calculator/src/lib.rs`, `scripts/build-wasm.mjs`
- **Concepto central**: `#[wasm_bindgen]` expone funciones Rust como JS; el estado del catálogo
  vive en un `Mutex<Option<Catalog>>` global para acceso thread-safe.
- **Aprendizaje principal**: Un HashMap para lookups O(1) es 36,000× más rápido que
  iterar arrays con comparación fuzzy.

### Módulo 2 — Astro SSG + TypeScript (Presentación)
- **Objetivo**: Construir UI reactiva sin framework pesado; componentes declarativos.
- **Archivos clave**: `src/components/RouteCalculator.astro`, `src/components/InteractiveMap.astro`
- **Concepto central**: Los componentes se comunican mediante `CustomEvent` — sin estado global.
- **Aprendizaje principal**: `escapeHtml()` es obligatorio en cualquier string interpolado en innerHTML.

### Módulo 3 — PWA / Service Worker (Offline)
- **Objetivo**: Que la app funcione sin internet en zonas con mala señal (Cancún periférico).
- **Archivos clave**: `public/sw.js`
- **Concepto central**: Cache-First para tiles de mapa; Network-First para datos de rutas.
- **Aprendizaje principal**: Incrementar `CACHE_VERSION` al actualizar assets; de lo contrario,
  los usuarios siguen viendo la versión antigua indefinidamente.

### Módulo 4 — IndexedDB + HMAC (Persistencia)
- **Objetivo**: Almacenar saldo de usuario sin backend ni base de datos remota.
- **Archivos clave**: `src/utils/db.ts`
- **Concepto central**: HMAC como firma de integridad del saldo — disuade manipulación directa.
- **Aprendizaje principal**: La criptografía del lado cliente no es seguridad absoluta,
  es un deterrente; sirve para un MVP educativo.

### Módulo 5 — CI/CD con GitHub Actions
- **Objetivo**: Automatizar tests, builds y despliegue para no romper producción.
- **Archivos clave**: `.github/workflows/`
- **Concepto central**: Cada PR debe pasar tests + build-wasm + validate-data + CodeQL antes del merge.
- **Aprendizaje principal**: El workflow `autocurative` corre cada lunes para detectar
  regresiones silenciosas antes que los usuarios.

---

## 🔄 Flujo de Trabajo entre Agentes

```
                     ┌─────────────────────────────┐
                     │     Julián (Desarrollador)   │
                     │   Hace la petición / revisa  │
                     └────────────┬────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
      ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
      │  claude-code │   │    speedy    │   │  autocurative    │
      │  (Features,  │   │  (Perf,      │   │  (Health check   │
      │   Fixes, Doc)│   │   Refactor)  │   │   semanal)       │
      └──────┬───────┘   └──────┬───────┘   └────────┬─────────┘
             │                  │                     │
             └──────────────────┴─────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │  PR → CI verde → Merge│
                    │  rama: claude/* o     │
                    │  copilot/*            │
                    └───────────────────────┘
```

---

## 📚 Glosario de Conceptos (para Julián)

| Término | Explicación simple |
|---------|-------------------|
| **WASM** | Rust compilado a código binario que el browser ejecuta casi tan rápido como C. |
| **PWA** | App web que se instala en el celular y funciona sin internet. |
| **Service Worker** | Script que intercepta peticiones de red; el "guardián offline". |
| **IndexedDB** | Base de datos del browser; persiste aunque cierres la pestaña. |
| **HMAC** | Firma criptográfica para detectar si alguien manipuló un valor almacenado. |
| **CustomEvent** | Mensaje que un componente web lanza y otro puede escuchar, sin imports. |
| **Circuit-breaker** | Límite que para el programa si consume demasiados recursos (DoS prevención). |
| **Prototype Pollution** | Ataque que modifica el prototipo base de objetos JS; se previene con `Map`. |
| **O(1) / O(N)** | Velocidad de un algoritmo: O(1) = siempre igual de rápido, O(N) = más lento con más datos. |
| **SSG** | Static Site Generator: Astro genera HTML en build-time, no en cada petición. |

---

## ✅ Checklist de Calidad por PR

Antes de hacer merge, verificar:

- [ ] `pnpm test` — todos los tests pasan
- [ ] `cargo test --lib` — tests Rust pasan (si se modificó `lib.rs`)
- [ ] `node scripts/validate-routes.mjs` — JSON válido (si se modificó `master_routes.json`)
- [ ] No hay archivos `.wasm` nuevos commiteados en tareas JS/TS
- [ ] Todo `innerHTML` con datos externos usa `escapeHtml()`
- [ ] CI verde (todas las checks de GitHub Actions)
- [ ] PR tiene descripción del problema, fix y tests
- [ ] Tests nuevos usan `vi.stubGlobal()` + `vi.unstubAllGlobals()` en afterEach (no mutación directa de globalThis)
- [ ] Documentación actualizada si hay cambios de arquitectura (crear o actualizar ADR en `docs/adr/`)

---

## 📂 Índice de ADRs

| ID | Título | Fecha | Estado |
|----|--------|-------|--------|
| [ADR-2026-002](adr/ADR-2026-002.md) | Astro Islands + Rust/WASM + Web Components/Lit | 2026-03-13 | ✅ Aprobado |
| [ADR-2026-003](adr/ADR-2026-003.md) | CI Hardening, Test Isolation, Limpieza de Artefactos | 2026-03-28 | ✅ Aprobado |
| [ADR-004-Donation-System](adr/ADR-004-Donation-System.md) | Shield Guardian — Sistema de Donación y Sostenibilidad | 2026-04-01 | ✅ Aprobado |

---

## 🔗 Mapa de Inter-comunicación entre Archivos de Agentes

| Archivo | Propósito | Referencia cruzada |
|---------|-----------|-------------------|
| `AGENTS.md` | Registro maestro de agentes y protocolos | → `CLAUDE.md`, `docs/TRACKING.md`, `.Jules/speedy.md` |
| `CLAUDE.md` | Instrucciones de desarrollo para claude-code | → `AGENTS.md`, `docs/TRACKING.md` |
| `docs/TRACKING.md` (este archivo) | Bitácora unificada multi-agente | → Todos los MDs de agentes, `docs/adr/` |
| `.Jules/speedy.md` | Optimizaciones y reglas de oro de speedy | → `AGENTS.md` §Historial, `docs/TRACKING.md` |
| `verification/learning.md` | Lecciones del proceso de verificación | → `docs/TRACKING.md`, `docs/adr/` |
