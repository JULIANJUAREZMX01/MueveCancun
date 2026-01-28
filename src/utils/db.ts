import { openDB } from 'idb';

const DB_NAME = 'cancunmueve-db';
const DB_VERSION = 2;

export const initDB = async () => {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('routes')) {
        db.createObjectStore('routes');
      }
      if (!db.objectStoreNames.contains('user-reports')) {
        db.createObjectStore('user-reports');
      }
      if (!db.objectStoreNames.contains('wallet-status')) {
        db.createObjectStore('wallet-status', { keyPath: 'id' });
      }
    },
  });

  // Initialize with default/test data if empty
  const tx = db.transaction('wallet-status', 'readwrite');
  const store = tx.objectStore('wallet-status');
  const existing = await store.get('driver_current');
  
  if (!existing) {
    await store.put({ 
      id: 'driver_current', 
      balance_mxn: 180.0, // $10 USD
      balance_usd: 10.0, 
      status: 'active' 
    });
  }

  await tx.done;
  return db;
};

export const getWalletBalance = async () => {
  const db = await initDB();
  return db.get('wallet-status', 'driver_current');
};

export const updateWalletBalance = async (amountMx: number) => {
  const db = await initDB();
  const wallet = await db.get('wallet-status', 'driver_current');
  if (wallet) {
    wallet.balance_mxn += amountMx;
    // Also update USD for reference (mock rate 18)
    wallet.balance_usd = wallet.balance_mxn / 18.0;
    await db.put('wallet-status', wallet);
  }
};
