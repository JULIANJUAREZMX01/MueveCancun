import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoordinatesStore } from './CoordinatesStore';

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('CoordinatesStore', () => {
    let store: CoordinatesStore;

    beforeEach(() => {
        store = new CoordinatesStore();
        fetchMock.mockReset();
    });

    it('should initialize with provided data and NOT fetch', async () => {
        const sampleData = {
            rutas: [
                {
                    paradas: [
                        { nombre: "Stop A", lat: 21.0, lng: -86.0 }
                    ]
                }
            ]
        };

        await store.init(sampleData);

        expect(fetchMock).not.toHaveBeenCalled();
        expect(store.findNearest(21.0, -86.0)).toBe("Stop A");
    });

    it('should initialize via fetch if NO data provided', async () => {
        const sampleData = {
            rutas: [
                {
                    paradas: [
                        { nombre: "Stop B", lat: 21.1, lng: -86.1 }
                    ]
                }
            ]
        };

        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => sampleData
        });

        await store.init();

        expect(fetchMock).toHaveBeenCalledWith('/data/master_routes.json');
        expect(store.findNearest(21.1, -86.1)).toBe("Stop B");
    });
});
