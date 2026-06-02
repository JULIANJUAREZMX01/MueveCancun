/**
 * src/data/catalog.ts — v2 FIXED
 *
 * Carga el catálogo de rutas una sola vez por proceso (cold start cache).
 * Usa fetch al CDN propio de Vercel (funciona desde serverless).
 * Fallback: URL hardcodeada del sitio.
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

export async function getCatalogRoutes(): Promise<CatalogRoute[]> {
  if (_routes !== null) return _routes;
  if (_loading !== null) return _loading;

  _loading = (async (): Promise<CatalogRoute[]> => {
    const baseUrl = process.env.SITE_URL
      ?? (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : null)
      ?? 'https://mueve-cancun-sigma.vercel.app';

    const url = baseUrl + '/data/master_routes.optimized.json';

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = (await res.json()) as { rutas?: CatalogRoute[] };
      _routes = data.rutas ?? [];
      console.log('[catalog] Loaded', _routes.length, 'routes from CDN');
      return _routes;
    } catch (err) {
      console.error('[catalog] fetch failed:', err);
      _routes = [];
      return _routes;
    }
  })();

  const result = await _loading;
  _loading = null;
  return result;
}

// Función sincrónica para compatibilidad (devuelve lo que está cacheado)
export function getCatalogSync(): CatalogRoute[] {
  return _routes ?? [];
}

// Total de paradas cacheadas (informativo)
export function getCatalogStopCount(): number {
  return (_routes ?? []).reduce((n, r) => n + (r.paradas?.length ?? 0), 0);
}
