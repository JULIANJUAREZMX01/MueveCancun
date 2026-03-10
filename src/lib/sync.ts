/**
 * Mueve Reparto — Sync Manager
 *
 * Consume la syncQueue de IndexedDB y la envía al backend API
 * cuando el dispositivo tiene conexión a internet.
 *
 * - Sin API configurada (PUBLIC_API_URL vacío): no hace nada (modo offline-only)
 * - Máximo 5 reintentos por entrada antes de abandonarla
 * - Se activa al recuperar conexión (window.online) y cada 5 minutos
 */

import { dbGetAll, dbDelete, dbPut, STORES, type SyncEntry } from './idb'

const API_URL: string = (import.meta.env.PUBLIC_API_URL as string) ?? ''

// ── Device ID ───────────────────────────────────────────────────────────────

/**
 * Obtiene o genera el device_id del repartidor.
 * Se persiste en localStorage para identificar el dispositivo entre sesiones.
 * No es un auth token — es solo un identificador de dispositivo.
 */
export function getDeviceId(): string {
  let id = localStorage.getItem('mr_device_id')
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    localStorage.setItem('mr_device_id', id)
  }
  return id
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

function apiHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Device-Id':  getDeviceId(),
  }
}

async function apiFetch(
  method: 'POST' | 'PATCH' | 'GET',
  path: string,
  body?: unknown,
): Promise<Response> {
  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10_000)
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers: apiHeaders(),
      body:    body ? JSON.stringify(body) : undefined,
      signal:  ctrl.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

// ── Sync logic ───────────────────────────────────────────────────────────────

/**
 * Procesa todas las entradas de la syncQueue de IDB:
 * - delivery_update → PATCH /stops/:id
 * - daily_summary   → POST  /stats (upsert)
 */
export async function flushSyncQueue(): Promise<void> {
  if (!navigator.onLine || !API_URL) return

  const queue = await dbGetAll<SyncEntry>(STORES.SYNC)
  if (queue.length === 0) return

  for (const entry of queue) {
    // Abandonar entradas que han fallado demasiadas veces
    if (entry.retries >= 5) {
      await dbDelete(STORES.SYNC, entry.id)
      continue
    }

    try {
      let ok = false

      if (entry.type === 'delivery_update') {
        const p = entry.payload as {
          id:          string
          status:      string
          completedAt?: number
          income?:     number
          notified?:   boolean
        }
        const res = await apiFetch('PATCH', `/stops/${p.id}`, {
          status:       p.status,
          completed_at: p.completedAt ? new Date(p.completedAt).toISOString() : undefined,
          income:       p.income,
          notified:     p.notified,
        })
        ok = res.ok
      }

      if (entry.type === 'daily_summary') {
        const res = await apiFetch('POST', '/stats', entry.payload)
        ok = res.ok
      }

      if (ok) {
        await dbDelete(STORES.SYNC, entry.id)
      } else {
        await dbPut<SyncEntry>(STORES.SYNC, {
          ...entry,
          retries:     entry.retries + 1,
          lastAttempt: Date.now(),
        })
      }
    } catch {
      // Timeout, red caída, etc. — incrementar retries y continuar
      await dbPut<SyncEntry>(STORES.SYNC, {
        ...entry,
        retries:     entry.retries + 1,
        lastAttempt: Date.now(),
      })
    }
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────

let _initialized = false

/**
 * Inicializa el sync manager. Idempotente — seguro llamar múltiples veces.
 *
 * Uso en MainLayout.astro:
 *   import { initSyncManager } from '@lib/sync'
 *   initSyncManager()
 */
export function initSyncManager(): void {
  if (!API_URL || _initialized) return
  _initialized = true

  // Procesar al recuperar conexión
  window.addEventListener('online', () => {
    flushSyncQueue().catch(console.error)
  })

  // Procesar al cargar si ya hay conexión
  if (navigator.onLine) {
    flushSyncQueue().catch(console.error)
  }

  // Ciclo periódico cada 5 minutos
  setInterval(() => {
    if (navigator.onLine) flushSyncQueue().catch(console.error)
  }, 5 * 60 * 1000)
}
