/**
 * POST /api/v1/journey
 *
 * Multimodal journey planner — acepta coordenadas O nombres de paradas.
 * Retorna planes con paradas reales (lat/lng) para trazar en el mapa.
 *
 * Arquitectura:
 *   1. resolveLocation: fuzzy search en catálogo (2384 paradas, 78 rutas)
 *   2. findRoutesBetween: busca rutas reales que conecten origen y destino
 *   3. buildPlan: genera legs con paradas, tarifas reales, ETA con tráfico
 */

import type { APIRoute } from 'astro';
import catalogJson from '../../../../public/data/master_routes.optimized.json';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface JourneyStop {
  nombre: string;
  lat: number;
  lng: number;
  orden?: number;
}

export interface JourneyLeg {
  mode:            string;
  route_id?:       string;
  route_name?:     string;
  from_stop?:      string;
  to_stop?:        string;
  minutes:         number;
  distance_km:     number;
  fare_mxn:        number;
  co2_grams:       number;
  paradas?:        JourneyStop[];
  color?:          string;
  transport_type?: string;
}

export interface JourneyPlan {
  id:              string;
  legs:            JourneyLeg[];
  total_minutes:   number;
  total_fare_mxn:  number;
  total_co2_grams: number;
  eco_score:       number;
  budget_score:    number;
  summary:         string;
  priority_used:   string;
}

interface CatalogStop {
  nombre?: string;
  name?:   string;
  lat:     number;
  lng:     number;
  orden?:  number;
}

interface CatalogRoute {
  id:       string;
  nombre?:  string;
  tarifa?:  number;
  tipo?:    string;
  color?:   string;
  paradas?: CatalogStop[];
}

// ── Constantes de transporte ─────────────────────────────────────────────────

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
  Bus_Urbano: '#0EA5E9', Bus_Urban: '#0EA5E9', Bus_Urbano_Isla: '#0d9488',
  Bus_Foraneo: '#6366F1', Combi_Municipal: '#10B981', Van_Foranea: '#8B5CF6',
  ADO: '#EF4444', PlayaExpress: '#F97316', MotorTaxi: '#F59E0B',
  Caminata: '#94A3B8', Indriver: '#1D4ED8', Uber: '#000000',
};

// ── Utilidades ───────────────────────────────────────────────────────────────

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const f1 = (lat1 * Math.PI) / 180;
  const f2 = (lat2 * Math.PI) / 180;
  const df = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function trafficFactor(h: number): number {
  if (h >= 7 && h <= 9)   return 2.2;
  if (h >= 17 && h <= 19) return 2.5;
  if (h >= 13 && h <= 14) return 1.5;
  if (h >= 20)            return 1.2;
  if (h <= 5)             return 1.0;
  return 1.1;
}

function normText(s: string): string {
  return s.trim().toLowerCase()
    .replace(/[áà]/g, 'a').replace(/[éè]/g, 'e')
    .replace(/[íì]/g, 'i').replace(/[óò]/g, 'o')
    .replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Catálogo (import estático — Vite bundle) ─────────────────────────────────

function getCatalog(): CatalogRoute[] {
  const data = catalogJson as { rutas?: CatalogRoute[] };
  return data.rutas ?? [];
}

// ── Resolver nombre → coordenadas ────────────────────────────────────────────

interface ResolvedLocation {
  lat:  number;
  lng:  number;
  name: string;
}

function resolveLocation(
  query: string | undefined,
  lat?: number,
  lng?: number,
): ResolvedLocation | null {
  const catalog = getCatalog();

  // Coordenadas directas → parada más cercana para nombre
  if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
    let bestName = query ?? (lat.toFixed(4) + ',' + lng.toFixed(4));
    let bestDist = Infinity;
    for (const route of catalog) {
      for (const stop of (route.paradas ?? [])) {
        if (!stop.lat || !stop.lng) continue;
        const d = haversineM(lat, lng, stop.lat, stop.lng);
        if (d < bestDist) {
          bestDist = d;
          if (d < 400) bestName = stop.nombre ?? stop.name ?? bestName;
        }
      }
    }
    return { lat, lng, name: bestName };
  }

  if (!query) return null;

  // Búsqueda fuzzy por nombre
  const q = normText(query);
  let bestStop: CatalogStop | null = null;
  let bestScore = 0;

  for (const route of catalog) {
    for (const stop of (route.paradas ?? [])) {
      if (!stop.lat || !stop.lng) continue;
      const raw = (stop.nombre ?? stop.name ?? '').trim();
      const n = normText(raw);
      let score = 0;
      if (n === q)                         score = 100;
      else if (n.startsWith(q))            score = 85;
      else if (n.includes(q))              score = 70;
      else if (q.includes(n) && n.length > 4) score = 50;
      else {
        const words = q.split(' ').filter(w => w.length > 2);
        const hits  = words.filter(w => n.includes(w)).length;
        if (hits > 0) score = (hits / words.length) * 40;
      }
      if (score > bestScore) {
        bestScore = score;
        bestStop  = stop;
      }
    }
  }

  if (bestScore > 20 && bestStop) {
    return {
      lat:  bestStop.lat,
      lng:  bestStop.lng,
      name: bestStop.nombre ?? bestStop.name ?? query,
    };
  }
  return null;
}

// ── Buscar rutas que conectan dos puntos ─────────────────────────────────────

interface RouteSuggestion {
  route:          CatalogRoute;
  fromStop:       CatalogStop;
  toStop:         CatalogStop;
  paradas:        CatalogStop[];
  walkToOrigin:   number;
  walkFromDest:   number;
  score:          number;
}

function findRoutesBetween(
  origLat: number, origLng: number,
  destLat: number, destLng: number,
): RouteSuggestion[] {
  const catalog = getCatalog();
  const suggestions: RouteSuggestion[] = [];
  const WALK_MAX = 1200; // metros

  for (const route of catalog) {
    const paradas = route.paradas ?? [];
    if (paradas.length < 2) continue;

    let bestFrom: CatalogStop | null = null;
    let bestFromDist = WALK_MAX;
    let bestFromIdx  = -1;
    let bestTo: CatalogStop | null = null;
    let bestToDist   = WALK_MAX;
    let bestToIdx    = -1;

    paradas.forEach((stop, idx) => {
      if (!stop.lat || !stop.lng) return;
      const dFrom = haversineM(origLat, origLng, stop.lat, stop.lng);
      const dTo   = haversineM(destLat, destLng, stop.lat, stop.lng);
      if (dFrom < bestFromDist) { bestFromDist = dFrom; bestFrom = stop; bestFromIdx = idx; }
      if (dTo   < bestToDist)   { bestToDist   = dTo;   bestTo   = stop; bestToIdx   = idx; }
    });

    if (!bestFrom || !bestTo) continue;
    if (bestFromIdx === bestToIdx) continue;
    if (bestFromIdx >= bestToIdx)  continue; // sentido inverso

    const slice = paradas.slice(bestFromIdx, bestToIdx + 1);
    suggestions.push({
      route,
      fromStop:     bestFrom,
      toStop:       bestTo,
      paradas:      slice,
      walkToOrigin: bestFromDist,
      walkFromDest: bestToDist,
      score:        1000 - (bestFromDist + bestToDist),
    });
  }

  return suggestions.sort((a, b) => b.score - a.score);
}

// ── Construir plan ───────────────────────────────────────────────────────────

let _planCounter = 0;

function buildPlan(
  s: RouteSuggestion,
  origLat: number, origLng: number,
  destLat: number, destLng: number,
  hour: number,
  priority: string,
): JourneyPlan {
  const { route, fromStop, toStop, paradas, walkToOrigin, walkFromDest } = s;
  const tipo = route.tipo ?? 'Bus_Urbano';
  const legs: JourneyLeg[] = [];
  _planCounter++;

  // Caminata al paradero
  if (walkToOrigin > 60) {
    const wMin = Math.round((walkToOrigin / 1000 / 5) * 60);
    legs.push({
      mode: 'Caminata', route_name: 'Caminar al paradero',
      from_stop: 'Tu ubicacion', to_stop: fromStop.nombre ?? 'Parada',
      minutes: wMin, distance_km: Math.round(walkToOrigin / 10) / 100,
      fare_mxn: 0, co2_grams: 0, color: COLORS['Caminata'], transport_type: 'Caminata',
      paradas: [
        { nombre: 'Tu ubicacion', lat: origLat, lng: origLng, orden: 0 },
        { nombre: fromStop.nombre ?? 'Parada', lat: fromStop.lat, lng: fromStop.lng, orden: 1 },
      ],
    });
  }

  // Distancia real de la ruta (stop-a-stop)
  let routeKm = 0;
  for (let i = 0; i < paradas.length - 1; i++) {
    const a = paradas[i], b = paradas[i + 1];
    if (a.lat && a.lng && b.lat && b.lng)
      routeKm += haversineM(a.lat, a.lng, b.lat, b.lng) / 1000;
  }
  if (routeKm === 0) {
    routeKm = haversineM(fromStop.lat, fromStop.lng, toStop.lat, toStop.lng) / 1000;
  }

  const speed  = (SPEEDS[tipo] ?? 22) / trafficFactor(hour);
  const busMin = Math.max(2, Math.round((routeKm / speed) * 60));
  const fare   = route.tarifa ?? FARES[tipo] ?? 14;
  const color  = route.color ?? COLORS[tipo] ?? '#0EA5E9';

  legs.push({
    mode: tipo,
    route_id:   route.id,
    route_name: route.nombre ?? route.id,
    from_stop:  fromStop.nombre ?? 'Parada origen',
    to_stop:    toStop.nombre   ?? 'Parada destino',
    minutes:    busMin,
    distance_km: Math.round(routeKm * 100) / 100,
    fare_mxn:   fare,
    co2_grams:  Math.round((CO2[tipo] ?? 18) * routeKm),
    color,
    transport_type: tipo,
    paradas: paradas.map((p, i) => ({
      nombre: p.nombre ?? p.name ?? 'Parada',
      lat: p.lat, lng: p.lng, orden: i,
    })),
  });

  // Caminata al destino
  if (walkFromDest > 60) {
    const wMin = Math.round((walkFromDest / 1000 / 5) * 60);
    legs.push({
      mode: 'Caminata', route_name: 'Caminar al destino',
      from_stop: toStop.nombre ?? 'Parada', to_stop: 'Tu destino',
      minutes: wMin, distance_km: Math.round(walkFromDest / 10) / 100,
      fare_mxn: 0, co2_grams: 0, color: COLORS['Caminata'], transport_type: 'Caminata',
      paradas: [
        { nombre: toStop.nombre ?? 'Parada', lat: toStop.lat, lng: toStop.lng, orden: 0 },
        { nombre: 'Tu destino', lat: destLat, lng: destLng, orden: 1 },
      ],
    });
  }

  const totalMin  = legs.reduce((s, l) => s + l.minutes, 0);
  const totalFare = legs.reduce((s, l) => s + l.fare_mxn, 0);
  const totalCo2  = legs.reduce((s, l) => s + l.co2_grams, 0);

  const busLeg = legs.find(l => l.mode !== 'Caminata');
  const summary = (busLeg?.route_name ?? tipo) + ' \u00b7 ' + totalMin + ' min \u00b7 $' + totalFare + ' MXN';

  return {
    id: 'plan_' + route.id + '_' + _planCounter,
    legs,
    total_minutes:   totalMin,
    total_fare_mxn:  totalFare,
    total_co2_grams: totalCo2,
    eco_score:   Math.max(0, Math.round(100 - totalCo2 / 10)),
    budget_score: Math.max(0, Math.round(100 - totalFare)),
    summary,
    priority_used: priority,
  };
}

// ── Handler HTTP ─────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as {
      origin:       { lat?: number; lng?: number; name?: string };
      destination:  { lat?: number; lng?: number; name?: string };
      preferences?: { priority?: string };
    };

    const { origin, destination, preferences } = body;
    const hour     = new Date().getHours();
    const priority = preferences?.priority ?? 'time';

    const orig = resolveLocation(origin.name, origin.lat, origin.lng);
    const dest = resolveLocation(destination.name, destination.lat, destination.lng);

    if (!orig || !dest) {
      return new Response(JSON.stringify({
        plans: [],
        meta:  { error: 'No se pudieron resolver las ubicaciones', origin_resolved: !!orig, dest_resolved: !!dest },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const suggestions = findRoutesBetween(orig.lat, orig.lng, dest.lat, dest.lng);

    let plans: JourneyPlan[] = suggestions
      .slice(0, 8)
      .map(s => buildPlan(s, orig.lat, orig.lng, dest.lat, dest.lng, hour, priority));

    // Ordenar por prioridad
    if (priority === 'cost') plans.sort((a, b) => a.total_fare_mxn - b.total_fare_mxn);
    else if (priority === 'eco') plans.sort((a, b) => b.eco_score - a.eco_score);
    else plans.sort((a, b) => a.total_minutes - b.total_minutes);

    plans = plans.slice(0, 5);

    // Fallback: alternativas privadas si no hay transporte público
    if (plans.length === 0) {
      const distKm = haversineM(orig.lat, orig.lng, dest.lat, dest.lng) / 1000;
      const alts = ['MotorTaxi', 'Indriver', 'Uber'];
      alts.forEach((mode, i) => {
        const speed = (SPEEDS[mode] ?? 30) / trafficFactor(hour);
        const min   = Math.max(3, Math.round((distKm / speed) * 60));
        const fare  = FARES[mode] ?? 45;
        const co2   = Math.round((CO2[mode] ?? 100) * distKm);
        plans.push({
          id: 'alt_' + mode + '_' + i,
          legs: [{
            mode, route_name: mode,
            from_stop: orig.name, to_stop: dest.name,
            minutes: min, distance_km: Math.round(distKm * 100) / 100,
            fare_mxn: fare, co2_grams: co2,
            color: COLORS[mode] ?? '#94A3B8', transport_type: mode,
            paradas: [
              { nombre: orig.name, lat: orig.lat, lng: orig.lng, orden: 0 },
              { nombre: dest.name, lat: dest.lat, lng: dest.lng, orden: 1 },
            ],
          }],
          total_minutes: min, total_fare_mxn: fare, total_co2_grams: co2,
          eco_score: 15, budget_score: Math.max(0, 100 - fare),
          summary: mode + ' \u00b7 ' + min + ' min \u00b7 $' + fare + ' MXN',
          priority_used: priority,
        });
      });
    }

    return new Response(JSON.stringify({
      plans,
      meta: {
        origin:       { name: orig.name, lat: orig.lat, lng: orig.lng },
        destination:  { name: dest.name, lat: dest.lat, lng: dest.lng },
        routes_found: suggestions.length,
        timestamp:    new Date().toISOString(),
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });

  } catch (err) {
    console.error('[journey] ERROR:', err);
    return new Response(JSON.stringify({ error: String(err), plans: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
