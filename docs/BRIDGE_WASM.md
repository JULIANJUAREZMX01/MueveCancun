# WASM Bridge Contract — MueveCancún

> Versión: 1.0.0 | Actualizado: 2026-05-09

Documento de referencia para el contrato de datos entre el motor Rust/WASM y el frontend TypeScript/Astro.

---

## Módulo `route-calculator`

**Archivo:** `public/wasm/route-calculator/route_calculator.js` + `.wasm`  
**Build:** `pnpm build:wasm` → `scripts/build-wasm.mjs`

### Funciones exportadas

| Función | Firma | Descripción |
|---------|-------|-------------|
| `load_catalog_core(json: string)` | `(string) → void` | Carga el catálogo de rutas en memoria WASM. Debe llamarse **antes** de `find_route`. Acepta JSON serializado de `master_routes.optimized.json`. |
| `load_catalog(json: string)` | `(string) → void` | Alias legacy de `load_catalog_core`. Se soporta por retrocompatibilidad. |
| `find_route(origin: string, dest: string)` | `(string, string) → string` | Busca rutas entre dos paradas. Devuelve JSON serializado de `Journey[]`. Lanza si el catálogo no fue cargado. |

### Inicialización (TypeScript)

```ts
import { initWasm } from '@/lib/initWasm';

// Carga el módulo WASM + catálogo
const ready = await initWasm();
if (!ready) throw new Error('WASM init failed');

// El módulo queda expuesto en window.WASM_ROUTE_MAP (Record<id, RouteEntry>)
// y window.WASM_ROUTES (RouteEntry[])
```

### Evento de disponibilidad

```ts
window.addEventListener('WASM_ENGINE_READY', (e) => {
  const { routes } = (e as CustomEvent<{ routes: RouteEntry[] }>).detail;
  // routes: array completo del catálogo
});
```

---

## Tipos TypeScript

```ts
// src/lib/initWasm.ts

export interface RouteStop {
  id?: string;
  nombre?: string;   // español
  name?: string;     // inglés / legacy
  lat?: number;
  lng?: number;
  orden?: number;
}

export interface RouteEntry {
  id: string;
  nombre?: string;
  name?: string;
  color?: string;        // hex #RRGGBB
  color_id?: string;     // clave en paleta caribeña
  tipo?: string;         // Bus_Urbano | Bus_Foraneo | Van_Foranea | Combi_Municipal | Bus_Urban
  tipo_transporte?: string;
  transport_type?: string;
  tarifa?: number;       // MXN
  paradas?: RouteStop[];
}

export interface JourneyLeg {
  route_id?: string;
  route_name?: string;
  origin_stop?: string;
  dest_stop?: string;
  price?: number;
  color?: string;
  color_id?: string;
  transport_type?: string;
  paradas?: RouteStop[];  // enriquecido por enrichJourneyLegs()
}

export interface Journey {
  id?: string;
  type?: string;      // "Direct" | "Transfer"
  total_price?: number;
  legs: JourneyLeg[];
}
```

---

## Catálogo de Rutas

**Archivo fuente:** `public/data/master_routes.json`  
**Versión optimizada (producción):** `public/data/master_routes.optimized.json`

### Estructura

```json
{
  "metadata": {
    "version": "3.8.0",
    "source": "merge-routes.ts (78 routes from 41 files)",
    "color_strategy": "color_id_map_v2 — 21 paleta caribeña"
  },
  "rutas": [ /* RouteEntry[] */ ]
}
```

### Flujo de actualización del catálogo

```
1. Editar archivos fuente en public/data/routes/*.json
2. pnpm scripts/merge-routes.ts    → regenera master_routes.json
3. pnpm scripts/validate-routes.ts → 0 errores
4. pnpm scripts/optimize-json.ts   → regenera master_routes.optimized.json
5. git commit + push → Vercel redeploy automático
```

---

## Eventos CustomEvent (window)

| Evento | Dirección | Payload |
|--------|-----------|---------|
| `WASM_ENGINE_READY` | WASM→UI | `{ routes: RouteEntry[] }` |
| `SHOW_ROUTE_ON_MAP` | Calc→Map | `{ journey: Journey }` |
| `ROUTE_CALCULATED` | Calc→Analytics | `{ count: number; origin: string; dest: string }` |
| `MAP_SET_STOP` | Map→Calc | `{ field: 'origin'|'dest'; name: string }` |
| `mc:position` | GPS→Map | `{ lat: number; lng: number; accuracy: number }` |
| `LANGUAGE_CHANGE` | Nav→Map | `{ lang: 'es'|'en' }` |

---

## Paleta de Colores Caribeña (color_id_map_v2)

| color_id | Color hex | Ruta(s) |
|----------|-----------|---------|
| R1 | #FF6B6B | R-1 Zona Hotelera, R-10, R-19 |
| R2 | #4ECDC4 | R-2-94 Villas Otoch, R-28 |
| R31 | #A3E4D7 | R-31 |
| DEFAULT | #94A3B8 | VAN Playa Express, ADO, CR Puerto Juárez |

---

## Seguridad

- El WASM corre en el thread principal del navegador (sin SharedArrayBuffer).
- Los headers `Cross-Origin-Embedder-Policy: require-corp` y `Cross-Origin-Opener-Policy: same-origin` están activos para cumplir los requisitos de WASM.
- El catálogo es público (datos de transporte público, sin PII).

---

## Compatibilidad

| Navegador | Soporte |
|-----------|---------|
| Chrome/Edge 90+ | ✅ Completo |
| Firefox 90+ | ✅ Completo |
| Safari 15.2+ | ✅ Completo |
| Chrome Android 90+ | ✅ Completo |
| iOS Safari 15.2+ | ✅ Completo |
