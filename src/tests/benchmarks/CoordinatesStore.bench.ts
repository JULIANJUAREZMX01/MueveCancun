import { bench, describe } from 'vitest';
import { CoordinatesStore } from '../../utils/CoordinatesStore';

describe('CoordinatesStore Benchmark', () => {
    const store = new CoordinatesStore();
    const stops = [];

    // Generate 10,000 stops in a 10x10 degree grid (approx 1000km x 1000km)
    // Lat: 0..10, Lng: 0..10.
    // 100x100 grid points.
    for (let i = 0; i < 100; i++) {
        for (let j = 0; j < 100; j++) {
            stops.push({
                nombre: `Stop_${i}_${j}`,
                lat: i / 10.0,
                lng: j / 10.0
            });
        }
    }

    const mockData = {
        rutas: [{
            id: 'R1',
            nombre: 'Route 1',
            paradas: stops
        }]
    };

    // Initialize store (Async setup is tricky in bench, so we check inside)
    let initialized = false;
    const ensureInit = async () => {
        if (!initialized) {
            await store.init(mockData);
            initialized = true;
        }
    };

    bench('findNearest (10k stops)', async () => {
        await ensureInit();
        // Query near (5.005, 5.005) - close to Stop_50_50 at (5.0, 5.0)
        // Distance approx 0.007 degrees (~700m)
        store.findNearest(5.005, 5.005);
    }, { time: 1000 });
});
