import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch before importing utils
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('getClosestLandmark', () => {
    beforeEach(async () => {
        mockFetch.mockReset();
        vi.resetModules();
    });

    it('should find the closest stop from the catalog', async () => {
        const { getClosestLandmark } = await import('../utils/utils');
        const mockData = {
            rutas: [
                {
                    id: 'R1',
                    nombre: 'Ruta 1',
                    paradas: [
                        { nombre: 'Far Stop', lat: 21.0, lng: -86.0 },
                        { nombre: 'Near Stop', lat: 21.1, lng: -86.8 }
                    ]
                }
            ]
        };

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => mockData
        });

        // Query point near "Near Stop" (21.1, -86.8)
        const result = await getClosestLandmark(21.101, -86.801);

        expect(result).not.toBeNull();
        expect(result.nombre).toBe('Near Stop');
    });

    it('should handle duplicate stops across different routes and find the closest', async () => {
        const { getClosestLandmark } = await import('../utils/utils');
        const mockData = {
            rutas: [
                {
                    id: 'R1',
                    nombre: 'Ruta 1',
                    paradas: [
                        { nombre: 'Shared Stop', lat: 21.1, lng: -86.8 }
                    ]
                },
                {
                    id: 'R2',
                    nombre: 'Ruta 2',
                    paradas: [
                        { nombre: 'Shared Stop', lat: 21.1, lng: -86.8 },
                        { nombre: 'Other Stop', lat: 21.2, lng: -86.9 }
                    ]
                }
            ]
        };

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => mockData
        });

        const result = await getClosestLandmark(21.101, -86.801);
        expect(result.nombre).toBe('Shared Stop');
    });

    it('should return null if catalog is empty', async () => {
        const { getClosestLandmark } = await import('../utils/utils');
        const mockData = {
            rutas: []
        };

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => mockData
        });

        const result = await getClosestLandmark(21.101, -86.801);
        expect(result).toBeNull();
    });
});
