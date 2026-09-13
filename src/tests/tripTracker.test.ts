import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/notifications', () => ({
  getDeviceId: () => 'device-test',
  notifyTripEvent: vi.fn().mockResolvedValue(undefined),
}));

import { startTrip, stopTrip } from '../lib/tripTracker';

describe('TripTracker telemetry', () => {
  let success: ((position: GeolocationPosition) => void) | undefined;
  const clearWatch = vi.fn();
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ trip_id: 'trip-test' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('navigator', {
      geolocation: {
        watchPosition: vi.fn((onSuccess: (position: GeolocationPosition) => void) => {
          success = onSuccess;
          return 7;
        }),
        clearWatch,
      },
    });
  });

  afterEach(async () => {
    await stopTrip();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('sends telemetry immediately after the first GPS position', async () => {
    await startTrip('R1', 'El Crucero', 'Plaza Las Américas');

    success?.({
      coords: {
        latitude: 21.1714, longitude: -86.8219, accuracy: 8, speed: 5, heading: 90,
        altitude: null, altitudeAccuracy: null,
      },
      timestamp: Date.now(),
    } as GeolocationPosition);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const telemetryCall = fetchMock.mock.calls.find(([url]) => url === '/api/v1/telemetry');
    expect(telemetryCall).toBeDefined();
    expect(JSON.parse(telemetryCall?.[1]?.body as string)).toMatchObject({
      device_id: 'device-test', route_id: 'R1', trip_id: 'trip-test',
      lat: 21.1714, lng: -86.8219, accuracy: 8, speed_kmh: 18, heading: 90,
    });
  });
});
