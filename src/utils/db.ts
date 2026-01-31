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

export async function initDB(): Promise<IDBPDatabase<MueveDB>> {
  return openDB<MueveDB>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('wallet-status')) {
        db.createObjectStore('wallet-status', { keyPath: 'id' });
      }
    },
  });
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
