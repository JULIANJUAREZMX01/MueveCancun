/**
 * POST /api/v1/journey
 *
 * Multimodal journey planner — busca rutas REALES del catálogo.
 * Acepta nombres de paradas o coordenadas {lat,lng}.
 * Retorna plans[] con paradas lat/lng para trazar en el mapa.
 */

import type { APIRoute } from 'astro';
import { getCatalogRoutes, type CatalogRoute, type CatalogStop } from '../../../data/catalog';
import { logger } from '../../../utils/logger';

export const prerender = false;

// ── Tipos de respuesta ───────────────────────────────────────────────────────

export interface JourneyStop {
  nombre: string;
  lat: number;
  lng: number;
  orden?: number;
}

export interface JourneyLeg {
  mode: string;
  route_id?: string;
  route_name?: string;
  from_stop?: string;
  to_stop?: string;
  minutes: number;
  distance_km: number;
  fare_mxn: number;
  co2_grams: number;
  paradas?: JourneyStop[];
  color?: string;
  transport_type?: string;
}

export interface JourneyPlan {
  id: string;
  legs: JourneyLeg[];
  total_minutes: number;
  total_fare_mxn: number;
  total_co2_grams: number;
  eco_score: number;
  budget_score: number;
  summary: string;
  priority_used: string;
}

export interface JourneyResponse {
  plans: JourneyPlan[];
  meta: {
    origin?: { name: string; lat?: number; lng?: number };
    destination?: { name: string; lat?: number; lng?: number };
    origin_ok: boolean;
    dest_ok: boolean;
    routes_found: number;
    error?: string;
  };
}

// ── Constantes de transporte ─────────────────────────────────────────────────

const SPEEDS: Record<string, number> = {
  Bus_Urbano: 22,
  Bus_Urban: 22,
  Bus_Urbano_Isla: 22,
  Bus_Foraneo: 55,
  Combi: 20,
  Taxi: 30,
  Caminata: 5,
  Bicicleta: 15,
};

const FARES: Record<string, number> = {
  Bus_Urbano: 12,
  Bus_Urban: 12,
  Bus_Urbano_Isla: 12,
  Bus_Foraneo: 0, // Calculado por distancia
  Combi: 10,
  Taxi: 0, // Calculado
  Caminata: 0,
  Bicicleta: 0,
};

const EMISSIONS: Record<string, number> = {
  Bus_Urbano: 45, // grams CO2 per km
  Bus_Urban: 45,
  Bus_Urbano_Isla: 45,
  Bus_Foraneo: 55,
  Combi: 100,
  Taxi: 150,
  Caminata: 0,
  Bicicleta: 0,
};

// ── Resolver parada por nombre o coordenadas ─────────────────────────────────

async function resolveStop(
  input: { name?: string; lat?: number; lng?: number } | string,
  routes: CatalogRoute[]
): Promise<{ stop: JourneyStop | null; route_matches?: CatalogRoute[] }> {
  const name = typeof input === 'string' ? input : input.name || '';
  const lat = typeof input !== 'string' ? input.lat : undefined;
  const lng = typeof input !== 'string' ? input.lng : undefined;

  // Si vienen coordenadas, buscar parada más cercana
  if (lat !== undefined && lng !== undefined) {
    let closest: JourneyStop | null = null;
    let minDist = Infinity;

    for (const route of routes) {
      for (const stop of route.paradas ?? []) {
        const dist = Math.hypot(stop.lat - lat, stop.lng - lng);
        if (dist < minDist) {
          minDist = dist;
          closest = {
            nombre: stop.nombre || stop.name || '',
            lat: stop.lat,
            lng: stop.lng,
            orden: stop.orden,
          };
        }
      }
    }

    return { stop: closest && minDist < 1 ? closest : null };
  }

  // Búsqueda por nombre
  if (!name) return { stop: null };

  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let bestMatch: JourneyStop | null = null;
  let matchRoutes: CatalogRoute[] = [];

  for (const route of routes) {
    for (const stop of route.paradas ?? []) {
      const sn = (stop.nombre || stop.name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

      if (sn.includes(normalized) || normalized.includes(sn)) {
        if (!bestMatch || sn.length < (bestMatch.nombre || '').length) {
          bestMatch = {
            nombre: stop.nombre || stop.name || '',
            lat: stop.lat,
            lng: stop.lng,
            orden: stop.orden,
          };
          matchRoutes = [route];
        } else if (sn === (bestMatch.nombre || '').toLowerCase()) {
          matchRoutes.push(route);
        }
      }
    }
  }

  return { stop: bestMatch, route_matches: matchRoutes };
}

// ── Calcular distancia (haversine) ───────────────────────────────────────────

function distance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.asin(Math.sqrt(a));
}

// ── Generar planes de viaje ──────────────────────────────────────────────────

function generatePlans(
  origin: JourneyStop,
  destination: JourneyStop,
  routes: CatalogRoute[]
): JourneyPlan[] {
  const plans: JourneyPlan[] = [];
  const dist = distance(origin.lat, origin.lng, destination.lat, destination.lng);

  // Plan 1: Direct bus (si existe una ruta directa)
  for (const route of routes) {
    const paradas = route.paradas ?? [];
    if (paradas.length < 2) continue;

    const origIdx = paradas.findIndex(
      (p) => Math.hypot(p.lat - origin.lat, p.lng - origin.lng) < 0.05
    );
    const destIdx = paradas.findIndex(
      (p) => Math.hypot(p.lat - destination.lat, p.lng - destination.lng) < 0.05
    );

    if (origIdx >= 0 && destIdx > origIdx) {
      const segment = paradas.slice(origIdx, destIdx + 1);
      const routeDist = segment.reduce((sum, p, i) => {
        if (i === 0) return sum;
        const prev = segment[i - 1];
        return sum + distance(prev.lat, prev.lng, p.lat, p.lng);
      }, 0);

      const mode = route.tipo || 'Bus_Urbano';
      const speed = SPEEDS[mode] || 20;
      const fare = FARES[mode] || 0;
      const minutes = Math.round((routeDist / speed) * 60);
      const emissions = (EMISSIONS[mode] || 0) * routeDist;

      const plan: JourneyPlan = {
        id: `direct-${route.id}`,
        legs: [
          {
            mode,
            route_id: route.id,
            route_name: route.nombre,
            from_stop: origin.nombre,
            to_stop: destination.nombre,
            minutes,
            distance_km: Math.round(routeDist * 10) / 10,
            fare_mxn: fare,
            co2_grams: Math.round(emissions),
            paradas: segment.map((p) => ({
              nombre: p.nombre || p.name || '',
              lat: p.lat,
              lng: p.lng,
              orden: p.orden,
            })),
            color: route.color,
            transport_type: mode,
          },
        ],
        total_minutes: minutes,
        total_fare_mxn: fare,
        total_co2_grams: Math.round(emissions),
        eco_score: Math.round(100 - (emissions / routeDist) * 10),
        budget_score: Math.round(100 - fare * 2),
        summary: `${route.nombre || 'Bus'} · ${minutes} min · $${fare} MXN`,
        priority_used: 'direct',
      };

      plans.push(plan);
    }
  }

  // Plan 2: Walking (si está lo suficientemente cerca)
  if (dist < 2) {
    const walkTime = Math.round((dist / (SPEEDS.Caminata || 5)) * 60);
    plans.push({
      id: 'walk',
      legs: [
        {
          mode: 'Caminata',
          from_stop: origin.nombre,
          to_stop: destination.nombre,
          minutes: walkTime,
          distance_km: Math.round(dist * 10) / 10,
          fare_mxn: 0,
          co2_grams: 0,
          paradas: [origin, destination],
        },
      ],
      total_minutes: walkTime,
      total_fare_mxn: 0,
      total_co2_grams: 0,
      eco_score: 100,
      budget_score: 100,
      summary: `A pie · ${walkTime} min · Gratis`,
      priority_used: 'eco',
    });
  }

  // Plan 3: Cheapest multi-leg
  if (plans.length > 0) {
    const cheapest = [...plans].sort((a, b) => a.total_fare_mxn - b.total_fare_mxn)[0];
    if (cheapest) {
      plans.sort((a, b) => {
        if (a.priority_used === 'eco') return -1;
        if (b.priority_used === 'eco') return 1;
        if (a.total_fare_mxn !== b.total_fare_mxn) return a.total_fare_mxn - b.total_fare_mxn;
        return a.total_minutes - b.total_minutes;
      });
    }
  }

  return plans;
}

// ── Endpoint POST ────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }): Promise<Response> => {
  try {
    const body = (await request.json()) as {
      origin?: { name?: string; lat?: number; lng?: number } | string;
      destination?: { name?: string; lat?: number; lng?: number } | string;
    };

    const originInput = body.origin;
    const destinationInput = body.destination;

    if (!originInput || !destinationInput) {
      return new Response(
        JSON.stringify({
          plans: [],
          meta: { error: 'Requiere origin y destination', origin_ok: false, dest_ok: false, routes_found: 0 },
        } as JourneyResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Cargar catálogo
    const routes = await getCatalogRoutes();

    if (routes.length === 0) {
      return new Response(
        JSON.stringify({
          plans: [],
          meta: { error: 'Catálogo no disponible', origin_ok: false, dest_ok: false, routes_found: 0 },
        } as JourneyResponse),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Resolver paradas
    const originRes = await resolveStop(originInput, routes);
    const destinationRes = await resolveStop(destinationInput, routes);

    if (!originRes.stop || !destinationRes.stop) {
      return new Response(
        JSON.stringify({
          plans: [],
          meta: {
            origin: originRes.stop
              ? { name: originRes.stop.nombre, lat: originRes.stop.lat, lng: originRes.stop.lng }
              : undefined,
            destination: destinationRes.stop
              ? { name: destinationRes.stop.nombre, lat: destinationRes.stop.lat, lng: destinationRes.stop.lng }
              : undefined,
            origin_ok: !!originRes.stop,
            dest_ok: !!destinationRes.stop,
            error: 'Ubicaciones no resueltas',
            routes_found: routes.length,
          },
        } as JourneyResponse),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generar planes
    const plans = generatePlans(originRes.stop, destinationRes.stop, routes);

    const response: JourneyResponse = {
      plans,
      meta: {
        origin: { name: originRes.stop.nombre, lat: originRes.stop.lat, lng: originRes.stop.lng },
        destination: { name: destinationRes.stop.nombre, lat: destinationRes.stop.lat, lng: destinationRes.stop.lng },
        origin_ok: true,
        dest_ok: true,
        routes_found: routes.length,
      },
    };

    logger.info(`[journey] ${originRes.stop.nombre} → ${destinationRes.stop.nombre} | ${plans.length} plans`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    logger.error('[journey] Error:', err instanceof Error ? err.message : String(err));
    return new Response(
      JSON.stringify({
        plans: [],
        meta: {
          error: err instanceof Error ? err.message : 'Internal error',
          origin_ok: false,
          dest_ok: false,
          routes_found: 0,
        },
      } as JourneyResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
