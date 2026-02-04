const CACHE_VERSION = 'v2.0.1';
const CACHE_NAME = `cancunmueve-${CACHE_VERSION}`;

const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/wasm/route-calculator/route_calculator.js',
  '/wasm/route-calculator/route_calculator_bg.wasm',
  '/wasm/spatial-index/spatial_index.js',
  '/wasm/spatial-index/spatial_index_bg.wasm',
  '/data/master_routes.json',
  '/coordinates.json',
  '/manifest.json',
  '/logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
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
  '/icons/loader.svg'
];

// Regex for OSM tiles (Zoom 12-16 only)
// Matches https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
const OSM_TILES_PATTERN = /^https:\/\/[a-c]\.tile\.openstreetmap\.org\/(1[2-6])\/.*\.png$/;

// Install: Cache crítico
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CRITICAL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: Limpiar caches antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Message: Handle Skip Waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch: Network-first para datos, cache-first para assets y tiles
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Estrategia por tipo de recurso
  if (request.url.includes('/data/')) {
    // Datos: Network-first
    event.respondWith(networkFirst(request));
  } else if (request.url.includes('/wasm/') || request.url.includes('/icons/') || request.url.includes('coordinates.json')) {
    // Assets inmutables o estáticos: Stale-While-Revalidate
    event.respondWith(staleWhileRevalidate(event));
  } else if (OSM_TILES_PATTERN.test(request.url)) {
    // OSM Tiles (Zoom 12-16): Cache-first
    event.respondWith(cacheFirst(request));
  } else {
    // Default: Network-first (HTML, etc.)
    event.respondWith(networkFirst(request));
  }
});

// Estrategias de caching
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    // Cache valid responses for tiles/assets
    if (response && response.status === 200) {
       const cache = await caches.open(CACHE_NAME);
       cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    // If offline and not in cache, we can't do much for images/tiles
    return new Response('', { status: 408, statusText: 'Request timed out' });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    return caches.match(request);
  }
}

async function staleWhileRevalidate(event) {
  const request = event.request;
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.log('Fetch failed in SWR', error);
  });

  if (cachedResponse) {
    event.waitUntil(fetchPromise);
    return cachedResponse;
  }

  return fetchPromise;
}
