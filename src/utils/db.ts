import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'cancunmueve-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<unknown>> | undefined;

export const initDB = async () => {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
          if (oldVersion < 1) {
            db.createObjectStore('routes');
            db.createObjectStore('user-reports');
          }
          if (oldVersion < 2) {
            db.createObjectStore('wallet-status');
          }
        },
      });

      // Initialize test balance if empty
      // This logic now runs only once per session when the DB connection is established
      const tx = db.transaction('wallet-status', 'readwrite');
      const store = tx.objectStore('wallet-status');
      const balance = await store.get('current_balance');

      if (balance === undefined) {
        await store.put({ id: 'current_balance', amount: 10.00, currency: 'USD' });
      }

      await tx.done;
      return db;
    })();
  }
  return dbPromise;
};

export const getWalletBalance = async () => {
  const db = await initDB();
  return db.get('wallet-status', 'current_balance');
};

export const updateWalletBalance = async (amount: number) => {
  const db = await initDB();
  const balance = await db.get('wallet-status', 'current_balance');
  if (balance) {
    balance.amount += amount;
    await db.put('wallet-status', balance);
  }
};
