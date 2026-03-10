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

export const STORES = {
  STOPS:    'stops',
  SYNC:     'sync_queue',
  TRACKING: 'tracking_points',
  STATS:    'daily_stats',
} as const;

const DB_NAME    = 'mueve-reparto-db';
const DB_VERSION = 1;

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

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

export async function dbPutMany<T>(store: string, values: T[]): Promise<void> {
  if (values.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    values.forEach(v => os.put(v));
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
