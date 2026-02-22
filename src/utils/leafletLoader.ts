
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
    document.head.appendChild(link);

    // 2. Load JS
    const script = document.createElement('script');
    script.src = '/vendor/leaflet/leaflet.js';
    script.defer = true;

    script.onload = () => {
        // Double check L exists
        if ((window as any).L) {
            resolve();
        } else {
            reject(new Error('Leaflet script loaded but window.L is missing'));
        }
    };

    script.onerror = () => {
        loadPromise = null; // Reset on failure so we can retry
        reject(new Error('Failed to load Leaflet JS'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}
