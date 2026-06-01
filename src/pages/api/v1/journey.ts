/**
 * POST /api/v1/journey
 *
 * Multimodal journey planner — acepta coordenadas O nombres de paradas.
 * Retorna planes con paradas reales para trazar en el mapa.
 */

import type { APIRoute } from 'astro';

export interface JourneyRequest {
  origin:      { lat?: number; lng?: number; name?: string };
  destination: { lat?: number; lng?: number; name?: string };
  preferences?: {
    priority?: 'time' | 'cost' | 'eco';
    max_fare_mxn?: number;
  };
}

export interface JourneyLeg {
  mode:         string;
  route_id?:    string;
  route_name?:  string;
  from_stop?:   string;
  to_stop?:     string;
  minutes:      number;
  distance_km:  number;
  fare_mxn:     number;
  co2_grams:    number;
  paradas?:     Array<{ nombre: string; lat: number; lng: number; orden?: number }>;
  color?:       string;
  transport_type?: string;
}

export interface JourneyPlan {
  id:             string;
  legs:           JourneyLeg[];
  total_minutes:  number;
  total_fare_mxn: number;
  total_co2_grams:number;
  eco_score:      number;
  budget_score:   number;
  summary:        string;
  priority_used:  string;
  origin_name?:   string;
  dest_name?:     string;
}

// ── Constantes de transporte ────────────────────────────────────────────────

const SPEEDS: Record<string, number> = {
  Bus_Urbano: 22, Bus_Urban: 22, Bus_Urbano_Isla: 22, Bus_Foraneo: 55,
  Combi_Municipal: 28, Van_Foranea: 35, Transporte: 25,
  Bus: 22, Combi: 28, Van: 35, ADO: 55, PlayaExpress: 45,
  MotorTaxi: 30, Bicicleta: 15, Caminata: 5, Indriver: 40, Uber: 40,
};
const CO2: Record<string, number> = {
  Bus_Urbano: 18, Bus_Urban: 18, Bus_Urbano_Isla: 18, Bus_Foraneo: 25,
  Combi_Municipal: 35, Van_Foranea: 45,
  Bus: 18, Combi: 35, Van: 45, ADO: 25, PlayaExpress: 20, MotorTaxi: 60,
  Bicicleta: 0, Caminata: 0, Indriver: 130, Uber: 130,
};
const FARES: Record<string, number> = {
  Bus_Urbano: 14, Bus_Urban: 14, Bus_Urbano_Isla: 14, Bus_Foraneo: 45,
  Combi_Municipal: 14, Van_Foranea: 25,
  Bus: 14, Combi: 14, Van: 25, ADO: 42, PlayaExpress: 25, MotorTaxi: 20,
  Bicicleta: 0, Caminata: 0, Indriver: 45, Uber: 55,
};
const COLORS: Record<string, string> = {
  Bus_Urbano: '#0EA5E9', Bus_Urban: '#0EA5E9', Bus_Urbano_Isla: '#0EA5E9',
  Bus_Foraneo: '#6366F1', Combi_Municipal: '#10B981', Van_Foranea: '#8B5CF6',
  ADO: '#EF4444', PlayaExpress: '#F97316', MotorTaxi: '#F59E0B',
};

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const f1 = (lat1 * Math.PI) / 180, f2 = (lat2 * Math.PI) / 180;
  const df = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function trafficFactor(h: number): number {
  if (h >= 7 && h <= 9) return 2.2;
  if (h >= 17 && h <= 19) return 2.5;
  if (h >= 13 && h <= 14) return 1.5;
  if (h >= 20) return 1.2;
  if (h <= 5) return 1.0;
  return 1.1;
}

// ── Carga del catálogo de rutas ─────────────────────────────────────────────

interface CatalogStop { nombre?: string; name?: string; lat: number; lng: number; orden?: number }
interface CatalogRoute {
  id: string; nombre?: string; tarifa?: number; tipo?: string;
  color?: string; paradas?: CatalogStop[];
}

let catalogCache: CatalogRoute[] | null = null;

async function getCatalog(): Promise<CatalogRoute[]> {
  if (catalogCache) return catalogCache;
  try {
    const res = await fetch('https://mueve-cancun-sigma.vercel.app/data/master_routes.optimized.json');
    if (!res.ok) throw new Error('catalog fetch failed');
    const data = await res.json() as { rutas?: CatalogRoute[] };
    catalogCache = data.rutas ?? [];
  } catch {
    catalogCache = [];
  }
  return catalogCache;
}

// Normalizar texto para búsqueda fuzzy
function norm(s: string): string {
  return s.trim().toLowerCase()
    .replace(/[áà]/g,'a').replace(/[éè]/g,'e').replace(/[íì]/g,'i')
    .replace(/[óò]/g,'o').replace(/[úùü]/g,'u').replace(/ñ/g,'n')
    .replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
}

// Resolver nombre de parada → coordenadas + ruta más cercana
async function resolveLocation(query: string | undefined, lat?: number, lng?: number): Promise<{
  lat: number; lng: number; name: string; nearestStop?: CatalogStop; nearestRoute?: CatalogRoute;
} | null> {
  
  // Si ya tiene coordenadas válidas, usarlas
  if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
    // Buscar parada más cercana para enriquecer
    const catalog = await getCatalog();
    let bestStop: CatalogStop | undefined;
    let bestRoute: CatalogRoute | undefined;
    let bestDist = Infinity;
    
    for (const route of catalog) {
      for (const stop of (route.paradas ?? [])) {
        if (!stop.lat || !stop.lng) continue;
        const d = haversine(lat, lng, stop.lat, stop.lng);
        if (d < bestDist) {
          bestDist = d;
          bestStop = stop;
          bestRoute = route;
        }
      }
    }
    return { 
      lat, lng, 
      name: query ?? bestStop?.nombre ?? \`${lat.toFixed(4)},${lng.toFixed(4)}\`,
      nearestStop: bestDist < 500 ? bestStop : undefined,
      nearestRoute: bestDist < 500 ? bestRoute : undefined,
    };
  }

  // Resolver por nombre de texto
  if (!query) return null;
  const catalog = await getCatalog();
  const q = norm(query);
  
  let bestStop: CatalogStop | undefined;
  let bestRoute: CatalogRoute | undefined;
  let bestScore = 0;

  for (const route of catalog) {
    for (const stop of (route.paradas ?? [])) {
      if (!stop.lat || !stop.lng) continue;
      const raw = (stop.nombre ?? stop.name ?? '').trim();
      const n = norm(raw);
      let score = 0;
      if (n === q) score = 100;
      else if (n.startsWith(q)) score = 85;
      else if (n.includes(q)) score = 70;
      else if (q.includes(n) && n.length > 4) score = 50;
      else {
        // Fuzzy: cuántas palabras del query están en el stop
        const qWords = q.split(' ').filter(w => w.length > 2);
        const matches = qWords.filter(w => n.includes(w)).length;
        if (matches > 0) score = (matches / qWords.length) * 40;
      }
      if (score > bestScore) {
        bestScore = score;
        bestStop = stop;
        bestRoute = route;
      }
    }
  }

  if (bestScore > 20 && bestStop) {
    return {
      lat: bestStop.lat,
      lng: bestStop.lng,
      name: bestStop.nombre ?? bestStop.name ?? query,
      nearestStop: bestStop,
      nearestRoute: bestRoute,
    };
  }
  return null;
}

// ── Buscar rutas que conectan dos puntos ────────────────────────────────────

interface RouteSuggestion {
  route: CatalogRoute;
  fromStop: CatalogStop;
  toStop: CatalogStop;
  paradas: CatalogStop[];
  walkToOrigin: number;  // metros
  walkFromDest: number;  // metros
  score: number;
}

async function findRoutesBetween(
  origLat: number, origLng: number,
  destLat: number, destLng: number
): Promise<RouteSuggestion[]> {
  const catalog = await getCatalog();
  const suggestions: RouteSuggestion[] = [];
  const WALK_THRESHOLD = 1200; // metros máx para caminar a una parada

  for (const route of catalog) {
    const paradas = route.paradas ?? [];
    if (paradas.length < 2) continue;

    // Encontrar parada más cercana al origen
    let bestFrom: CatalogStop | null = null;
    let bestFromDist = WALK_THRESHOLD;
    let bestFromIdx = -1;

    // Encontrar parada más cercana al destino
    let bestTo: CatalogStop | null = null;
    let bestToDist = WALK_THRESHOLD;
    let bestToIdx = -1;

    paradas.forEach((stop, idx) => {
      if (!stop.lat || !stop.lng) return;
      const dFrom = haversine(origLat, origLng, stop.lat, stop.lng);
      const dTo   = haversine(destLat, destLng, stop.lat, stop.lng);
      
      if (dFrom < bestFromDist) {
        bestFromDist = dFrom; bestFrom = stop; bestFromIdx = idx;
      }
      if (dTo < bestToDist) {
        bestToDist = dTo; bestTo = stop; bestToIdx = idx;
      }
    });

    if (!bestFrom || !bestTo || bestFromIdx === bestToIdx) continue;
    // Asegurar sentido correcto de la ruta
    if (bestFromIdx >= bestToIdx) continue;

    const paradasSlice = paradas.slice(bestFromIdx, bestToIdx + 1);
    const score = 1000 - (bestFromDist + bestToDist);

    suggestions.push({
      route,
      fromStop: bestFrom,
      toStop: bestTo,
      paradas: paradasSlice,
      walkToOrigin: bestFromDist,
      walkFromDest: bestToDist,
      score,
    });
  }

  return suggestions.sort((a, b) => b.score - a.score);
}

// ── Builder de planes ───────────────────────────────────────────────────────

function buildPlan(
  suggestion: RouteSuggestion,
  origLat: number, origLng: number,
  destLat: number, destLng: number,
  hour: number,
  priority: string
): JourneyPlan {
  const { route, fromStop, toStop, paradas, walkToOrigin, walkFromDest } = suggestion;
  const tipo = route.tipo ?? 'Bus_Urbano';
  const legs: JourneyLeg[] = [];

  // Leg de caminata al origen (si >50m)
  if (walkToOrigin > 50) {
    const walkMin = (walkToOrigin / 1000 / 5) * 60;
    legs.push({
      mode: 'Caminata',
      route_name: 'Caminar al paradero',
      from_stop: 'Tu ubicación',
      to_stop: fromStop.nombre ?? 'Parada',
      minutes: Math.round(walkMin),
      distance_km: walkToOrigin / 1000,
      fare_mxn: 0,
      co2_grams: 0,
      paradas: [
        { nombre: 'Tu ubicación', lat: origLat, lng: origLng, orden: 0 },
        { nombre: fromStop.nombre ?? 'Parada', lat: fromStop.lat, lng: fromStop.lng, orden: 1 },
      ],
      color: '#94A3B8',
      transport_type: 'Caminata',
    });
  }

  // Calcular distancia de la ruta
  let routeDistKm = 0;
  for (let i = 0; i < paradas.length - 1; i++) {
    const a = paradas[i], b = paradas[i + 1];
    if (a.lat && a.lng && b.lat && b.lng)
      routeDistKm += haversine(a.lat, a.lng, b.lat, b.lng) / 1000;
  }
  if (routeDistKm === 0) {
    routeDistKm = haversine(fromStop.lat, fromStop.lng, toStop.lat, toStop.lng) / 1000;
  }

  const speed = (SPEEDS[tipo] ?? 22) / trafficFactor(hour);
  const busMin = (routeDistKm / speed) * 60;
  const fare = route.tarifa ?? FARES[tipo] ?? 14;

  legs.push({
    mode: tipo,
    route_id: route.id,
    route_name: route.nombre ?? route.id,
    from_stop: fromStop.nombre ?? 'Parada origen',
    to_stop: toStop.nombre ?? 'Parada destino',
    minutes: Math.max(3, Math.round(busMin)),
    distance_km: Math.round(routeDistKm * 100) / 100,
    fare_mxn: fare,
    co2_grams: Math.round((CO2[tipo] ?? 18) * routeDistKm),
    paradas: paradas.map((p, i) => ({ nombre: p.nombre ?? 'Parada', lat: p.lat, lng: p.lng, orden: i })),
    color: route.color ?? COLORS[tipo] ?? '#0EA5E9',
    transport_type: tipo,
  });

  // Leg de caminata al destino (si >50m)
  if (walkFromDest > 50) {
    const walkMin = (walkFromDest / 1000 / 5) * 60;
    legs.push({
      mode: 'Caminata',
      route_name: 'Caminar al destino',
      from_stop: toStop.nombre ?? 'Parada',
      to_stop: 'Tu destino',
      minutes: Math.round(walkMin),
      distance_km: walkFromDest / 1000,
      fare_mxn: 0,
      co2_grams: 0,
      paradas: [
        { nombre: toStop.nombre ?? 'Parada', lat: toStop.lat, lng: toStop.lng, orden: 0 },
        { nombre: 'Tu destino', lat: destLat, lng: destLng, orden: 1 },
      ],
      color: '#94A3B8',
      transport_type: 'Caminata',
    });
  }

  const totalMin = legs.reduce((s, l) => s + l.minutes, 0);
  const totalFare = legs.reduce((s, l) => s + l.fare_mxn, 0);
  const totalCo2 = legs.reduce((s, l) => s + l.co2_grams, 0);

  const ecoScore   = Math.max(0, 100 - (totalCo2 / 10));
  const budgetScore = Math.max(0, 100 - totalFare);

  const routeMinBus = legs.find(l => l.mode !== 'Caminata');
  const summary = `${route.nombre ?? tipo} · ${totalMin} min · $${totalFare} MXN · ${totalCo2}g CO₂`;

  return {
    id: `plan_${route.id}_${Date.now()}`,
    legs,
    total_minutes: totalMin,
    total_fare_mxn: totalFare,
    total_co2_grams: totalCo2,
    eco_score: Math.round(ecoScore),
    budget_score: Math.round(budgetScore),
    summary,
    priority_used: priority,
  };
}

// ── Endpoint principal ──────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as JourneyRequest;
    const { origin, destination, preferences } = body;
    const hour = new Date().getHours();
    const priority = preferences?.priority ?? 'time';

    // Resolver ubicaciones
    const [orig, dest] = await Promise.all([
      resolveLocation(origin.name, origin.lat, origin.lng),
      resolveLocation(destination.name, destination.lat, destination.lng),
    ]);

    if (!orig || !dest) {
      return new Response(JSON.stringify({
        error: 'No se pudieron resolver las ubicaciones',
        plans: [],
        meta: { origin_resolved: !!orig, dest_resolved: !!dest }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Buscar rutas entre los dos puntos
    const suggestions = await findRoutesBetween(orig.lat, orig.lng, dest.lat, dest.lng);

    // Generar planes (top 5)
    let plans: JourneyPlan[] = suggestions
      .slice(0, 8)
      .map(s => buildPlan(s, orig.lat, orig.lng, dest.lat, dest.lng, hour, priority));

    // Ordenar por prioridad
    if (priority === 'cost') plans.sort((a,b) => a.total_fare_mxn - b.total_fare_mxn);
    else if (priority === 'eco') plans.sort((a,b) => b.eco_score - a.eco_score);
    else plans.sort((a,b) => a.total_minutes - b.total_minutes);

    plans = plans.slice(0, 5);

    // Si no hay rutas directas, agregar alternativas (mototaxi, indriver)
    if (plans.length === 0) {
      const distKm = haversine(orig.lat, orig.lng, dest.lat, dest.lng) / 1000;
      const modes = ['MotorTaxi', 'Indriver', 'Uber'];
      modes.forEach((mode, i) => {
        const speed = (SPEEDS[mode] ?? 30) / trafficFactor(hour);
        const min = Math.round((distKm / speed) * 60);
        const fare = FARES[mode] ?? 45;
        plans.push({
          id: `alt_${mode}_${i}`,
          legs: [{
            mode, route_name: mode,
            from_stop: orig.name, to_stop: dest.name,
            minutes: min, distance_km: Math.round(distKm * 100) / 100,
            fare_mxn: fare, co2_grams: Math.round((CO2[mode] ?? 100) * distKm),
            color: COLORS[mode] ?? '#94A3B8',
            transport_type: mode,
            paradas: [
              { nombre: orig.name, lat: orig.lat, lng: orig.lng, orden: 0 },
              { nombre: dest.name, lat: dest.lat, lng: dest.lng, orden: 1 },
            ],
          }],
          total_minutes: min,
          total_fare_mxn: fare,
          total_co2_grams: Math.round((CO2[mode] ?? 100) * distKm),
          eco_score: 20,
          budget_score: Math.max(0, 100 - fare),
          summary: `${mode} · ${min} min · $${fare} MXN`,
          priority_used: priority,
        });
      });
    }

    return new Response(JSON.stringify({
      plans,
      meta: {
        origin:      { name: orig.name, lat: orig.lat, lng: orig.lng },
        destination: { name: dest.name, lat: dest.lat, lng: dest.lng },
        routes_found: suggestions.length,
        timestamp: new Date().toISOString(),
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });

  } catch (err) {
    console.error('[journey] ERROR:', err);
    return new Response(JSON.stringify({ error: String(err), plans: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
