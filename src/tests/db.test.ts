import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { openDB } from 'idb';
import { getWalletBalance, __resetDBPromise, setWalletBalance, initDB, updateWalletBalance } from '../utils/db';

// Mock the idb library
vi.mock('idb', () => {
  let store: unknown = {};

  const mockDb: unknown = {
    get: async (storeName: string, key: string) => {
      if (!store[storeName]) store[storeName] = {};
      return store[storeName][key];
    },
    put: async (storeName: string, val: unknown, key: string) => {
      if (!store[storeName]) store[storeName] = {};
      if (key) store[storeName][key] = val;
      else {
          // Fallback for simple puts if needed
      }
    },
    _tamperStore: (storeName: string, key: string, val: unknown) => {
      if (!store[storeName]) store[storeName] = {};
      store[storeName][key] = val;
    },
    _clearStore: () => { store = {}; }
  };

  return {
    openDB: vi.fn().mockResolvedValue(mockDb),
  };
});

import { webcrypto } from 'crypto';
const originalLocalStorage = (globalThis as unknown).localStorage;
if (!globalThis.crypto) {
  // @ts-expect-error: Mocking internal IDB behavior
  globalThis.crypto = webcrypto;
}

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
globalThis.localStorage = localStorageMock as unknown;

afterAll(() => {
  (globalThis as unknown).localStorage = originalLocalStorage;
});

describe('DB Security Checks', () => {

  beforeEach(async () => {
    __resetDBPromise();
    const db = await openDB('cancunmueve-db', 4) as unknown;
    db._clearStore();

    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'balance_migration_done') return 'true';
      return null;
    });
  });

  it('should generate and verify a valid signature on setWalletBalance', async () => {
    await setWalletBalance(100.00);
    const balance = await getWalletBalance();

    expect(balance).toBeDefined();
    expect(balance?.amount).toBe(100.00);
    expect(balance?.signature).toBeDefined();
    expect(typeof balance?.signature).toBe('string');
  });

  it('should reset balance to 0 if amount is tampered with', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'v4_key_migration_done') return 'true';
      if (key === 'balance_migration_done') return 'true';
      return null;
    });

    await setWalletBalance(50.00);

    const db = await openDB('cancunmueve-db', 4) as unknown;
    const existing = await db.get('wallet-status', 'current_balance');
    existing.amount = 9999.00;
    db._tamperStore('wallet-status', 'current_balance', existing);

    const tamperedBalance = await getWalletBalance();
    expect(tamperedBalance).toBeDefined();
    expect(tamperedBalance?.amount).toBe(0.00);
  });

  it('should treat a missing signature as a legacy record and backfill it', async () => {
    await setWalletBalance(75.00);
    const db = await openDB('cancunmueve-db', 4) as unknown;
    const existing = await db.get('wallet-status', 'current_balance');
    delete existing.signature;
    db._tamperStore('wallet-status', 'current_balance', existing);

    const result = await getWalletBalance();
    expect(result?.amount).toBe(75.00);
    expect(result?.signature).toBeDefined();
  });

  it('should correctly handle updates and sign the new balance', async () => {
    await setWalletBalance(100.00);
    await updateWalletBalance(50.00);
    const finalBalance = await getWalletBalance();
    expect(finalBalance?.amount).toBe(150.00);
    expect(finalBalance?.signature).toBeDefined();
  });

  it('should initialize a fresh profile with default 180.00 MXN balance and a valid signature', async () => {
    localStorageMock.getItem.mockImplementation(() => null);
    __resetDBPromise();
    await initDB();
    const balance = await getWalletBalance();
    expect(balance).toBeDefined();
    expect(balance?.amount).toBe(180.00);
    expect(balance?.signature).toBeDefined();
  });
});
