import { put } from './idb';
import type { TrackingPoint } from './types';

let watchId: number | null = null;

export function startTracking(): void {
  if (watchId !== null) return;
  if (!navigator.geolocation) return;
  watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      const point: TrackingPoint = {
        lat: pos.coords.latitude, lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy, timestamp: pos.timestamp
      };
      await put('tracking', { ...point, id: String(point.timestamp) });
      window.dispatchEvent(new CustomEvent('mc:position', { detail: point }));
    },
    (err) => console.warn('GPS error:', err),
    { enableHighAccuracy: true, maximumAge: 5000 }
  );
}

export function stopTracking(): void {
  if (watchId === null) return;
  navigator.geolocation.clearWatch(watchId);
  watchId = null;
}
