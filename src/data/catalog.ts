/**
 * src/data/catalog.ts
 *
 * Módulo singleton del catálogo de rutas.
 * Vite bundlea el JSON inline en el servidor — no requiere fs ni fetch.
 */

// @ts-ignore — Vite 7 maneja JSON import nativamente
import rawCatalog from '../../public/data/master_routes.optimized.json';

export interface CatalogStop {
  nombre?: string;
  name?:   string;
  lat:     number;
  lng:     number;
  orden?:  number;
}

export interface CatalogRoute {
  id:       string;
  nombre?:  string;
  tarifa?:  number;
  tipo?:    string;
  color?:   string;
  paradas?: CatalogStop[];
}

const data = rawCatalog as { rutas?: CatalogRoute[] };
export const CATALOG_ROUTES: CatalogRoute[] = data.rutas ?? [];
export const CATALOG_STOP_COUNT = CATALOG_ROUTES.reduce((n, r) => n + (r.paradas?.length ?? 0), 0);
