# AGENTS.md — Sistema Multi-Agente de MueveCancun (Nexus Prime v3.4)

**Misión**: PWA offline-first de transporte público en Cancún. Motor de ruteo en WebAssembly (Rust), sin backend.

---

## Estado de Consolidación (Marzo 2026)
La PWA ha sido consolidada en la versión 3.4, integrando más de 22 ramas de desarrollo. Se ha unificado el catálogo de rutas en un solo `master_routes.json` y se ha optimizado el sistema de páginas dinámicas para eliminar el bloat de build.

### Cambios Clave:
1. **Wallet Prime**: Saldo inicial de $0.00 MXN. Funcionalidad de búsqueda abierta para todos.
2. **Conductor Registration**: Nuevo flujo para que conductores reciban un bono de $180.00 MXN.
3. **Promotional Codes**: Sistema de códigos de descuento (e.g., 'MUEVECANCUN2026').
4. **Nexus Transfer Engine**: Motor WASM optimizado para transbordos geográficos y de nombre.

---

## Protocolo de Comunicación (DOM Events)

Los componentes se comunican mediante `CustomEvent` en el browser:

| Evento | Emisor | Receptor | Payload |
|--------|--------|----------|---------|
| `MAP_SET_STOP` | `InteractiveMap.astro` | `RouteCalculator.astro` | `{ type: 'origin'|'dest', name: string }` |
| `SHOW_ROUTE_ON_MAP` | `RouteCalculator.astro` | `InteractiveMap.astro` | `{ journey: Journey }` |
| `BALANCE_UPDATED` | `wallet.astro` | `RouteCalculator.astro` | `{}` |

---

## Guía de Desarrollo

### WASM Build:
`pnpm build:wasm` (usa wasm-pack para compilar rust-wasm/).

### Data Update:
1. Editar `public/data/master_routes.json`.
2. Ejecutar `pnpm run prepare-data` (merge + optimize).

### Deployment:
El sistema está configurado para Render (SSG). El middleware maneja redirecciones de idioma y completitud de tutorial.
