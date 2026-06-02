/**
 * src/data/catalog.ts — v3
 *
 * Carga el catálogo de rutas una sola vez por proceso (cold start cache).
 * Usa fetch al CDN propio de Vercel (funciona desde serverless).
 * SIN AbortSignal.timeout (incompatible con Node 18).
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

let _routes: CatalogRoute[] | null = null;
let _loading: Promise<CatalogRoute[]> | null = null;

function fetchWithTimeout(url: string, timeoutMs: number = 8000): Promise<Response> {
  return Promise.race([
    fetch(url),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error('Fetch timeout')), timeoutMs)
    ),
  ]);
}

export async function getCatalogRoutes(): Promise<CatalogRoute[]> {
  if (_routes !== null) return _routes;
  if (_loading !== null) return _loading;

  _loading = (async (): Promise<CatalogRoute[]> => {
    const baseUrl = process.env.SITE_URL
      ?? (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : null)
      ?? 'https://mueve-cancun-sigma.vercel.app';

    const url = baseUrl + '/data/master_routes.optimized.json';

    try {
      const res = await fetchWithTimeout(url, 8000);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = (await res.json()) as { rutas?: CatalogRoute[] };
      _routes = data.rutas ?? [];
      console.log('[catalog] Loaded', _routes.length, 'routes from', url);
      return _routes;
    } catch (err) {
      console.error('[catalog] fetch failed:', String(err), 'from', url);
      _routes = [];
      return _routes;
    }
  })();

  const result = await _loading;
  _loading = null;
  return result;
}

export function getCatalogSync(): CatalogRoute[] {
  return _routes ?? [];
}

export function getCatalogStopCount(): number {
  return (_routes ?? []).reduce((n, r) => n + (r.paradas?.length ?? 0), 0);
}
