import { getDistance } from "./utils";

// Define Types
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
    private loadingPromise: Promise<void> | null = null;

    static instance = new CoordinatesStore();

    async init(initialData?: any) {
        if (this.db) return;
        if (this.loadingPromise) return this.loadingPromise;

        this.loadingPromise = (async () => {
            try {
                let data = initialData;

                if (data) {
                    console.log("[CoordinatesStore] ⚡ Using injected data (Skipped Fetch)");
                } else {
                    console.log("[CoordinatesStore] 🌍 Fetching master routes for coordinates...");
                    const res = await fetch('/data/master_routes.json');
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    data = await res.json();
                }

                this.db = {};
                if (data.routes) {
                    data.routes.forEach((route: RouteData) => {
                        route.paradas.forEach(stop => {
                            // Normalize Key
                            const key = stop.nombre.toLowerCase().trim();
                            if (this.db) this.db[key] = { lat: stop.lat, lng: stop.lng };
                        });
                    });
                }
                console.log(`[CoordinatesStore] Indexed ${Object.keys(this.db || {}).length} stops.`);
            } catch (e) {
                console.error("[CoordinatesStore] Failed to load data", e);
            }
        })();

        return this.loadingPromise;
    }

    getCoordinates(stopName: string) {
        if (!this.db) return null;
        const key = stopName.toLowerCase().trim();
        return this.db[key] || null;
    }

    findNearest(lat: number, lng: number): string | null {
        if (!this.db) return null;
        let minDist = Infinity;
        let nearest = null;

        for (const [name, coords] of Object.entries(this.db)) {
            const d = getDistance(lat, lng, coords.lat, coords.lng);
            if (d < minDist) {
                minDist = d;
                nearest = name;
            }
        }
        return nearest;
    }
}

export const coordinatesStore = CoordinatesStore.instance;
