/**
 * TripTracker — Motor de seguimiento en tiempo real
 * Guía al usuario desde el paradero hasta el destino
 */
import { notifyTripEvent, getDeviceId } from './notifications';

export interface TripState {
  tripId: string | null;
  routeId: string | null;
  phase: 'idle' | 'walking' | 'waiting' | 'on_bus' | 'arrived';
  nearestStop: string | null;
  nextStop: string | null;
  busUnitId: string | null;
  occupancyPct: number;
  startedAt: number | null;
  boardedAt: number | null;
  watchId: number | null;
  gpsStatus: 'idle' | 'requesting' | 'active' | 'denied' | 'unavailable';
}

const state: TripState = {
  tripId: null, routeId: null, phase: 'idle',
  nearestStop: null, nextStop: null, busUnitId: null,
  occupancyPct: 0, startedAt: null, boardedAt: null, watchId: null, gpsStatus: 'idle'
};

const TELEMETRY_INTERVAL = 15000;
let telemetryTimer: ReturnType<typeof setInterval> | null = null;
let lastLat = 0, lastLng = 0, lastSpeedKmh = 0, lastHeading = 0;

export function getState(): TripState { return { ...state }; }

/** Iniciar seguimiento de un viaje */
export async function startTrip(routeId: string, originStop: string, destStop: string): Promise<string | null> {
  if (state.phase !== 'idle') await stopTrip();

  const device_id = getDeviceId();

  try {
    const res = await fetch('/api/v1/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', device_id, route_id: routeId, origin_stop: originStop, dest_stop: destStop })
    });
    const data = await res.json();
    state.tripId = res.ok && data.trip_id ? data.trip_id : 'local_' + Date.now();
  } catch { state.tripId = 'local_' + Date.now(); }

  state.routeId = routeId;
  state.phase = 'waiting';
  state.startedAt = Date.now();
  state.nearestStop = originStop;

  await notifyTripEvent('trip_start', { route: routeId, stop: originStop });
  startGpsWatch();
  dispatchStateChange();
  return state.tripId;
}

/** Registrar que el usuario abordó el bus */
export async function boardBus(busUnitId?: string): Promise<void> {
  state.phase = 'on_bus';
  state.busUnitId = busUnitId || null;
  state.boardedAt = Date.now();

  const device_id = getDeviceId();
  await fetch('/api/v1/trips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'board', device_id, trip_id: state.tripId,
      route_id: state.routeId, origin_stop: state.nearestStop,
      bus_unit_id: busUnitId
    })
  }).catch(() => {});

  await notifyTripEvent('board_now', { route: state.routeId ?? '' });
  dispatchStateChange();
}

/** Reportar ocupación del bus */
export async function reportOccupancy(pct: number): Promise<void> {
  state.occupancyPct = pct;
  const device_id = getDeviceId();
  await fetch('/api/v1/trips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'occupancy', device_id, trip_id: state.tripId,
      route_id: state.routeId, bus_unit_id: state.busUnitId, occupancy: pct
    })
  }).catch(() => {});
}

/** Confirmar llegada al destino */
export async function arriveAtDestination(): Promise<void> {
  state.phase = 'arrived';
  const device_id = getDeviceId();

  await fetch('/api/v1/trips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'arrive', device_id, trip_id: state.tripId, route_id: state.routeId })
  }).catch(() => {});

  const trips = parseInt(localStorage.getItem('mc_total_trips') || '0') + 1;
  localStorage.setItem('mc_total_trips', String(trips));

  await notifyTripEvent('arrived', { destination: state.nearestStop ?? '' });
  stopGpsWatch();
  dispatchStateChange();
}

/** Detener seguimiento */
export async function stopTrip(): Promise<void> {
  stopGpsWatch();
  state.phase = 'idle'; state.tripId = null; state.routeId = null;
  state.nearestStop = null; state.nextStop = null; state.busUnitId = null;
  state.boardedAt = null;
  dispatchStateChange();
}

function startGpsWatch(): void {
  if (state.watchId !== null) return;
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    state.gpsStatus = 'unavailable';
    dispatchStateChange();
    return;
  }

  state.gpsStatus = 'requesting';
  dispatchStateChange();
  state.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      lastLat = pos.coords.latitude;
      lastLng = pos.coords.longitude;
      lastSpeedKmh = (pos.coords.speed || 0) * 3.6;
      lastHeading = pos.coords.heading || 0;
      state.gpsStatus = 'active';
      dispatchStateChange();
      const point = { lat: lastLat, lng: lastLng, accuracy: pos.coords.accuracy, speed_kmh: lastSpeedKmh, heading: lastHeading };
      window.dispatchEvent(new CustomEvent('mc:position', { detail: point }));
      void sendTelemetry(point);
    },
    (err) => {
      state.gpsStatus = 'denied';
      dispatchStateChange();
      console.warn('[TripTracker] GPS error:', err);
    },
    { enableHighAccuracy: true, maximumAge: 3000 }
  );

  telemetryTimer = setInterval(() => {
    if (!lastLat) return;
    void sendTelemetry({ lat: lastLat, lng: lastLng, speed_kmh: lastSpeedKmh, heading: lastHeading });
  }, TELEMETRY_INTERVAL);
}

async function sendTelemetry(point: { lat: number; lng: number; accuracy?: number; speed_kmh?: number; heading?: number }): Promise<void> {
  const device_id = getDeviceId();
  await fetch('/api/v1/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_id, lat: point.lat, lng: point.lng, accuracy: point.accuracy,
      route_id: state.routeId, trip_id: state.tripId,
      phase: state.phase, nearest_stop: state.nearestStop,
      speed_kmh: point.speed_kmh ?? 0, heading: point.heading ?? 0
    })
  }).catch(() => {});
}

function stopGpsWatch(): void {
  if (state.watchId !== null && typeof navigator !== 'undefined') {
    navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
  }
  if (telemetryTimer) { clearInterval(telemetryTimer); telemetryTimer = null; }
  state.gpsStatus = 'idle';
}

function dispatchStateChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mc:trip-state', { detail: getState() }));
  }
}
