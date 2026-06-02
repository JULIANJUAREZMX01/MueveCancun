/**
 * POST /api/v1/journey
 *
 * Multimodal journey planner — busca rutas REALES del catálogo.
 * Acepta nombres de paradas o coordenadas {lat,lng}.
 * Retorna plans[] con paradas lat/lng para trazar en el mapa.
 */

import type { APIRoute } from 'astro';
import { getCatalogRoutes, type CatalogRoute, type CatalogStop } from '../../../data/catalog';

// ── Tipos de respuesta ───────────────────────────────────────────────────────

export interface JourneyStop  { nombre: string; lat: number; lng: number; orden?: number }
export interface JourneyLeg   {
  mode: string; route_id?: string; route_name?: string;
  from_stop?: string; to_stop?: string; minutes: number;
  distance_km: number; fare_mxn: number; co2_grams: number;
  paradas?: JourneyStop[]; color?: string; transport_type?: string;
}
export interface JourneyPlan  {
  id: string; legs: JourneyLeg[]; total_minutes: number;
  total_fare_mxn: number; total_co2_grams: number;
  eco_score: number; budget_score: number; summary: string; priority_used: string;
}

// ── Constantes de transporte ─────────────────────────────────────────────────

const SPEEDS: Record<string, number> = {
  Bus_Urbano: 22, Bus_Urban: 22, Bus_Urbano_Isla: 22, Bus_Foraneo: 55,
  Combi_Municipal: 14, Van_Foranea: 25,
  Caminata: 0, MotorTaxi: 20, Indriver: 45, Uber: 55,
};
const COLORS: Record<string, string> = {
  Bus_Urbano: '#0EA5E9', Bus_Urban: '#0EA5E9', Bus_Urbano_Isla: '#0d9488',
  Bus_Foraneo: '#6366F1', Combi_Municipal: '#10B981', Van_Foranea: '#8B5CF6',
  Caminata: '#94A3B8', MotorTaxi: '#F59E0B', Indriver: '#1D4ED8', Uber: '#1a1a1a',
};

// ── Utilidades ───────────────────────────────────────────────────────────────

function hmDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const f1 = lat1 * Math.PI / 180, f2 = lat2 * Math.PI / 180;
  const df = (lat2 - lat1) * Math.PI / 180, dl = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function tf(h: number): number {
  if (h >= 7  && h <= 9)  return 2.2;
  if (h >= 17 && h <= 19) return 2.5;
  if (h >= 13 && h <= 14) return 1.5;
  if (h >= 20) return 1.2;
  if (h <= 5)  return 1.0;
  return 1.1;
}

function norm(s: string): string {
  return s.trim().toLowerCase()
    .replace(/[aá]/g, 'a').replace(/[eé]/g, 'e')
    .replace(/[ií]/g, 'i').replace(/[oó]/g, 'o')
    .replace(/[uúü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Resolver nombre → lat/lng ─────────────────────────────────────────────────

interface Loc { lat: number; lng: number; name: string }

async function resolveLocation(
  routes: CatalogRoute[],
  query?: string,
  lat?: number,
  lng?: number
): Promise<Loc | null> {
  if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
    let name = query ?? (lat.toFixed(4) + ',' + lng.toFixed(4));
    let best = Infinity;
    for (const r of routes) {
      for (const p of (r.paradas ?? [])) {
        if (!p.lat || !p.lng) continue;
        const d = hmDist(lat, lng, p.lat, p.lng);
        if (d < best && d < 400) { best = d; name = p.nombre ?? p.name ?? name; }
      }
    }
    return { lat, lng, name };
  }
  if (!query) return null;

  const q = norm(query);
  let bestStop: CatalogStop | null = null;
  let bestScore = 0;

  for (const r of routes) {
    for (const p of (r.paradas ?? [])) {
      if (!p.lat || !p.lng) continue;
      const n = norm(p.nombre ?? p.name ?? '');
      let score = 0;
      if (n === q)                          score = 100;
      else if (n.startsWith(q))             score = 85;
      else if (n.includes(q))               score = 70;
      else if (q.includes(n) && n.length > 4) score = 50;
      else {
        const words = q.split(' ').filter(w => w.length > 2);
        const hits  = words.filter(w => n.includes(w)).length;
        if (hits > 0) score = (hits / words.length) * 40;
      }
      if (score > bestScore) { bestScore = score; bestStop = p; }
    }
  }
  return bestStop ? { lat: bestStop.lat, lng: bestStop.lng, name: bestStop.nombre ?? bestStop.name ?? 'Parada' } : null;
}

// ── Buscar rutas cercanas ────────────────────────────────────────────────────

interface Suggestion {
  route: CatalogRoute;
  fromIdx: number; toIdx: number;
  fromStop: CatalogStop; toStop: CatalogStop;
  dist: number;
}

async function findRoutes(
  routes: CatalogRoute[],
  oLat: number,
  oLng: number,
  dLat: number,
  dLng: number
): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];
  for (const route of routes) {
    const paradas = route.paradas ?? [];
    for (let i = 0; i < paradas.length - 1; i++) {
      for (let j = i + 1; j < paradas.length; j++) {
        const pi = paradas[i], pj = paradas[j];
        if (!pi.lat || !pi.lng || !pj.lat || !pj.lng) continue;

        const d1 = hmDist(oLat, oLng, pi.lat, pi.lng);
        const d2 = hmDist(oLat, oLng, pj.lat, pj.lng);
        const d3 = hmDist(dLat, dLng, pi.lat, pi.lng);
        const d4 = hmDist(dLat, dLng, pj.lat, pj.lng);

        if (d1 < 1000 && d4 < 1000) {
          suggestions.push({
            route, fromIdx: i, toIdx: j,
            fromStop: pi, toStop: pj,
            dist: hmDist(pi.lat, pi.lng, pj.lat, pj.lng),
          });
        }
      }
    }
  }
  return suggestions.sort((a, b) => a.dist - b.dist);
}

// ── Construir plan de viaje ──────────────────────────────────────────────────

let _planId = 0;

async function buildPlan(
  s: Suggestion,
  oLat: number, oLng: number,
  dLat: number, dLng: number,
  hour: number,
  priority: string
): Promise<JourneyPlan> {
  const _n = ++_planId;
  const legs: JourneyLeg[] = [];

  // Pierna 1: Caminata → origen de ruta
  legs.push({
    mode: 'Caminata',
    minutes: Math.ceil(hmDist(oLat, oLng, s.fromStop.lat, s.fromStop.lng) / (1.4 * 60)),
    distance_km: (hmDist(oLat, oLng, s.fromStop.lat, s.fromStop.lng) / 1000).toFixed(1) as any,
    fare_mxn: 0, co2_grams: 0,
    paradas: [
      { nombre: 'Tu origen', lat: oLat, lng: oLng, orden: 0 },
      { nombre: s.fromStop.nombre ?? s.fromStop.name ?? 'Parada', lat: s.fromStop.lat, lng: s.fromStop.lng, orden: 1 },
    ],
  });

  // Pierna 2: Ruta de autobús/transporte
  const paradas_ruta = (s.route.paradas ?? [])
    .slice(s.fromIdx, s.toIdx + 1)
    .filter((p): p is CatalogStop => !!p.lat && !!p.lng)
    .map((p, i) => ({ nombre: p.nombre ?? p.name ?? 'Parada', lat: p.lat, lng: p.lng, orden: i }));

  const distRuta = hmDist(s.fromStop.lat, s.fromStop.lng, s.toStop.lat, s.toStop.lng) / 1000;
  const speed = SPEEDS[s.route.tipo ?? 'Bus_Urbano'] ?? 22;
  const minRuta = Math.ceil(distRuta / (speed / 60));

  legs.push({
    mode: s.route.tipo ?? 'Bus_Urbano',
    route_id: s.route.id,
    route_name: s.route.nombre ?? 'Ruta ' + s.route.id,
    from_stop: s.fromStop.nombre ?? s.fromStop.name,
    to_stop: s.toStop.nombre ?? s.toStop.name,
    minutes: minRuta,
    distance_km: distRuta.toFixed(1) as any,
    fare_mxn: (s.route.tarifa ?? 12.5) * tf(hour),
    co2_grams: Math.round(distRuta * 150),
    paradas: paradas_ruta,
    color: COLORS[s.route.tipo ?? 'Bus_Urbano'],
    transport_type: s.route.tipo,
  });

  // Pierna 3: Caminata → destino
  legs.push({
    mode: 'Caminata',
    minutes: Math.ceil(hmDist(dLat, dLng, s.toStop.lat, s.toStop.lng) / (1.4 * 60)),
    distance_km: (hmDist(dLat, dLng, s.toStop.lat, s.toStop.lng) / 1000).toFixed(1) as any,
    fare_mxn: 0, co2_grams: 0,
    paradas: [
      { nombre: s.toStop.nombre ?? s.toStop.name ?? 'Parada', lat: s.toStop.lat, lng: s.toStop.lng, orden: 0 },
        { nombre: 'Tu destino', lat: dLat, lng: dLng, orden: 1 },
    ],
  });

  const totMin  = legs.reduce((acc, l) => acc + l.minutes, 0);
  const totFare = legs.reduce((acc, l) => acc + l.fare_mxn, 0);
  const totCo2  = legs.reduce((acc, l) => acc + l.co2_grams, 0);
  const busLeg  = legs.find(l => l.mode !== 'Caminata');
  const summary = (busLeg?.route_name ?? 'Transporte') + ' · ' + totMin + ' min · $' + totFare + ' MXN';

  return {
    id: 'plan_' + _n,
    legs, total_minutes: totMin, total_fare_mxn: totFare, total_co2_grams: totCo2,
    eco_score:    Math.max(0, Math.round(100 - totCo2 / 10)),
    budget_score: Math.max(0, Math.round(100 - totFare)),
    summary, priority_used: priority,
  };
}

// ── Endpoint ─────────────────────────────────────────────────────────────────

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

    // FETCH del catálogo
    const routes = await getCatalogRoutes();

    const orig = await resolveLocation(routes, origin.name, origin.lat, origin.lng);
    const dest = await resolveLocation(routes, destination.name, destination.lat, destination.lng);

    if (!orig || !dest) {
      return new Response(JSON.stringify({
        plans: [],
        meta: { error: 'Ubicaciones no resueltas', origin_ok: !!orig, dest_ok: !!dest },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const suggestions = await findRoutes(routes, orig.lat, orig.lng, dest.lat, dest.lng);
    let plans: JourneyPlan[] = [];
    for (const s of suggestions.slice(0, 8)) {
      plans.push(await buildPlan(s, orig.lat, orig.lng, dest.lat, dest.lng, hour, priority));
    }

    if (priority === 'cost')     plans.sort((a, b) => a.total_fare_mxn - b.total_fare_mxn);
    if (priority === 'eco')      plans.sort((a, b) => b.eco_score - a.eco_score);
    if (priority === 'comfort')  plans.sort((a, b) => a.total_minutes - b.total_minutes);

    return new Response(JSON.stringify({
      plans: plans.slice(0, 3),
      meta: {
        origin_name: orig.name, origin_lat: orig.lat, origin_lng: orig.lng,
        destination_name: dest.name, destination_lat: dest.lat, destination_lng: dest.lng,
        routes_found: suggestions.length,
        timestamp: new Date().toISOString(),
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[journey]', err);
    return new Response(JSON.stringify({
      plans: [],
      meta: { error: String(err) },
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
