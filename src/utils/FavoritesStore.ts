// Favorites Store - manages favorite routes using IndexedDB

const DB_NAME = 'cancunmueve-db';
const DB_VERSION = 3;
const STORE_NAME = 'favorites';

let db: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

export const favoritesStore = {
    async isFavorite(routeId: string): Promise<boolean> {
        try {
            const database = await openDB();
            return new Promise((resolve) => {
                const transaction = database.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(routeId);
                request.onsuccess = () => resolve(!!request.result);
                request.onerror = () => resolve(false);
            });
        } catch {
            return false;
        }
    },

    async addFavorite(routeId: string): Promise<void> {
        try {
            const database = await openDB();
            return new Promise((resolve, reject) => {
                const transaction = database.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put({ id: routeId, addedAt: Date.now() });
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error('Failed to add favorite:', e);
        }
    },

    async removeFavorite(routeId: string): Promise<void> {
        try {
            const database = await openDB();
            return new Promise((resolve, reject) => {
                const transaction = database.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(routeId);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error('Failed to remove favorite:', e);
        }
    },

    async toggleFavorite(routeId: string): Promise<boolean> {
        const isFav = await this.isFavorite(routeId);
        if (isFav) {
            await this.removeFavorite(routeId);
            return false;
        } else {
            await this.addFavorite(routeId);
            return true;
        }
    },

    async getAllFavorites(): Promise<string[]> {
        try {
            const database = await openDB();
            return new Promise((resolve) => {
                const transaction = database.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result.map((r: any) => r.id));
                request.onerror = () => resolve([]);
            });
        } catch {
            return [];
        }
    }
};
