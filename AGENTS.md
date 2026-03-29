# AGENTS.md — Sistema Multi-Agente de MueveCancun

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
rama claude/* → tests pasan → PR a main → CI verde → merge
```

Cada PR debe incluir: descripción del problema, fix implementado, tests que lo prueban.
