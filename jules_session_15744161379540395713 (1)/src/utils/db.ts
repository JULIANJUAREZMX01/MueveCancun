import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'CancunMueveDB';
const STORE_NAME = 'routes';

export async function initDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function saveRoutes(routes: any) {
  const db = await initDB();
  await db.put(STORE_NAME, routes, 'current_routes');
}

export async function getRoutes() {
  const db = await initDB();
  return db.get(STORE_NAME, 'current_routes');
}
