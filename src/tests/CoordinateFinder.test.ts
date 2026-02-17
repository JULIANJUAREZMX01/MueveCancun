import { describe, it, expect } from 'vitest';
import { CoordinateFinder } from '../utils/CoordinateFinder';

describe('CoordinateFinder', () => {
    const db = {
        'Plaza Las Americas': [21.145, -86.825] as [number, number],
        'Mercado 28': [21.160, -86.828] as [number, number],
        'Zona Hotelera': [21.135, -86.750] as [number, number],
        'Cancun Mall': [21.165, -86.825] as [number, number],
    };

    const finder = new CoordinateFinder(db);

    it('should find exact match', () => {
        const result = finder.search('Plaza Las Americas');
        expect(result[0].name).toBe('Plaza Las Americas');
    });

    it('should find partial match (case insensitive)', () => {
        const result = finder.search('plaza');
        expect(result.some(r => r.name === 'Plaza Las Americas')).toBe(true);
    });

    it('should find match by part of name', () => {
        const result = finder.search('mercado');
        expect(result.some(r => r.name === 'Mercado 28')).toBe(true);
    });

    it('should find match in middle of name', () => {
         const result = finder.search('Las');
         expect(result.some(r => r.name === 'Plaza Las Americas')).toBe(true);
    });

    it('should handle empty or short queries', () => {
        expect(finder.search('')).toEqual([]);
        expect(finder.search('a')).toEqual([]);
    });
});
