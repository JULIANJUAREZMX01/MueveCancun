import { SpatialHash } from './SpatialHash';

// Schema types (approximate)
interface RouteStop {
    nombre: string;
    lat: number;
    lng: number;
}
interface Route {
    id: string;
    nombre: string;
    paradas: RouteStop[];
}
interface Hub {
    id: string;
    nombre: string;
    lat: number;
    lng?: number; // Sometimes lon
    lon?: number;
}
interface RouteData {
    hubs: Hub[];
    rutas: Route[];
    metadata?: any;
}

class CoordinatesStore {
  private static instance: CoordinatesStore;
  private data: RouteData | null = null;
  private text: string | null = null;
  private db: Record<string, [number, number]> | null = null;
  private spatialHash: SpatialHash<string>;
  private fetchPromise: Promise<{ text: string; data: RouteData }> | null = null;

  private constructor() {
      // 0.01 degrees is approx 1.1km. Good for "nearby" queries.
      this.spatialHash = new SpatialHash<string>(0.01);
  }

  public static getInstance(): CoordinatesStore {
    if (!CoordinatesStore.instance) {
      CoordinatesStore.instance = new CoordinatesStore();
    }
    return CoordinatesStore.instance;
  }

  public async init(initialData?: RouteData): Promise<{ text: string; data: RouteData }> {
    // 1. If initialData is provided, use it (inject/update).
    if (initialData) {
        // If we already have data and text, and the injected data is the same object, do nothing.
        if (this.data === initialData && this.text) {
             return { text: this.text, data: this.data };
        }

        this.data = initialData;
        try {
            this.text = JSON.stringify(initialData);
        } catch (e) {
            console.warn("Failed to stringify initialData", e);
            this.text = "{}"; // Fallback
        }
        this.processData();
        return { text: this.text, data: this.data };
    }

    // 2. If we have data loaded already, return it.
    if (this.data && this.text) {
      return { text: this.text, data: this.data };
    }

    // 3. If a fetch is already in progress, return that promise.
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // 4. Fetch data.
    this.fetchPromise = (async () => {
      try {
        const response = await fetch('/data/master_routes.json');
        if (!response.ok) throw new Error('Failed to fetch routes');
        this.text = await response.text();
        this.data = JSON.parse(this.text);
        this.processData();
        return { text: this.text!, data: this.data! };
      } catch (e) {
        this.fetchPromise = null; // Reset on failure so we can try again
        throw e;
      }
    })();

    return this.fetchPromise;
  }

  private processData() {
      if (!this.data) return;

      this.db = {};
      this.spatialHash.clear();

      // Process Hubs
      if (this.data.hubs && Array.isArray(this.data.hubs)) {
          for (const hub of this.data.hubs) {
              const lat = hub.lat;
              const lng = hub.lng ?? hub.lon; // Handle both fields
              if (typeof lat === 'number' && typeof lng === 'number') {
                  this.db[hub.nombre] = [lat, lng];
                  this.spatialHash.insert(lat, lng, hub.nombre);
              }
          }
      }

      // Process Routes
      if (this.data.rutas && Array.isArray(this.data.rutas)) {
          for (const route of this.data.rutas) {
              if (route.paradas && Array.isArray(route.paradas)) {
                  for (const stop of route.paradas) {
                      const lat = stop.lat;
                      const lng = stop.lng;
                      if (typeof lat === 'number' && typeof lng === 'number') {
                          // Only update DB if not exists or maybe overwrite?
                          // Existing code just overwrites or assumes consistency.
                          this.db[stop.nombre] = [lat, lng];
                          this.spatialHash.insert(lat, lng, stop.nombre);
                      }
                  }
              }
          }
      }
  }

  public getDB() {
      return this.db;
  }

  public findNearest(lat: number, lng: number): string | null {
      const candidates = this.spatialHash.query(lat, lng);

      let nearest: string | null = null;
      let minDist = Infinity;

      for (const candidate of candidates) {
          const d = this.distance(lat, lng, candidate.lat, candidate.lng);
          if (d < minDist) {
              minDist = d;
              nearest = candidate.data;
          }
      }

      // Threshold check? InteractiveMap uses 1000m.
      // But store just finds nearest. Consumer can check distance.
      // However, for optimization, we might want to limit.
      // Let's just return the nearest.
      return nearest;
  }

  // Haversine distance in meters
  private distance(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 6371e3; // metres
      const φ1 = lat1 * Math.PI/180; // φ, λ in radians
      const φ2 = lat2 * Math.PI/180;
      const Δφ = (lat2-lat1) * Math.PI/180;
      const Δλ = (lon2-lon1) * Math.PI/180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      return R * c;
  }
}

export const coordinatesStore = CoordinatesStore.getInstance();
