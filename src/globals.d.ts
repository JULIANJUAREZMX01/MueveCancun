// MueveCancún — Global Window augmentation
// Provee tipos para las propiedades globales que se montan en window

import type * as L from 'leaflet';
import type { RouteEntry } from './lib/initWasm';

declare global {
  interface Window {
    /** true después de que initWasm() termina exitosamente */
    WASM_READY: boolean;
    /** Mapa id/nombre→RouteEntry cargado desde master_routes.optimized.json */
    WASM_ROUTE_MAP: Record<string, RouteEntry>;
    /** Array de todas las rutas del catálogo */
    WASM_ROUTES: RouteEntry[];
    /** Instancia global de Leaflet (cargada dinámicamente en loadLeaflet()) */
    L: typeof L;
  }
}

export {};
