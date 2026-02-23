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
