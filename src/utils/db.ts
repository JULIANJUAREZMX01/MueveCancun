import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'cancunmueve-db';
const DB_VERSION = 4;

// Crypto utilities for securing balance against client-side tampering (DevTools modifications).
// Note: The HMAC key is static and client-visible. This is a deterrent against casual/manual
// edits, not a true cryptographic integrity guarantee against a determined attacker who can
// recompute valid signatures using DevTools.
let _cryptoKeyPromise: Promise<CryptoKey> | null = null;

const getCryptoKey = (): Promise<CryptoKey> => {
  if (!_cryptoKeyPromise) {
    const enc = new TextEncoder();
    const keyMaterial = enc.encode("cancunmueve_wallet_secure_salt_v1");
    _cryptoKeyPromise = crypto.subtle.importKey(
      "raw",
      keyMaterial,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  }
  return _cryptoKeyPromise;
};

const generateSignature = async (amount: number): Promise<string> => {
  const key = await getCryptoKey();
  const enc = new TextEncoder();
  const data = enc.encode(amount.toFixed(2));
  const signature = await crypto.subtle.sign("HMAC", key, data);
  // Convert ArrayBuffer to Hex String
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const verifySignature = async (amount: number, signatureHex: string | undefined): Promise<boolean> => {
  if (!signatureHex) return false;
  try {
    const expectedSignature = await generateSignature(amount);
    return expectedSignature === signatureHex;
  } catch (e) {
    return false;
  }
};

/**
 * Migrate balance from localStorage to IndexedDB.
 * This consolidates the triple balance system (user_balance, muevecancun_balance, wallet-status)
 * into a single source: IndexedDB via this module.
 * Accepts the already-open db instance to avoid circular recursion with initDB.
 */
export const migrateBalanceFromLocalStorage = async (db: Awaited<ReturnType<typeof openDB>>): Promise<void> => {
  try {
      // Helper to mark migration complete and clear legacy keys
      const finalizeMigration = () => {
          localStorage.setItem('balance_migration_done', 'true');
          localStorage.removeItem('muevecancun_balance');
          localStorage.removeItem('user_balance');
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
          }
        },
      });

      // Initialize test balance if empty (180 MXN for consistency with UI)
      const tx = db.transaction('wallet-status', 'readwrite');
      const store = tx.objectStore('wallet-status');
      const balance = await store.get('current_balance');

      if (balance === undefined) {
        const defaultAmount = 180.00;
        const signature = await generateSignature(defaultAmount);
        await store.put({ id: 'current_balance', amount: defaultAmount, currency: 'MXN', signature }, 'current_balance');
        console.log('[DB] Initial wallet balance set to 180.00 MXN');
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
    if (!balance.signature) {
      // Legacy record without a signature: treat as a trusted state and backfill the signature.
      console.log('[DB] Legacy record found without signature. Backfilling.');
      balance.signature = await generateSignature(balance.amount);
      const writeTx = db.transaction('wallet-status', 'readwrite');
      await writeTx.objectStore('wallet-status').put(balance, 'current_balance');
      await writeTx.done;
      return balance;
    }

    const isValid = await verifySignature(balance.amount, balance.signature);
    if (!isValid) {
      console.error('[SECURITY] Wallet balance signature verification failed. Possible tampering detected. Resetting to 0.00 MXN.');
      // Punish tampering by resetting balance to 0
      const resetAmount = 0.00;
      balance.amount = resetAmount;
      balance.signature = await generateSignature(resetAmount);
      // Escalate to readwrite only when a correction is required.
      const writeTx = db.transaction('wallet-status', 'readwrite');
      await writeTx.objectStore('wallet-status').put(balance, 'current_balance');
      await writeTx.done;
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

  const signature = await generateSignature(amount);

  if (existing) {
    existing.amount = amount;
    existing.signature = signature;
    await store.put(existing, 'current_balance');
  } else {
    await store.put({ id: 'current_balance', amount, currency: 'MXN', signature }, 'current_balance');
  }

  await tx.done;
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
    balance.signature = await generateSignature(newAmount);
    await store.put(balance, 'current_balance');
    await tx.done;
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
export const __resetDBPromise = () => { dbPromise = null; };
