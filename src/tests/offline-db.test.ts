import { describe, it, expect, vi, beforeEach } from 'vitest';
import { savePendingReport, getPendingReports, deletePendingReport, __resetDBPromise } from '../utils/db';

// Mock the idb library
vi.mock('idb', () => {
  let stores: Record<string, any> = {
    'pending-reports': {},
    'wallet-status': { current_balance: { amount: 180.00, currency: 'MXN' } },
    'security-keys': {}
  };

  const mockDb: any = {
    get: async (store: string, key: string) => stores[store][key],
    put: async (store: string, val: any, key: string) => {
        const k = key || val.id || 'auto_' + Math.random();
        if (store === 'pending-reports' && !val.id) val.id = Math.floor(Math.random() * 1000);
        stores[store][val.id || k] = val;
        return val.id || k;
    },
    getAll: async (store: string) => Object.values(stores[store]),
    delete: async (store: string, id: any) => {
        delete stores[store][id];
    },
    _clearStore: () => {
        stores['pending-reports'] = {};
        stores['wallet-status'] = { 'current_balance': { amount: 180.00, currency: 'MXN' } };
    }
  };

  return {
    openDB: vi.fn().mockResolvedValue(mockDb),
  };
});

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
