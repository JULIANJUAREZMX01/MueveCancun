import { WasmLoader, type RouteCalculatorWasm } from '../utils/WasmLoader';

let _initPromise: Promise<boolean> | null = null;

export async function initWasm(): Promise<boolean> {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      const wasmModule = (await WasmLoader.getModule()) as unknown as RouteCalculatorWasm;

      const response = await fetch('/data/master_routes.optimized.json');
      if (!response.ok) throw new Error('Catalog missing');
      const catalogJson = await response.text();
      const catalogData = JSON.parse(catalogJson) as { rutas?: RouteEntry[] };

      if (typeof wasmModule.load_catalog_core === 'function') {
        wasmModule.load_catalog_core(catalogJson);
      } else if (typeof (wasmModule as unknown as Record<string, unknown>).load_catalog === 'function') {
        (wasmModule as unknown as { load_catalog: (j: string) => void }).load_catalog(catalogJson);
      }

      // Exponer catálogo como mapa id→route para enriquecer legs en JS
      const rutas: RouteEntry[] = catalogData.rutas ?? [];
      const routeMap: Record<string, RouteEntry> = {};
      for (const r of rutas) {
        if (r.id) routeMap[r.id] = r;
        const normName = (r.nombre ?? '').toLowerCase().trim();
        if (normName) routeMap[normName] = r;
      }

      if (typeof window !== 'undefined') {
        (window as unknown as { WASM_READY: boolean }).WASM_READY = true;
        (window as Record<string, unknown>).WASM_ROUTE_MAP = routeMap;
        (window as Record<string, unknown>).WASM_ROUTES = rutas;
        window.dispatchEvent(new CustomEvent('WASM_ENGINE_READY', { detail: { routes: rutas } }));
      }

      console.log('[initWasm] ENGINE READY —', rutas.length, 'routes');
      return true;
    } catch (error) {
      console.error('[initWasm] ERROR:', error);
      _initPromise = null;
      return false;
    }
  })();

  return _initPromise;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface RouteStop {
  id?: string;
  nombre?: string;
  name?: string;
  lat?: number;
  lng?: number;
  orden?: number;
}

export interface RouteEntry {
  id: string;
  nombre?: string;
  name?: string;
  color?: string;
  color_id?: string;
  tipo?: string;
  tipo_transporte?: string;
  transport_type?: string;
  tarifa?: number;
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
  paradas?: RouteStop[];
}

export interface Journey {
  id?: string;
  type?: string;
  total_price?: number;
  legs: JourneyLeg[];
}

// ── Enrichment helper ──────────────────────────────────────────────────────

/**
 * Enriquece los legs de un Journey con color, paradas y tipo_transporte del catálogo.
 * Seguro de llamar antes de que WASM_ROUTE_MAP esté disponible (no-op en ese caso).
 */
export function enrichJourneyLegs(journey: Journey): Journey {
  const routeMap = (window as unknown as Record<string, Record<string, RouteEntry>>).WASM_ROUTE_MAP ?? {};
  if (!journey?.legs?.length) return journey;

  const enriched: Journey = { ...journey };
  enriched.legs = journey.legs.map((leg) => {
    if (leg.color && leg.paradas?.length) return leg; // Ya enriquecido

    const route: RouteEntry | undefined =
      routeMap[leg.route_id ?? ''] ??
      routeMap[(leg.route_name ?? '').toLowerCase().trim()];

    if (!route) return leg;

    const stops: RouteStop[] = route.paradas ?? [];
    let sliced: RouteStop[] = stops;

    if (stops.length > 0 && (leg.origin_stop || leg.dest_stop)) {
      const origin = (leg.origin_stop ?? '').toLowerCase().split(' ')[0];
      const dest   = (leg.dest_stop   ?? '').toLowerCase().split(' ')[0];
      const oi = stops.findIndex((s) => (s.nombre ?? s.name ?? '').toLowerCase().includes(origin));
      const di = stops.findIndex((s) => (s.nombre ?? s.name ?? '').toLowerCase().includes(dest));
      if (oi !== -1 && di !== -1) {
        const [from, to] = oi <= di ? [oi, di] : [di, oi];
        sliced = stops.slice(from, to + 1);
      }
    }

    return {
      ...leg,
      color:          leg.color          ?? route.color          ?? '#0EA5E9',
      color_id:       leg.color_id       ?? route.color_id       ?? 'DEFAULT',
      transport_type: leg.transport_type ?? route.tipo           ?? route.tipo_transporte ?? 'Bus_Urban',
      paradas:        leg.paradas?.length ? leg.paradas : sliced,
    };
  });

  return enriched;
}

if (typeof window !== 'undefined') {
  initWasm().catch(() => {});
}
