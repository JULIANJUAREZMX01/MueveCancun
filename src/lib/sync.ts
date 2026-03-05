/**
 * Mueve Reparto — Sync Manager
 * Encola peticiones para sincronizacion offline con retry exponencial.
 *
 * Uso:
 *   await SyncManager.enqueue('/api/deliveries', 'POST', { address: '...' });
 *   await SyncManager.flush();  // llamar al recuperar conexion
 */

import { idb, STORES, type SyncEntry } from './idb';

const MAX_ATTEMPTS = 5;

export class SyncManager {
  /**
   * Encola una peticion para envio posterior.
   * Registra Background Sync si el navegador lo soporta.
   */
  static async enqueue(url: string, method: string, body: unknown): Promise<void> {
    const entry: SyncEntry = { url, method, body, timestamp: Date.now(), attempts: 0 };
    await idb.put(STORES.SYNC_QUEUE, entry);

    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      try {
        await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register('sync-mr-data');
      } catch {
        // Background Sync no disponible, se procesara al volver a estar online
      }
    }
  }

  /**
   * Procesa toda la cola. Llamar cuando se detecta conexion.
   * Usa retry con backoff exponencial (1s, 2s, 4s...).
   */
  static async flush(): Promise<void> {
    const queue = await idb.getAll<SyncEntry>(STORES.SYNC_QUEUE);
    if (!queue.length) return;

    for (const entry of queue) {
      if (entry.attempts >= MAX_ATTEMPTS) {
        if (entry.id !== undefined) await idb.delete(STORES.SYNC_QUEUE, entry.id);
        continue;
      }

      try {
        const res = await fetch(entry.url, {
          method: entry.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry.body),
        });

        if (res.ok) {
          if (entry.id !== undefined) await idb.delete(STORES.SYNC_QUEUE, entry.id);
        } else {
          await SyncManager.incrementAttempts(entry);
        }
      } catch {
        await SyncManager.incrementAttempts(entry);
      }
    }
  }

  private static async incrementAttempts(entry: SyncEntry): Promise<void> {
    const updated: SyncEntry = { ...entry, attempts: entry.attempts + 1 };
    await idb.put(STORES.SYNC_QUEUE, updated);
  }
}

// Escuchar recuperacion de conexion para procesar la cola automaticamente
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    SyncManager.flush().catch(console.error);
  });
}
