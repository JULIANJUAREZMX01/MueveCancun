import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'cancunmueve-db';
const DB_VERSION = 4;

let _cryptoKey: CryptoKey | null = null;
let _dbPromise: Promise<IDBPDatabase> | null = null;

const getCryptoKey = async (db: IDBPDatabase): Promise<CryptoKey> => {
  if (_cryptoKey) return _cryptoKey;
  let key = await db.get('security-keys', 'hmac-key');
  if (!key) {
    key = await crypto.subtle.generateKey({ name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
    await db.put('security-keys', key, 'hmac-key');
  }
  _cryptoKey = key as CryptoKey;
  return _cryptoKey;
};

const generateSignature = async (amount: number, key: CryptoKey): Promise<string> => {
  const enc = new TextEncoder();
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(amount.toFixed(2)));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const verifySignature = async (amount: number, sig: string | undefined, key: CryptoKey): Promise<boolean> => {
  if (!sig) return false;
  const expected = await generateSignature(amount, key);
  return expected === sig;
};

const dispatchBalanceUpdate = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('BALANCE_UPDATED'));
  }
};

/**
 * Migrate balance from localStorage to IndexedDB.
 */
export const migrateBalanceFromLocalStorage = async (db: IDBPDatabase): Promise<void> => {
  try {
      if (typeof window === 'undefined' || localStorage.getItem('balance_migration_done')) return;

      const legacyBalance = parseFloat(
          localStorage.getItem('muevecancun_balance') ?? localStorage.getItem('user_balance') ?? 'NaN'
      );

      if (isNaN(legacyBalance) || legacyBalance <= 0) {
          localStorage.setItem('balance_migration_done', 'true');
          return;
      }

      const key = await getCryptoKey(db);
      const signature = await generateSignature(legacyBalance, key);
      await db.put(
          'wallet-status',
          { id: 'current_balance', amount: legacyBalance, currency: 'MXN', signature },
          'current_balance'
      );

      localStorage.setItem('balance_migration_done', 'true');
      localStorage.removeItem('muevecancun_balance');
      localStorage.removeItem('user_balance');
      dispatchBalanceUpdate();
  } catch (e) {
      console.warn('Balance migration failed:', e);
  }
};

export const initDB = async (): Promise<IDBPDatabase> => {
  if (_dbPromise) return _dbPromise;

  _dbPromise = (async () => {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('routes');
          db.createObjectStore('user-reports');
        }
        if (oldVersion < 2) {
          db.createObjectStore('wallet-status');
        }
        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains('pending-reports')) {
            db.createObjectStore('pending-reports', { keyPath: 'id', autoIncrement: true });
          }
          if (!db.objectStoreNames.contains('security-keys')) {
            db.createObjectStore('security-keys');
          }
        }
      },
    });

    // Initialize balance if empty
    const balance = await db.get('wallet-status', 'current_balance');
    if (balance === undefined) {
      const defaultAmount = 180.00;
      const key = await getCryptoKey(db);
      const signature = await generateSignature(defaultAmount, key);
      await db.put('wallet-status', { id: 'current_balance', amount: defaultAmount, currency: 'MXN', signature }, 'current_balance');
      dispatchBalanceUpdate();
    }

    // Trigger migration
    await migrateBalanceFromLocalStorage(db);

    return db;
  })();

  return _dbPromise;
};

export const getWalletBalance = async () => {
  const db = await initDB();
  const balance = await db.get('wallet-status', 'current_balance');
  if (balance) {
    const key = await getCryptoKey(db);
    
    if (!balance.signature) {
      balance.signature = await generateSignature(balance.amount, key);
      await db.put('wallet-status', balance, 'current_balance');
      dispatchBalanceUpdate();
      return balance;
    }

    const isValid = await verifySignature(balance.amount, balance.signature, key);

    if (!isValid) {
      console.error('[SECURITY] Wallet balance signature verification failed. Possible tampering detected. Resetting to 0.00 MXN.');
      const resetAmount = 0.00;
      balance.amount = resetAmount;
      balance.signature = await generateSignature(resetAmount, key);
      await db.put('wallet-status', balance, 'current_balance');
      dispatchBalanceUpdate();
      return balance;
    }
  }
  return balance;
};

export const setWalletBalance = async (amount: number) => {
  const db = await initDB();
  const existing = await db.get('wallet-status', 'current_balance');
  const key = await getCryptoKey(db);
  const signature = await generateSignature(amount, key);

  const data = existing ? { ...existing, amount, signature } : { id: 'current_balance', amount, currency: 'MXN', signature };
  await db.put('wallet-status', data, 'current_balance');
  dispatchBalanceUpdate();
};

export const updateWalletBalance = async (amount: number) => {
  const balance = await getWalletBalance();
  if (balance) {
    await setWalletBalance(balance.amount + amount);
  }
};

// --- Offline Reporting Support ---

export interface PendingReport {
  id?: number;
  tipo: string;
  ruta: string;
  descripcion: string;
  lat?: string;
  lng?: string;
  userAgent: string;
  url: string;
  timestamp: number;
}

export const savePendingReport = async (report: Omit<PendingReport, 'id' | 'timestamp'>) => {
  const db = await initDB();
  await db.put('pending-reports', {
    ...report,
    timestamp: Date.now()
  });
};

export const getPendingReports = async () => (await initDB()).getAll('pending-reports');
export const deletePendingReport = async (id: number) => (await initDB()).delete('pending-reports', id);

export const __resetDBPromise = () => {
  dbPromise = null;
  _cryptoKey = null;
};
