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
});
