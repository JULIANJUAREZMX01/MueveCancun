import { bench, describe, beforeAll } from 'vitest';
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
// Use private API for testing setup
(CoordinatesStore as any).instance = store;

// We need to wait for init to complete before benchmarking
// However, `bench` runs immediately.
// But we can force synchronous population of `db` and `spatialIndex` for the test
// by manually invoking the logic, bypassing `init` async wrapper.

// Mock the internal logic of init
(store as any).db = {};
// Since CoordinatesStore imports SpatialHash, we assume it's available.
// We need to import SpatialHash to instantiate it manually?
// No, store has it internally. We can just use init, but wait.

// Let's try to run init and hope it finishes before bench starts?
// Unlikely.

// Better approach: Re-implement the population logic here synchronously.
import { SpatialHash } from '../../utils/SpatialHash';

(store as any).spatialIndex = new SpatialHash();
(store as any).allPoints = [];

mockData.rutas.forEach((route: any) => {
    route.paradas.forEach((stop: any) => {
        const key = stop.nombre.toLowerCase().trim();
        (store as any).db[key] = [stop.lat, stop.lng];
        (store as any).spatialIndex.insert(stop.lat, stop.lng, key);
        (store as any).allPoints.push({ name: key, lat: stop.lat, lng: stop.lng });
    });
});

describe('CoordinatesStore Performance', () => {
    bench('findNearest (random)', () => {
        const lat = Math.random() * 10;
        const lng = Math.random() * 10;
        store.findNearest(lat, lng);
    });
});
