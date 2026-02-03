const CACHE_NAME = 'cancun-mueve-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/rutas',
  '/mapa',
  '/manifest.json',
  '/coordinates.json',
  '/wasm/route_calculator/route_calculator.js',
  '/wasm/route_calculator/route_calculator_bg.wasm',
  '/icons/bus.svg',
  '/icons/compass.svg',
  '/icons/credit-card.svg',
  '/icons/map-pin.svg',
  '/icons/loader.svg',
  '/icons/alert.svg',
  '/icons/swap.svg',
  '/icons/flag.svg',
  '/icons/home.svg',
  '/icons/briefcase.svg',
  '/icons/plane.svg',
  '/icons/palm-tree.svg',
  '/icons/pwa-192x192.png',
  '/icons/pwa-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests like Leaflet CDN for simplicity in this task,
  // or handle them carefully. The prompt implies caching everything necessary.
  // Leaflet CDN is critical for offline map (if we cached tiles, but tiles are many).
  // We can't cache all OSM tiles. The prompt says "Files to Cache: ...". It doesn't mention external CDNs explicitly but says "Offline capability".
  // Without Leaflet JS cached, offline map won't work even if we have logic.
  // But Leaflet is loaded via <script src="...">. The browser caches it usually.
  // SW can cache it too.

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Stale-While-Revalidate Strategy
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Check if valid response
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
            });
        }
        return networkResponse;
      }).catch(err => {
         // Network failed
         console.log('Network fetch failed', err);
      });

      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
