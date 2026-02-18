import { describe, it, expect, vi, beforeEach } from 'vitest';
import { coordinatesStore } from '../lib/CoordinatesStore';

// Mock fetch
const mockRouteData = {
  hubs: [
    { nombre: "Hub A", lat: 10, lng: 10, id: "h1" }
  ],
  rutas: [
    {
      id: "r1", nombre: "Route 1",
      paradas: [
        { nombre: "Stop 1", lat: 10.001, lng: 10.001 }
      ]
    }
  ]
};

global.fetch = vi.fn();

describe('CoordinatesStore', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Access private instance to reset it
    (coordinatesStore as any).data = null;
    (coordinatesStore as any).text = null;
    (coordinatesStore as any).fetchPromise = null;
    (coordinatesStore as any).db = null;
    (coordinatesStore as any).spatialHash.clear();
  });

  it('should be a singleton', () => {
    expect(coordinatesStore).toBeDefined();
  });

  it('should fetch data on first init', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(mockRouteData)
    });

    const res = await coordinatesStore.init();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(res.data).toEqual(mockRouteData);
    expect(coordinatesStore.getDB()!['Hub A']).toEqual([10, 10]);
  });

  it('should NOT fetch data again on second init (sequential)', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(mockRouteData)
    });

    await coordinatesStore.init();
    await coordinatesStore.init();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should NOT fetch data again on second init (concurrent)', async () => {
    let resolveFetch: (val?: unknown) => void = () => {};
    const fetchPromise = new Promise(resolve => { resolveFetch = resolve; });

    (global.fetch as any).mockReturnValue(fetchPromise.then(() => ({
        ok: true,
        text: async () => JSON.stringify(mockRouteData)
    })));

    const p1 = coordinatesStore.init();
    const p2 = coordinatesStore.init();

    resolveFetch();
    await Promise.all([p1, p2]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should accept injected data', async () => {
    const injectedData = { ...mockRouteData, hubs: [] }; // No hubs, but has routes
    const res = await coordinatesStore.init(injectedData);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(res.data).toBe(injectedData);
    // Should contain "Stop 1" from routes
    expect(coordinatesStore.getDB()).toHaveProperty('Stop 1');
    // Should NOT contain "Hub A"
    expect(coordinatesStore.getDB()).not.toHaveProperty('Hub A');
  });

  it('should find nearest stop', async () => {
    (coordinatesStore as any).data = mockRouteData;
    (coordinatesStore as any).text = JSON.stringify(mockRouteData);
    (coordinatesStore as any).processData();

    // "Stop 1" is at 10.001, 10.001
    const nearest = coordinatesStore.findNearest(10.0011, 10.0011);
    expect(nearest).toBe("Stop 1");
  });
});
