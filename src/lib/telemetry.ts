/**
 * Mueve Reparto — Telemetry (GPS Tracker)
 * Captura posicion, la encola para sync y emite evento local para el mapa.
 *
 * Uso:
 *   const t = new TelemetryTracker('stop-uuid');
 *   t.start();
 *   // ... al terminar:
 *   t.stop();
 *
 * Escuchar posicion en el mapa:
 *   window.addEventListener('mr:position', (e: CustomEvent<PositionPayload>) => { ... });
 */

import { SyncManager } from './sync';

export interface PositionPayload {
  stop_id: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  recorded_at: string;
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5_000,
  timeout: 10_000,
};

const ERROR_MESSAGES: Record<number, string> = {
  1: 'Permiso de ubicacion denegado.',
  2: 'Posicion no disponible.',
  3: 'Tiempo de espera agotado.',
};

export class TelemetryTracker {
  private watchId: number | null = null;

  constructor(private readonly stopId: string) {}

  start(): void {
    if (!('geolocation' in navigator)) {
      console.warn('[Telemetry] Geolocalizacion no disponible en este dispositivo.');
      return;
    }
    if (this.watchId !== null) return; // ya activo

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.onPosition(pos),
      (err) => this.onError(err),
      GEO_OPTIONS,
    );
  }

  stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  get active(): boolean {
    return this.watchId !== null;
  }

  private async onPosition(pos: GeolocationPosition): Promise<void> {
    const payload: PositionPayload = {
      stop_id: this.stopId,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
      recorded_at: new Date().toISOString(),
    };

    // Evento local para actualizar el mapa sin esperar al servidor
    window.dispatchEvent(new CustomEvent<PositionPayload>('mr:position', { detail: payload }));

    // Encolar para sincronizacion con la API
    await SyncManager.enqueue('/api/tracking', 'POST', payload).catch(console.error);
  }

  private onError(err: GeolocationPositionError): void {
    console.error(`[Telemetry] ${ERROR_MESSAGES[err.code] ?? 'Error desconocido'}`);
  }
}

/** Singleton de sesion activa. Se usa desde reparto.astro. */
let _activeTracker: TelemetryTracker | null = null;

export function startTracking(stopId: string): void {
  _activeTracker?.stop();
  _activeTracker = new TelemetryTracker(stopId);
  _activeTracker.start();
}

export function stopTracking(): void {
  _activeTracker?.stop();
  _activeTracker = null;
}

// Activar/desactivar segun evento de estado de entrega
if (typeof window !== 'undefined') {
  window.addEventListener('mr:delivery-status', (e: Event) => {
    const { stopId, status } = (e as CustomEvent<{ stopId: string; status: string }>).detail;
    if (status === 'in_route') {
      startTracking(stopId);
    } else if (status === 'delivered' || status === 'failed') {
      stopTracking();
    }
  });
}
