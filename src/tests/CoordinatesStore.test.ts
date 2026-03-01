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

    it('should return correct nearest when spatial index has candidates in same cell', async () => {
        // Two stops very close together (same spatial hash cell, ~0.001 deg apart)
        const mockData = {
            version: '1.0',
            rutas: [
                {
                    id: 'R1',
                    nombre: 'Ruta 1',
                    tarifa: 10,
                    tipo: 'Bus',
                    paradas: [
                        { nombre: 'Stop Near', lat: 10.001, lng: 10.001, orden: 1 },
                        { nombre: 'Stop Nearer', lat: 10.0005, lng: 10.0005, orden: 2 }
                    ]
                }
            ]
        };

        await store.init(mockData);

        // Query point exactly at 10,10 — "Stop Nearer" is closer
        const nearest = store.findNearest(10.0, 10.0);
        expect(nearest).toBe('stop nearer');
    });

    it('should return correct nearest when candidate is in a neighboring cell', async () => {
        // Place one stop just across a cell boundary from the query point
        // Cell size is 0.01 deg. Query at 10.0, nearest stop at 10.009 (same or adjacent cell)
        // and a farther stop in a different cell
        const mockData = {
            version: '1.0',
            rutas: [
                {
                    id: 'R1',
                    nombre: 'Ruta 1',
                    tarifa: 10,
                    tipo: 'Bus',
                    paradas: [
                        { nombre: 'Adjacent Cell Stop', lat: 10.009, lng: 10.009, orden: 1 },
                        { nombre: 'Far Stop', lat: 20.0, lng: 20.0, orden: 2 }
                    ]
                }
            ]
        };

        await store.init(mockData);

        const nearest = store.findNearest(10.0, 10.0);
        expect(nearest).toBe('adjacent cell stop');
    });

    it('should return correct nearest when no stops are in spatial index neighborhood', async () => {
        // All stops are far from query point — spatial index query returns no candidates
        // Global fallback must find the correct nearest
        const mockData = {
            version: '1.0',
            rutas: [
                {
                    id: 'R1',
                    nombre: 'Ruta 1',
                    tarifa: 10,
                    tipo: 'Bus',
                    paradas: [
                        { nombre: 'Distant Stop A', lat: 80.0, lng: 80.0, orden: 1 },
                        { nombre: 'Distant Stop B', lat: 85.0, lng: 85.0, orden: 2 }
                    ]
                }
            ]
        };

        await store.init(mockData);

        // Query at 0,0 — neither stop is in the spatial index's 3x3 neighborhood
        // Global fallback should find "Distant Stop A" as nearer
        const nearest = store.findNearest(0.0, 0.0);
        expect(nearest).toBe('distant stop a');
    });
});
