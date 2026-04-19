import { bench, describe } from 'vitest';
import { getClosestLandmark } from '../../utils/utils';
import fs from 'fs';
import path from 'path';

// Mock fetch for the benchmark
const routesPath = path.resolve(__dirname, '../../../public/data/master_routes.optimized.json');
const routesData = JSON.parse(fs.readFileSync(routesPath, 'utf-8'));

global.fetch = async (url: string) => {
    if (url === '/data/master_routes.optimized.json') {
        return {
            ok: true,
            json: async () => routesData,
        } as Response;
    }
    throw new Error('Not found');
};

describe('getClosestLandmark Performance', () => {
    // Warm up and cache the catalog
    bench('getClosestLandmark - Baseline', async () => {
        // Cancun coordinates
        await getClosestLandmark(21.1619, -86.8515);
    }, { iterations: 100 });
});
