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
        // utils/CoordinatesStore stores as { lat, lng } with lowercase keys
        expect(store.getDB()!['stop a']).toEqual({ lat: 10, lng: 10 });
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
        expect(store.getDB()!['stop b']).toEqual({ lat: 20, lng: 20 });
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

    it('should exercise SpatialHash fast-path when query is in same/adjacent cell', async () => {
        // SpatialHash uses cellSize=0.01 degrees; a query within 0.005 degrees lands in the same cell
        const mockData = {
            version: '1.0',
            rutas: [
                {
                    id: 'R1',
                    nombre: 'Ruta 1',
                    tarifa: 10,
                    tipo: 'Bus',
                    paradas: [
                        { nombre: 'Stop Nearby', lat: 21.1, lng: -86.8, orden: 1 },
                        { nombre: 'Stop Distant', lat: 21.9, lng: -86.1, orden: 2 }
                    ]
                }
            ]
        };

        await store.init(mockData);

        // Query within the same spatial cell as 'Stop Nearby' (offset by 0.001 degrees)
        const nearest = store.findNearest(21.1 + 0.001, -86.8 + 0.001);
        expect(nearest).toBe('stop nearby');
    });

    it('should not accumulate duplicates when init is called multiple times', async () => {
        const mockData = {
            version: '1.0',
            rutas: [
                {
                    id: 'R1',
                    nombre: 'Ruta 1',
                    tarifa: 10,
                    tipo: 'Bus',
                    paradas: [
                        { nombre: 'Stop A', lat: 10, lng: 10, orden: 1 },
                        { nombre: 'Stop B', lat: 20, lng: 20, orden: 2 }
                    ]
                }
            ]
        };

        await store.init(mockData);
        await store.init(mockData);

        // If allPoints accumulated duplicates, findNearest could still return
        // the right stop but the DB should only have one entry per stop name.
        expect(Object.keys(store.getDB()!).length).toBe(2);
        // findNearest should still return the correct result after multiple inits
        expect(store.findNearest(10.1, 10.1)).toBe('stop a');
    });
});
