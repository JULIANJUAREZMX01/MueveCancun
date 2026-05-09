import { logger } from "./logger";
import { getDistance } from "./geometry";
import type { RoutesCatalog, RouteData } from "../types";
import { SpatialHash } from "./SpatialHash";
import { normalizeString } from "./utils";

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
    private nearestCache: Map<string, { name: string; distanceKm: number }> = new Map();
    private readonly MAX_CACHE_SIZE = 100;

    static instance = new CoordinatesStore();

    async init(initialData?: RoutesCatalog): Promise<{ text: string, data: RoutesCatalog | Partial<RoutesCatalog> }> {
        if (this.loadingPromise && !initialData) return this.loadingPromise;

        this.loadingPromise = (async () => {
            try {
                let data = initialData;
                let text = "";

                if (data) {
                    logger.log("[CoordinatesStore] ⚡ Using injected data (Skipped Fetch)");
                    text = JSON.stringify(data);
                } else {
                    logger.log("[CoordinatesStore] 🌍 Fetching master routes for coordinates...");
                    try {
                        const res = await fetch('/data/master_routes.optimized.json');
                        if (res.ok) {
                            text = await res.text();
                            logger.log("[CoordinatesStore] ⚡ Loaded optimized catalog");
                        } else {
                            throw new Error("Optimized not found");
                        }
                    } catch (e) {
                        console.warn("[CoordinatesStore] Optimized catalog missing, falling back...", e);
                        const res = await fetch('/data/master_routes.json');
                        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`, { cause: e });
                        text = await res.text();
                    }
                    data = JSON.parse(text);
                }

                this.db = new Map<string, [number, number]>();
                this.originalNames = new Map<string, string>();
                this.spatialIndex = new SpatialHash<string>(); // Initialize SpatialHash
                this.allPoints = []; // Clear on re-init to prevent duplicates
                this.nearestCache.clear();
                
                if (data.rutas) {
                    // First pass: collect into Map (auto-deduplicates by normalized key)
                    const rawMap = new Map<string, { nombre: string; lat: number; lng: number }>();
                    data.rutas.forEach((route: RouteData) => {
                        route.paradas.forEach(stop => {
                            const lat = stop.lat ?? stop.latitude;
                            const lng = stop.lng ?? stop.longitude ?? stop.lon;
                            if (lat == null || lng == null || typeof lat !== 'number' || typeof lng !== 'number') return;
                            const key = normalizeString(stop.nombre);
                            // Only keep first occurrence (prevents duplicate spatial inserts)
                            if (!rawMap.has(key)) {
                                rawMap.set(key, { nombre: stop.nombre.trim(), lat, lng });
                            }
                        });
                    });

                    // Second pass: populate db, originalNames (deduped)
                    for (const [key, { nombre, lat, lng }] of rawMap.entries()) {
                        if (this.db) this.db.set(key, [lat, lng]);
                        this.originalNames.set(key, nombre);
                    }
                }
                // Populate Spatial Index and List (guaranteed no duplicates)
                if (this.db) {
                    for (const [name, coords] of this.db.entries()) {
                         const lat = coords[0];
                         const lng = coords[1];
                         if (this.spatialIndex) this.spatialIndex.insert(lat, lng, name);
                         this.allPoints.push({ name, lat, lng });
                    }
                }
                logger.log(`[CoordinatesStore] Indexed ${this.db?.size || 0} stops.`);
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
        const key = normalizeString(stopName);
        return this.db.get(key) || null;
    }

    getDB() {
        return this.db;
    }

    /** Returns all coordinates as a Map (alias para compatibilidad con InteractiveMap). */
    getAll(): Map<string, [number, number]> {
        return this.db ?? new Map();
    }

    /** Returns the original-cased stop name for a given key (lowercase lookup). */
    getOriginalName(key: string): string | undefined {
        return this.originalNames.get(normalizeString(key));
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

        // 1. Check Cache (LRU-ish)
        const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
        const cached = this.nearestCache.get(cacheKey);
        if (cached) {
            // Move to end to maintain LRU
            this.nearestCache.delete(cacheKey);
            this.nearestCache.set(cacheKey, cached);
            return cached;
        }

        let minDist = Infinity;
        let nearestKey: string | null = null;

        // 2. O(1) Spatial Hash first
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

        // 3. O(N) global search only when spatial hash returned no candidates
        if (minDist === Infinity && this.allPoints.length > 0) {
            // Pre-calculate degrees to km conversion roughly (constant)
            // 1 degree lat ≈ 111km. 1 degree lng ≈ 111km * cos(lat)
            const latRad = lat * Math.PI / 180;
            const kLat = 111;
            const kLng = 111 * Math.cos(latRad);

            // Find an initial candidate using fast equirectangular approximation
            // to provide a better bound for pruning.
            let initialCandidate: Coordinate | null = null;
            let bestApproxDistSq = Infinity;
            for (const point of this.allPoints) {
                const dLat = (point.lat - lat) * kLat;
                const dLng = (point.lng - lng) * kLng;
                const dSq = dLat * dLat + dLng * dLng;
                if (dSq < bestApproxDistSq) {
                    bestApproxDistSq = dSq;
                    initialCandidate = point;
                }
            }

            // Now we have a good candidate, get its real distance
            if (initialCandidate) {
                nearestKey = initialCandidate.name;
                minDist = getDistance(lat, lng, initialCandidate.lat, initialCandidate.lng);

                // Final pass with pruning
                const thresholdLat = minDist / kLat;
                const thresholdLng = minDist / Math.abs(kLng);

                for (const point of this.allPoints) {
                    // Bounding box pruning
                    if (Math.abs(point.lat - lat) > thresholdLat || Math.abs(point.lng - lng) > thresholdLng) {
                        continue;
                    }

                    const d = getDistance(lat, lng, point.lat, point.lng);
                    if (d < minDist) {
                        minDist = d;
                        nearestKey = point.name;
                    }
                }
            }
        }

        if (!nearestKey) return null;

        const name = this.originalNames.get(nearestKey) || nearestKey;
        const result = { name, distanceKm: minDist };

        // Save to cache
        this.nearestCache.set(cacheKey, result);
        if (this.nearestCache.size > this.MAX_CACHE_SIZE) {
            const firstKey = this.nearestCache.keys().next().value;
            if (firstKey !== undefined) this.nearestCache.delete(firstKey);
        }

        return result;
    }
}

export const coordinatesStore = CoordinatesStore.instance;
