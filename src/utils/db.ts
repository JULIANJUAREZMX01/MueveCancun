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
export const migrateBalanceFromLocalStorage = async (db: Awaited<ReturnType<typeof openDB>>): Promise<void> => {
  try {
      // Helper to mark migration complete and clear legacy keys
      const finalizeMigration = () => {
          localStorage.setItem('balance_migration_done', 'true');
          localStorage.removeItem('muevecancun_balance');
          localStorage.removeItem('user_balance');
          dispatchBalanceUpdate();
      };

      // Read BEFORE removing to avoid silent balance loss on upgrade
      const legacyBalance = parseFloat(
          localStorage.getItem('muevecancun_balance') ?? localStorage.getItem('user_balance') ?? 'NaN'
      );

      // If there is no valid positive legacy balance, we can safely mark migration done
      if (isNaN(legacyBalance) || legacyBalance <= 0) {
          finalizeMigration();
          return;
      }

      // If a positive legacy balance exists and IDB still has the default 180.00, migrate it
      try {
          const tx = db.transaction('wallet-status', 'readwrite');
          const store = tx.objectStore('wallet-status');
          const existing = await store.get('current_balance');
          const isDefault = existing?.amount === 180.00 || existing?.amount === 0.00 || !existing;
          if (isDefault) {
              const signature = await generateSignature(legacyBalance, await getCryptoKey(db));
              await store.put(
                  { id: 'current_balance', amount: legacyBalance, currency: 'MXN', signature },
                  'current_balance'
              );
          }
          await tx.done;
          // Only after a successful transaction do we clear legacy data and mark migration done
          finalizeMigration();
      } catch (e) {
          // On IndexedDB/WebCrypto failure, keep legacy values so a later init can retry
      }
  } catch (e) {
      // Ignore errors if localStorage is not available (e.g. SSR)
  }
};

let dbPromise: Promise<IDBPDatabase> | null = null;

export const initDB = async (): Promise<IDBPDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    try {
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

      // Initialize test balance if empty (180 MXN for consistency with UI)
      const tx = db.transaction('wallet-status', 'readwrite');
      const store = tx.objectStore('wallet-status');
      const balance = await store.get('current_balance');

      if (balance === undefined) {
        const defaultAmount = 180.00;
        const key = await getCryptoKey(db);
        const signature = await generateSignature(defaultAmount, key);
        await store.put({ id: 'current_balance', amount: defaultAmount, currency: 'MXN', signature }, 'current_balance');
        dispatchBalanceUpdate();
      }
    },
  });
  const db = await _dbPromise;
  const balance = await db.get('wallet-status', 'current_balance');
  if (balance === undefined) {
    const key = await getCryptoKey(db);
    const amount = 180.00;
    const signature = await generateSignature(amount, key);
    await db.put('wallet-status', { id: 'current_balance', amount, currency: 'MXN', signature }, 'current_balance');
  }
  return db;
};

export const getWalletBalance = async () => {
  const db = await initDB();
  const balance = await db.get('wallet-status', 'current_balance');
  if (balance) {
    const key = await getCryptoKey(db);

    // If there's no signature, it's a legacy record (pre-v3)
    if (!balance.signature) {
      balance.signature = await generateSignature(balance.amount, key);
      const writeTx = db.transaction('wallet-status', 'readwrite');
      await writeTx.objectStore('wallet-status').put(balance, 'current_balance');
      await writeTx.done;
      dispatchBalanceUpdate();
      return balance;
    }

    const isValid = await verifySignature(balance.amount, balance.signature, key);

    if (!isValid) {
      console.error('[SECURITY] Wallet balance signature verification failed. Possible tampering detected. Resetting to 0.00 MXN.');
      // Punish tampering by resetting balance to 0
      const resetAmount = 0.00;
      balance.amount = resetAmount;
      balance.signature = await generateSignature(resetAmount, key);
      // Escalate to readwrite only when a correction is required.
      const writeTx = db.transaction('wallet-status', 'readwrite');
      await writeTx.objectStore('wallet-status').put(balance, 'current_balance');
      await writeTx.done;
      dispatchBalanceUpdate();
      return balance;
    }
  }
  return balance;
};

export const setWalletBalance = async (amount: number) => {
  const db = await initDB();
  const tx = db.transaction('wallet-status', 'readwrite');
  const store = tx.objectStore('wallet-status');
  const existing = await store.get('current_balance');

  const key = await getCryptoKey(db);
  const signature = await generateSignature(amount, key);

  if (existing) {
    existing.amount = amount;
    existing.signature = signature;
    await store.put(existing, 'current_balance');
  } else {
    await store.put({ id: 'current_balance', amount, currency: 'MXN', signature }, 'current_balance');
  }

  await tx.done;
  dispatchBalanceUpdate();
};

export const updateWalletBalance = async (amount: number) => {
  const db = await initDB();
  // We call getWalletBalance first so it can handle tampering validation
  const balance = await getWalletBalance();
  if (balance) {
    const tx = db.transaction('wallet-status', 'readwrite');
    const store = tx.objectStore('wallet-status');
    const newAmount = balance.amount + amount;
    const key = await getCryptoKey(db);
    balance.amount = newAmount;
    balance.signature = await generateSignature(newAmount, key);
    await store.put(balance, 'current_balance');
    await tx.done;
    dispatchBalanceUpdate();
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
  const tx = db.transaction('pending-reports', 'readwrite');
  await tx.objectStore('pending-reports').add({
    ...report,
    timestamp: Date.now()
  });
  await tx.done;
};

export const savePendingReport = async (r: any) => {
  const db = await initDB();
  return db.put('pending-reports', { ...r, timestamp: Date.now() });
};

export const getPendingReports = async () => (await initDB()).getAll('pending-reports');
export const deletePendingReport = async (id: number) => (await initDB()).delete('pending-reports', id);

export const __resetDBPromise = () => {
  _dbPromise = null;
  _cryptoKey = null;
};
