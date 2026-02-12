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
                console.log("[CoordinatesStore] Fetching master routes for coordinates...");
                const res = await fetch('/data/master_routes.json');
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const data = await res.json();
                
                this.db = {};
                this.allPoints = [];
                this.spatialIndex = new SpatialHash(0.01);

                if (data && Array.isArray(data.rutas)) {
                    data.rutas.forEach((route: any) => {
                        if (Array.isArray(route.paradas)) {
                            route.paradas.forEach((stop: any) => {
                                if (stop.nombre && typeof stop.lat === 'number' && typeof stop.lng === 'number') {
                                    // Use name as key, overwrite duplicates (assuming same location)
                                    this.db![stop.nombre] = [stop.lat, stop.lng];
                                }
                            });
                        }
                    });
                }
                
                // Populate Spatial Index and List
                if (this.db) {
                    Object.entries(this.db).forEach(([name, coords]) => {
                         if(Array.isArray(coords) && coords.length === 2) {
                            const lat = coords[0];
                            const lng = coords[1];
                            this.spatialIndex!.insert(lat, lng, name);
                            this.allPoints.push({ name: name, lat, lng } as any);
                         }
                    });
                }
                console.log(`[CoordinatesStore] Loaded ${this.allPoints.length} unique stops from master routes.`);
            } catch (e) {
                console.error("[CoordinatesStore] Failed to load routes:", e);
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
