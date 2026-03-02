import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'cancunmueve-db';
const DB_VERSION = 3;

// Crypto utilities for securing balance against client-side tampering (IDOR/DevTools modifications)
const getCryptoKey = async (): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  // Using a static salt/key derivation. For a purely static site without a backend,
  // we cannot have a true "secret", but this prevents casual DevTools tampering.
  const keyMaterial = enc.encode("cancunmueve_wallet_secure_salt_v1");
  return await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
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
 * Migrate balance from localStorage to IndexedDB
 * This consolidates the triple balance system (user_balance, muevecancun_balance, wallet-status)
 * into a single source: IndexedDB via this module.
 */
export const migrateBalanceFromLocalStorage = async (db: IDBPDatabase): Promise<void> => {
  try {
    // Check if migration already done
    const migrationDone = localStorage.getItem('balance_migration_done');
    if (migrationDone === 'true') {
      console.log('[DB] Balance migration already completed');
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

    // Use the localStorage value if found, otherwise keep existing IndexedDB value
    if (localBalance !== null && !isNaN(localBalance) && localBalance > 0) {
      const existing = await store.get('current_balance');
      if (existing) {
        // Preserve the higher balance from localStorage
        if (localBalance > existing.amount) {
          existing.amount = localBalance;
          existing.signature = await generateSignature(localBalance);
          await store.put(existing, 'current_balance');
          console.log(`[DB] Migrated balance from ${source}: ${localBalance}`);
        }
      } else {
        // Create new balance record
        const signature = await generateSignature(localBalance);
        await store.put({ id: 'current_balance', amount: localBalance, currency: 'MXN', signature }, 'current_balance');
        console.log(`[DB] Created balance from ${source}: ${localBalance}`);
      }
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
        await store.put({ id: 'current_balance', amount: 180.00, currency: 'MXN' }, 'current_balance');
        console.log('[DB] Initial wallet balance set to 180.00 MXN');
      }

      await tx.done;

  if (balance === undefined) {
    const defaultAmount = 180.00;
    const signature = await generateSignature(defaultAmount);
    await store.put({ id: 'current_balance', amount: defaultAmount, currency: 'MXN', signature }, 'current_balance');
    console.log('[DB] Initial wallet balance set to 180.00 MXN');
  }

      return db;
    } catch (e) {
      dbPromise = null;
      throw e;
    }
  })();

  return dbPromise;
};

export const getWalletBalance = async (): Promise<{ id: string; amount: number; currency: string; signature?: string } | undefined> => {
  const db = await initDB();
  const tx = db.transaction('wallet-status', 'readwrite');
  const store = tx.objectStore('wallet-status');
  const balance = await store.get('current_balance');

  if (balance) {
    const isValid = await verifySignature(balance.amount, balance.signature);
    if (!isValid) {
      console.error('[SECURITY] Wallet balance signature verification failed. Possible tampering detected. Resetting to 0.00 MXN.');
      // Punish tampering by resetting balance to 0
      const resetAmount = 0.00;
      balance.amount = resetAmount;
      balance.signature = await generateSignature(resetAmount);
      await store.put(balance, 'current_balance');
      await tx.done;
      return balance;
    }
  }

  await tx.done;
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
