/* MueveCancún Service Worker — v4.1.0 "Mar Turquesa"
 * Estrategias: cache-first (assets), stale-while-revalidate (data), network-first (pages)
 */
const CACHE_VERSION = 'v4.1.0-mar-turquesa';
const CACHE_NAME = `cancunmueve-${CACHE_VERSION}`;

const CRITICAL_ASSETS = [
  /* Páginas shell */
  '/', '/es/home', '/en/home',
  '/es/rutas', '/en/rutas',
  '/es/wallet', '/en/wallet',
  '/es/community', '/en/community',
  '/es/about', '/en/about',
  '/es/donate', '/en/donate',
  '/es/offline', '/en/offline',
  /* Mapas y WASM */
  '/vendor/leaflet/leaflet.js',
  '/vendor/leaflet/leaflet.css',
  '/wasm/route-calculator/route_calculator.js',
  '/wasm/route-calculator/route_calculator_bg.wasm',
  '/wasm/spatial-index/spatial_index.js',
  '/wasm/spatial-index/spatial_index_bg.wasm',
  /* Datos offline */
  '/data/master_routes.optimized.json',
  '/data/paradas.json',
  '/data/precios.json',
  '/coordinates.json',
  /* Manifest + assets PWA */
  '/manifest.json',
  '/favicon.svg',
  '/logo.png',
  '/og-image.png',
  '/icons/pwa-192x192.png',
  '/icons/pwa-512x512.png',
  /* Iconos SVG */
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
  '/icons/gps.svg',
  '/icons/users.svg',
];

/* Patrones de tiles de mapa para cache-first */
const OSM_TILES = /^https:\/\/[a-c]\.tile\.openstreetmap\.org\/(1[1-8])\/.*\.png$/;
const CARTO_TILES = /^https:\/\/[a-d]\.basemaps\.cartocdn\.com\/.*\.png$/;

/* ── INSTALL: precache todos los assets críticos ── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        CRITICAL_ASSETS.map(url =>
          cache.add(url).catch(e => console.warn(`[SW] Precache falló: ${url}`, e))
        )
      )
    ).then(() => {
      console.log(`[SW] ${CACHE_VERSION} instalado`);
      self.skipWaiting();
    })
  );
});

/* ── ACTIVATE: limpiar caches viejos ── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log(`[SW] Eliminando cache viejo: ${k}`);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

/* ── MESSAGE: skipWaiting desde UI ── */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

/* ── FETCH: estrategias por tipo de request ── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  /* Datos y API → stale-while-revalidate */
  if (url.pathname.startsWith('/data/') || url.pathname.startsWith('/api/') || url.pathname === '/coordinates.json') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  /* Assets inmutables + tiles → cache-first */
  if (
    url.pathname.startsWith('/wasm/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/vendor/') ||
    url.pathname.endsWith('.wasm') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.webp') ||
    OSM_TILES.test(request.url) ||
    CARTO_TILES.test(request.url)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  /* Páginas y todo lo demás → network-first */
  event.respondWith(networkFirst(request));
});

/* ═══ ESTRATEGIAS ═══ */

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return serveOffline(request);
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { signal: AbortSignal.timeout?.(5000) });
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || serveOffline(request);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached || serveOffline(request));
  return cached || fetchPromise;
}

async function serveOffline(request) {
  if (request.mode === 'navigate') {
    const cache = await caches.open(CACHE_NAME);
    const lang = request.url.includes('/en/') ? 'en' : 'es';
    const offline = await cache.match(`/${lang}/offline`);
    if (offline) return offline;
  }
  return new Response(JSON.stringify({ offline: true, error: 'Sin conexión' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}
