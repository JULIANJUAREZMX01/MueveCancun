// 🛡️ SECURITY NOTE: This file is critical for availability (DoS protection).
// It implements a singleton pattern to ensure route data is loaded only once.
// Missing this file causes the application to crash (Denial of Service).

export interface RouteData {
    version: string;
    rutas: Route[];
}

export interface Route {
    id: string;
    nombre: string;
    tarifa: number;
    tipo: string;
    paradas: Stop[];
}

export interface Stop {
    nombre: string;
    lat: number;
    lng: number;
    orden: number;
}

export class CoordinatesStore {
    private static instance: CoordinatesStore;
    private data: RouteData | null = null;
    private text: string = '';
    private db: Record<string, [number, number]> = {}; // Map<StopName, [Lat, Lng]>
    private isInitialized = false;

    private constructor() {}

    public static getInstance(): CoordinatesStore {
        if (!CoordinatesStore.instance) {
            CoordinatesStore.instance = new CoordinatesStore();
        }
        return CoordinatesStore.instance;
    }

    /**
     * Initializes the store with data (if provided) or fetches it.
     * Returns the raw text (for WASM) and the parsed object (for JS).
     */
    public async init(injectedData?: RouteData): Promise<{ text: string, data: RouteData }> {
        // Idempotency check
        if (this.isInitialized && this.data) {
            return { text: this.text, data: this.data };
        }

        if (injectedData) {
            console.log("[CoordinatesStore] Initialized with injected data");
            this.data = injectedData;
            this.text = JSON.stringify(injectedData);
            this.buildDB();
            this.isInitialized = true;
            return { text: this.text, data: this.data };
        }

        // Fetch from API
        try {
            console.log("[CoordinatesStore] Fetching master_routes.json...");
            const response = await fetch('/data/master_routes.json');
            if (!response.ok) {
                throw new Error(`Failed to fetch routes: ${response.status} ${response.statusText}`);
            }
            this.text = await response.text();

            // Validation: excessive size check (DoS protection)
            if (this.text.length > 15 * 1024 * 1024) {
                 throw new Error("Route data exceeds safety limit (15MB)");
            }

            this.data = JSON.parse(this.text);
            this.buildDB();
            this.isInitialized = true;
            console.log(`[CoordinatesStore] Loaded ${this.data?.rutas.length} routes.`);

            // @ts-ignore
            return { text: this.text, data: this.data };
        } catch (e) {
            console.error("[CoordinatesStore] Critical Error:", e);
            throw e;
        }
    }

    private buildDB() {
        this.db = {};
        if (!this.data || !this.data.rutas) return;

        let count = 0;
        for (const route of this.data.rutas) {
            if (!route.paradas) continue;
            for (const stop of route.paradas) {
                // Use Stop Name as Key (Dedup by name)
                if (!this.db[stop.nombre]) {
                    this.db[stop.nombre] = [stop.lat, stop.lng];
                    count++;
                }
            }
        }
        console.log(`[CoordinatesStore] Built spatial DB with ${count} unique stops.`);
    }

    public getDB(): Record<string, [number, number]> {
        return this.db;
    }

    /**
     * Finds the nearest stop to the given coordinates.
     * Uses simple Euclidean distance for performance.
     */
    public findNearest(lat: number, lng: number): string | null {
        let bestStop: string | null = null;
        let minSqDist = Infinity;

        for (const [name, coords] of Object.entries(this.db)) {
             const dLat = coords[0] - lat;
             const dLng = coords[1] - lng;
             const sqDist = dLat*dLat + dLng*dLng;

             if (sqDist < minSqDist) {
                 minSqDist = sqDist;
                 bestStop = name;
             }
        }

        return bestStop;
    }
}

export const coordinatesStore = CoordinatesStore.getInstance();
