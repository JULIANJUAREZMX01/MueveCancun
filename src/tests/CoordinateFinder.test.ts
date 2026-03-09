
import { describe, it, expect, beforeEach } from 'vitest';
import { CoordinateFinder } from '../utils/CoordinateFinder';

describe('CoordinateFinder', () => {
    const mockDb = new Map<string, [number, number]>([
        ['Plaza Las Américas', [21.1619, -86.8249]],
        ['Mercado 28', [21.1606, -86.8306]],
        ['ADO Centro', [21.1633, -86.8267]],
        ['Parque Las Palapas', [21.1622, -86.8275]],
        ['Playa Delfines', [21.0592, -86.7797]],
        ['Zona Hotelera Km 10', [21.1147, -86.7644]],
        ['Cancún Mall', [21.1730, -86.8480]],
        ['Hospital General', [21.1680, -86.8520]],
        ['Estadio Andrés Quintana Roo', [21.1517, -86.8375]],
        ['Punta Sam', [21.2464, -86.8042]],
        ['Puerto Juárez', [21.1831, -86.8061]],
        ['Terminal Marítima', [21.1835, -86.8065]],
        ['El Crucero', [21.1697, -86.8261]],
        ['Av. Tulum / Av. Cobá', [21.1601, -86.8247]],
        ['Superama Bonampak', [21.1578, -86.8239]],
        ['Walmart Nichupté', [21.1444, -86.8422]],
        ['Gran Plaza', [21.1481, -86.8506]],
        ['IMSS Cobá', [21.1625, -86.8286]],
        ['Mercado 23', [21.1681, -86.8258]],
        ['Parque Cancún', [21.1392, -86.8028]],
        ['La Isla Shopping Village', [21.1111, -86.7622]],
        ['Kukulcán Plaza', [21.1075, -86.7636]],
        ['Fórum By The Sea', [21.1333, -86.7481]],
        ['Playa Tortugas', [21.1422, -86.7725]],
        ['Playa Langosta', [21.1461, -86.7925]],
        ['Playa Caracol', [21.1389, -86.7461]],
        ['Coco Bongo', [21.1328, -86.7478]],
        ['Hard Rock Café', [21.1325, -86.7472]],
        ['Aquarium Cancún', [21.1119, -86.7619]],
        ['Museo Maya de Cancún', [21.0733, -86.7761]],
        ['Ruinas El Rey', [21.0608, -86.7792]],
        ['Ventura Park', [21.0347, -86.7842]],
        ['Moon Palace', [20.9639, -86.8181]],
        ['Aeropuerto Internacional de Cancún (CUN)', [21.0400, -86.8744]],
        ['Universidad del Caribe (Unicaribe)', [21.2067, -86.8250]],
        ['Universidad Tecnológica de Cancún (UT)', [21.0689, -86.8431]],
        ['Instituto Tecnológico de Cancún (ITC)', [21.1511, -86.8422]],
        ['Universidad Anáhuac Cancún', [21.0711, -86.8464]],
        ['La Salle Cancún', [21.0772, -86.8450]],
        ['Polígono Sur', [21.1250, -86.8833]],
        ['Villas Otoch Paraíso', [21.1889, -86.8889]],
        ['Prado Norte', [21.1917, -86.9000]],
        ['Hacienda Real del Caribe', [21.1833, -86.8750]],
        ['Ciudad Jardín', [21.1950, -86.8500]],
        ['Tierra Maya', [21.1800, -86.8900]],
        ['Villas del Mar', [21.1850, -86.8800]],
        ['La Joya', [21.1150, -86.8650]],
        ['Santa Fe', [21.1189, -86.8700]],
        ['Puerto Morelos (Colonia Cetina Gasca)', [20.8464, -86.9039]],
        ['Puerto Morelos (Ventana al Mar)', [20.8475, -86.8753]],
        ['Ruta de los Cenotes', [20.8522, -86.8975]],
        ['Leona Vicario', [20.9950, -87.1992]],
        ['Valladolid Nuevo', [21.0289, -87.4117]],
        ['Agua Holbox', [21.5239, -87.3822]],
        ['Chiquilá', [21.4361, -87.2650]],
        ['Kantunilkín', [21.0950, -87.4983]],
        ['El Ideal', [21.0428, -87.5681]],
        ['Ignacio Zaragoza (KM 80)', [21.0028, -87.6742]],
        ['Cristóbal Colón', [20.9572, -87.8094]],
        ['Piste', [20.6975, -88.5833]],
        ['Chichén Itzá', [20.6843, -88.5678]],
        ['Mérida (Centro)', [20.9674, -89.6236]],
        ['Ruta 44 / La Joya', [21.1606, -86.8306]],
        ['Ruta 4 / Mercado 28', [21.1606, -86.8306]],
    ]);

    let finder: CoordinateFinder;

    beforeEach(() => {
        finder = new CoordinateFinder(mockDb);
    });

    describe('find', () => {
        it('should return exact match', () => {
            const coords = finder.find('Plaza Las Américas');
            expect(coords).toEqual([21.1619, -86.8249]);
        });

        it('should be case insensitive', () => {
            const coords = finder.find('plaza las amÉricas');
            expect(coords).toEqual([21.1619, -86.8249]);
        });

        it('should handle token matching', () => {
             const coords = finder.find('Américas Plaza');
             expect(coords).toEqual([21.1619, -86.8249]);
        });

        it('should handle partial words (fuzzy search)', () => {
             const coords = finder.find('Delfines');
             expect(coords).toEqual([21.0592, -86.7797]);
        });

        it('should return null for non-existent stop', () => {
            const coords = finder.find('Non-Existent Stop');
            expect(coords).toBeNull();
        });

        it('should handle empty string', () => {
            const coords = finder.find('');
            expect(coords).toBeNull();
        });

        it('should populate the cache on fuzzy match and return from cache on repeat call', () => {
            // 'Américas Plaza' is not an exact key, so it goes through fuzzy search
            const query = 'Américas Plaza';
            expect((finder as any).cache.has(query)).toBe(false);

            const result1 = finder.find(query);
            expect(result1).toEqual([21.1619, -86.8249]);

            // Cache should now contain the result
            expect((finder as any).cache.has(query)).toBe(true);

            // Second call should return the same result (served from cache)
            const result2 = finder.find(query);
            expect(result2).toEqual([21.1619, -86.8249]);
        });
    });

    describe('findBestMatch', () => {
         it('should return exact match with name', () => {
             const match = finder.findBestMatch('Plaza Las Américas');
             expect(match).toEqual({ name: 'Plaza Las Américas', coords: [21.1619, -86.8249] });
         });
    });

    describe('search', () => {
        it('should return exact matches first', () => {
            const results = finder.search('Plaza Las Américas');
            expect(results[0].name).toBe('Plaza Las Américas');
        });

        it('should return results that start with the query next', () => {
            const results = finder.search('Plaza');
            // 'Plaza' should match 'Plaza Outlet', 'Plaza Héroes', 'Plaza Las Américas', etc.
            // All of them start with 'Plaza' so they should come before 'Gran Plaza'
            const firstResultIndex = results.findIndex(r => r.name.startsWith('Plaza'));
            const granPlazaIndex = results.findIndex(r => r.name === 'Gran Plaza');

            // Limit is 5 by default, so Gran Plaza might not even be in the results
            if (granPlazaIndex !== -1) {
                expect(firstResultIndex).toBeLessThan(granPlazaIndex);
            }
            expect(firstResultIndex).toBe(0); // The first result should start with Plaza
        });

        it('should return results based on length', () => {
            const results = finder.search('Ruta 4');
            // Both 'Ruta 4 / Mercado 28' and 'Ruta 44 / La Joya' start with 'ruta 4'
            // When startsWith is tied, the shorter name comes first
            // 'Ruta 44 / La Joya' (17 chars) is shorter than 'Ruta 4 / Mercado 28' (19 chars)
            const ruta44Index = results.findIndex(r => r.name === 'Ruta 44 / La Joya');
            const ruta4Index = results.findIndex(r => r.name === 'Ruta 4 / Mercado 28');

            expect(ruta44Index).not.toBe(-1);
            expect(ruta4Index).not.toBe(-1);

            // Shorter name should rank higher
            expect(ruta44Index).toBeLessThan(ruta4Index);
        });

        it('should handle Direct Substring Fallback for short queries', () => {
            // Direct substring check — bypasses token index for short/partial queries
            // The token index requires tokens >= 3 length. So searching for "km"
            // relies entirely on the direct substring check.
            const results = finder.search('km');
            expect(results.length).toBeGreaterThan(0);
            expect(results.some(r => r.name.toLowerCase().includes('km'))).toBe(true);
        });

        it('should respect the limit parameter', () => {
            const results = finder.search('Plaza', 3);
            expect(results.length).toBe(3);
        });

        it('should handle empty query', () => {
            const results = finder.search('');
            expect(results).toEqual([]);
        });

        it('should handle very short queries that do not match direct substring', () => {
            const results = finder.search('z'); // Length < 2 should return [] according to the code
            expect(results).toEqual([]);
        });

        it('should handle Spanish accents in query', () => {
            const results = finder.search('Américas');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].name).toBe('Plaza Las Américas');
        });
    });

    describe('uninitialized state', () => {
        it('should not throw if db is empty and searches are made', () => {
             const emptyFinder = new CoordinateFinder(new Map());
             expect(emptyFinder.find('Plaza Las Américas')).toBeNull();
             expect(emptyFinder.findBestMatch('Plaza Las Américas')).toBeNull();
             expect(emptyFinder.search('Plaza Las Américas')).toEqual([]);
        });    });
});
