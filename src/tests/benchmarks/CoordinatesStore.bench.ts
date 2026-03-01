speedy-coords-optimization-15533773443829542511
import { describe, it, expect, bench } from 'vitest';
import { CoordinatesStore } from '../../utils/CoordinatesStore';
import { SpatialHash } from '../../utils/SpatialHash';
import { getDistance } from '../../utils/utils';

// Mock data generator
function generateMockData(count: number) {
    const routes = [];
    for (let i = 0; i < count; i++) {
        routes.push({
            id: `route_${i}`,
            nombre: `Route ${i}`,
            paradas: [
                { lat: 21.16 + (Math.random() - 0.5) * 0.1, lng: -86.85 + (Math.random() - 0.5) * 0.1, nombre: `Stop ${i}_A` },
                { lat: 21.17 + (Math.random() - 0.5) * 0.1, lng: -86.84 + (Math.random() - 0.5) * 0.1, nombre: `Stop ${i}_B` },
            ]
        });
    }
    return { routes };
}

describe('CoordinatesStore Benchmark', () => {
    const store = new CoordinatesStore();
    // 500 routes * 20 stops = 10,000 stops
    const mockData = { rutas: [] };
    for (let i = 0; i < 500; i++) {
        mockData.rutas.push({
            id: `route_${i}`,
            nombre: `Route ${i}`,
            paradas: Array.from({ length: 20 }, (_, j) => ({
                 lat: 21.10 + Math.random() * 0.2, // ~20km spread
                 lng: -86.90 + Math.random() * 0.2,
                 nombre: `Stop ${i}_${j}`
            }))
        });
    }

    // Initialize mock store data synchronously
    (store as any).db = {};
    (store as any).spatialIndex = new SpatialHash();
    (store as any).allPoints = [];

    mockData.rutas.forEach(route => {
        route.paradas.forEach(stop => {
            const key = stop.nombre;
            (store as any).db[key] = [stop.lat, stop.lng];
            (store as any).spatialIndex.insert(stop.lat, stop.lng, key);
            (store as any).allPoints.push({ name: key, lat: stop.lat, lng: stop.lng });
        });
    });

    // Benchmark New Implementation (Optimized via SpatialHash)
    bench('findNearest (Optimized)', () => {
        store.findNearest(21.1619, -86.8515);
    });

    // Benchmark Old Implementation (Linear Scan Simulation)
    bench('Linear Scan (Legacy)', () => {
        // Simulate the old O(N) behavior
        const allPoints = (store as any).allPoints;
        let minDist = Infinity;
        let nearest = null;

        for (const point of allPoints) {
            // Use getDistance (Haversine) to match actual legacy cost
            const d = getDistance(21.1619, -86.8515, point.lat, point.lng);
            if (d < minDist) {
                minDist = d;
                nearest = point.name;
            }
        }
      
import { bench, describe } from 'vitest';
import { CoordinatesStore } from '../../utils/CoordinatesStore';

// Generate 5000 random points in a 10x10 degree area (approx 1000km x 1000km)
const points: any[] = [];
for (let i = 0; i < 5000; i++) {
    const lat = Math.random() * 10;
    const lng = Math.random() * 10;
    points.push({
        id: `route-${i}`,
        nombre: `Route ${i}`,
        paradas: [{ lat, lng, nombre: `Stop ${i}` }]
    });
}

const mockData = {
    version: '1.0',
    rutas: points
};

const store = new CoordinatesStore();

// Initialize the store once before running benchmarks, using the real init path
beforeAll(async () => {
    await store.init(mockData as any);
});

describe('CoordinatesStore Performance', () => {
    bench('findNearest (random)', () => {
        const lat = Math.random() * 10;
        const lng = Math.random() * 10;
        store.findNearest(lat, lng);
main
    });
});
