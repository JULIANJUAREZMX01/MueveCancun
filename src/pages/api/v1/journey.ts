/**
 * POST /api/v1/journey/plan
 * 
 * Multimodal journey planner — combines routes, transport modes,
 * ETA estimation, and carbon footprint.
 * 
 * Super App endpoint — No Auth required for basic, JWT for premium.
 */

import type { APIRoute } from 'astro';
import { logger } from '@utils/logger';

export interface JourneyRequest {
  origin: { lat: number; lng: number; name?: string };
  destination: { lat: number; lng: number; name?: string };
  preferences?: {
    priority: 'time' | 'cost' | 'eco';
    max_fare_mxn?: number;
    transport_modes?: string[];
    avoid_modes?: string[];
  };
  hour?: number;  // 0-23, defaults to current hour
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
}

// Transport speed map (km/h) — mirrors Rust eta-engine
const SPEEDS: Record<string, number> = {
  Bus: 22, Bus_Urban: 22, Bus_Urbano: 22, Bus_HotelZone: 22,
  Combi: 28, Combi_Municipal: 28,
  Van: 35, Van_Foranea: 35,
  ADO: 55, ADO_Airport: 55,
  PlayaExpress: 45,
  MotorTaxi: 30,
  Bicicleta: 15,
  Caminata: 5,
  Indriver: 40, Uber: 40,
  Ferry: 25,
};

// CO2 grams/km per passenger
const CO2: Record<string, number> = {
  Bus: 18, Bus_Urban: 18, Bus_Urbano: 18, Bus_HotelZone: 18,
  Combi: 35, Van: 45, ADO: 25, ADO_Airport: 25,
  PlayaExpress: 20, MotorTaxi: 60,
  Bicicleta: 0, Caminata: 0,
  Indriver: 130, Uber: 130, Ferry: 50,
};

// Base fares MXN
const FARES: Record<string, number> = {
  Bus: 14, Bus_Urban: 14, Combi: 14, Van: 25, ADO: 42,
  ADO_Airport: 65, PlayaExpress: 25, MotorTaxi: 20,
  Bicicleta: 0, Caminata: 0, Indriver: 45, Uber: 55,
};

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function trafficFactor(hour: number): number {
  if (hour >= 7 && hour <= 9) return 2.2;
  if (hour >= 17 && hour <= 19) return 2.5;
  if (hour >= 13 && hour <= 14) return 1.5;
  if (hour >= 20 && hour <= 23) return 1.2;
  if (hour <= 5) return 1.0;
  return 1.1;
}

function buildLeg(mode: string, distanceKm: number, hour: number): JourneyLeg {
  const speed = (SPEEDS[mode] ?? 22) / trafficFactor(hour);
  const minutes = (distanceKm / speed) * 60;
  return {
    mode,
    minutes: Math.round(minutes * 10) / 10,
    distance_km: Math.round(distanceKm * 100) / 100,
    fare_mxn: FARES[mode] ?? 14,
    co2_grams: Math.round((CO2[mode] ?? 18) * distanceKm),
  };
}

function planJourney(req: JourneyRequest): JourneyPlan[] {
  const { origin, destination, preferences, hour: reqHour } = req;
  const hour = reqHour ?? new Date().getHours();
  const priority = preferences?.priority ?? 'time';
  const maxFare = preferences?.max_fare_mxn ?? Infinity;

  const distanceM = haversine(origin.lat, origin.lng, destination.lat, destination.lng);
  const distanceKm = distanceM / 1000;

  const availableModes = preferences?.transport_modes ?? ['Bus', 'Combi', 'ADO', 'MotorTaxi', 'Bicicleta'];
  const avoidModes = new Set(preferences?.avoid_modes ?? []);

  const plans: JourneyPlan[] = [];

  // Plan A: Direct (single mode)
  for (const mode of availableModes) {
    if (avoidModes.has(mode)) continue;
    const fare = FARES[mode] ?? 14;
    if (fare > maxFare) continue;

    const leg = buildLeg(mode, distanceKm, hour);
    const co2 = leg.co2_grams;
    const ecoScore = Math.round((1 - Math.min(co2 / 500, 1)) * 100);
    const budgetScore = Math.round((1 - Math.min(fare / 200, 1)) * 100);

    plans.push({
      id: `direct-${mode.toLowerCase()}`,
      legs: [{ ...leg, route_name: `Directo en ${mode}` }],
      total_minutes: leg.minutes,
      total_fare_mxn: fare,
      total_co2_grams: co2,
      eco_score: ecoScore,
      budget_score: budgetScore,
      summary: `${mode} · ${leg.minutes.toFixed(0)} min · $${fare} MXN · ${co2}g CO₂`,
      priority_used: priority,
    });
  }

  // Plan B: Walk to stop + Bus (if distance > 500m and walk portion < 15min)
  if (distanceKm > 0.5) {
    const walkDistKm = 0.3; // Avg walk to stop
    const busDistKm = distanceKm - walkDistKm;
    const walkLeg = buildLeg('Caminata', walkDistKm, hour);
    const busLeg = buildLeg('Bus', busDistKm, hour);
    const totalMin = walkLeg.minutes + busLeg.minutes;
    const totalFare = (FARES['Bus'] ?? 14);
    const totalCo2 = walkLeg.co2_grams + busLeg.co2_grams;

    if (totalFare <= maxFare && !avoidModes.has('Bus')) {
      plans.push({
        id: 'walk-bus',
        legs: [
          { ...walkLeg, route_name: 'Caminar a la parada' },
          { ...busLeg, route_name: 'Autobús directo' },
        ],
        total_minutes: Math.round(totalMin * 10) / 10,
        total_fare_mxn: totalFare,
        total_co2_grams: totalCo2,
        eco_score: 90,
        budget_score: 95,
        summary: `Caminata + Bus · ${totalMin.toFixed(0)} min · $${totalFare} MXN · ${totalCo2}g CO₂`,
        priority_used: priority,
      });
    }
  }

  // Sort by priority
  plans.sort((a, b) => {
    if (priority === 'cost') return a.total_fare_mxn - b.total_fare_mxn;
    if (priority === 'eco') return b.eco_score - a.eco_score;
    return a.total_minutes - b.total_minutes; // 'time'
  });

  return plans.slice(0, 5); // Top 5 plans
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as JourneyRequest;

    if (!body.origin || !body.destination) {
      return new Response(JSON.stringify({ error: 'origin and destination are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const plans = planJourney(body);
    return new Response(JSON.stringify({
      plans,
      meta: {
        version: '1.0',
        computed_at: new Date().toISOString(),
        origin: body.origin,
        destination: body.destination,
        priority: body.preferences?.priority ?? 'time',
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Powered-By': 'CancúnOS-MobilityEngine',
      },
    });
  } catch (err) {
    logger.error('[API/v1/journey]', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({
    endpoint: 'POST /api/v1/journey/plan',
    description: 'Multimodal journey planner — Cancún transit system',
    version: '1.0.0',
    example: {
      origin: { lat: 21.1619, lng: -86.8515, name: 'Centro Cancún' },
      destination: { lat: 21.0836, lng: -86.7779, name: 'Zona Hotelera' },
      preferences: { priority: 'eco', max_fare_mxn: 50, transport_modes: ['Bus', 'Bicicleta'] }
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
