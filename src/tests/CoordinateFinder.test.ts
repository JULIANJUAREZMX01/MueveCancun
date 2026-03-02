 feature/coordinate-finder-tests-5146796998182803990
import { describe, it, expect, beforeEach } from 'vitest';
import { CoordinateFinder } from '../lib/CoordinateFinder';

describe('CoordinateFinder', () => {
    const mockDb: Record<string, [number, number]> = {
        'Plaza Las Américas': [21.1619, -86.8249],
        'Mercado 28': [21.1606, -86.8306],
        'ADO Centro': [21.1633, -86.8267],
        'Parque Las Palapas': [21.1622, -86.8275],
        'Playa Delfines': [21.0592, -86.7797],
        'Zona Hotelera Km 10': [21.1147, -86.7644],
        'Cancún Mall': [21.1730, -86.8480],
        'Hospital General': [21.1680, -86.8520],
        'Estadio Andrés Quintana Roo': [21.1517, -86.8375],
        'Punta Sam': [21.2464, -86.8042],
        'Puerto Juárez': [21.1831, -86.8061],
        'Terminal Marítima': [21.1835, -86.8065],
        'El Crucero': [21.1697, -86.8261],
        'Av. Tulum / Av. Cobá': [21.1601, -86.8247],
        'Superama Bonampak': [21.1578, -86.8239],
        'Walmart Nichupté': [21.1444, -86.8422],
        'Gran Plaza': [21.1481, -86.8506],
        'IMSS Cobá': [21.1625, -86.8286],
        'Mercado 23': [21.1681, -86.8258],
        'Parque Cancún': [21.1392, -86.8028],
        'La Isla Shopping Village': [21.1111, -86.7622],
        'Kukulcán Plaza': [21.1075, -86.7636],
        'Fórum By The Sea': [21.1333, -86.7481],
        'Playa Tortugas': [21.1422, -86.7725],
        'Isla Mujeres Ferry': [21.1831, -86.8061], // Same coords as Puerto Juárez
        'Aeropuerto Internacional de Cancún': [21.0403, -86.8736],
        'Ruta 4 / Mercado 28': [21.1606, -86.8306], // Same as Mercado 28
        'Ruta 5 / El Crucero': [21.1697, -86.8261], // Same as El Crucero
        'Ruta 15 / Plaza Las Américas': [21.1619, -86.8249], // Same as Plaza Las Américas
        'Ruta 44 / La Joya': [21.1211, -86.8856],
        'Ruta 69 / Corales': [21.1872, -86.8244],
        'Ruta 22 / Tierra Maya': [21.1417, -86.8922],
        'Ruta 11 / Villas del Mar': [21.1844, -86.9011],
        'Ruta 14 / Tres Reyes': [21.1022, -86.9156],
        'Ruta 237 / El Milagro': [21.1158, -86.8942],
        'Ruta 95-96 / Región 94': [21.1711, -86.8644],
        'Ruta 71 / Portillo': [21.1719, -86.8372],
        'Colegio de Bachilleres 1': [21.1575, -86.8436],
        'Universidad del Caribe': [21.2067, -86.8211],
        'Universidad Tecnológica de Cancún': [21.0544, -86.8528],
        'Instituto Tecnológico de Cancún': [21.1506, -86.8383],
        'CECYTE I': [21.1539, -86.8586],
        'CONALEP I': [21.1678, -86.8731],
        'Chedraui Portillo': [21.1722, -86.8369],
        'Soriana Híper Kabah': [21.1583, -86.8458],
        'Bodega Aurrerá Talleres': [21.1686, -86.8453],
        'Super Aki Crucero': [21.1697, -86.8261], // Same as El Crucero
        'Mega Soriana Tulum': [21.1581, -86.8250],
        'Plaza Outlet': [21.1567, -86.8483],
        'Malecón Tajamar': [21.1528, -86.8183],
        'Pabellón Cumbres': [21.1228, -86.8358],
        'Plaza Héroes': [21.1783, -86.8842],
        'Multiplaza Kabah': [21.1611, -86.8617],
        'Plaza Cancún 2000': [21.1656, -86.8333],
        'Jardines del Sur': [21.1219, -86.8522],
        'Polígono Sur': [21.1233, -86.8539],
        'Santa Fe': [21.1344, -86.8656],
        'Villas Otoch Paraíso': [21.1967, -86.8814],
        'Prado Norte': [21.2017, -86.8864],
        'Hacienda Real del Caribe': [21.1822, -86.8856],
        'Paseos del Mar': [21.2078, -86.8911],
        'Galaxias del Sol': [21.1983, -86.8983],
        'Aloja': [21.2033, -86.8967],
        'Vista Real': [21.1894, -86.8942],
        'Ciudad Natura': [21.2117, -86.8928],
        'La Joya': [21.1211, -86.8856], // Same as Ruta 44 / La Joya
        'Tierra Maya': [21.1417, -86.8922], // Same as Ruta 22 / Tierra Maya
        'Villas del Mar': [21.1844, -86.9011], // Same as Ruta 11 / Villas del Mar
        'Tres Reyes': [21.1022, -86.9156], // Same as Ruta 14 / Tres Reyes
        'El Milagro': [21.1158, -86.8942], // Same as Ruta 237 / El Milagro
        'Corales': [21.1872, -86.8244], // Same as Ruta 69 / Corales
        'Puerto Cancún': [21.1636, -86.8122],
        'Marina Town Center': [21.1644, -86.8111],
        'Playa Langosta': [21.1406, -86.7847],
        'Playa Pez Volador': [21.1417, -86.7792],
        'Playa Linda': [21.1428, -86.7867],
        'Playa Caracol': [21.1378, -86.7492],
        'Playa Gaviota Azul': [21.1328, -86.7481],
        'Playa Chac Mool': [21.1294, -86.7497],
        'Playa Marlin': [21.1083, -86.7628],
        'Playa Ballenas': [21.0967, -86.7675],
        'Playa Coral': [21.0361, -86.7892],
        'Ventura Park': [21.0364, -86.7894],
        'Moon Palace': [20.9753, -86.8525],
        'Vidanta Riviera Maya': [20.7303, -86.9536],
        'Xoximilco': [20.9419, -86.8667],
        'Croco Cun Zoo': [20.8872, -86.8833],
        'Jardín Botánico Dr. Alfredo Barrera Marín': [20.8425, -86.8967],
        'Puerto Morelos (Centro)': [20.8483, -86.8744],
        'Ruta de los Cenotes': [20.8522, -86.8975],
        'Leona Vicario': [20.9950, -87.1992],
        'Valladolid Nuevo': [21.0289, -87.4117],
        'Agua Holbox': [21.5239, -87.3822],
        'Chiquilá': [21.4361, -87.2650],
        'Kantunilkín': [21.0950, -87.4983],
        'El Ideal': [21.0428, -87.5681],
        'Ignacio Zaragoza (KM 80)': [21.0028, -87.6742],
        'Cristóbal Colón': [20.9572, -87.8094],
        'Piste': [20.6975, -88.5833], // Near Chichén Itzá
        'Chichén Itzá': [20.6843, -88.5678],
        'Mérida (Centro)': [20.9674, -89.6236]
    };

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
             const emptyFinder = new CoordinateFinder({});
             expect(emptyFinder.find('Plaza Las Américas')).toBeNull();
             expect(emptyFinder.findBestMatch('Plaza Las Américas')).toBeNull();
             expect(emptyFinder.search('Plaza Las Américas')).toEqual([]);
        });

import { describe, it, expect } from 'vitest';
import { CoordinateFinder } from '../utils/CoordinateFinder';

describe('CoordinateFinder', () => {
    const db = new Map<string, [number, number]>([
        ['Plaza Las Americas', [21.145, -86.825]],
        ['Mercado 28', [21.160, -86.828]],
        ['Zona Hotelera', [21.135, -86.750]],
        ['Cancun Mall', [21.165, -86.825]],
    ]);

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
 main
    });
});
