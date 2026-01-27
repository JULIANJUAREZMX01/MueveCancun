const CACHE_VERSION = 'v2.0.0';
const CACHE_NAME = `cancunmueve-${CACHE_VERSION}`;

const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/wasm/route-calculator/route_calculator_bg.wasm',
  '/wasm/spatial-index/spatial_index_bg.wasm',
  '/data/master_routes.json'
];

const MAPBOX_TILES_PATTERN = /https:\/\/api\.mapbox\.com\/v4\//;

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

// Fetch: Network-first para datos, cache-first para assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Estrategia por tipo de recurso
  if (request.url.includes('/data/')) {
    // Datos: Network-first
    event.respondWith(networkFirst(request));
  } else if (request.url.includes('/wasm/')) {
    // WASM: Cache-first (inmutable)
    event.respondWith(cacheFirst(request));
  } else if (MAPBOX_TILES_PATTERN.test(request.url)) {
    // Tiles de mapbox: Cache con expire (stale while revalidate)
    event.respondWith(staleWhileRevalidate(request));
  } else {
    // Default: Network-first
    event.respondWith(networkFirst(request));
  }
});

// Estrategias de caching
async function cacheFirst(request) {
  const cached = await caches.match(request);
  return cached || fetch(request);
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

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then(response => {
    const cache = caches.open(CACHE_NAME);
    cache.then(c => c.put(request, response.clone()));
    return response;
  });
  return cached || fetchPromise;
}

// Background Sync para reportes offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reports') {
    event.waitUntil(syncPendingReports());
  }
});

async function syncPendingReports() {
  // Implementar cuando Gemini configure Supabase
  console.log('[SW] Syncing pending reports...');
}
