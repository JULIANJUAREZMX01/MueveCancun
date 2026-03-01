import { bench, describe } from 'vitest';
import { CoordinatesStore } from '../../utils/CoordinatesStore';

// Generate 5000 random points in a 10x10 degree area (approx 1100km x 1100km)
const stops: any[] = [];
for (let i = 0; i < 5000; i++) {
    stops.push({
        nombre: `Stop ${i}`,
        lat: Math.random() * 10,
        lng: Math.random() * 10,
        orden: 1
    });
}

const mockData = {
    version: '1.0',
    rutas: [
        {
            id: 'R1',
            nombre: 'Ruta Test',
            paradas: stops
        }
    ]
};

// Initialize store
const store = CoordinatesStore.instance;

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
    bench('findNearest (random query)', () => {
        // Random point within the area
        const lat = Math.random() * 10;
        const lng = Math.random() * 10;
        store.findNearest(lat, lng);
    });

    bench('findNearest (close proximity)', () => {
        // Pick a known location from the dataset to ensure hit
        const stop = stops[2500];
        // Slight offset (approx 10m)
        store.findNearest(stop.lat + 0.0001, stop.lng + 0.0001);
    });
});
