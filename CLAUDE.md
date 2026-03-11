# CLAUDE.md — MueveCancun AI Agent Instructions
**Versión:** Nexus Prime v3.3.1 | **Última actualización:** 2026-03-11

## Proyecto

**MueveCancun** es una PWA offline-first para transporte público en Cancún y la Riviera Maya.
Stack: **Astro SSG + Rust/WASM + Leaflet + IndexedDB**
Repositorio: `JULIANJUAREZMX01/MueveCancun`
Branch de desarrollo: siempre `claude/fix-*` o similar; **nunca pushear directo a `main`** sin PR de revisión.

---

## Arquitectura de 4 Capas (Protocolo Nexus)

```
Capa 1: Datos        → public/data/master_routes.json + public/data/routes/*.json
Capa 2: Procesamiento → rust-wasm/route-calculator/src/lib.rs (compilado a WASM)
Capa 3: Presentación  → src/components/, src/pages/ (Astro SSG)
Capa 4: Persistencia  → src/utils/db.ts (IndexedDB + HMAC wallet)
Capa 5: Lib (nueva)  → src/lib/ (idb.ts, sync.ts, telemetry.ts, transport.ts)
```

---

## Comandos Esenciales

```bash
# Desarrollo
pnpm install
pnpm run dev                    # Dev server (incluye prepare-data)

# Tests (SIEMPRE correr antes de commit)
pnpm test                       # Vitest (TS)
cd rust-wasm/route-calculator && cargo test --lib  # Tests Rust (15 tests)

# Build completo
node scripts/build-wasm.mjs    # Compilar Rust → WASM
node scripts/validate-routes.mjs  # Validar datos de rutas
node scripts/optimize-json.mjs   # Pre-optimizar JSON para WASM
node scripts/merge-routes.mjs    # Combinar rutas individuales → master
pnpm build                      # Build Astro SSG completo

# Validación rápida
node scripts/check-wasm.cjs    # Verificar binario WASM existe
node scripts/validate-routes.mjs  # Validar JSON de rutas
```

---

## Archivos Críticos — Leer ANTES de Modificar

| Archivo | Propósito | Riesgo |
|---------|-----------|--------|
| `rust-wasm/route-calculator/src/lib.rs` | Motor de ruteo WASM | Alto — cambios requieren recompilación |
| `public/data/master_routes.json` | Catálogo de rutas | Alto — mal JSON rompe el motor |
| `src/components/RouteCalculator.astro` | UI principal | Medio — leer antes de editar |
| `src/components/InteractiveMap.astro` | Mapa Leaflet | Medio — requestIdleCallback timeout crítico |
| `public/sw.js` | Service Worker PWA v3.2.0-ssg | Medio — afecta caché offline |
| `src/utils/CoordinatesStore.ts` | Base de datos de coordenadas | Bajo |
| `src/lib/idb.ts` | Abstracción IndexedDB | Bajo |
| `src/lib/sync.ts` | Cola de sync offline | Bajo |

---

## Reglas de Datos

1. **Cada parada** en `master_routes.json` DEBE tener `lat`, `lng` con valores reales (no 0,0).
2. **Cada ruta** DEBE tener: `id`, `nombre`, `tarifa` (número), `tipo`, `paradas` (array).
3. **IDs de ruta**: máximo 100 caracteres; usar formato `RUTA_AREA_NNN` (e.g., `R1_ZONA_HOTELERA_001`).
4. **Nombres de paradas**: máximo 100 caracteres; ser descriptivos (incluir colonia o referencia).
5. **Máximos WASM**: 5000 rutas por catálogo, 500 paradas por ruta.
6. Después de editar `master_routes.json`, correr: `node scripts/validate-routes.mjs`.
7. `stop_has_coords()` en Rust requiere AMBAS coordenadas válidas (`lat.abs() > 0.0001 && lng.abs() > 0.0001`).

---

## Lógica de Transbordos (Nexus Transfer Engine v3.3.1)

El motor WASM en `lib.rs` detecta transbordos en 2 pasos:

1. **Pass 1 — Exact match**: busca paradas con el mismo nombre normalizado entre ruta A y ruta B.
2. **Pass 2 — Geo proximity**: si no hay match exacto, busca paradas a ≤350m de distancia (Haversine).

**Sort de resultados**: Forward Direct (score 5) > Reverse Direct (4) > Transfer hub preferido (3) > Transfer geo (2) > precio.

**Hubs preferidos** (definidos en `PREFERRED_HUBS` en `lib.rs`):
- El Crucero, Plaza Las Américas, ADO, Zona Hotelera, Muelle Ultramar, Mercado 23/28, etc.

**Campo `is_forward`**: `true` si el origen viene antes del destino en el orden de paradas.

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

**Fix crítico (v3.3.1)**: `requestIdleCallback` tiene `{ timeout: 2000 }` — sin esto el mapa nunca cargaba cuando WASM mantenía el main thread ocupado.

---

## Módulos de Librería (src/lib/)

| Módulo | Propósito |
|--------|-----------|
| `src/lib/idb.ts` | Abstracción IndexedDB: `put<T>()`, `getAll<T>()`, `remove()` |
| `src/lib/sync.ts` | Cola offline con reintentos exponenciales → `/api/sync` |
| `src/lib/telemetry.ts` | Telemetría opt-in, sin datos personales |
| `src/lib/types.ts` | Tipos TypeScript compartidos (SyncEntry, etc.) |
| `src/lib/transport.ts` | `TRANSPORT_LABELS` + `getTransportLabel()` helper |

---

## Seguridad (No Romper)

- **XSS**: Siempre usar `escapeHtml()` antes de insertar strings en innerHTML.
- **Prototype Pollution**: Usar `Map` en lugar de objetos planos para datos del catálogo.
- **DoS WASM**: El motor tiene límite de 10M ops y 10MB de payload — no aumentar.
- **HMAC Wallet**: `src/utils/db.ts` — la firma HMAC es un deterrente; no remover.
- **CSP**: `MainLayout.astro` define CSP estricto — `connect-src` solo permite `self` y CartoCDN.

---

## Tests Esperados

Al agregar features o fixes, agregar tests en:
- `src/tests/` (Vitest) para código TypeScript
- `src/tests/benchmarks/` para benchmarks de performance
- `rust-wasm/route-calculator/src/lib.rs` sección `#[cfg(test)]` para Rust

Tests mínimos Rust (15 total): `test_find_route_transfer_exact_name`, `test_find_route_transfer_geographic`, `test_haversine_accuracy`, `test_find_route_direct_reverse_deprioritized`.

---

## CI/CD (7 Workflows)

| Workflow | Trigger | Propósito |
|----------|---------|-----------|
| `test.yml` | push/PR | Rust tests → TS tests → validación de rutas → build check |
| `build-wasm.yml` | push a rust-wasm/** | Compilar WASM, correr tests, auto-commit binarios |
| `autocurative.yml` | Lunes 06:00 UTC / data push | Self-healing: merge rutas, geocode, validar, reconstruir |
| `codeql.yml` | push main / PR / jueves | Análisis de seguridad CodeQL |
| `claude-delegation.yml` | workflow_dispatch | Delegar tareas a Claude en ramas no-main |
| `validate-data.yml` | data changes | Validar master_routes.json |

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

Crear PR para revisión antes de merge a `main`.

---

## Diagnóstico Rápido de Fallos

| Síntoma | Causa probable | Fix |
|---------|---------------|-----|
| "Catalog not loaded" en consola | WASM no compilado o JSON inválido | `node scripts/build-wasm.mjs && node scripts/validate-routes.mjs` |
| GPS no funciona | `findNearestWithDistance` falla | Verificar que `coordinatesStore.init()` se llamó antes |
| Transbordos no aparecen | Nombres de paradas sin match | Verificar nombres en catálogo; agregar hub alias |
| Mapa no dibuja ruta | Coordenadas faltantes en paradas | Agregar `lat`/`lng` en `master_routes.json` |
| Mapa atascado en "CARGANDO MAPA..." | `requestIdleCallback` sin timeout | Ya corregido en v3.3.1 — verificar `{ timeout: 2000 }` |
| SW muestra contenido antiguo | Cache version no bumpeada | Incrementar `CACHE_VERSION` en `public/sw.js` |
| Leaflet no carga offline | No estaba en CRITICAL_ASSETS | Ya corregido en v3.2.0-ssg — verificar SW |

