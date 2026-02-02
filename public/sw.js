const CACHE_VERSION = 'v2.0.0';
const CACHE_NAME = `cancunmueve-${CACHE_VERSION}`;

const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/wasm/route-calculator/route_calculator.js',
  '/wasm/route-calculator/route_calculator_bg.wasm',
  '/wasm/spatial-index/spatial_index.js',
  '/wasm/spatial-index/spatial_index_bg.wasm',
  '/data/master_routes.json',
  '/data/routes.json',
  '/manifest.json',
  '/logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
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
const CACHE_NAME = 'cancunmueve-v2.3.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/data/master_routes.json'
];

const WASM_ASSETS = [
  '/src/wasm/route_calculator/route_calculator_bg.wasm',
  '/src/wasm/route_calculator/route_calculator.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll([...STATIC_ASSETS, ...WASM_ASSETS]))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache-first for WASM
  if (url.pathname.endsWith('.wasm') || url.pathname.includes('/wasm/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
    return;
  }

  // Network-first for Data
  if (url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Default strategy: Stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((response) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      });
      return response || fetchPromise;
    })
  );
});
