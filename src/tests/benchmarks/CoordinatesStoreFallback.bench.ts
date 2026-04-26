import { bench, describe } from 'vitest';
import { CoordinatesStore } from '../../utils/CoordinatesStore';

const store = new CoordinatesStore();

const stops: { lat: number, lng: number, nombre: string }[] = [];
for (let i = 0; i < 10000; i++) {
    stops.push({
        lat: 21.0 + Math.random(),
        lng: -87.0 + Math.random(),
        nombre: `Stop-${i}`
    });
}

const mockData = {
    rutas: [
        {
            id: 'bench-route',
            nombre: 'Benchmark Route',
            paradas: stops
        }
    ]
};

await store.init(mockData);

describe('CoordinatesStore.findNearest Fallback', () => {
    bench('findNearest (spatial hash hit)', () => {
        store.findNearestWithDistance(21.5, -86.5);
    });

    bench('findNearest (fallback - far away)', () => {
        // This point is far from the 21-22, -87 to -86 range
        store.findNearestWithDistance(0, 0);
    });
});
