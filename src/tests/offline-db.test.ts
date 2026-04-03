import { describe, it, expect, vi, beforeEach } from 'vitest';
import { savePendingReport, getPendingReports, deletePendingReport, __resetDBPromise } from '../utils/db';

// Mock the idb library
vi.mock('idb', () => {
  let stores: Record<string, any> = {
    'pending-reports': [],
    'wallet-status': { current_balance: { amount: 180.00, signature: 'mock' } }
  };

  const mockTx = {
    objectStore: (name: string) => ({
      add: async (val: any) => {
        const id = stores[name].length + 1;
        stores[name].push({ ...val, id });
      },
      delete: async (id: number) => {
        stores[name] = stores[name].filter((item: any) => item.id !== id);
      },
      getAll: async () => stores[name],
      get: async (key: string) => stores[name][key],
      put: async (val: any, key: string) => { stores[name][key] = val; },
    }),
    done: Promise.resolve(),
  };

  const mockDb = {
    transaction: (storeName: string, mode?: string) => mockTx,
    getAll: async (storeName: string) => stores[storeName],
    _clearStore: () => {
        stores['pending-reports'] = [];
        stores['wallet-status'] = { current_balance: { amount: 180.00, signature: 'mock' } };
    }
  };

  return {
    openDB: vi.fn().mockResolvedValue(mockDb),
  };
});

// Since we use Web Crypto API, we need to ensure it's available in the test environment.
import { webcrypto } from 'crypto';
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true, writable: false });
}

describe('Offline DB Support', () => {
  beforeEach(async () => {
    __resetDBPromise();
    const { openDB } = await import('idb');
    const db = await openDB('any', 1) as any;
    db._clearStore();
  });

  it('should save and retrieve pending reports', async () => {
    const report = {
      tipo: 'ruta',
      ruta: 'R-27',
      descripcion: 'Test offline report',
      userAgent: 'NodeJS/Vitest',
      url: 'http://localhost/test'
    };

    await savePendingReport(report);
    const reports = await getPendingReports();

    expect(reports.length).toBe(1);
    expect(reports[0].tipo).toBe('ruta');
    expect(reports[0].descripcion).toBe('Test offline report');
    expect(reports[0].timestamp).toBeDefined();
    expect(reports[0].id).toBeDefined();
  });

  it('should delete pending reports', async () => {
    const report = {
      tipo: 'precio',
      ruta: 'R-1',
      descripcion: 'Delete me',
      userAgent: 'NodeJS/Vitest',
      url: 'http://localhost/test'
    };

    await savePendingReport(report);
    let reports = await getPendingReports();
    const id = reports[0].id!;

    await deletePendingReport(id);
    reports = await getPendingReports();

    expect(reports.length).toBe(0);
  });
});
