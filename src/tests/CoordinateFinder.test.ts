import { describe, it, expect, beforeEach } from 'vitest';
import { CoordinateFinder } from '../utils/CoordinateFinder';

describe('CoordinateFinder', () => {
    const mockDb = new Map([
        ['Plaza Las Américas', [21.145, -86.825] as [number, number]],
        ['Mercado 28', [21.160, -86.828] as [number, number]],
        ['Zona Hotelera', [21.135, -86.750] as [number, number]],
        ['Cancún Mall', [21.165, -86.825] as [number, number]],
        ['Cancún Centro', [21.160, -86.830] as [number, number]],
        ['Playa del Carmen', [20.6296, -87.0739] as [number, number]],
        ['Tulum', [20.2114, -87.4653] as [number, number]],
        ['Puerto Morelos', [20.8467, -86.8756] as [number, number]],
        ['Valladolid', [20.6896, -88.2017] as [number, number]],
        ['Chichén Itzá', [20.6843, -88.5678] as [number, number]],
        ['Mérida (Centro)', [20.9674, -89.6236] as [number, number]]
    ]);

    let finder: CoordinateFinder;

    beforeEach(() => {
        finder = new CoordinateFinder(mockDb);
    });

    describe('find', () => {
        it('should return exact match', () => {
            const coords = finder.find('Plaza Las Américas');
            expect(coords).toEqual([21.145, -86.825]);
        });

        it('should return null for non-existent stop', () => {
            expect(finder.find('DoesNotExist')).toBeNull();
        });
    });

    describe('search', () => {
        it('should return exact matches first', () => {
            const results = finder.search('Plaza Las Américas');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].name).toBe('Plaza Las Américas');
        });

        it('should respect the limit parameter', () => {
            const results = finder.search('a', 2);
            expect(results.length).toBeLessThanOrEqual(2);
        });
    });
});
