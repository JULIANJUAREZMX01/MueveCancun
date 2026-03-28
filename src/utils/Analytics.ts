export interface AnalyticsProvider {
  trackEvent(event: string, properties?: Record<string, any>): void;
}

export class Analytics implements AnalyticsProvider {
  private static instance: Analytics;

  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  trackEvent(event: string, properties?: Record<string, any>): void {
    // Stub implementation
    console.log(`[Analytics] Event: ${event}`, properties);
    
    // Call global gtag trackers if available
    const win = window as any;
    if (win.mueveTrackers) {
      if (event === 'route_search' && properties) {
        win.mueveTrackers.routeSearch(properties.origin, properties.destination, properties.isOffline);
      } else if (event === 'offline_usage') {
        win.mueveTrackers.offlineUsage();
      } else if (event === 'pwa_install') {
        win.mueveTrackers.pwaInstall();
      }
    }
  }
}

export const analytics = Analytics.getInstance();
