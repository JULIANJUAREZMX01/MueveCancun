// GraffitiWarrior Re-implementation
export class CoordinatesStore {
    private static instance: CoordinatesStore;
    private data: any = null;
    private text: string = "";
    private spatialIndex: any = null; // Placeholder for spatial index

    private constructor() {}

    public static getInstance(): CoordinatesStore {
        if (!CoordinatesStore.instance) {
            CoordinatesStore.instance = new CoordinatesStore();
        }
        return CoordinatesStore.instance;
    }

    async init(injectedData?: any): Promise<{ text: string, data: any }> {
        if (this.data && this.text) return { text: this.text, data: this.data };

        try {
            if (injectedData) {
                this.data = injectedData;
                this.text = JSON.stringify(injectedData);
            } else {
                const response = await fetch('/data/master_routes.json');
                if (!response.ok) throw new Error("Failed to fetch routes");
                this.text = await response.text();
                this.data = JSON.parse(this.text);
            }

            // Build simple index if needed (omitted for now to save space/time)

            return { text: this.text, data: this.data };
        } catch (e) {
            console.error("CoordinatesStore init error:", e);
            throw e;
        }
    }

    getDB() {
        return this.data ? this.data.rutas || this.data.routes || [] : [];
    }

    findNearest(lat: number, lng: number): string | null {
        if (!this.data) return null;
        // Simple O(N) search for nearest stop
        let minDist = Infinity;
        let nearestName = null;

        const routes = this.getDB();
        for (const route of routes) {
            if (!route.paradas) continue;
            for (const stop of route.paradas) {
                if (stop.lat && stop.lng) {
                    const d = Math.sqrt(Math.pow(stop.lat - lat, 2) + Math.pow(stop.lng - lng, 2));
                    if (d < minDist) {
                        minDist = d;
                        nearestName = stop.nombre;
                    }
                }
            }
        }

        // Threshold approx 500m (0.005 degrees roughly)
        if (minDist < 0.005) {
            return nearestName;
        }
        return null;
    }
}

export const coordinatesStore = CoordinatesStore.getInstance();
