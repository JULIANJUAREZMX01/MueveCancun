import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { openDB } from 'idb';
import { getWalletBalance, __resetDBPromise, setWalletBalance, initDB, updateWalletBalance } from '../utils/db';

// --- Mock shape that matches the vi.mock implementation below ---
interface MockObjectStore {
  get: (key: string) => Promise<unknown>;
  put: (val: unknown, key: string) => Promise<void>;
}

interface MockTxShape {
  objectStore: (_name: string) => MockObjectStore;
  done: Promise<void>;
}

interface MockDB {
  transaction: (_storeName: string, _mode?: string) => MockTxShape;
  get: (_storeName: string, key: string) => Promise<unknown>;
  put: (_storeName: string, val: unknown, key: string) => Promise<void>;
  _tamperStore: (key: string, val: unknown) => void;
  _clearStore: () => void;
}

// Mock the idb library
vi.mock('idb', () => {
  let store: Record<string, unknown> = {};

  const mockTx: MockTxShape = {
    objectStore: (_name: string): MockObjectStore => ({
      get: async (key: string) => store[key],
      put: async (val: unknown, key: string) => { store[key] = val; },
    }),
    done: Promise.resolve(),
  };

  const mockDb: MockDB = {
    transaction: (_storeName: string, _mode?: string) => mockTx,
    get: async (_storeName: string, key: string) => store[key],
    put: async (_storeName: string, val: unknown, key: string) => { store[key] = val; },
    // A helper method on the mock to let us bypass the SDK and directly tamper
    _tamperStore: (key: string, val: unknown) => { store[key] = val; },
    _clearStore: () => { store = {}; }
  };

  return {
    openDB: vi.fn().mockResolvedValue(mockDb),
  };
});

// Since we use Web Crypto API, we need to ensure it's available in the test environment.
// Node 20+ has crypto.subtle on globalThis.
import { webcrypto } from 'crypto';
const originalLocalStorage = (globalThis as unknown as Record<string, unknown>).localStorage;
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true, writable: false });
}


// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true, writable: true });

afterAll(() => {
  // Only restore localStorage, which we replaced with a mock.
  // globalThis.crypto is not restored because we only polyfill it when absent;
  // in Node 20+ it is already defined and read-only, so nothing was changed.
  Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true, writable: true });
});

describe('DB Security Checks', () => {

  beforeEach(async () => {
    __resetDBPromise();
    // We clear the mock store before each test
    const db = await openDB('cancunmueve-db', 3) as unknown as MockDB;
    db._clearStore();

    // Simulate migration already done to prevent auto-signing loophole
    localStorageMock.getItem.mockImplementation((key: string) => {
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
    const db = await openDB('cancunmueve-db', 3) as unknown as MockDB;
    const existing = await db.get('wallet-status', 'current_balance') as Record<string, unknown>;

    // User tries to artificially inflate balance to 9999
    existing.amount = 9999.00;
    db._tamperStore('current_balance', existing);

    // 3. Read it back via the API, it should detect tampering and reset to 0
    const tamperedBalance = await getWalletBalance();

    expect(tamperedBalance).toBeDefined();
    expect(tamperedBalance?.amount).toBe(0.00); // Punished!
  });

  it('should treat a missing signature as a legacy record and backfill it', async () => {
    await setWalletBalance(75.00);

    const db = await openDB('cancunmueve-db', 3) as unknown as MockDB;
    const existing = await db.get('wallet-status', 'current_balance') as Record<string, unknown>;

    // Simulate a legacy record: remove its signature
    delete existing.signature;
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

  it('should initialize a fresh profile with default 0.00 MXN balance and a valid signature', async () => {
    // Simulate a fresh profile: no migration done and no localStorage values
    localStorageMock.getItem.mockImplementation((_key: string) => null);

    __resetDBPromise();
    await initDB();

    const balance = await getWalletBalance();
    expect(balance).toBeDefined();
    expect(balance?.amount).toBe(0.00);
    expect(balance?.signature).toBeDefined();
  });
});
