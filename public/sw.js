const CACHE_VERSION = 'v3.0.1-ssg';
const CACHE_NAME = `cancunmueve-${CACHE_VERSION}`;

// Critical assets for offline-first PWA
const CRITICAL_ASSETS = [
  '/',
  '/home',
  '/rutas',
  '/mapa',
  '/wallet',
  '/community',
  '/tracking',
  '/contribuir',
  '/wasm/route-calculator/route_calculator.js',
  '/wasm/route-calculator/route_calculator_bg.wasm',
  '/wasm/spatial-index/spatial_index.js',
  '/wasm/spatial-index/spatial_index_bg.wasm',
  '/data/master_routes.json',
  '/coordinates.json',
  '/manifest.json',
  '/logo.png',
  '/icons/pwa-192x192.png',
  '/icons/pwa-512x512.png',
  '/icons/bus.svg',
  '/icons/compass.svg',
  '/icons/map-pin.svg',
  '/icons/credit-card.svg',
  '/icons/alert.svg',
  '/icons/flag.svg',
  '/icons/swap.svg',
  '/icons/home.svg',
  '/icons/briefcase.svg',
  '/icons/plane.svg',
  '/icons/palm-tree.svg',
  '/icons/loader.svg',
  '/offline'
];

// Regex for OSM tiles (Zoom 11-18)
const OSM_TILES_PATTERN = /^https:\/\/[a-c]\.tile\.openstreetmap\.org\/(1[1-8])\/.*\.png$/;
const CARTO_TILES_PATTERN = /^https:\/\/[a-d]\.basemaps\.cartocdn\.com\/.*\.png$/;

// Install: Cache critical assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v3.0.0-ssg');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching critical assets');
        return cache.addAll(CRITICAL_ASSETS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
      .catch(err => console.error('[SW] Install failed:', err))
  );
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v3.0.0-ssg');
  event.waitUntil(
    caches.keys()
      .then(keys => {
        console.log('[SW] Cleaning old caches:', keys);
        return Promise.all(
          keys.filter(key => key !== CACHE_NAME)
            .map(key => {
              console.log('[SW] Deleting cache:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Message: Handle Skip Waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING message');
    self.skipWaiting();
  }
});

// Fetch: Optimized strategies for SSG + PWA
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Strategy selection
  if (url.pathname.includes('/data/')) {
    // Data files: Stale-While-Revalidate (best for dynamic data)
    event.respondWith(staleWhileRevalidate(request));
  } else if (
    url.pathname.includes('/wasm/') || 
    url.pathname.includes('/icons/') || 
    url.pathname.endsWith('coordinates.json') ||
    url.pathname.endsWith('.wasm') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
    // Immutable assets: Cache-First
    event.respondWith(cacheFirst(request));
  } else if (OSM_TILES_PATTERN.test(request.url) || CARTO_TILES_PATTERN.test(request.url)) {
    // Map tiles: Cache-First (they don't change)
    event.respondWith(cacheFirst(request));
  } else if (url.pathname.startsWith('/ruta/') || url.pathname === '/rutas' || url.pathname === '/mapa') {
    // Static pages (SSG): Cache-First with network fallback
    event.respondWith(cacheFirst(request));
  } else {
    // Default (HTML pages): Network-First with cache fallback
    event.respondWith(networkFirst(request));
  }
});

// Cache Strategies

// Cache-First: Best for immutable assets
async function cacheFirst(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Return offline page or placeholder
    if (request.mode === 'navigate') {
      const offlineCache = await caches.open(CACHE_NAME);
      return await offlineCache.match('/offline');
    }

    return new Response('Offline', { 
      status: 503, 
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Network-First: Best for dynamic content
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Return offline fallback
    if (request.mode === 'navigate') {
        const offlineCache = await caches.open(CACHE_NAME);
        return await offlineCache.match('/offline');
    }

    return new Response('Offline', { 
      status: 503, 
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Stale-While-Revalidate: Best for data that changes but we want instant response
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    if (response && response.status === 200) {
      const cache = caches.open(CACHE_NAME);
      cache.then(c => c.put(request, response.clone()));
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}
