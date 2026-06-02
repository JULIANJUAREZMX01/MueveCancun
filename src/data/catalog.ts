/**
 * src/data/catalog.ts — v3 FIXED
 *
 * Carga el catálogo de rutas una sola vez por proceso (cold start cache).
 * Usa fetch al CDN del sitio propio (funciona desde serverless Vercel/Render).
 * Fallback: archivo estático se sirve automáticamente en /data/
 */

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

// Cache a nivel de módulo — persiste entre requests en el mismo contenedor
let _routes: CatalogRoute[] | null = null;
let _loading: Promise<CatalogRoute[]> | null = null;

/**
 * Obtener catálogo de rutas de forma asincrónica.
 * Cacheado automáticamente a nivel de módulo.
 */
export async function getCatalogRoutes(): Promise<CatalogRoute[]> {
  if (_routes !== null) return _routes;
  if (_loading !== null) return _loading;

  _loading = (async (): Promise<CatalogRoute[]> => {
    // URL del archivo estático servido por el sitio
    // Funciona en SSR/serverless porque es fetch a CDN externo
    const url = '/data/master_routes.optimized.json';

    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} loading catalog`);
      }

      const data = (await res.json()) as { rutas?: CatalogRoute[] };
      _routes = data.rutas ?? [];

      console.log(
        `[catalog] Loaded ${_routes.length} routes, ${_routes.reduce((n, r) => n + (r.paradas?.length ?? 0), 0)} stops`
      );

      return _routes;
    } catch (err) {
      console.error('[catalog] Load failed:', err instanceof Error ? err.message : String(err));
      _routes = [];
      return _routes;
    }
  })();

  try {
    return await _loading;
  } finally {
    _loading = null;
  }
}

/**
 * Obtener catálogo de forma sincrónica (solo si ya está cargado).
 * Usado para compatibilidad, pero getCatalogRoutes() es preferido.
 */
export function getCatalogSync(): CatalogRoute[] {
  return _routes ?? [];
}

/**
 * Total de paradas en el catálogo.
 */
export function getCatalogStopCount(): number {
  return (_routes ?? []).reduce((n, r) => n + (r.paradas?.length ?? 0), 0);
}
