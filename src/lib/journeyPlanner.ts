import { enrichJourneyLegs, initWasm, type Journey, type JourneyLeg } from './initWasm';
import { WasmLoader } from '../utils/WasmLoader';

export interface JourneyPlanLeg {
  mode: string;
  route_id?: string;
  route_name?: string;
  from_stop?: string;
  to_stop?: string;
  minutes: number;
  distance_km: number;
  fare_mxn: number;
  co2_grams: number;
  paradas?: Array<{ nombre?: string; name?: string; lat?: number; lng?: number; orden?: number }>;
  color?: string;
  transport_type?: string;
}

export interface JourneyPlan {
  id: string;
  legs: JourneyPlanLeg[];
  total_minutes: number;
  total_fare_mxn: number;
  total_co2_grams: number;
  eco_score: number;
  budget_score: number;
  summary: string;
}

const SPEED_KMH: Record<string, number> = {
  Bus_Urbano: 22,
  Bus_Urban: 22,
  Bus_Urbano_Isla: 22,
  Bus_Foraneo: 45,
  Combi: 20,
};

function haversineKm(a: { lat?: number; lng?: number }, b: { lat?: number; lng?: number }): number {
  if (typeof a.lat !== 'number' || typeof a.lng !== 'number' || typeof b.lat !== 'number' || typeof b.lng !== 'number') return 0;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function legDistanceKm(leg: JourneyLeg): number {
  const stops = leg.paradas ?? [];
  return stops.slice(1).reduce((total, stop, index) => total + haversineKm(stops[index], stop), 0);
}

function journeyToPlan(journey: Journey, index: number): JourneyPlan {
  const legs = journey.legs.map((leg) => {
    const mode = leg.transport_type ?? 'Bus_Urban';
    const distance = legDistanceKm(leg);
    const minutes = Math.max(1, Math.round((distance / (SPEED_KMH[mode] ?? 20)) * 60));
    return {
      mode,
      route_id: leg.route_id,
      route_name: leg.route_name,
      from_stop: leg.origin_stop,
      to_stop: leg.dest_stop,
      minutes,
      distance_km: Math.round(distance * 10) / 10,
      fare_mxn: leg.price ?? 0,
      co2_grams: Math.round(distance * 45),
      paradas: leg.paradas,
      color: leg.color,
      transport_type: mode,
    };
  });
  const transferMinutes = Math.max(0, legs.length - 1) * 5;
  const totalMinutes = legs.reduce((sum, leg) => sum + leg.minutes, transferMinutes);
  const totalFare = journey.total_price ?? legs.reduce((sum, leg) => sum + leg.fare_mxn, 0);
  const routeNames = legs.map((leg) => leg.route_name ?? leg.mode).join(' → ');

  return {
    id: journey.id ?? `offline-${index}`,
    legs,
    total_minutes: totalMinutes,
    total_fare_mxn: totalFare,
    total_co2_grams: legs.reduce((sum, leg) => sum + leg.co2_grams, 0),
    eco_score: 75,
    budget_score: Math.max(0, 100 - totalFare * 2),
    summary: routeNames,
  };
}

/** Search the catalog in the browser WASM engine so routing keeps working offline. */
export async function findOfflineJourneyPlans(origin: string, destination: string): Promise<JourneyPlan[]> {
  const ready = await initWasm();
  if (!ready) throw new Error('WASM routing engine is unavailable');

  const wasm = await WasmLoader.getModule();
  const raw = wasm.find_route(origin, destination);
  const journeys = Array.isArray(raw) ? raw as Journey[] : [];
  return journeys.map((journey, index) => journeyToPlan(enrichJourneyLegs(journey), index));
}
