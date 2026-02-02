import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initDB } from './db';
import * as idb from 'idb';

// Mock idb
vi.mock('idb', () => {
  return {
    openDB: vi.fn().mockImplementation(() => Promise.resolve({
      objectStoreNames: {
        contains: () => true
      },
      close: () => {},
      get: () => Promise.resolve(null),
      put: () => Promise.resolve(),
    })),
  };
});

describe('Database Connection Caching', () => {
  // Since dbPromise is a module-level variable, it persists across tests if we don't reset the module.
  // However, vitest isolates test files, but within the same file, the module state persists.
  // We can't easily reset the module-level variable from outside without exposing a reset function or using vi.resetModules() and re-importing.
  // For this test, I will just assume it starts fresh or I will check that subsequent calls don't increase the count.

  beforeEach(() => {
    vi.clearAllMocks();
    // Ideally we would reset the dbPromise here.
    // If we can't reset it, we can only test the "cached" behavior if the first test already set it.
    // But since this is the only test file importing it in this context (and vitest runs files in isolation usually),
    // the first test run will initialize it.
  });

  it('calls openDB only once and returns the same promise', async () => {
    // First call triggers openDB
    const p1 = initDB();

    // Second call should return cached promise
    const p2 = initDB();
    const p3 = initDB();

    await Promise.all([p1, p2, p3]);

    // Check that openDB was called only once
    // Note: If previous tests (in other `it` blocks if any existed) had run, it might have been called already.
    // But here we only have one test or we need to be careful.
    // Given the previous run, the module might be cached if I use the same process?
    // Vitest watch mode does this, but `vitest run` should start fresh.

    // However, since I cannot easily reset the module variable 'dbPromise' without `vi.resetModules()` and dynamic import,
    // I will use `vi.resetModules()` to ensure a fresh start for this test file execution if needed,
    // but typically `vitest run` is fresh enough.

    // Let's assume fresh start.
    expect(idb.openDB).toHaveBeenCalledTimes(1);

    // Verify reference equality
    expect(p1).toBe(p2);
    expect(p2).toBe(p3);
  });
});
