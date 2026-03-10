import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCurrentPosition } from '../utils/geolocation';

describe('Geolocation Utility', () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    // Mock navigator.geolocation
    Object.defineProperty(global, 'navigator', {
      value: {
        geolocation: {
          getCurrentPosition: vi.fn(),
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
    vi.clearAllMocks();
  });

  it('should resolve with position when getCurrentPosition succeeds', async () => {
    const mockPosition = {
      coords: {
        latitude: 10,
        longitude: 20,
        accuracy: 1,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    } as GeolocationPosition;

    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementationOnce((successCallback) => {
      successCallback(mockPosition);
    });

    const result = await getCurrentPosition();

    expect(result).toEqual(mockPosition);
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  });

  it('should reject with error when getCurrentPosition fails', async () => {
    const mockError = new Error('Geolocation error') as GeolocationPositionError;

    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementationOnce((_, errorCallback) => {
      if (errorCallback) {
        errorCallback(mockError);
      }
    });

    await expect(getCurrentPosition()).rejects.toThrow('Geolocation error');

    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  });
});
