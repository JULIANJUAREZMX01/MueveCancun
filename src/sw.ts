/// <reference lib="WebWorker" />
export type {}; // Makes this file a TS module so `declare const self` can shadow the global
declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'v3.3.1-fix';
const CACHE_NAME = `cancunmueve-${CACHE_VERSION}`;

// Critical assets for offline-first PWA
const CRITICAL_ASSETS: string[] = [
  '/',
  '/home',
  '/rutas',
  '/mapa',
  '/wallet',
  '/community',
  '/tracking',
  '/contribuir',
  '/vendor/leaflet/leaflet.js',
  '/vendor/leaflet/leaflet.css',
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

const OSM_TILES_PATTERN = /^https:\/\/[a-c]\.tile\.openstreetmap\.org\/(1[1-8])\/.*\.png$/;
const CARTO_TILES_PATTERN = /^https:\/\/[a-d]\.basemaps\.cartocdn\.com\/.*\.png$/;

// User-created routes pattern (dynamic ruta_*.json files)
const USER_ROUTE_PATTERN = /\/data\/routes\/ruta_\d+\.json$/;

// --- Install ---
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log(`[SW] Installing ${CACHE_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching critical assets');
        // Use individual puts to avoid one bad URL killing the whole install
        return Promise.allSettled(
          CRITICAL_ASSETS.map(url => cache.add(url).catch((e: unknown) => console.warn(`[SW] Failed to cache ${url}:`, e)))
        );
      })
      .then(() => self.skipWaiting())
      .catch((err: unknown) => console.error('[SW] Install failed:', err))
  );
});

// --- Activate ---
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log(`[SW] Activating ${CACHE_VERSION}`);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
      ))
      .then(() => self.clients.claim())
  );
});

// --- Message ---
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // On-demand: cache a user-created route file
  if (event.data?.type === 'CACHE_USER_ROUTE' && event.data.url) {
    const url = event.data.url as string;
    if (USER_ROUTE_PATTERN.test(url)) {
      caches.open(CACHE_NAME).then(cache => cache.add(url)).catch(() => {});
    }
  }
});

// --- Fetch ---
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // User-created routes: Network-First (they may be updated), then cache
  if (USER_ROUTE_PATTERN.test(url.pathname)) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  if (url.pathname.includes('/data/')) {
    // Data files: Stale-While-Revalidate
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
    // Map tiles: Cache-First
    event.respondWith(cacheFirst(request));
  } else if (url.pathname.startsWith('/ruta/') || url.pathname === '/rutas' || url.pathname === '/mapa') {
    event.respondWith(cacheFirst(request));
  } else {
    // HTML pages: Network-First
    event.respondWith(networkFirst(request));
  }
});

// --- Cache Strategies ---

async function cacheFirst(request: Request): Promise<Response> {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response?.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const offlinePage = await (await caches.open(CACHE_NAME)).match('/offline');
      if (offlinePage) return offlinePage;
    }
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function networkFirst(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response?.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const offlinePage = await (await caches.open(CACHE_NAME)).match('/offline');
      if (offlinePage) return offlinePage;
    }
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function networkFirstWithCache(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response?.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}

async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then((response: Response) => {
    if (response?.status === 200) {
      caches.open(CACHE_NAME).then(c => c.put(request, response.clone()));
    }
    return response;
  }).catch((): Response => cached ?? new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } }));
  return cached ?? fetchPromise;
}
