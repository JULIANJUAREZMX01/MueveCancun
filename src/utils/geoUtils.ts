/**
 * geoUtils.ts — Geolocation UX utilities
 * Soft prompt, retry, state machine, typed callbacks
 */

export type GeoState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable' | 'timeout';

export interface GeoResult {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface GeoOptions {
  onState?: (state: GeoState) => void;
  onSuccess?: (result: GeoResult) => void;
  onError?: (state: GeoState, message: string) => void;
  /** Max wait ms before switching to timeout state (default 10_000) */
  timeout?: number;
  /** High accuracy mode (default true) */
  highAccuracy?: boolean;
}

const PERMISSION_CACHE_KEY = 'mc_geo_permission';

function cachePermission(state: PermissionState) {
  try { localStorage.setItem(PERMISSION_CACHE_KEY, state); } catch { /* noop */ }
}

function getCachedPermission(): PermissionState | null {
  try { return localStorage.getItem(PERMISSION_CACHE_KEY) as PermissionState | null; } catch { return null; }
}

/**
 * Request geolocation with soft UX:
 * - Checks Permissions API first (no prompt if previously denied)
 * - Emits state transitions via onState
 * - Caches result in localStorage to avoid repeated prompts
 */
export async function requestGeoLocation(options: GeoOptions = {}): Promise<GeoResult | null> {
  const {
    onState,
    onSuccess,
    onError,
    timeout = 10_000,
    highAccuracy = true,
  } = options;

  if (!navigator.geolocation) {
    onState?.('unavailable');
    onError?.('unavailable', 'Geolocalización no disponible en este dispositivo');
    return null;
  }

  // Check permission without triggering prompt
  if (navigator.permissions) {
    try {
      const perm = await navigator.permissions.query({ name: 'geolocation' });
      cachePermission(perm.state);

      if (perm.state === 'denied') {
        onState?.('denied');
        onError?.('denied', 'Permiso de ubicación denegado. Actívalo en la configuración del navegador.');
        return null;
      }

      // Listen for future changes
      perm.addEventListener('change', () => {
        cachePermission(perm.state);
      }, { once: true });
    } catch { /* Permissions API not supported, continue */ }
  } else {
    // No Permissions API — check cached state
    const cached = getCachedPermission();
    if (cached === 'denied') {
      onState?.('denied');
      onError?.('denied', 'Permiso de ubicación denegado. Actívalo en la configuración del navegador.');
      return null;
    }
  }

  onState?.('requesting');

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      onState?.('timeout');
      onError?.('timeout', 'GPS tardó demasiado. Intenta en una zona con mejor señal.');
      resolve(null);
    }, timeout);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        cachePermission('granted');
        const result: GeoResult = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        onState?.('granted');
        onSuccess?.(result);
        resolve(result);
      },
      (err) => {
        clearTimeout(timer);
        let state: GeoState = 'denied';
        let msg = 'Error de geolocalización';

        switch (err.code) {
          case GeolocationPositionError.PERMISSION_DENIED:
            state = 'denied';
            msg = 'Permiso de ubicación denegado.';
            cachePermission('denied');
            break;
          case GeolocationPositionError.POSITION_UNAVAILABLE:
            state = 'unavailable';
            msg = 'Ubicación no disponible. Verifica tu señal GPS.';
            break;
          case GeolocationPositionError.TIMEOUT:
            state = 'timeout';
            msg = 'Tiempo de espera agotado. Intenta de nuevo.';
            break;
        }

        onState?.(state);
        onError?.(state, msg);
        resolve(null);
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: timeout - 500,
        maximumAge: 30_000,
      }
    );
  });
}
