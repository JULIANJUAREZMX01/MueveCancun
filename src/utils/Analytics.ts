/**
 * MueveCancun Telemetry Service
 * Offline-ready analytics that queues events in localStorage and syncs when online.
 */

type EventName = 
  | 'search_route' 
  | 'view_route' 
  | 'map_interaction' 
  | 'language_change' 
  | 'gps_center'
  | 'pwa_install_prompt'
  | 'error_wasm';

interface TelemetryEvent {
  name: EventName;
  params?: Record<string, any>;
  timestamp: number;
}

class TelemetryService {
  private queueKey = 'muevecancun_telemetry_queue';

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.sync());
      // Try to sync on load if online
      if (navigator.onLine) this.sync();
    }
  }

  track(name: EventName, params?: Record<string, any>) {
    const event: TelemetryEvent = {
      name,
      params,
      timestamp: Date.now()
    };

    console.log(`[Telemetry] Tracking: ${name}`, params);

    // If online, we could send immediately. For now, we always queue to ensure robustness.
    this.queue(event);
    
    if (navigator.onLine) {
      this.sync();
    }
  }

  private queue(event: TelemetryEvent) {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.queueKey);
      const queue: TelemetryEvent[] = stored ? JSON.parse(stored) : [];
      queue.push(event);
      localStorage.setItem(this.queueKey, JSON.stringify(queue.slice(-100))); // Match max 100 events
    } catch (e) {
      console.error("[Telemetry] Failed to queue event", e);
    }
  }

  private async sync() {
    if (typeof window === 'undefined' || !navigator.onLine) return;

    try {
      const stored = localStorage.getItem(this.queueKey);
      if (!stored) return;

      const queue: TelemetryEvent[] = JSON.parse(stored);
      if (queue.length === 0) return;

      console.log(`[Telemetry] Syncing ${queue.length} events...`);
      
      // MOCK: In a real app, this would be a fetch() to an API
      // await fetch('/api/telemetry', { 
      //    method: 'POST', 
      //    body: JSON.stringify({ events: queue }) 
      // });

      // Simulated success
      localStorage.setItem(this.queueKey, JSON.stringify([]));
      console.log("[Telemetry] Sync complete.");
    } catch (e) {
      console.error("[Telemetry] Sync failed", e);
    }
  }
}

export const analytics = new TelemetryService();
