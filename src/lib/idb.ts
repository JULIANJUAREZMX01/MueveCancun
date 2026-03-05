/**
 * Mueve Reparto — IndexedDB Helper
 * Persistencia offline-first para paradas y cola de sync.
 */

const DB_NAME = 'MueveRepartoDB';
const DB_VERSION = 1;

export const STORES = {
  STOPS: 'stops',
  SYNC_QUEUE: 'sync_queue',
  TRACKING: 'tracking',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

export interface Stop {
  id: string;
  address: string;
  lat: number;
  lng: number;
  status: 'pending' | 'in_route' | 'delivered' | 'failed';
  priority: 'normal' | 'urgent';
  sequence?: number;
  recipient_phone?: string;
  tracking_token?: string;
  created_at: string;
}

export interface SyncEntry {
  id?: number; // auto-increment
  url: string;
  method: string;
  body: unknown;
  timestamp: number;
  attempts: number;
}

export interface TrackingPoint {
  id?: number; // auto-increment
  stop_id: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  recorded_at: string;
}

class IDBHelper {
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORES.STOPS)) {
          db.createObjectStore(STORES.STOPS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          db.createObjectStore(STORES.SYNC_QUEUE, {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
        if (!db.objectStoreNames.contains(STORES.TRACKING)) {
          db.createObjectStore(STORES.TRACKING, {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) =>
        reject((event.target as IDBOpenDBRequest).error);
    });
  }

  async put<T>(storeName: StoreName, data: T): Promise<IDBValidKey> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async get<T>(storeName: StoreName, key: IDBValidKey): Promise<T | undefined> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  }

  async getAll<T>(storeName: StoreName): Promise<T[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  async delete(storeName: StoreName, key: IDBValidKey): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readwrite');
      const req = tx.objectStore(storeName).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clear(storeName: StoreName): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readwrite');
      const req = tx.objectStore(storeName).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export const idb = new IDBHelper();
