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

// Synchronously populate the store to avoid async issues with bench runner
import { SpatialHash } from '../../utils/SpatialHash';
(store as any).db = {};

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
