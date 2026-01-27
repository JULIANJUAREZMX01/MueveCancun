export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
    } else {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      });
    }
  });
}

export function watchPosition(
  onSuccess: PositionCallback,
  onError: PositionErrorCallback
): number {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser');
  }
  return navigator.geolocation.watchPosition(onSuccess, onError, {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
  });
}

export function clearWatch(watchId: number) {
  navigator.geolocation.clearWatch(watchId);
}
