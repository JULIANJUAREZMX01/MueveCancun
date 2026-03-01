import { bench, describe } from 'vitest';
import { CoordinatesStore } from '../../utils/CoordinatesStore';

// Use a fresh CoordinatesStore instance for benchmarking to avoid interference from the shared singleton.
// The module exports both the CoordinatesStore class and a singleton `coordinatesStore`; here we use a separate instance.
const store = new CoordinatesStore();

// Generate 10,000 random stops
const stops: { lat: number, lng: number, nombre: string }[] = [];
for (let i = 0; i < 10000; i++) {
    stops.push({
        lat: 21.0 + Math.random(), // 21.0 to 22.0
        lng: -87.0 + Math.random(), // -87.0 to -86.0
        nombre: `Stop-${i}`
    });
}

// Mock Data Structure
const mockData = {
    rutas: [
        {
            id: 'bench-route',
            nombre: 'Benchmark Route',
            paradas: stops
        }
    ]
};

// Initialize Store
await store.init(mockData);

describe('CoordinatesStore.findNearest', () => {
    bench('findNearest (dense area)', () => {
        // Search near center
        store.findNearest(21.5, -86.5);
    });

    bench('findNearest (edge case)', () => {
        // Search at edge
        store.findNearest(21.0, -87.0);
    });
});
