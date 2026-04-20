import { logger } from "../utils/logger";
import { getPendingReports, deletePendingReport, type PendingReport } from '../utils/db';

let processing = false;

type SyncWindow = Window & {
  __syncIntervalId?: ReturnType<typeof setInterval>;
};

const buildPayload = (data: PendingReport) => ({
  title: `[REPORTE] ${data.tipo} — ${data.ruta || 'Sin Ruta'}`,
  labels: ['reporte', 'estado:pendiente'],
  body: `## 📋 Reporte ciudadano — MueveCancun

**Tipo:** ${data.tipo}
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

async function sendToGitHub(report: PendingReport, config: { owner: string, repo: string, token: string }) {
  const payload = buildPayload(report);
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
  if (processing) return;

  // In some environments, navigator.onLine might not be updated yet when 'online' event fires.
  // We allow the check but add logging.
  if (!navigator.onLine) {
    logger.log('[Sync] navigator.onLine is false, skipping processing.');
    return;
  }

  processing = true;
  try {
    const pending = await getPendingReports();
    if (pending.length === 0) {
        processing = false;
        return;
    }

    logger.log(`[Sync] Processing ${pending.length} pending reports...`);

    for (const report of pending) {
      if (report.id === undefined) continue;
      try {
        await sendToGitHub(report, config);
        await deletePendingReport(report.id);
        logger.log(`[Sync] Report ${report.id} synced and deleted.`);
      } catch (err) {
        console.error(`[Sync] Failed to sync report ${report.id}:`, err);
      }
    }

    // Always notify that a sync pass finished
    window.dispatchEvent(new CustomEvent('SYNC_COMPLETE'));
  } catch (err) {
    console.error('[Sync] Critical error in processPending:', err);
  } finally {
    processing = false;
  }
}

let syncInitialized = false;
export function initSync(config: { owner: string, repo: string, token: string }): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (syncInitialized) return;
  syncInitialized = true;

  const triggerSync = () => {
    processPending(config).catch(err => console.error('[Sync] Trigger error:', err));
  };

  window.addEventListener('online', () => {
    logger.log('[Sync] Browser online event detected.');
    // Delay slightly to ensure navigator.onLine is updated
    setTimeout(triggerSync, 500);
  });

  // Guarded interval — prevent multiple intervals if initSync called again
  const syncWindow = window as SyncWindow;
  if (!syncWindow.__syncIntervalId) {
    syncWindow.__syncIntervalId = setInterval(triggerSync, 10000);
  }

  if (navigator.onLine) {
    triggerSync();
  }
}
