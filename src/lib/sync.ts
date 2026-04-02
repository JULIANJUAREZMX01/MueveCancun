import { getAll, remove } from './idb';
import type { SyncEntry } from './types';

const MAX_RETRIES = 5;
let processing = false;

// Definitive decision: In SSG mode, we hit the external API directly from the client.
const buildPayload = (data: any) => ({
  title: `[REPORTE] ${data.tipo_title ?? data.tipo}${data.ruta ? ` — ${data.ruta}` : ''}`,
  labels: data.labels ?? ['reporte', 'estado:pendiente'],
  body: `## 📋 Reporte ciudadano — MueveCancun

**Tipo:** ${data.tipo_title ?? data.tipo}
**Ruta:** ${data.ruta || '_No especificada_'}
**Fecha:** ${new Date(data.timestamp || Date.now()).toLocaleString('es-MX', { timeZone: 'America/Cancun' })}

## 📝 Descripción
${data.descripcion}

${data.lat && data.lng ? `**📍 Ubicación:** [${data.lat}, ${data.lng}](https://www.openstreetmap.org/?mlat=${data.lat}&mlon=${data.lng}#map=16/${data.lat}/${data.lng})` : ''}

---
_Dispositivo: ${data.userAgent}_
_URL: ${data.url}_
Nexus Protocol v1.2 (Offline-First Sync)
`
});

async function sendToGitHub(entry: SyncEntry, config: { owner: string, repo: string, token: string }) {
  const payload = buildPayload(entry.payload);
  const res = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/issues`, {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${config.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`GitHub API Error: ${res.status}`);
  return res.json();
}

export async function processPending(config: { owner: string, repo: string, token: string }): Promise<void> {
  if (processing || !navigator.onLine) return;
  processing = true;
  try {
    const pending = await getAll<SyncEntry>('pending');
    for (const entry of pending) {
      if (entry.retries >= MAX_RETRIES) {
        await remove('pending', entry.id);
        continue;
      }
      try {
        await sendToGitHub(entry, config);
        await remove('pending', entry.id);
      } catch (err) {
        console.error('[Sync] Failed to sync entry:', entry.id, err);
        // Retries increment is handled by caller or we can do it here if entry is passed with it
        // For simplicity in this SSG refactor, we let it stay in IDB and try next time
      }
    }
  } finally {
    processing = false;
  }
}

export function initSync(config: { owner: string, repo: string, token: string }): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

  const triggerSync = () => {
    void processPending(config).catch((error) => {
      console.error('Failed to process pending sync entries:', error);
    });
  };

  window.addEventListener('online', triggerSync);
  if (navigator.onLine) {
    triggerSync();
  }
}
