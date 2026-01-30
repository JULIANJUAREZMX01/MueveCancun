import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'cancunmueve-db';
const STORE_NAME = 'wallet-status';

export interface WalletStatus {
  id: string;
  balance: number;
  lastUpdate: number;
}

export async function initDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function getBalance(): Promise<number> {
  const db = await initDB();
  const status = await db.get(STORE_NAME, 'current-wallet') as WalletStatus | undefined;
  return status?.balance ?? 0;
}

export async function updateBalance(newBalance: number): Promise<void> {
  const db = await initDB();
  const status: WalletStatus = {
    id: 'current-wallet',
    balance: newBalance,
    lastUpdate: Date.now(),
  };
  await db.put(STORE_NAME, status);
}

// Inicializar con $180.00 MXN si no existe (para propósitos de demostración/Private Pilot)
export async function ensureInitialBalance(): Promise<void> {
  const balance = await getBalance();
  if (balance === 0) {
    await updateBalance(180.00);
    console.log('Wallet initialized with $180.00 MXN');
  }
}
