import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'cancunmueve-db';
const DB_VERSION = 4;

// Crypto utilities for securing balance against client-side tampering (DevTools modifications).
// The HMAC key is generated per-device and stored in IndexedDB.
// This makes it significantly harder to forge signatures compared to a hardcoded key,
// as the key is not present in the source code or static assets.
let _cryptoKey: CryptoKey | null = null;

const getCryptoKey = async (dbInstance?: IDBPDatabase): Promise<CryptoKey> => {
  if (_cryptoKey) return _cryptoKey;

  const db = dbInstance || await initDB();
  const tx = db.transaction('security-keys', 'readwrite');
  const store = tx.objectStore('security-keys');

  let key: CryptoKey | undefined = await store.get('hmac-key');

  if (!key) {
    console.log('[SECURITY] No HMAC key found. Generating a new device-specific key.');
    key = await crypto.subtle.generateKey(
      { name: "HMAC", hash: "SHA-256" },
      false, // non-extractable for added security
      ["sign", "verify"]
    );
    await store.put(key, 'hmac-key');
  }

  await tx.done;
  _cryptoKey = key;
  return key;
};

const generateSignature = async (amount: number, dbInstance?: IDBPDatabase): Promise<string> => {
  const key = await getCryptoKey(dbInstance);
  const enc = new TextEncoder();
  const data = enc.encode(amount.toFixed(2));
  const signature = await crypto.subtle.sign("HMAC", key, data);
  // Convert ArrayBuffer to Hex String
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const verifySignature = async (amount: number, signatureHex: string | undefined, dbInstance?: IDBPDatabase): Promise<boolean> => {
  if (!signatureHex) return false;
  try {
    const expectedSignature = await generateSignature(amount, dbInstance);
    return expectedSignature === signatureHex;
  } catch (e) {
    return false;
  }
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
              const signature = await generateSignature(legacyBalance);
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
        const signature = await generateSignature(defaultAmount, db);
        await store.put({ id: 'current_balance', amount: defaultAmount, currency: 'MXN', signature }, 'current_balance');
        console.log('[DB] Initial wallet balance set to 180.00 MXN');
        dispatchBalanceUpdate();
      }

      await tx.done;

      // Run migration after DB initialization, passing db to avoid circular recursion
      await migrateBalanceFromLocalStorage(db);

      return db;
    } catch (error) {
      console.error('[DB] Initialization failed:', error);
      dbPromise = null;
      throw error;
    }
  })();

  return dbPromise;
};

export const getWalletBalance = async (): Promise<{ id: string; amount: number; currency: string; signature?: string } | undefined> => {
  const db = await initDB();

  // Use a readonly transaction for the normal, no-tampering path.
  const readTx = db.transaction('wallet-status', 'readonly');
  const balance = await readTx.objectStore('wallet-status').get('current_balance');
  await readTx.done;

  if (balance) {
    // If there's no signature, it's a legacy record (pre-v3)
    if (!balance.signature) {
      console.log('[DB] Legacy record found without signature. Backfilling.');
      balance.signature = await generateSignature(balance.amount, db);
      const writeTx = db.transaction('wallet-status', 'readwrite');
      await writeTx.objectStore('wallet-status').put(balance, 'current_balance');
      await writeTx.done;
      dispatchBalanceUpdate();
      return balance;
    }

    const isValid = await verifySignature(balance.amount, balance.signature, db);

    if (!isValid) {
      // If verification fails, but the key was JUST generated (migration from hardcoded to device key),
      // we can't easily verify the old signature without the old key.
      // However, we can use a "trust-once" flag during migration or check if the key is new.
      // Since we want to eliminate the hardcoded key entirely, we check if we've already done this migration.
      const migrationFlag = localStorage.getItem('v4_key_migration_done');

      if (!migrationFlag) {
        console.log('[SECURITY] V4 Migration: Trusting existing signature once and re-signing with device key.');
        balance.signature = await generateSignature(balance.amount, db);
        const writeTx = db.transaction('wallet-status', 'readwrite');
        await writeTx.objectStore('wallet-status').put(balance, 'current_balance');
        await writeTx.done;
        localStorage.setItem('v4_key_migration_done', 'true');
        return balance;
      }

      console.error('[SECURITY] Wallet balance signature verification failed. Possible tampering detected. Resetting to 0.00 MXN.');
      // Punish tampering by resetting balance to 0
      const resetAmount = 0.00;
      balance.amount = resetAmount;
      balance.signature = await generateSignature(resetAmount, db);
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

export const setWalletBalance = async (amount: number): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction('wallet-status', 'readwrite');
  const store = tx.objectStore('wallet-status');
  const existing = await store.get('current_balance');

  const signature = await generateSignature(amount, db);

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
    balance.amount = newAmount;
    balance.signature = await generateSignature(newAmount, db);
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

export const getPendingReports = async (): Promise<PendingReport[]> => {
  const db = await initDB();
  return db.getAll('pending-reports');
};

export const deletePendingReport = async (id: number) => {
  const db = await initDB();
  const tx = db.transaction('pending-reports', 'readwrite');
  await tx.objectStore('pending-reports').delete(id);
  await tx.done;
};

// Test util
export const __resetDBPromise = () => {
  dbPromise = null;
  _cryptoKey = null;
};
