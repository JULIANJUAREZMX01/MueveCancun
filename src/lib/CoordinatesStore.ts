import { SpatialHash } from '../utils/SpatialHash';

export interface Coordinate {
    lat: number;
    lng: number;
    name: string;
}

class CoordinatesStore {
    private db: Record<string, [number, number]> | null = null;
    private spatialIndex: SpatialHash<string> | null = null;
    private loadingPromise: Promise<void> | null = null;
    private allPoints: Coordinate[] = [];

    // Singleton instance
    static instance = new CoordinatesStore();

    async init() {
        if (this.db) return;
        if (this.loadingPromise) return this.loadingPromise;

        this.loadingPromise = (async () => {
            try {
                console.log("[CoordinatesStore] Fetching coordinates...");
                const res = await fetch('/coordinates.json');
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                this.db = await res.json();

                this.spatialIndex = new SpatialHash(0.01);
                this.allPoints = [];

                if (this.db) {
                    Object.entries(this.db).forEach(([name, coords]) => {
                         if(Array.isArray(coords) && coords.length === 2) {
                            const lat = coords[0];
                            const lng = coords[1];
                            this.spatialIndex!.insert(lat, lng, name);
                            this.allPoints.push({ name, lat, lng });
                         }
                    });
                }
                console.log(`[CoordinatesStore] Loaded ${this.allPoints.length} points.`);
            } catch (e) {
                console.error("[CoordinatesStore] Failed to load:", e);
                this.loadingPromise = null; // Allow retry
                throw e;
            }
        })();

        return this.loadingPromise;
    }

    getDB() {
        return this.db;
    }

    findNearest(lat: number, lng: number): string | null {
        if (!this.spatialIndex) return null;

        // Get candidates from Spatial Hash (3x3 grid)
        const candidates = this.spatialIndex.query(lat, lng);

        // Haversine Distance
        const dist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const R = 6371; // km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        };

        let searchSet: ({ lat: number; lng: number; data: string } | Coordinate)[] = candidates;
        let usedAll = false;

        // Fallback 1: Empty Grid
        if (searchSet.length === 0) {
            searchSet = this.allPoints;
            usedAll = true;
        }

        let minDist = Infinity;
        let nearest: string | null = null;

        for (const p of searchSet) {
             // SpatialHash stores data as string (name) in .data
             // allPoints stores name as property .name
             const pName = 'data' in p ? p.data : p.name;
             const pLat = p.lat;
             const pLng = p.lng;

             const d = dist(lat, lng, pLat, pLng);
             if (d < minDist) {
                 minDist = d;
                 nearest = pName;
             }
        }

        // Fallback 2: Boundary Safety Check
        // If the nearest point is further than 1.5km, we might have missed a closer point just outside the 3x3 grid.
        if (!usedAll && minDist > 1.5) {
             // Check all to be safe
             for (const p of this.allPoints) {
                 const d = dist(lat, lng, p.lat, p.lng);
                 if (d < minDist) {
                     minDist = d;
                     nearest = p.name;
                 }
             }
        }

        return nearest;
    }
}

export const coordinatesStore = CoordinatesStore.instance;
