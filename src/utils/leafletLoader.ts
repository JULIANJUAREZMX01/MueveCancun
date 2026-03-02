
let loadPromise: Promise<void> | null = null;

export function loadLeaflet(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve(); // Server-side

  // Check if Leaflet is already loaded globally
  if ((window as any).L) {
      return Promise.resolve();
  }

  // Return existing promise if loading is in progress
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    // 1. Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/vendor/leaflet/leaflet.css';

    // 2. Load JS
    const script = document.createElement('script');
    script.src = '/vendor/leaflet/leaflet.js';
    script.defer = true;

    const cleanup = () => {
      link.remove();
      script.remove();
    };

    const cssPromise = new Promise<void>((cssResolve, cssReject) => {
      link.onload = () => cssResolve();
      link.onerror = () => cssReject(new Error('Failed to load Leaflet CSS'));
      document.head.appendChild(link);
    });

    const jsPromise = new Promise<void>((jsResolve, jsReject) => {
      script.onload = () => {
        if ((window as any).L) {
          jsResolve();
        } else {
          jsReject(new Error('Leaflet script loaded but window.L is missing'));
        }
      };
      script.onerror = () => jsReject(new Error('Failed to load Leaflet JS'));
      document.head.appendChild(script);
    });

    Promise.all([cssPromise, jsPromise])
      .then(() => resolve())
      .catch((err) => {
        cleanup();
        loadPromise = null; // Reset on failure so we can retry
        reject(err);
      });
  });

  return loadPromise;
}
