import { WasmLoader, type RouteCalculatorWasm } from '../utils/WasmLoader';

let _initPromise: Promise<boolean> | null = null;

export async function initWasm(): Promise<boolean> {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      const wasmModule = await WasmLoader.getModule();

      // Cargar catálogo de rutas
      const response = await fetch('/data/master_routes.optimized.json');
      if (!response.ok) throw new Error(`[initWasm] Catalog fetch failed: ${response.status}`);
      const catalogJson = await response.text();
      const catalogData = JSON.parse(catalogJson) as { rutas?: RouteEntry[] };

      // load_catalog es el export real del WASM (confirmado en route_calculator.d.ts)
      if (typeof wasmModule.load_catalog === 'function') {
        wasmModule.load_catalog(catalogJson);
        console.log('[initWasm] Catalog loaded via load_catalog ✅');
      } else {
        console.warn('[initWasm] load_catalog not found in WASM module');
      }

      // Exponer catálogo en window para enrichment de legs
      const rutas: RouteEntry[] = catalogData.rutas ?? [];
      const routeMap: Record<string, RouteEntry> = {};
      for (const r of rutas) {
        if (r.id) routeMap[r.id] = r;
        const normName = (r.nombre ?? r.name ?? '').toLowerCase().trim();
        if (normName) routeMap[normName] = r;
      }

      if (typeof window !== 'undefined') {
        window.WASM_READY = true;
        window.WASM_ROUTE_MAP = routeMap;
        window.WASM_ROUTES = rutas;
        window.dispatchEvent(new CustomEvent('WASM_ENGINE_READY', { detail: { routes: rutas } }));
      }

      console.log('[initWasm] ENGINE READY —', rutas.length, 'routes loaded');
      return true;
    } catch (error) {
      console.error('[initWasm] ERROR:', error);
      _initPromise = null;
      return false;
    }
  })();

  return _initPromise;
}

// ── Types ───────────────────────────────────────────────────────────────────

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

// ── Resolución de nombres de parada ─────────────────────────────────────────

export function resolveStopName(query: string): string {
  const rutas: RouteEntry[] = typeof window !== 'undefined'
    ? window.WASM_ROUTES ?? []
    : [];
  if (!rutas.length) return query;

  const norm = (s: string) => s.trim().toLowerCase()
    .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i')
    .replace(/ó/g,'o').replace(/ú/g,'u').replace(/ü/g,'u').replace(/ñ/g,'n');

  const q = norm(query);
  let best: { name: string; score: number } | null = null;

  for (const r of rutas) {
    for (const p of (r as any).paradas ?? []) {
      const raw = (p.nombre ?? p.name ?? '').trim();
      if (!raw) continue;
      const n = norm(raw);
      let score = 0;
      if (n === q)              score = 100;
      else if (n.startsWith(q)) score = 80;
      else if (n.includes(q))   score = 60;
      else if (q.includes(n) && n.length > 4) score = 50;
      else {
        const tokens = q.split(/\s+/);
        const matched = tokens.filter(t => t.length > 3 && n.includes(t)).length;
        if (matched > 0) score = matched * 15;
      }
      if (score > (best?.score ?? 0)) best = { name: raw, score };
    }
  }

  return best && best.score >= 25 ? best.name : query;
}

// ── Enriquecimiento de legs ──────────────────────────────────────────────────

export function enrichJourneyLegs(journey: Journey): Journey {
  const routeMap = (typeof window !== 'undefined' ? window.WASM_ROUTE_MAP : null) ?? {};
  if (!journey?.legs?.length) return journey;

  const enriched: Journey = { ...journey };
  enriched.legs = journey.legs.map((leg) => {
    if (leg.color && leg.paradas?.length) return leg;

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

// Auto-init en cliente
if (typeof window !== 'undefined') {
  initWasm().catch(() => {});
}
