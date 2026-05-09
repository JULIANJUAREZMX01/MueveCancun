/**
 * Notificaciones Push — MueveCancún v4.0
 * Flujo: requestPermission → subscribe → sync con servidor → recibir push
 */

const VAPID_PUBLIC = 'BMlz5E1hOjy8GsJVJhY2cX7K4m3VxKQzNdTqPEKXnRGVfBHdJLqnMzX8Yy9cQ2Wj';
// Nota: Esta es una key pública de demostración — en producción usar VAPID real

export type NotifType =
  | 'trip_start'
  | 'bus_arriving'
  | 'board_now'
  | 'next_stop'
  | 'transfer_soon'
  | 'arrived'
  | 'stop_crowded'
  | 'route_update';

export interface LocalNotif {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
}

/** Solicitar permiso y suscribirse a push */
export async function requestNotifications(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  const perm = await Notification.requestPermission();
  if (perm === 'granted') await registerPushSubscription();
  return perm;
}

/** Registrar la suscripción push con el servidor */
async function registerPushSubscription(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.pushManager) return;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      // En producción real usar VAPID applicationServerKey
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC).buffer
      }).catch(() => null) as PushSubscription | null;
    }
    if (!sub) return;

    const device_id = getDeviceId();
    await fetch('/api/v1/push-sub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id,
        endpoint: sub.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))),
        auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))),
      })
    }).catch(() => {});
  } catch (e) {
    console.warn('[Notifications] Push sub failed:', e);
  }
}

/** Mostrar notificación local inmediata (sin push) */
export async function showLocalNotif(opts: LocalNotif): Promise<void> {
  if (Notification.permission !== 'granted') return;

  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(opts.title, {
      body: opts.body,
      icon: opts.icon || '/icons/pwa-192x192.png',
      badge: opts.badge || '/icons/bus.svg',
      tag: opts.tag || 'mueve-notif',
      data: opts.data,
      actions: opts.actions || [],
      requireInteraction: false,
      silent: false,
    } as NotificationOptions);
  } catch {
    // Fallback: notificación directa
    new Notification(opts.title, { body: opts.body, icon: opts.icon || '/icons/pwa-192x192.png' });
  }
}

/** Notificaciones contextuales del viaje */
export async function notifyTripEvent(type: NotifType, data: Record<string, unknown> = {}): Promise<void> {
  const msgs: Record<NotifType, LocalNotif> = {
    trip_start: {
      title: '🚌 Viaje iniciado',
      body: `Ruta ${data.route || ''} — Dirigiéndote al paradero`,
      tag: 'trip-start',
      data: { type, ...data }
    },
    bus_arriving: {
      title: '⏱️ Bus llegando',
      body: `El bus de la ruta ${data.route || ''} está a ~${data.minutes || 2} minutos`,
      tag: 'bus-arriving',
      actions: [{ action: 'dismiss', title: 'OK' }],
      data: { type, ...data }
    },
    board_now: {
      title: '🚀 ¡Sube ahora!',
      body: `El bus está en tu paradero — ¡No lo pierdas!`,
      tag: 'board-now',
      data: { type, ...data }
    },
    next_stop: {
      title: '📍 Próximo paradero',
      body: `Siguiente parada: ${data.stop || ''}`,
      tag: 'next-stop',
      data: { type, ...data }
    },
    transfer_soon: {
      title: '🔄 Transbordo próximo',
      body: `Prepárate para cambiar a la ruta ${data.next_route || ''} en ${data.stop || ''}`,
      tag: 'transfer',
      data: { type, ...data }
    },
    arrived: {
      title: '✅ ¡Llegaste!',
      body: `Has llegado a ${data.destination || 'tu destino'}. Buen viaje 🌴`,
      tag: 'arrived',
      data: { type, ...data }
    },
    stop_crowded: {
      title: '🔴 Paradero lleno',
      body: `${data.stop || 'Paradero'} tiene alta demanda — considera el siguiente`,
      tag: 'stop-crowded',
      data: { type, ...data }
    },
    route_update: {
      title: '⚠️ Actualización de ruta',
      body: `${data.message || 'Cambio en tu ruta activa'}`,
      tag: 'route-update',
      data: { type, ...data }
    }
  };

  const notif = msgs[type];
  if (notif) await showLocalNotif(notif);
}

/** Obtener o crear device_id persistente */
export function getDeviceId(): string {
  const KEY = 'mc_device_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = 'MC_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(KEY, id);
  }
  return id;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
