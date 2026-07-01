/**
 * src/data/catalog.ts — v4 FIXED
 *
 * En Vercel serverless, import estático de public/ NO funciona.
 * Solución: Fetch lazy con cache a nivel de módulo.
 * El archivo está disponible en el CDN de Vercel, accesible desde el edge/serverless.
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

/**
 * Obtener catálogo de forma asincrónica con cache automático.
 */
export async function getCatalogRoutes(): Promise<CatalogRoute[]> {
  // Si ya está en caché, devolver inmediatamente
  if (_routes !== null) return _routes;

  // Si está cargando, esperar el resultado
  if (_loading !== null) return _loading;

  // Iniciar carga
  _loading = (async (): Promise<CatalogRoute[]> => {
    try {
      // Construir URL absoluta del sitio
      const siteUrl = process.env.SITE_URL || process.env.VERCEL_URL || 'https://mueve-cancun-sigma.vercel.app';
      const baseUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
      const catalogUrl = `${baseUrl}/data/master_routes.optimized.json`;

      const response = await fetch(catalogUrl, {
        signal: AbortSignal.timeout(10000),
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`[catalog] HTTP ${response.status} from ${catalogUrl}`);
        _routes = [];
        return _routes;
      }

      const data = (await response.json()) as { rutas?: CatalogRoute[] };
      _routes = data.rutas ?? [];

      const stopCount = _routes.reduce((n, r) => n + (r.paradas?.length ?? 0), 0);
      console.log(`[catalog] ✅ Loaded ${_routes.length} routes, ${stopCount} stops from CDN`);

      return _routes;
    } catch (error) {
      console.error('[catalog] fetch error:', error);
      _routes = [];
      return _routes;
    }
  })();

  return _loading;
}

/**
 * Obtener catálogo de forma sincrónica (solo si ya cargado).
 */
export function getCatalogSync(): CatalogRoute[] {
  return _routes ?? [];
}

/**
 * Contar total de paradas (informativo).
 */
export function getCatalogStopCount(): number {
  return (_routes ?? []).reduce((n, r) => n + (r.paradas?.length ?? 0), 0);
}
