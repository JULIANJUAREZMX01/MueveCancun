/**
 * Mueve Reparto — IndexedDB helper
 * Typed stores: stops, sync_queue, tracking_points
 */

export interface Stop {
  id: string;
  address: string;
  lat?: number;
  lng?: number;
  priority: 'normal' | 'urgent';
  status: 'pending' | 'in_transit' | 'completed' | 'failed';
  note?: string;
  income?: number;       // ingreso esperado en MXN
  clientName?: string;
  clientPhone?: string;
  order: number;         // posicion en la ruta del dia
  createdAt: number;
  completedAt?: number;
  notified?: boolean;
}

export interface SyncEntry {
  id: string;
  type: 'delivery_update' | 'tracking_point' | 'daily_summary';
  payload: unknown;
  retries: number;
  createdAt: number;
  lastAttempt?: number;
}

export interface TrackingPoint {
  id: string;
  lat: number;
  lng: number;
  accuracy: number;
  speed?: number;
  heading?: number;
  timestamp: number;
}

export interface DailyStats {
  date: string;          // YYYY-MM-DD
  completed: number;
  total: number;
  income: number;
  distanceKm?: number;
  durationMin?: number;
}

export interface GeoCache {
  key: string;      // dirección normalizada (trim + lowercase)
  lat: number;
  lng: number;
  displayName: string;
  timestamp: number; // Date.now()
}

export const STORES = {
  STOPS:    'stops',
  SYNC:     'sync_queue',
  TRACKING: 'tracking_points',
  STATS:    'daily_stats',
  GEO:      'geocache',
} as const;

const DB_NAME    = 'mueve-reparto-db';
const DB_VERSION = 2;

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const oldVersion = e.oldVersion;

      if (!db.objectStoreNames.contains(STORES.STOPS)) {
        const stops = db.createObjectStore(STORES.STOPS, { keyPath: 'id' });
        stops.createIndex('status',   'status',   { unique: false });
        stops.createIndex('priority', 'priority', { unique: false });
        stops.createIndex('order',    'order',    { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SYNC)) {
        db.createObjectStore(STORES.SYNC, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.TRACKING)) {
        const tracking = db.createObjectStore(STORES.TRACKING, { keyPath: 'id' });
        tracking.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.STATS)) {
        db.createObjectStore(STORES.STATS, { keyPath: 'date' });
      }

      if (oldVersion < 2 && !db.objectStoreNames.contains(STORES.GEO)) {
        db.createObjectStore(STORES.GEO, { keyPath: 'key' });
      }
    };

    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };

    req.onerror = () => reject(req.error);
  });
}

export async function dbPut<T>(store: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

export async function dbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror   = () => reject(req.error);
  });
}

export async function dbGetAll<T>(store: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror   = () => reject(req.error);
  });
}

export async function dbDelete(store: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

export async function dbClear(store: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

// ── High-level helpers ──

export async function getStops(): Promise<Stop[]> {
  const stops = await dbGetAll<Stop>(STORES.STOPS);
  return stops.sort((a, b) => a.order - b.order);
}

export async function getTodayStats(): Promise<{ completed: number; total: number; income: number; urgent: number }> {
  const stops = await dbGetAll<Stop>(STORES.STOPS);
  const completed = stops.filter(s => s.status === 'completed').length;
  const urgent    = stops.filter(s => s.priority === 'urgent' && s.status !== 'completed').length;
  const income    = stops
    .filter(s => s.status === 'completed' && s.income)
    .reduce((sum, s) => sum + (s.income ?? 0), 0);

  return { completed, total: stops.length, income, urgent };
}

export async function getNextStop(): Promise<Stop | undefined> {
  const stops = await getStops();
  return stops.find(s => s.status === 'pending' || s.status === 'in_transit');
}

export async function completeStop(id: string): Promise<void> {
  const stop = await dbGet<Stop>(STORES.STOPS, id);
  if (!stop) return;
  await dbPut(STORES.STOPS, {
    ...stop,
    status: 'completed',
    completedAt: Date.now(),
  });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

let _lastNominatimCall = 0;

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const key = address.trim().toLowerCase();
  if (!key || key.length < 5) return null;

  // 1. Buscar en caché IDB
  const cached = await dbGet<GeoCache>(STORES.GEO, key);
  if (cached) {
    const AGE_30_DAYS = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - cached.timestamp < AGE_30_DAYS) {
      return { lat: cached.lat, lng: cached.lng, displayName: cached.displayName };
    }
    // Caché expirada, continuar
  }

  // 2. Rate limit: esperar si la última llamada fue hace < 1 segundo
  const elapsed = Date.now() - _lastNominatimCall;
  if (elapsed < 1000) {
    await new Promise(r => setTimeout(r, 1000 - elapsed));
  }
  _lastNominatimCall = Date.now();

  // 3. Llamar a Nominatim
  try {
    const q = encodeURIComponent(`${address}, Cancún, Quintana Roo, México`);
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=mx`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MueveReparto/1.0 (https://mueverepartoencancun.onrender.com)' },
      signal: AbortSignal.timeout(5000),  // 5 segundos máximo
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.length) return null;

    const result = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };

    // 4. Guardar en caché
    await dbPut<GeoCache>(STORES.GEO, {
      key,
      lat: result.lat,
      lng: result.lng,
      displayName: result.displayName,
      timestamp: Date.now(),
    });

    return result;
  } catch {
    return null;  // Timeout, sin red, error Nominatim — fallback gracioso
  }
}
