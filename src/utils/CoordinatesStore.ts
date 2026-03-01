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
    private db: { [key: string]: [number, number] } | null = null;
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
                this.spatialIndex = new SpatialHash<string>(); // Initialize SpatialHash
                this.allPoints = []; // Clear on re-init to prevent duplicates
                
                if (data.rutas) {
                    data.rutas.forEach((route: RouteData) => {
                        route.paradas.forEach(stop => {
                            // Normalize Key
                            const key = stop.nombre.toLowerCase().trim();
                            if (this.db) this.db[key] = [stop.lat, stop.lng];
                        });
                    });
                }
                // Populate Spatial Index and List
                if (this.db) {
                    Object.entries(this.db).forEach(([name, coords]) => {
                         const lat = coords[0];
                         const lng = coords[1];
                         if (this.spatialIndex) this.spatialIndex.insert(lat, lng, name);
                         this.allPoints.push({ name, lat, lng });
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
        if (!this.db || !this.spatialIndex) return null;

        // Optimization: Use Spatial Hash for O(1) query
        const candidates = this.spatialIndex.query(lat, lng);
        let minDist = Infinity;
        let nearest = null;

        if (candidates.length > 0) {
            // Search candidates (SpatialHash structure: { lat, lng, data })
            for (const point of candidates) {
                const d = getDistance(lat, lng, point.lat, point.lng);
                if (d < minDist) {
                    minDist = d;
                    nearest = point.data;
                }
            }
        } else {
            // Fallback: Linear scan all points (allPoints structure: { name, lat, lng })
            // This happens only if no stops are within the spatial grid cells (~3km area)
            for (const point of this.allPoints) {
                const d = getDistance(lat, lng, point.lat, point.lng);
                if (d < minDist) {
                    minDist = d;
                    nearest = point.name;
                }
            }
        }

        return nearest;
    }
}

export const coordinatesStore = CoordinatesStore.instance;
