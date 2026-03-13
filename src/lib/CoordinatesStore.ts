export class CoordinatesStore {
    private data: any = null;
    private db: Record<string, [number, number]> = {};

    async init(initialData?: any): Promise<{ text: string, data: any }> {
        if (initialData) {
            this.data = initialData;
        } else if (!this.data) {
            try {
                // Fetch from public data
                const res = await fetch('/data/master_routes.json');
                if (!res.ok) throw new Error("Failed to fetch routes");
                this.data = await res.json();
            } catch (e) {
                console.error("Failed to load routes:", e);
                this.data = { routes: [] };
            }
        }

        this.buildDB();

        return {
            text: JSON.stringify(this.data),
            data: this.data
        };
    }

    private buildDB() {
        this.db = {};
        const routes = this.data.routes || this.data.rutas || [];

        routes.forEach((route: any) => {
            if (route.paradas) {
                route.paradas.forEach((stop: any) => {
                    if (stop.nombre && (stop.lat !== undefined) && (stop.lng !== undefined || stop.lon !== undefined)) {
                        const lng = stop.lng !== undefined ? stop.lng : stop.lon;
                        this.db[stop.nombre] = [stop.lat, lng];
                    }
                });
            }
        });
    }

    getDB() {
        return this.db;
    }

    findNearest(lat: number, lng: number): string | null {
        let nearest: string | null = null;
        let minDist = Infinity;

        for (const [name, coords] of Object.entries(this.db)) {
            const d = this.distance(lat, lng, coords[0], coords[1]);
            if (d < minDist) {
                minDist = d;
                nearest = name;
            }
        }

        // Threshold: 1000 meters (approx)
        // 1 deg lat = 111km. 1000m = 0.009 deg.
        if (minDist < 0.01) {
            return nearest;
        }
        return null;
    }

    private distance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        // Euclidean approximation for speed is fine for short distances
        return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
    }
}

export const coordinatesStore = new CoordinatesStore();
