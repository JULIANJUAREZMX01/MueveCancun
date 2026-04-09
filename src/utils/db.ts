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

export const initDB = async (): Promise<IDBPDatabase> => {
  if (_dbPromise) return _dbPromise;
  _dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db, old) {
      if (old < 1) { db.createObjectStore('routes'); db.createObjectStore('user-reports'); }
      if (old < 2) { db.createObjectStore('wallet-status'); }
      if (old < 4) {
        if (!db.objectStoreNames.contains('pending-reports')) db.createObjectStore('pending-reports', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('security-keys')) db.createObjectStore('security-keys');
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
    if (!balance.signature) {
      balance.signature = await generateSignature(balance.amount, key);
      await db.put('wallet-status', balance, 'current_balance');
    } else {
      const valid = await verifySignature(balance.amount, balance.signature, key);
      if (!valid) {
        balance.amount = 0;
        balance.signature = await generateSignature(0, key);
        await db.put('wallet-status', balance, 'current_balance');
      }
    }
  }
  return balance;
};

export const setWalletBalance = async (amount: number) => {
  const db = await initDB();
  const key = await getCryptoKey(db);
  const signature = await generateSignature(amount, key);
  await db.put('wallet-status', { id: 'current_balance', amount, currency: 'MXN', signature }, 'current_balance');
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('BALANCE_UPDATED'));
};

export const updateWalletBalance = async (amount: number) => {
  const b = await getWalletBalance();
  if (b) await setWalletBalance(b.amount + amount);
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
