import { put } from './idb';
import type { TrackingPoint } from './types';

let watchId: number | null = null;

export function startTracking(): void {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return;
  if (watchId !== null) return;
  if (!navigator.geolocation) return;
  watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      const point: TrackingPoint = {
        lat: pos.coords.latitude, lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy, timestamp: pos.timestamp
      };
      try {
        await put('tracking', { ...point, id: String(point.timestamp) });
        window.dispatchEvent(new CustomEvent('mc:position', { detail: point }));
      } catch (err) {
        console.error('Failed to store tracking point:', err);
      }
    },
    (err) => console.warn('GPS error:', err),
    { enableHighAccuracy: true, maximumAge: 5000 }
  );
}

export function stopTracking(): void {
  if (typeof navigator === 'undefined') return;
  if (watchId === null) return;
  navigator.geolocation.clearWatch(watchId);
  watchId = null;
}
