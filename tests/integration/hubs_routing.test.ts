import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Hub-to-Hub Routing Integration', () => {
    type RouteResult = { legs?: unknown[] };
    let find_route: (origin: string, destination: string) => RouteResult[] = () => [];
    let wasmReady = false;

    beforeAll(async () => {
        const wasmPath = path.resolve(__dirname, '../../public/wasm/route-calculator/route_calculator_bg.wasm');
        const jsGluePath = path.resolve(__dirname, '../../public/wasm/route-calculator/route_calculator.js');
        const routesPath = path.resolve(__dirname, '../../public/data/master_routes.optimized.json');

        if (!fs.existsSync(wasmPath) || !fs.existsSync(jsGluePath)) {
            console.warn('[hubs_routing.test] WASM artifacts missing, skipping integration assertions.');
            return;
        }

        const wasmModule = await import('../../public/wasm/route-calculator/route_calculator.js');
        await wasmModule.default(fs.readFileSync(wasmPath));
        const catalog = fs.readFileSync(routesPath, 'utf8');
        wasmModule.load_catalog(catalog);
        find_route = wasmModule.find_route;
        wasmReady = true;
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
                if (!wasmReady) return;
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
