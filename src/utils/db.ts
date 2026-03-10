import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'cancunmueve-db';
const DB_VERSION = 3;

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
  } catch {
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
    // Check if migration already done
    const migrationDone = localStorage.getItem('balance_migration_done');
    if (migrationDone === 'true') {
      return;
    }

    const tx = db.transaction('wallet-status', 'readwrite');
    const store = tx.objectStore('wallet-status');

    // Priority: muevecancun_balance (wallet.astro) > user_balance (RouteCalculator.astro)
    let localBalance: number | null = null;
    let source = '';

    // Try muevecancun_balance first (wallet page)
    const muevecancunBalance = localStorage.getItem('muevecancun_balance');
    if (muevecancunBalance !== null) {
      localBalance = parseFloat(muevecancunBalance);
      source = 'muevecancun_balance';
    }

    // Try user_balance if muevecancun_balance not found
    if (localBalance === null || isNaN(localBalance)) {
      const userBalance = localStorage.getItem('user_balance');
      if (userBalance !== null) {
        localBalance = parseFloat(userBalance);
        source = 'user_balance';
      }
    }

    const existing = await store.get('current_balance');

    if (localBalance !== null && !isNaN(localBalance) && localBalance > 0) {
      if (existing) {
        if (localBalance > existing.amount) {
          // Preserve the higher balance from localStorage
          existing.amount = localBalance;
          existing.signature = await generateSignature(localBalance);
          await store.put(existing, 'current_balance');
        } else if (!existing.signature) {
          // Backfill signature for legacy records that have no higher localStorage value
          existing.signature = await generateSignature(existing.amount);
          await store.put(existing, 'current_balance');
        }
      } else {
        // Create new balance record
        const signature = await generateSignature(localBalance);
        await store.put({ id: 'current_balance', amount: localBalance, currency: 'MXN', signature }, 'current_balance');
      }
    } else if (existing && !existing.signature) {
      // No localStorage balance, but existing record has no signature - backfill it
      existing.signature = await generateSignature(existing.amount);
      await store.put(existing, 'current_balance');
    }

    // Mark migration as done
    localStorage.setItem('balance_migration_done', 'true');

    // Clean up localStorage
    localStorage.removeItem('muevecancun_balance');
    localStorage.removeItem('user_balance');

    await tx.done;
    console.log('[DB] Balance migration completed successfully');
  } catch (e) {
    console.error('[DB] Balance migration failed:', e);
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
          // Version 3: Migration handled in code, no schema changes needed
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

// Test util
export const __resetDBPromise = () => { dbPromise = null; };
