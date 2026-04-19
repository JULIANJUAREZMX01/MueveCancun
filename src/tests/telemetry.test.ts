import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import { startTracking, stopTracking } from '../lib/telemetry';
import { put } from '../lib/idb';

vi.mock('../lib/idb', () => ({
  put: vi.fn(),
}));

describe('Telemetry', () => {
  let watchPositionMock: MockInstance;
  let clearWatchMock: MockInstance;
  let dispatchEventSpy: MockInstance;
  let consoleErrorSpy: MockInstance;
  let consoleWarnSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();

    watchPositionMock = vi.fn();
    clearWatchMock = vi.fn();

    // Ensure we are in a "browser-like" environment for the test
    if (typeof globalThis.navigator === 'undefined') {
      (globalThis as unknown).navigator = {};
    }

    (globalThis.navigator as unknown).geolocation = {
      watchPosition: watchPositionMock,
      clearWatch: clearWatchMock,
    };

    if (typeof globalThis.window === 'undefined') {
       (globalThis as unknown).window = {
         dispatchEvent: vi.fn(),
         CustomEvent: class CustomEvent {
           type: string;
           detail: unknown;
           constructor(type: string, options: unknown) {
             this.type = type;
             this.detail = options.detail;
           }
         }
       };
    } else {
      vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true);
    }

    dispatchEventSpy = vi.spyOn(globalThis.window, 'dispatchEvent');
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Reset the module state by calling stopTracking
    stopTracking();
    vi.restoreAllMocks();
  });

  it('should start tracking and handle success path', async () => {
    let successCallback: unknown;
    watchPositionMock.mockImplementation((success: unknown) => {
      successCallback = success;
      return 123; // mock watchId
    });

    startTracking();

    expect(watchPositionMock).toHaveBeenCalled();

    const mockPos = {
      coords: {
        latitude: 21.1619,
        longitude: -86.8515,
        accuracy: 10,
      },
      timestamp: 1625097600000,
    };

    vi.mocked(put).mockResolvedValue(undefined);

    await successCallback(mockPos);

    expect(put).toHaveBeenCalledWith('tracking', {
      lat: 21.1619,
      lng: -86.8515,
      accuracy: 10,
      timestamp: 1625097600000,
      id: '1625097600000',
    });

    expect(dispatchEventSpy).toHaveBeenCalled();
    const event = dispatchEventSpy.mock.calls[0][0];
    expect(event.type).toBe('mc:position');
    expect(event.detail).toEqual({
      lat: 21.1619,
      lng: -86.8515,
      accuracy: 10,
      timestamp: 1625097600000,
    });
  });

  it('should log error when IDB put fails', async () => {
    let successCallback: unknown;
    watchPositionMock.mockImplementation((success: unknown) => {
      successCallback = success;
      return 123;
    });

    startTracking();

    const mockPos = {
      coords: { latitude: 0, longitude: 0, accuracy: 0 },
      timestamp: 123456789,
    };

    const error = new Error('IDB Failure');
    vi.mocked(put).mockRejectedValue(error);

    await successCallback(mockPos);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to store tracking point:', error);
  });

  it('should log warning when GPS error occurs', () => {
    let errorCallback: unknown;
    watchPositionMock.mockImplementation((_success: unknown, error: unknown) => {
      errorCallback = error;
      return 123;
    });

    startTracking();

    const gpsError = { code: 1, message: 'User denied Geolocation' };
    errorCallback(gpsError);

    expect(consoleWarnSpy).toHaveBeenCalledWith('GPS error:', gpsError);
  });

  it('should stop tracking', () => {
    watchPositionMock.mockReturnValue(123);
    startTracking();

    stopTracking();

    expect(clearWatchMock).toHaveBeenCalledWith(123);
  });
});
