import { logger } from "./logger";
import { getDistance } from "./geometry";
import type { RoutesCatalog, RouteData, Stop } from "../lib/types";
import { SpatialHash } from "./SpatialHash";
import { normalizeString } from "./utils";

type Coordinate = { name: string; lat: number; lng: number };

export class CoordinatesStore {
    private db: Map<string, [number, number]> | null = null;
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
                let data = initialData as RoutesCatalog | Partial<RoutesCatalog>;
                let text = "";

                if (data && 'rutas' in data) {
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
                    data = JSON.parse(text) as RoutesCatalog;
                }

                this.db = new Map<string, [number, number]>();
                this.originalNames = new Map<string, string>();
                this.spatialIndex = new SpatialHash<string>();
                this.allPoints = [];
                this.nearestCache.clear();
                
                if (data.rutas) {
                    const rawMap = new Map<string, { nombre: string; lat: number; lng: number }>();
                    data.rutas.forEach((route: RouteData) => {
                        route.paradas.forEach((stop: Stop) => {
                            const lat = stop.lat;
                            const lng = stop.lng;
                            if (lat == null || lng == null || typeof lat !== 'number' || typeof lng !== 'number') return;
                            const key = normalizeString(stop.nombre);
                            if (!rawMap.has(key)) {
                                rawMap.set(key, { nombre: stop.nombre.trim(), lat, lng });
                            }
                        });
                    });

                    for (const [key, { nombre, lat, lng }] of rawMap.entries()) {
                        if (this.db) this.db.set(key, [lat, lng]);
                        this.originalNames.set(key, nombre);
                    }
                }
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
                return { text: "{}", data: { rutas: [] } };
            }
        })();

        return this.loadingPromise;
    }

    getCoordinates(stopName: string): [number, number] | null {
        if (!this.db) return null;
        const key = normalizeString(stopName);
        return this.db.get(key) || null;
    }

    getDB(): Map<string, [number, number]> | null {
        return this.db;
    }

    getAll(): Map<string, [number, number]> {
        return this.db ?? new Map();
    }

    getOriginalName(key: string): string | undefined {
        return this.originalNames.get(normalizeString(key));
    }

    getOriginalNames(): Map<string, string> {
        return this.originalNames;
    }

    findNearest(lat: number, lng: number): string | null {
        return this.findNearestWithDistance(lat, lng)?.name ?? null;
    }

    findNearestWithDistance(lat: number, lng: number): { name: string; distanceKm: number } | null {
        if (!this.db) return null;

        const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
        const cached = this.nearestCache.get(cacheKey);
        if (cached) {
            this.nearestCache.delete(cacheKey);
            this.nearestCache.set(cacheKey, cached);
            return cached;
        }

        let minDist = Infinity;
        let nearestKey: string | null = null;

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

        if (minDist === Infinity && this.allPoints.length > 0) {
            const latRad = lat * Math.PI / 180;
            const kLat = 111;
            const kLng = 111 * Math.cos(latRad);

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

            if (initialCandidate) {
                nearestKey = initialCandidate.name;
                minDist = getDistance(lat, lng, initialCandidate.lat, initialCandidate.lng);

                const thresholdLat = minDist / kLat;
                const thresholdLng = minDist / Math.abs(kLng);

                for (const point of this.allPoints) {
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

        this.nearestCache.set(cacheKey, result);
        if (this.nearestCache.size > this.MAX_CACHE_SIZE) {
            const firstKey = this.nearestCache.keys().next().value;
            if (firstKey !== undefined) this.nearestCache.delete(firstKey);
        }

        return result;
    }
}

export const coordinatesStore = CoordinatesStore.instance;
