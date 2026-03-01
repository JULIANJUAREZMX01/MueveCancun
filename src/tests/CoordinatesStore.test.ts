import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoordinatesStore } from '../utils/CoordinatesStore';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('CoordinatesStore', () => {
    let store: CoordinatesStore;

    beforeEach(() => {
        // Create a fresh instance for each test
        store = new CoordinatesStore();
        // Reset the static singleton for isolation
        (CoordinatesStore as any).instance = store;
        (store as any).loadingPromise = null;
        (store as any).db = null;
        mockFetch.mockReset();
    });

    it('should be a singleton via static instance', () => {
        const store2 = CoordinatesStore.instance;
        expect(store2).toBe(store);
    });

    it('should initialize with injected data', async () => {
        const mockData = {
            version: '1.0',
            rutas: [
                {
                    id: 'R1',
                    nombre: 'Ruta 1',
                    tarifa: 10,
                    tipo: 'Bus',
                    paradas: [
                        { nombre: 'Stop A', lat: 10, lng: 10, orden: 1 }
                    ]
                }
            ]
        };

        const result = await store.init(mockData);
        expect(result.data).toEqual(mockData);
        // utils/CoordinatesStore stores as [lat, lng] tuples with lowercase keys
        expect(store.getDB()!['stop a']).toEqual([10, 10]);
    });

    it('should fetch data if not injected', async () => {
        const mockData = {
            version: '1.0',
            rutas: [
                {
                    id: 'R1',
                    nombre: 'Ruta 1',
                    tarifa: 10,
                    tipo: 'Bus',
                    paradas: [
                        { nombre: 'Stop B', lat: 20, lng: 20, orden: 1 }
                    ]
                }
            ]
        };

        mockFetch.mockResolvedValue({
            ok: true,
            text: async () => JSON.stringify(mockData)
        });

        const result = await store.init();
        expect(result.data).toEqual(mockData);
        expect(store.getDB()!['stop b']).toEqual([20, 20]);
        expect(mockFetch).toHaveBeenCalledWith('/data/master_routes.json');
    });

    it('should find nearest stop', async () => {
        const mockData = {
            version: '1.0',
            rutas: [
                {
                    id: 'R1',
                    nombre: 'Ruta 1',
                    tarifa: 10,
                    tipo: 'Bus',
                    paradas: [
                        { nombre: 'Stop Close', lat: 10, lng: 10, orden: 1 },
                        { nombre: 'Stop Far', lat: 50, lng: 50, orden: 2 }
                    ]
                }
            ]
        };

        await store.init(mockData);

        // Point close to 10,10
        const nearest = store.findNearest(10.1, 10.1);
        expect(nearest).toBe('stop close');
    });
});

describe('CoordinatesStore.findNearest - spatial index fast path', () => {
    let store: CoordinatesStore;

    // Helper to build minimal route data from a list of stops
    const makeData = (stops: Array<{ nombre: string; lat: number; lng: number }>) => ({
        version: '1.0',
        rutas: [{
            id: 'R1',
            nombre: 'Ruta 1',
            tarifa: 15,
            tipo: 'Bus',
            paradas: stops.map((s, i) => ({ ...s, orden: i + 1 }))
        }]
    });

    beforeEach(() => {
        store = new CoordinatesStore();
        (CoordinatesStore as any).instance = store;
        (store as any).loadingPromise = null;
        (store as any).db = null;
    });

    // All tests use coordinates near (10.0, 10.0).
    // Default cell size = 0.01 deg (~1.11 km at equator).
    // Cell for (10.0, 10.0): x=1000, y=1000.

    it('finds nearest stop via spatial index when stop is in the same cell as the query point', async () => {
        // Stop at (10.005, 10.0) is in cell y=1000 (same as query at 10.0, 10.0).
        // Haversine distance ≈ 0.556 km < 1.0 km → early-return triggers.
        await store.init(makeData([
            { nombre: 'Stop Same Cell', lat: 10.005, lng: 10.0 },
            { nombre: 'Stop Far Away', lat: 30.0, lng: 30.0 },
        ]));
        const nearest = store.findNearest(10.0, 10.0);
        expect(nearest).toBe('stop same cell');
    });

    it('finds nearest stop via spatial index when stop is in a neighboring cell', async () => {
        // Stop at (9.995, 10.0) is in cell y=999 — a direct south neighbor of query cell y=1000.
        // Haversine distance ≈ 0.556 km < 1.0 km → early-return triggers.
        await store.init(makeData([
            { nombre: 'Stop Neighbor Cell', lat: 9.995, lng: 10.0 },
            { nombre: 'Stop Far Away', lat: 30.0, lng: 30.0 },
        ]));
        const nearest = store.findNearest(10.0, 10.0);
        expect(nearest).toBe('stop neighbor cell');
    });

    it('returns the closest stop when multiple candidates are returned by the spatial index', async () => {
        // Both stops are in the same cell (y=1000); Stop Near is 0.222 km away, Stop Mid is 0.666 km away.
        await store.init(makeData([
            { nombre: 'Stop Near', lat: 10.002, lng: 10.0 },
            { nombre: 'Stop Mid',  lat: 10.006, lng: 10.0 },
        ]));
        const nearest = store.findNearest(10.0, 10.0);
        expect(nearest).toBe('stop near');
    });

    it('invokes spatialIndex.query and returns a non-empty candidate list on a spatial-index hit', async () => {
        await store.init(makeData([
            { nombre: 'Stop Alpha', lat: 10.005, lng: 10.0 },
        ]));

        const spatialIndex = (store as any).spatialIndex;
        const querySpy = vi.spyOn(spatialIndex, 'query');

        const nearest = store.findNearest(10.0, 10.0);

        expect(nearest).toBe('stop alpha');
        expect(querySpy).toHaveBeenCalledOnce();
        // Verify the spatial index actually returned candidates (fast path was exercised)
        const candidates = querySpy.mock.results[0].value as unknown[];
        expect(candidates.length).toBeGreaterThan(0);
    });

    it('falls back to global scan when all spatial-index candidates exceed the 1 km early-return threshold', async () => {
        // Stop at (10.011, 10.0) is in neighboring cell y=1001.
        // Haversine distance ≈ 1.22 km > 1.0 km → no early-return; global scan is used to confirm.
        await store.init(makeData([
            { nombre: 'Stop Beyond Threshold', lat: 10.011, lng: 10.0 },
        ]));
        const nearest = store.findNearest(10.0, 10.0);
        expect(nearest).toBe('stop beyond threshold');
    });
});
