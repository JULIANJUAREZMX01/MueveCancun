import { getDistance } from "./utils";
import { SpatialHash } from "./SpatialHash";

// Define Types
type Coordinate = { name: string; lat: number; lng: number };

type RouteData = {
    id: string;
    nombre: string;
    paradas: {
        lat: number;
        lng: number;
        nombre: string;
    }[];
};

export class CoordinatesStore {
    private db: { [key: string]: { lat: number; lng: number } } | null = null;
    private spatialIndex: SpatialHash<string> | null = null;
    private loadingPromise: Promise<{ text: string, data: any }> | null = null;
    private allPoints: Coordinate[] = [];

    static instance = new CoordinatesStore();

    async init(initialData?: any): Promise<{ text: string, data: any }> {
        if (this.loadingPromise && !initialData) return this.loadingPromise;

        this.loadingPromise = (async () => {
            try {
                let data = initialData;
                let text = "";

                if (data) {
                    console.log("[CoordinatesStore] ⚡ Using injected data (Skipped Fetch)");
                    text = JSON.stringify(data);
                } else {
                    console.log("[CoordinatesStore] 🌍 Fetching master routes for coordinates...");
                    const res = await fetch('/data/master_routes.json');
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    text = await res.text();
                    data = JSON.parse(text);
                }

                this.db = {};
                this.spatialIndex = new SpatialHash(); // Initialize SpatialHash
                
                if (data.rutas) {
                    data.rutas.forEach((route: RouteData) => {
                        route.paradas.forEach(stop => {
                            // Normalize Key
                            const key = stop.nombre.toLowerCase().trim();
                            if (this.db) this.db[key] = { lat: stop.lat, lng: stop.lng };
                        });
                    });
                }
                // Populate Spatial Index and List
                if (this.db) {
                    Object.entries(this.db).forEach(([name, coords]) => {
                         const lat = coords.lat;
                         const lng = coords.lng;
                         if (this.spatialIndex) this.spatialIndex.insert(lat, lng, name);
                         this.allPoints.push({ name: name, lat, lng } as any);
                    });
                }
                console.log(`[CoordinatesStore] Indexed ${Object.keys(this.db || {}).length} stops.`);
                return { text, data };
            } catch (e) {
                console.error("[CoordinatesStore] Failed to load data", e);
                return { text: "{}", data: {} };
            }
        })();

        return this.loadingPromise;
    }

    getCoordinates(stopName: string) {
        if (!this.db) return null;
        const key = stopName.toLowerCase().trim();
        return this.db[key] || null;
    }

    getDB() {
        return this.db;
    }

    findNearest(lat: number, lng: number): string | null {
        if (!this.db) return null;

        // Track the current best candidate and distance
        let minDist = Infinity;
        let nearest: string | null = null;

        // 1. Try Spatial Index (O(1)) as an optimization to get an initial best candidate
        if (this.spatialIndex) {
            const candidates = this.spatialIndex.query(lat, lng);
            if (candidates.length > 0) {
                for (const point of candidates) {
                    const d = getDistance(lat, lng, point.lat, point.lng);
                    if (d < minDist) {
                        minDist = d;
                        // SpatialHash stores the stop name in point.data
                        nearest = point.data;
                    }
                }
            }
        }

        // 2. Fallback: Linear Scan (O(N))
        // Always run this to guarantee we find the true nearest stop, even if it's
        // outside the spatial grid cells considered by the spatial index.

        // Rebuild the list of points from the current DB to avoid relying on any
        // potentially stale or duplicated state that may exist in this.allPoints.
        const points: Coordinate[] = [];
        const routes = this.db as RouteData[];
        for (let r = 0; r < routes.length; r++) {
            const route = routes[r];
            for (let s = 0; s < route.paradas.length; s++) {
                const stop = route.paradas[s];
                points.push({
                    name: stop.nombre,
                    lat: stop.lat,
                    lng: stop.lng,
                });
            }
        }
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const d = getDistance(lat, lng, p.lat, p.lng);
            if (d < minDist) {
                minDist = d;
                nearest = p.name;
            }
        }
        return nearest;
    }
}

export const coordinatesStore = CoordinatesStore.instance;
