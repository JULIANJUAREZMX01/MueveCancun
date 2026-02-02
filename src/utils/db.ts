import { openDB } from 'idb';

const DB_NAME = 'cancunmueve-db';
const DB_VERSION = 2;

export const initDB = async () => {
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
  const tx = db.transaction('wallet-status', 'readwrite');
  const store = tx.objectStore('wallet-status');
  const balance = await store.get('current_balance');

  if (balance === undefined) {
    await store.put({ id: 'current_balance', amount: 10.00, currency: 'USD' });
  }

  await tx.done;
  return db;
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
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface MueveDB extends DBSchema {
  'wallet-status': {
    key: string;
    value: {
      id: string;
      balance: number;
      lastUpdated: string;
    };
  };
}

const DATABASE_NAME = 'cancunmueve-db';
const DATABASE_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MueveDB>> | undefined;

export function initDB(): Promise<IDBPDatabase<MueveDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MueveDB>(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('wallet-status')) {
          db.createObjectStore('wallet-status', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function getBalance(): Promise<number> {
  const db = await initDB();
  const wallet = await db.get('wallet-status', 'driver-1');
  if (!wallet) {
    // Initial balance as requested by the persona
    await db.put('wallet-status', {
      id: 'driver-1',
      balance: 180.0,
      lastUpdated: new Date().toISOString(),
    });
    return 180.0;
  }
  return wallet.balance;
}

export async function updateBalance(newBalance: number): Promise<void> {
  const db = await initDB();
  await db.put('wallet-status', {
    id: 'driver-1',
    balance: newBalance,
    lastUpdated: new Date().toISOString(),
  });
}
