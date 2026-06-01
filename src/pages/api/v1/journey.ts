/**
 * POST /api/v1/journey
 *
 * Multimodal journey planner — busca rutas REALES del catálogo de Cancún.
 * Acepta nombres de paradas o coordenadas.
 * Retorna plans[] con paradas lat/lng para trazar en el mapa.
 */

import type { APIRoute } from 'astro';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface JourneyStop {
  nombre: string;
  lat:    number;
  lng:    number;
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

// ── Constantes ───────────────────────────────────────────────────────────────

const SPEEDS: Record<string, number> = {
  Bus_Urbano: 22, Bus_Urban: 22, Bus_Urbano_Isla: 22, Bus_Foraneo: 55,
  Combi_Municipal: 28, Van_Foranea: 35, Transporte: 25,
  MotorTaxi: 30, Bicicleta: 15, Caminata: 5, Indriver: 40, Uber: 40,
};

const CO2: Record<string, number> = {
  Bus_Urbano: 18, Bus_Urban: 18, Bus_Urbano_Isla: 18, Bus_Foraneo: 25,
  Combi_Municipal: 35, Van_Foranea: 45,
  Caminata: 0, Bicicleta: 0, MotorTaxi: 60, Indriver: 130, Uber: 130,
};

const FARES: Record<string, number> = {
  Bus_Urbano: 14, Bus_Urban: 14, Bus_Urbano_Isla: 14, Bus_Foraneo: 45,
  Combi_Municipal: 14, Van_Foranea: 25,
  Caminata: 0, MotorTaxi: 20, Indriver: 45, Uber: 55,
};

const COLORS: Record<string, string> = {
  Bus_Urbano: '#0EA5E9', Bus_Urban: '#0EA5E9', Bus_Urbano_Isla: '#0d9488',
  Bus_Foraneo: '#6366F1', Combi_Municipal: '#10B981', Van_Foranea: '#8B5CF6',
  Caminata: '#94A3B8', MotorTaxi: '#F59E0B', Indriver: '#1D4ED8', Uber: '#1a1a1a',
};

// ── Catálogo ─────────────────────────────────────────────────────────────────

let _catalog: CatalogRoute[] | null = null;

function getCatalog(): CatalogRoute[] {
  if (_catalog) return _catalog;
  try {
    // En SSR con @astrojs/node, __dirname no existe — usar fileURLToPath
    const here = dirname(fileURLToPath(import.meta.url));
    // El public/ está 4 niveles arriba: src/pages/api/v1/ -> src/pages/api -> src/pages -> src -> raíz
    const catalogPath = join(here, '../../../../public/data/master_routes.optimized.json');
    const raw = readFileSync(catalogPath, 'utf-8');
    const data = JSON.parse(raw) as { rutas?: CatalogRoute[] };
    _catalog = data.rutas ?? [];
  } catch (e) {
    console.error('[journey] getCatalog error:', e);
    _catalog = [];
  }
  return _catalog;
}

// ── Utilidades ───────────────────────────────────────────────────────────────

function hmDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const f1 = lat1 * Math.PI / 180;
  const f2 = lat2 * Math.PI / 180;
  const df = (lat2 - lat1) * Math.PI / 180;
  const dl = (lng2 - lng1) * Math.PI / 180;
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
    .replace(/[áà]/g, 'a').replace(/[éè]/g, 'e')
    .replace(/[íì]/g, 'i').replace(/[óò]/g, 'o')
    .replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Resolver ubicación ───────────────────────────────────────────────────────

interface Loc { lat: number; lng: number; name: string }

function resolveLocation(query?: string, lat?: number, lng?: number): Loc | null {
  const catalog = getCatalog();

  if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
    let name = query ?? (lat.toFixed(4) + ',' + lng.toFixed(4));
    let bestD = Infinity;
    for (const r of catalog) {
      for (const p of (r.paradas ?? [])) {
        if (!p.lat || !p.lng) continue;
        const d = hmDist(lat, lng, p.lat, p.lng);
        if (d < bestD && d < 400) { bestD = d; name = p.nombre ?? p.name ?? name; }
      }
    }
    return { lat, lng, name };
  }

  if (!query) return null;

  const q = norm(query);
  let bestStop: CatalogStop | null = null;
  let bestScore = 0;

  for (const r of catalog) {
    for (const p of (r.paradas ?? [])) {
      if (!p.lat || !p.lng) continue;
      const raw = (p.nombre ?? p.name ?? '').trim();
      const n = norm(raw);
      let score = 0;
      if (n === q)                        score = 100;
      else if (n.startsWith(q))           score = 85;
      else if (n.includes(q))             score = 70;
      else if (q.includes(n) && n.length > 4) score = 50;
      else {
        const words = q.split(' ').filter(w => w.length > 2);
        const hits  = words.filter(w => n.includes(w)).length;
        if (hits > 0) score = (hits / words.length) * 40;
      }
      if (score > bestScore) { bestScore = score; bestStop = p; }
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

// ── Buscar rutas ─────────────────────────────────────────────────────────────

interface Suggestion {
  route: CatalogRoute; fromStop: CatalogStop; toStop: CatalogStop;
  paradas: CatalogStop[]; walkA: number; walkB: number; score: number;
}

function findRoutes(oLat: number, oLng: number, dLat: number, dLng: number): Suggestion[] {
  const catalog = getCatalog();
  const results: Suggestion[] = [];
  const MAX_WALK = 1200;

  for (const route of catalog) {
    const stops = route.paradas ?? [];
    if (stops.length < 2) continue;

    let fStop: CatalogStop | null = null, fDist = MAX_WALK, fIdx = -1;
    let tStop: CatalogStop | null = null, tDist = MAX_WALK, tIdx = -1;

    stops.forEach((s, i) => {
      if (!s.lat || !s.lng) return;
      const da = hmDist(oLat, oLng, s.lat, s.lng);
      const db = hmDist(dLat, dLng, s.lat, s.lng);
      if (da < fDist) { fDist = da; fStop = s; fIdx = i; }
      if (db < tDist) { tDist = db; tStop = s; tIdx = i; }
    });

    if (!fStop || !tStop || fIdx < 0 || tIdx < 0) continue;
    if (fIdx === tIdx || fIdx >= tIdx) continue;

    results.push({
      route, fromStop: fStop, toStop: tStop,
      paradas: stops.slice(fIdx, tIdx + 1),
      walkA: fDist, walkB: tDist,
      score: 1000 - fDist - tDist,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

// ── Construir plan ───────────────────────────────────────────────────────────

let _n = 0;

function buildPlan(
  s: Suggestion,
  oLat: number, oLng: number,
  dLat: number, dLng: number,
  hour: number, priority: string,
): JourneyPlan {
  const { route, fromStop, toStop, paradas, walkA, walkB } = s;
  const tipo  = route.tipo ?? 'Bus_Urbano';
  const color = route.color ?? COLORS[tipo] ?? '#0EA5E9';
  const fare  = route.tarifa ?? FARES[tipo] ?? 14;
  const legs: JourneyLeg[] = [];
  _n++;

  if (walkA > 60) {
    const wm = Math.round((walkA / 1000 / 5) * 60);
    legs.push({
      mode: 'Caminata', route_name: 'Caminar al paradero',
      from_stop: 'Tu ubicacion', to_stop: fromStop.nombre ?? 'Parada',
      minutes: wm, distance_km: Math.round(walkA) / 1000,
      fare_mxn: 0, co2_grams: 0, color: COLORS['Caminata'], transport_type: 'Caminata',
      paradas: [
        { nombre: 'Tu ubicacion', lat: oLat, lng: oLng, orden: 0 },
        { nombre: fromStop.nombre ?? 'Parada', lat: fromStop.lat, lng: fromStop.lng, orden: 1 },
      ],
    });
  }

  let km = 0;
  for (let i = 0; i < paradas.length - 1; i++) {
    const a = paradas[i], b = paradas[i + 1];
    if (a.lat && a.lng && b.lat && b.lng) km += hmDist(a.lat, a.lng, b.lat, b.lng) / 1000;
  }
  if (km < 0.01) km = hmDist(fromStop.lat, fromStop.lng, toStop.lat, toStop.lng) / 1000;

  const spd = (SPEEDS[tipo] ?? 22) / tf(hour);
  const min = Math.max(2, Math.round((km / spd) * 60));

  legs.push({
    mode: tipo, route_id: route.id,
    route_name:     route.nombre ?? route.id,
    from_stop:      fromStop.nombre ?? 'Parada origen',
    to_stop:        toStop.nombre   ?? 'Parada destino',
    minutes:        min,
    distance_km:    Math.round(km * 100) / 100,
    fare_mxn:       fare,
    co2_grams:      Math.round((CO2[tipo] ?? 18) * km),
    color, transport_type: tipo,
    paradas: paradas.map((p, i) => ({
      nombre: p.nombre ?? p.name ?? 'Parada',
      lat: p.lat, lng: p.lng, orden: i,
    })),
  });

  if (walkB > 60) {
    const wm = Math.round((walkB / 1000 / 5) * 60);
    legs.push({
      mode: 'Caminata', route_name: 'Caminar al destino',
      from_stop: toStop.nombre ?? 'Parada', to_stop: 'Tu destino',
      minutes: wm, distance_km: Math.round(walkB) / 1000,
      fare_mxn: 0, co2_grams: 0, color: COLORS['Caminata'], transport_type: 'Caminata',
      paradas: [
        { nombre: toStop.nombre ?? 'Parada', lat: toStop.lat, lng: toStop.lng, orden: 0 },
        { nombre: 'Tu destino', lat: dLat, lng: dLng, orden: 1 },
      ],
    });
  }

  const totMin  = legs.reduce((acc, l) => acc + l.minutes, 0);
  const totFare = legs.reduce((acc, l) => acc + l.fare_mxn, 0);
  const totCo2  = legs.reduce((acc, l) => acc + l.co2_grams, 0);
  const busLeg  = legs.find(l => l.mode !== 'Caminata');
  const summary = (busLeg?.route_name ?? tipo) + ' · ' + totMin + ' min · $' + totFare + ' MXN';

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

    const orig = resolveLocation(origin.name, origin.lat, origin.lng);
    const dest = resolveLocation(destination.name, destination.lat, destination.lng);

    if (!orig || !dest) {
      return new Response(JSON.stringify({
        plans: [],
        meta: { error: 'Ubicaciones no resueltas', origin_ok: !!orig, dest_ok: !!dest },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const suggestions = findRoutes(orig.lat, orig.lng, dest.lat, dest.lng);
    let plans: JourneyPlan[] = suggestions
      .slice(0, 8)
      .map(s => buildPlan(s, orig.lat, orig.lng, dest.lat, dest.lng, hour, priority));

    if (priority === 'cost')    plans.sort((a, b) => a.total_fare_mxn - b.total_fare_mxn);
    else if (priority === 'eco') plans.sort((a, b) => b.eco_score - a.eco_score);
    else                         plans.sort((a, b) => a.total_minutes - b.total_minutes);

    plans = plans.slice(0, 5);

    if (plans.length === 0) {
      const km = hmDist(orig.lat, orig.lng, dest.lat, dest.lng) / 1000;
      ['MotorTaxi', 'Indriver', 'Uber'].forEach((mode, i) => {
        const speed = (SPEEDS[mode] ?? 30) / tf(hour);
        const min   = Math.max(3, Math.round((km / speed) * 60));
        const fare  = FARES[mode] ?? 45;
        plans.push({
          id: 'alt_' + i,
          legs: [{
            mode, route_name: mode, from_stop: orig.name, to_stop: dest.name,
            minutes: min, distance_km: Math.round(km * 100) / 100,
            fare_mxn: fare, co2_grams: Math.round((CO2[mode] ?? 100) * km),
            color: COLORS[mode] ?? '#94A3B8', transport_type: mode,
            paradas: [
              { nombre: orig.name, lat: orig.lat, lng: orig.lng, orden: 0 },
              { nombre: dest.name, lat: dest.lat, lng: dest.lng, orden: 1 },
            ],
          }],
          total_minutes: min, total_fare_mxn: fare,
          total_co2_grams: Math.round((CO2[mode] ?? 100) * km),
          eco_score: 15, budget_score: Math.max(0, 100 - fare),
          summary: mode + ' · ' + min + ' min · $' + fare + ' MXN',
          priority_used: priority,
        });
      });
    }

    return new Response(JSON.stringify({
      plans,
      meta: {
        origin: { name: orig.name, lat: orig.lat, lng: orig.lng },
        destination: { name: dest.name, lat: dest.lat, lng: dest.lng },
        routes_found: suggestions.length,
        ts: new Date().toISOString(),
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

  } catch (err) {
    console.error('[journey] ERROR:', err);
    return new Response(
      JSON.stringify({ error: String(err), plans: [] }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
