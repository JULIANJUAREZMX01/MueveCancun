import { getDistance } from "./geometry";
import type { RoutesCatalog, RouteData } from "../types";
import { SpatialHash } from "./SpatialHash";

// Define Types
type Coordinate = { name: string; lat: number; lng: number };


export class CoordinatesStore {
    // 🛡️ SECURITY FIX (Prototype Pollution Prevention)
    // By using a Map instead of a plain Object (Record<string, ...>),
    // we prevent attacks where malicious JSON payload keys like "__proto__"
    // or "constructor" could overwrite JS prototype chain methods,
    // potentially leading to DoS or bypassing logic checks.
    private db: Map<string, [number, number]> | null = null;
    // Maps lowercase key → original-cased stop name for display
    private originalNames: Map<string, string> = new Map();
    private spatialIndex: SpatialHash<string> | null = null;
    private loadingPromise: Promise<{ text: string, data: RoutesCatalog | Partial<RoutesCatalog> }> | null = null;
    private allPoints: Coordinate[] = [];

    static instance = new CoordinatesStore();

    async init(initialData?: RoutesCatalog): Promise<{ text: string, data: RoutesCatalog | Partial<RoutesCatalog> }> {
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
                    try {
                        const res = await fetch('/data/master_routes.optimized.json');
                        if (res.ok) {
                            text = await res.text();
                            console.log("[CoordinatesStore] ⚡ Loaded optimized catalog");
                        } else {
                            throw new Error("Optimized not found");
                        }
                    } catch (e) {
                        console.warn("[CoordinatesStore] Optimized catalog missing, falling back...", e);
                        const res = await fetch('/data/master_routes.json');
                        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                        text = await res.text();
                    }
                    data = JSON.parse(text);
                }

                this.db = new Map<string, [number, number]>();
                this.originalNames = new Map<string, string>();
                this.spatialIndex = new SpatialHash<string>(); // Initialize SpatialHash
                this.allPoints = []; // Clear on re-init to prevent duplicates
                
                if (data.rutas) {
                    data.rutas.forEach((route: RouteData) => {
                        route.paradas.forEach(stop => {
                            // Normalize Key (lowercase for case-insensitive lookup)
                            const key = stop.nombre.toLowerCase().trim();
                            if (this.db) this.db.set(key, [stop.lat, stop.lng]);
                            // Preserve original casing for display
                            this.originalNames.set(key, stop.nombre.trim());
                        });
                    });
                }
                // Populate Spatial Index and List
                if (this.db) {
                    for (const [name, coords] of this.db.entries()) {
                         const lat = coords[0];
                         const lng = coords[1];
                         if (this.spatialIndex) this.spatialIndex.insert(lat, lng, name);
                         this.allPoints.push({ name, lat, lng });
                    }
                }
                console.log(`[CoordinatesStore] Indexed ${this.db?.size || 0} stops.`);
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
        return this.db.get(key) || null;
    }

    getDB() {
        return this.db;
    }

    /** Returns the original-cased stop name for a given key (lowercase lookup). */
    getOriginalName(key: string): string | undefined {
        return this.originalNames.get(key.toLowerCase().trim());
    }

    /** Returns the full map of lowercase key → original-cased name. */
    getOriginalNames(): Map<string, string> {
        return this.originalNames;
    }

    findNearest(lat: number, lng: number): string | null {
        return this.findNearestWithDistance(lat, lng)?.name ?? null;
    }

    /** Returns the nearest stop with its distance in km.  Returns null if no stops are indexed. */
    findNearestWithDistance(lat: number, lng: number): { name: string; distanceKm: number } | null {
        if (!this.db) return null;

        let minDist = Infinity;
        let nearestKey: string | null = null;

        // O(1) Spatial Hash first
        if (this.spatialIndex) {
            const candidates = this.spatialIndex.query(lat, lng);
            for (const point of candidates) {
                const d = getDistance(lat, lng, point.lat, point.lng);
                if (d < minDist) {
                    minDist = d;
                    nearestKey = point.data;
                }
            }
        }

        // O(N) global search only when spatial hash returned no candidates
        if (minDist === Infinity) {
            for (const point of this.allPoints) {
                const d = getDistance(lat, lng, point.lat, point.lng);
                if (d < minDist) {
                    minDist = d;
                    nearestKey = point.name;
                }
            }
        }

        if (!nearestKey) return null;

        const name = this.originalNames.get(nearestKey) || nearestKey;
        return { name, distanceKm: minDist };
    }
}

export const coordinatesStore = CoordinatesStore.instance;
