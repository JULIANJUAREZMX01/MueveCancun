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

describe('CoordinatesStore Performance', () => {
    const store = new CoordinatesStore();

    beforeAll(async () => {
        await store.init(mockData);
    });

    bench('findNearest (random)', () => {
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
