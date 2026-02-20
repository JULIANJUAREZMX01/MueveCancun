import { bench, describe } from 'vitest';
import { CoordinatesStore } from '../../utils/CoordinatesStore';

// Create a fresh instance for benchmarking to avoid singleton pollution
// But the class exports a singleton instance.
// However, the class itself is exported. Wait, looking at file:
// export class CoordinatesStore { ... }
// export const coordinatesStore = CoordinatesStore.instance;

// I can instantiate a new one if I import the class.
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
