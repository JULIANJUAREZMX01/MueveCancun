# CLAUDE.md — MueveCancun AI Agent Instructions

<!--
  OBJETO DE ESTUDIO — CLAUDE (claude-code)
  =========================================
  Agente principal de desarrollo. Opera en ramas claude/* y copilot/*.
  Nunca hace push directo a main.

  CONTEXTO ACTUAL (actualizado: 2026-03-28):
  - Versión: 1.0.0 (Nexus Prime v3.3+)
  - PR #365 merged (Jules): Hardening estricto de tipos TS/WASM, migración de sw.js → src/sw.ts,
    migración de public/js/*.js → src/scripts/*.ts. Elimina src/lib/CoordinatesStore.ts duplicado.
  - Post-PR #365: Los artefactos WASM (public/wasm/route-calculator/*.js/.d.ts/.wasm) están en
    .gitignore y NO se deben commitear. Solo se generan en build/CI.
  - Service Worker: Ahora vive en src/sw.ts (TypeScript), NO en public/sw.js.
  - Scripts cliente: Ahora viven en src/scripts/*.ts, NO en public/js/*.

  ORDEN DE SEGUIMIENTO (historial de ramas claude/*):
  - copilot/fix-pr-365-conflicts: Resolución de 9 conflictos del merge de PR #365.
  - docs/agent-context-tracking: Documentación de contexto y tracking multi-agente (este PR).

  REFERENCIA CRUZADA:
  → AGENTS.md para protocolo de comunicación entre agentes.
  → docs/AGENT_TRACKING.md para historial completo de PRs.
  → ARCH_MANIFEST.md para decisiones de arquitectura vigentes.
-->

## Proyecto

**MueveCancun** es una PWA offline-first para transporte público en Cancún y la Riviera Maya.
Stack: **Astro SSG + Rust/WASM + Leaflet + IndexedDB**
Repositorio: `JULIANJUAREZMX01/MueveCancun`
Branch de desarrollo: siempre `claude/fix-*` o similar; **nunca pushear directo a `main`**.

---

## Arquitectura de 4 Capas (Protocolo Nexus)

```
Capa 1: Datos        → public/data/master_routes.json + public/data/routes/*.json
Capa 2: Procesamiento → rust-wasm/route-calculator/src/lib.rs (compilado a WASM)
Capa 3: Presentación  → src/components/, src/pages/ (Astro SSG)
Capa 4: Persistencia  → src/utils/db.ts (IndexedDB + HMAC wallet)
```

---

## Comandos Esenciales

```bash
# Desarrollo
pnpm install
pnpm run dev                    # Dev server (incluye optimize-json)

# Tests (SIEMPRE correr antes de commit)
pnpm test                       # Vitest (TS)
cd rust-wasm/route-calculator && cargo test --lib  # Tests Rust

# Build completo
node scripts/build-wasm.mjs    # Compilar Rust → WASM
node scripts/validate-routes.mjs  # Validar datos de rutas
node scripts/optimize-json.mjs   # Pre-optimizar JSON para WASM
pnpm build                      # Build Astro SSG completo

# Validación rápida
node scripts/check-wasm.cjs    # Verificar binario WASM existe
node scripts/validate-routes.mjs  # Validar JSON de rutas
```

---

## Archivos Críticos — Leer ANTES de Modificar

<!-- Post-PR #365: sw.js migrado a src/sw.ts; public/js/*.js migrados a src/scripts/*.ts -->

| Archivo | Propósito | Riesgo |
|---------|-----------|--------|
| `rust-wasm/route-calculator/src/lib.rs` | Motor de ruteo WASM | Alto — cambios requieren recompilación |
| `public/data/master_routes.json` | Catálogo de rutas | Alto — mal JSON rompe el motor |
| `src/components/RouteCalculator.astro` | UI principal (~60KB) | Medio — leer antes de editar |
| `src/components/InteractiveMap.astro` | Mapa Leaflet | Medio |
| `src/sw.ts` | Service Worker PWA (TypeScript) | Medio — afecta caché offline |
| `src/utils/CoordinatesStore.ts` | Base de datos de coordenadas | Bajo |
| `src/utils/WasmLoader.ts` | FFI TypeScript↔WASM (tipado estricto) | Medio — ver ADR 003 |
| `src/types.ts` | Tipos consolidados (Journey, RouteLeg, RouteStop) | Bajo — fuente de verdad de tipos |

---

## Reglas de Datos

1. **Cada parada** en `master_routes.json` DEBE tener `lat`, `lng` con valores reales (no 0,0).
2. **Cada ruta** DEBE tener: `id`, `nombre`, `tarifa` (número), `tipo`, `paradas` (array).
3. **IDs de ruta**: máximo 100 caracteres; usar formato `RUTA_AREA_NNN` (e.g., `R1_ZONA_HOTELERA_001`).
4. **Nombres de paradas**: máximo 100 caracteres; ser descriptivos (incluir colonia o referencia).
5. **Máximos WASM**: 5000 rutas por catálogo, 500 paradas por ruta.
6. Después de editar `master_routes.json`, correr: `node scripts/validate-routes.mjs`.

---

## Lógica de Transbordos (Nexus Transfer Engine)

El motor WASM en `lib.rs` detecta transbordos en 2 pasos:

1. **Pass 1 — Exact match**: busca paradas con el mismo nombre normalizado entre ruta A y ruta B.
2. **Pass 2 — Geo proximity**: si no hay match exacto, busca paradas a ≤350m de distancia (Haversine).

**Hubs preferidos** (definidos en `PREFERRED_HUBS` en `lib.rs`):
- El Crucero, Plaza Las Américas, ADO, Zona Hotelera, Muelle Ultramar, Mercado 23/28, etc.

Para agregar un nuevo hub: añadir el nombre (o substring) a `PREFERRED_HUBS` en `lib.rs` y recompilar.

---

## Flujo GPS → Parada

**Antes (roto)**: GPS devolvía `"lat, lng"` como texto en el input → WASM no encontraba nada.
**Ahora (fixed)**:
1. `CoordinatesStore.findNearestWithDistance(lat, lng)` devuelve `{ name, distanceKm }`.
2. Si `distanceKm < 1.0`: se usa el nombre de la parada más cercana.
3. Si no: toast de error con mensaje de ayuda.

---

## Flujo Mapa → Calculador

El `InteractiveMap.astro` emite `CustomEvent('MAP_SET_STOP', { detail: { type: 'origin'|'dest', name } })`.
El `RouteCalculator.astro` escucha ese evento y actualiza los inputs.

---

## Seguridad (No Romper)

- **XSS**: Siempre usar `escapeHtml()` antes de insertar strings en innerHTML.
- **Prototype Pollution**: Usar `Map` en lugar de objetos planos para datos del catálogo.
- **DoS WASM**: El motor tiene límite de 10M ops y 10MB de payload — no aumentar.
- **HMAC Wallet**: `src/utils/db.ts` — la firma HMAC es un deterrente; no remover.

---

## Tests Esperados

Al agregar features o fixes, agregar tests en:
- `src/tests/` (Vitest) para código TypeScript
- `rust-wasm/route-calculator/src/lib.rs` sección `#[cfg(test)]` para Rust

Test mínimo para transfer: `test_find_route_transfer_exact_name` y `test_find_route_transfer_geographic`.

---

## Git Workflow

```bash
# Siempre trabajar en rama claude/*
git checkout -b claude/descripcion-breve-XXXXX

# Commit con mensaje descriptivo
git commit -m "fix(routing): descripción del fix"

# Push
git push -u origin claude/descripcion-breve-XXXXX
```

**Nunca** push a `main` directamente. Siempre crear PR para revisión.

---

## Diagnóstico Rápido de Fallos

<!-- Nota: public/sw.js ya NO existe. El Service Worker vive en src/sw.ts desde PR #365. -->

| Síntoma | Causa probable | Fix |
|---------|---------------|-----|
| "Catalog not loaded" en consola | WASM no compilado o JSON inválido | `node scripts/build-wasm.mjs && node scripts/validate-routes.mjs` |
| GPS no funciona | `findNearestWithDistance` falla | Verificar que `coordinatesStore.init()` se llamó antes |
| Transbordos no aparecen | Nombres de paradas sin match | Verificar nombres en catálogo; agregar hub alias |
| Mapa no dibuja ruta | Coordenadas faltantes en paradas | Agregar `lat`/`lng` en `master_routes.json` |
| SW muestra contenido antiguo | Cache version no bumpeada | Incrementar `CACHE_VERSION` en `src/sw.ts` |
| Error de tipo en WasmLoader | FFI sin tipar | Ver `src/types.ts` y `docs/adr/003-typescript-strict-ffi.md` |
