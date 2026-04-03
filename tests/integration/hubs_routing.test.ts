import { describe, it, expect, beforeAll } from 'vitest';
import init, { load_catalog, find_route } from '../../public/wasm/route-calculator/route_calculator.js';
import fs from 'fs';
import path from 'path';

describe('Hub-to-Hub Routing Integration', () => {
    beforeAll(async () => {
        const wasmPath = path.resolve(__dirname, '../../public/wasm/route-calculator/route_calculator_bg.wasm');
        const routesPath = path.resolve(__dirname, '../../public/data/master_routes.optimized.json');

        await init(fs.readFileSync(wasmPath));
        const catalog = fs.readFileSync(routesPath, 'utf8');
        load_catalog(catalog);
    });

    const hubs = [
        "El Crucero",
        "Terminal ADO Cancún Centro",
        "Plaza Las Américas",
        "Mercado 28",
        "Muelle Ultramar (Puerto Juárez)"
    ];

    // Some hubs have slight variations in the catalog
    const hubAliases: Record<string, string[]> = {
        "Terminal ADO Cancún Centro": ["Terminal ADO Centro Cancún", "Terminal ADO Centro", "Terminal ADO Cancún Centro"]
    };

    const findAnyHubResult = (origin: string, destination: string) => {
        const origins = hubAliases[origin] || [origin];
        const destinations = hubAliases[destination] || [destination];

        for (const o of origins) {
            for (const d of destinations) {
                const results = find_route(o, d);
                if (results && results.length > 0) return results;
            }
        }
        return [];
    };

    hubs.forEach(origin => {
        hubs.forEach(destination => {
            if (origin === destination) return;

            it(`Should find at least one route from ${origin} to ${destination}`, () => {
                const results = findAnyHubResult(origin, destination);
                expect(results).toBeDefined();
                expect(results.length).toBeGreaterThan(0);

                const firstResult = results[0];
                expect(firstResult.legs).toBeDefined();
                expect(firstResult.legs.length).toBeGreaterThan(0);
            });
        });
    });
});
