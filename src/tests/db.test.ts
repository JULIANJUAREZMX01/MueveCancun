/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/ban-ts-comment */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { openDB } from 'idb';
import { getWalletBalance, __resetDBPromise, setWalletBalance, initDB, updateWalletBalance } from '../utils/db';

// Mock the idb library
vi.mock('idb', () => {
  let store: any = {};

  const mockTx = {
    objectStore: (_name: string) => ({
      get: async (key: string) => store[key],
      put: async (val: any, key: string) => { store[key] = val; },
    }),
    done: Promise.resolve(),
  };

  const mockDb = {
    transaction: (_storeName: string, _mode?: string) => mockTx,
    get: async (_storeName: string, key: string) => store[key],
    put: async (_storeName: string, val: any, key: string) => { store[key] = val; },
    // A helper method on the mock to let us bypass the SDK and directly tamper
    _tamperStore: (key: string, val: any) => { store[key] = val; },
    _clearStore: () => { store = {}; }
  };

  return {
    openDB: vi.fn().mockResolvedValue(mockDb),
  };
});

// Since we use Web Crypto API, we need to ensure it's available in the test environment.
// Node 20+ has crypto.subtle on globalThis.
import { webcrypto } from 'crypto';
const originalLocalStorage = (globalThis as any).localStorage;
if (!globalThis.crypto) {
  // @ts-ignore
  globalThis.crypto = webcrypto;
}


// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
globalThis.localStorage = localStorageMock as any;

afterAll(() => {
  // Only restore localStorage, which we replaced with a mock.
  // globalThis.crypto is not restored because we only polyfill it when absent;
  // in Node 20+ it is already defined and read-only, so nothing was changed.
  (globalThis as any).localStorage = originalLocalStorage;
});

describe('DB Security Checks', () => {

  beforeEach(async () => {
    __resetDBPromise();
    // We clear the mock store before each test
    const db = await openDB('cancunmueve-db', 3);
    // @ts-ignore
    db._clearStore();

    // Simulate migration already done to prevent auto-signing loophole
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
    // 1. Set legitimate balance
    await setWalletBalance(50.00);

    // 2. Tamper with the store directly (bypassing the signature generation)
    const db = await openDB('cancunmueve-db', 3);
    // @ts-ignore
    const existing = await db.get('wallet-status', 'current_balance');

    // User tries to artificially inflate balance to 9999
    existing.amount = 9999.00;
    // @ts-ignore
    db._tamperStore('current_balance', existing);

    // 3. Read it back via the API, it should detect tampering and reset to 0
    const tamperedBalance = await getWalletBalance();

    expect(tamperedBalance).toBeDefined();
    expect(tamperedBalance?.amount).toBe(0.00); // Punished!
  });

  it('should treat a missing signature as a legacy record and backfill it', async () => {
    await setWalletBalance(75.00);

    const db = await openDB('cancunmueve-db', 3);
    // @ts-ignore
    const existing = await db.get('wallet-status', 'current_balance');

    // Simulate a legacy record: remove its signature
    delete existing.signature;
    // @ts-ignore
    db._tamperStore('current_balance', existing);

    const result = await getWalletBalance();

    // Balance should be preserved (treated as legacy state, not tampering)
    expect(result?.amount).toBe(75.00);
    expect(result?.signature).toBeDefined();
  });

  it('should correctly handle updates and sign the new balance', async () => {
    await setWalletBalance(100.00);
    await updateWalletBalance(50.00); // Recharging $50

    const finalBalance = await getWalletBalance();
    expect(finalBalance?.amount).toBe(150.00);
    expect(finalBalance?.signature).toBeDefined();
  });

  it('should initialize a fresh profile with default 180.00 MXN balance and a valid signature', async () => {
    // Simulate a fresh profile: no migration done and no localStorage values
    localStorageMock.getItem.mockImplementation((_key) => null);

    __resetDBPromise();
    await initDB();

    const balance = await getWalletBalance();
    expect(balance).toBeDefined();
    expect(balance?.amount).toBe(180.00);
    expect(balance?.signature).toBeDefined();
  });
});
