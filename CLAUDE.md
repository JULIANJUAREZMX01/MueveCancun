# CLAUDE.md — MueveCancun AI Agent Instructions

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

| Archivo | Propósito | Riesgo |
|---------|-----------|--------|
| `rust-wasm/route-calculator/src/lib.rs` | Motor de ruteo WASM | Alto — cambios requieren recompilación |
| `public/data/master_routes.json` | Catálogo de rutas | Alto — mal JSON rompe el motor |
| `src/components/RouteCalculator.astro` | UI principal (~60KB) | Medio — leer antes de editar |
| `src/components/InteractiveMap.astro` | Mapa Leaflet | Medio |
| `public/sw.js` | Service Worker PWA | Medio — afecta caché offline |
| `src/utils/CoordinatesStore.ts` | Base de datos de coordenadas | Bajo |

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

| Síntoma | Causa probable | Fix |
|---------|---------------|-----|
| "Catalog not loaded" en consola | WASM no compilado o JSON inválido | `node scripts/build-wasm.mjs && node scripts/validate-routes.mjs` |
| GPS no funciona | `findNearestWithDistance` falla | Verificar que `coordinatesStore.init()` se llamó antes |
| Transbordos no aparecen | Nombres de paradas sin match | Verificar nombres en catálogo; agregar hub alias |
| Mapa no dibuja ruta | Coordenadas faltantes en paradas | Agregar `lat`/`lng` en `master_routes.json` |
| SW muestra contenido antiguo | Cache version no bumpeada | Incrementar `CACHE_VERSION` en `public/sw.js` |
