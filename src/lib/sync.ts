import { put, getAll, remove } from './idb';
import type { SyncEntry } from './types';

const MAX_RETRIES = 5;

async function processPending(): Promise<void> {
  const pending = await getAll<SyncEntry>('pending');
  for (const entry of pending) {
    if (entry.retries >= MAX_RETRIES) { await remove('pending', entry.id); continue; }
    try {
      await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry.payload) });
      await remove('pending', entry.id);
    } catch {
      await put<SyncEntry>('pending', { ...entry, retries: entry.retries + 1 });
    }
  }
}

export function initSync(): void {
  window.addEventListener('online', () => processPending());
  if (navigator.onLine) processPending();
}

export async function queueSync(id: string, payload: unknown): Promise<void> {
  await put<SyncEntry>('pending', { id, payload, timestamp: Date.now(), retries: 0 });
  if (navigator.onLine) await processPending();
}
