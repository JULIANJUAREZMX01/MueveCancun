import { put, getAll, remove } from './idb';
import type { SyncEntry } from './types';

const MAX_RETRIES = 5;

let processing = false;

async function processPending(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    const pending = await getAll<SyncEntry>('pending');
    for (const entry of pending) {
      if (entry.retries >= MAX_RETRIES) { await remove('pending', entry.id); continue; }
      try {
        const response = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry.payload) });
        if (response.ok) {
          await remove('pending', entry.id);
        } else {
          await put<SyncEntry>('pending', { ...entry, retries: entry.retries + 1 });
        }
      } catch {
        await put<SyncEntry>('pending', { ...entry, retries: entry.retries + 1 });
      }
    }
  } finally {
    processing = false;
  }
}

export function initSync(): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  window.addEventListener('online', () => {
    void processPending().catch((error) => {
      console.error('Failed to process pending sync entries after coming online:', error);
    });
  });
  if (navigator.onLine) {
    void processPending().catch((error) => {
      console.error('Failed to process pending sync entries during initSync:', error);
    });
  }
}

export async function queueSync(id: string, payload: unknown): Promise<void> {
  await put<SyncEntry>('pending', { id, payload, timestamp: Date.now(), retries: 0 });
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    await processPending();
  }
}
