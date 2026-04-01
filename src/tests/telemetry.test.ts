import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startTracking, stopTracking } from '../lib/telemetry';
import { put } from '../lib/idb';

vi.mock('../lib/idb', () => ({
  put: vi.fn(),
}));

describe('Telemetry', () => {
  let watchPositionMock: any;
  let clearWatchMock: any;
  let dispatchEventSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    watchPositionMock = vi.fn();
    clearWatchMock = vi.fn();

    // Use vi.stubGlobal so state is fully restored in afterEach
    vi.stubGlobal('navigator', {
      geolocation: {
        watchPosition: watchPositionMock,
        clearWatch: clearWatchMock,
      },
    });

    vi.stubGlobal('window', {
      dispatchEvent: vi.fn(),
      CustomEvent: class CustomEvent {
        type: string;
        detail: any;
        constructor(type: string, options: any) {
          this.type = type;
          this.detail = options.detail;
        }
      },
    });

    dispatchEventSpy = vi.spyOn(globalThis.window, 'dispatchEvent');
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Reset the module state by calling stopTracking
    stopTracking();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('should start tracking and handle success path', async () => {
    let successCallback: any;
    watchPositionMock.mockImplementation((success: any) => {
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
    let successCallback: any;
    watchPositionMock.mockImplementation((success: any) => {
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
    let errorCallback: any;
    watchPositionMock.mockImplementation((_success: any, error: any) => {
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
