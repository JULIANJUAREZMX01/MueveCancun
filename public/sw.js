const CACHE_VERSION = 'v4.0.0-reparto';
const CACHE_NAME = `mueve-reparto-${CACHE_VERSION}`;

// Critical assets for offline-first PWA — Mueve Reparto
const CRITICAL_ASSETS = [
  '/',
  '/home',
  '/pedidos',
  '/reparto',
  '/enviar',
  '/metricas',
  '/offline',
  '/wasm/route-calculator/route_calculator.js',
  '/wasm/route-calculator/route_calculator_bg.wasm',
  '/router.worker.js',
  '/manifest.json',
  '/logo.png',
  '/icons/pwa-192x192.png',
  '/icons/pwa-512x512.png',
  '/icons/map-pin.svg',
  '/icons/home.svg',
  '/icons/loader.svg',
];

// Regex for OSM tiles (Zoom 11-18)
const OSM_TILES_PATTERN = /^https:\/\/[a-c]\.tile\.openstreetmap\.org\/(1[1-8])\/.*\.png$/;
const CARTO_TILES_PATTERN = /^https:\/\/[a-d]\.basemaps\.cartocdn\.com\/.*\.png$/;

// Install: Cache critical assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v4.0.0-reparto');
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
  console.log('[SW] Activating v4.0.0-reparto');
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
  if (url.pathname.startsWith('/api/')) {
    // API calls: Network-only (never cache, go through sync queue offline)
    return;
  } else if (url.pathname.includes('/data/')) {
    // Data files: Stale-While-Revalidate
    event.respondWith(staleWhileRevalidate(request));
  } else if (
    url.pathname.includes('/wasm/') ||
    url.pathname.includes('/icons/') ||
    url.pathname.endsWith('.wasm') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
    // Immutable assets: Cache-First
    event.respondWith(cacheFirst(request));
  } else if (OSM_TILES_PATTERN.test(request.url) || CARTO_TILES_PATTERN.test(request.url)) {
    // Map tiles: Cache-First
    event.respondWith(cacheFirst(request));
  } else if (['/home', '/pedidos', '/reparto', '/enviar', '/metricas'].includes(url.pathname)) {
    // Delivery app pages: Cache-First (PWA shell)
    event.respondWith(cacheFirst(request));
  } else {
    // Default: Network-First with cache fallback
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

// Background Sync: procesar cola de peticiones pendientes
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mr-data') {
    event.waitUntil(flushSyncQueue());
  }
});

async function flushSyncQueue() {
  const db = await openSyncDB();
  const entries = await getAllFromStore(db, 'sync_queue');
  for (const entry of entries) {
    try {
      const res = await fetch(entry.url, {
        method: entry.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry.body),
      });
      if (res.ok) {
        await deleteFromStore(db, 'sync_queue', entry.id);
      }
    } catch {
      // Se reintentara en el proximo sync
    }
  }
}

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('MueveRepartoDB', 1);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function getAllFromStore(db, store) {
  return new Promise((resolve, reject) => {
    const req = db.transaction([store], 'readonly').objectStore(store).getAll();
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function deleteFromStore(db, store, key) {
  return new Promise((resolve, reject) => {
    const req = db.transaction([store], 'readwrite').objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}
