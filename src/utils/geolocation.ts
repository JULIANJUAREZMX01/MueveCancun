export interface PositionResult {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface PositionOptions {
  onPermissionDenied?: () => void;
  onError?: (err: GeolocationPositionError) => void;
}

export const getCurrentPosition = (options: PositionOptions = {}): Promise<PositionResult | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      options.onError?.({ code: 0, message: "Geolocation not supported" } as GeolocationPositionError);
      return resolve(null);
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          options.onPermissionDenied?.();
        } else {
          options.onError?.(err);
        }
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      }
    );
  });
};
