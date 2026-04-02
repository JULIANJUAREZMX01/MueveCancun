import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import { startTracking, stopTracking } from '../lib/telemetry';
import { put } from '../lib/idb';

vi.mock('../lib/idb', () => ({
  put: vi.fn(),
}));

describe('Telemetry', () => {
  let watchPositionMock: any;
  let clearWatchMock: any;
  let dispatchEventSpy: MockInstance;
  let consoleErrorSpy: MockInstance;
  let consoleWarnSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();

    watchPositionMock = vi.fn();
    clearWatchMock = vi.fn();

    // Setup global navigator and window for testing environment
    if (typeof globalThis.navigator === 'undefined') {
      (globalThis as any).navigator = {
        geolocation: {
          watchPosition: watchPositionMock,
          clearWatch: clearWatchMock,
        }
      };
    } else {
      (globalThis.navigator as any).geolocation = {
        watchPosition: watchPositionMock,
        clearWatch: clearWatchMock,
      };
    }

    if (typeof globalThis.window === 'undefined') {
       (globalThis as any).window = {
         dispatchEvent: vi.fn(),
         CustomEvent: class CustomEvent {
           type: string;
           detail: unknown;
           constructor(type: string, options: { detail: unknown }) {
             this.type = type;
             this.detail = options.detail;
           }
         }
       };
    }

    dispatchEventSpy = vi.spyOn(globalThis.window, 'dispatchEvent');
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    stopTracking();
    vi.restoreAllMocks();
  });

  it('should start tracking and handle success path', async () => {
    let successCallback: GeolocationPositionCallback | undefined;
    watchPositionMock.mockImplementation((success: GeolocationPositionCallback) => {
      successCallback = success;
      return 123;
    });

    startTracking();

    expect(watchPositionMock).toHaveBeenCalled();

    const mockPos: any = {
      coords: {
        latitude: 21.1619,
        longitude: -86.8515,
        accuracy: 10,
      },
      timestamp: 1625097600000,
    };

    vi.mocked(put).mockResolvedValue(undefined as any);

    await successCallback!(mockPos);

    expect(put).toHaveBeenCalledWith('tracking', {
      lat: 21.1619,
      lng: -86.8515,
      accuracy: 10,
      timestamp: 1625097600000,
      id: '1625097600000',
    });

    expect(dispatchEventSpy).toHaveBeenCalled();
    const event = dispatchEventSpy.mock.calls[0][0] as any;
    expect(event.type).toBe('mc:position');
    expect(event.detail).toEqual({
      lat: 21.1619,
      lng: -86.8515,
      accuracy: 10,
      timestamp: 1625097600000,
    });
  });

  it('should log error when IDB put fails', async () => {
    let successCallback: GeolocationPositionCallback | undefined;
    watchPositionMock.mockImplementation((success: GeolocationPositionCallback) => {
      successCallback = success;
      return 123;
    });

    startTracking();

    const mockPos: any = {
      coords: { latitude: 0, longitude: 0, accuracy: 0 },
      timestamp: 123456789,
    };

    const error = new Error('IDB Failure');
    vi.mocked(put).mockRejectedValue(error);

    await successCallback!(mockPos);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to store tracking point:', error);
  });

  it('should log warning when GPS error occurs', () => {
    let errorCallback: GeolocationPositionErrorCallback | undefined;
    watchPositionMock.mockImplementation((_success: any, error: any) => {
      errorCallback = error;
      return 123;
    });

    startTracking();

    const gpsError = { code: 1, message: 'User denied Geolocation' } as any;
    errorCallback!(gpsError);

    expect(consoleWarnSpy).toHaveBeenCalledWith('GPS error:', gpsError);
  });

  it('should stop tracking', () => {
    watchPositionMock.mockReturnValue(123);
    startTracking();

    stopTracking();

    expect(clearWatchMock).toHaveBeenCalledWith(123);
  });
});
