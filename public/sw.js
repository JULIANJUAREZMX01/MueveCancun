// ─────────────────────────────────────────────────────────────────────────────
// MueveCancún Service Worker v3.4.0
// Estrategias de caché:
//   • CRITICAL_ASSETS  → Cache-First (install-time prefetch)
//   • /data/**         → Stale-While-Revalidate (datos de rutas)
//   • /wasm/**, /icons/**, *.js, *.css → Cache-First (assets inmutables)
//   • Tiles OSM/Carto  → Cache-First (mapas offline)
//   • Páginas HTML     → Network-First (contenido fresco)
//   • /ruta/** individuales → Cache-First
// ─────────────────────────────────────────────────────────────────────────────
const CACHE_VERSION = 'v3.4.0';
const CACHE_NAME = `cancunmueve-${CACHE_VERSION}`;
// Rutas reales del proyecto (output: static → /es/* y /en/*)
const LANG_PREFIXES = ['/es', '/en'];
const PAGE_SLUGS = ['home', 'rutas', 'wallet', 'community', 'tracking', 'contribuir', 'donate', 'about', 'offline', 'guess'];
const PAGE_URLS = [];
for (const prefix of LANG_PREFIXES) {
    for (const slug of PAGE_SLUGS) {
        PAGE_URLS.push(`${prefix}/${slug}`);
    }
}
const CRITICAL_ASSETS = [
    '/',
    ...PAGE_URLS,
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
    '/icons/gps.svg',
    '/icons/users.svg',
    '/icons/camera-game.svg',
    '/icons/map-plus.svg',
    '/es/offline',
    '/en/offline',
];
const OSM_TILES_PATTERN = /^https:\/\/[a-c]\.tile\.openstreetmap\.org\/(1[1-8])\/.*\.png$/;
const CARTO_TILES_PATTERN = /^https:\/\/[a-d]\.basemaps\.cartocdn\.com\/.*\.png$/;
const USER_ROUTE_PATTERN = /\/data\/routes\/ruta_\d+\.json$/;
// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    console.log(`[SW] Installing ${CACHE_VERSION}`);
    event.waitUntil(caches.open(CACHE_NAME)
        .then(cache => {
        console.log('[SW] Caching critical assets');
        return Promise.allSettled(CRITICAL_ASSETS.map(url => cache.add(url).catch((e) => console.warn(`[SW] Skip cache (non-critical): ${url}`, e?.message ?? e))));
    })
        .then(() => {
        console.log(`[SW] Install complete — ${CACHE_VERSION}`);
        return self.skipWaiting();
    })
        .catch((err) => console.error('[SW] Install failed:', err)));
});
// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    console.log(`[SW] Activating ${CACHE_VERSION}`);
    event.waitUntil(caches.keys()
        .then(keys => Promise.all(keys
        .filter(key => key !== CACHE_NAME)
        .map(key => {
        console.log('[SW] Purging old cache:', key);
        return caches.delete(key);
    })))
        .then(() => self.clients.claim()));
});
// ─── Messages ─────────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        void self.skipWaiting();
    }
    if (event.data?.type === 'CACHE_USER_ROUTE' && event.data.url) {
        const url = event.data.url;
        if (USER_ROUTE_PATTERN.test(url)) {
            caches.open(CACHE_NAME).then(cache => cache.add(url)).catch(() => { });
        }
    }
    // Health check ping
    if (event.data?.type === 'SW_PING') {
        event.source?.postMessage({ type: 'SW_PONG', version: CACHE_VERSION });
    }
});
// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    if (request.method !== 'GET')
        return;
    if (!url.protocol.startsWith('http'))
        return;
    // Skip API routes (SSR endpoints) — never cache
    if (url.pathname.startsWith('/api/'))
        return;
    // User-created route files → Network-First (may be updated)
    if (USER_ROUTE_PATTERN.test(url.pathname)) {
        event.respondWith(networkFirstWithCache(request));
        return;
    }
    // Data files → Stale-While-Revalidate
    if (url.pathname.startsWith('/data/')) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }
    // Immutable assets → Cache-First
    if (url.pathname.startsWith('/wasm/') ||
        url.pathname.startsWith('/icons/') ||
        url.pathname.startsWith('/vendor/') ||
        url.pathname.endsWith('coordinates.json') ||
        url.pathname.endsWith('.wasm') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.webp') ||
        url.pathname.endsWith('.ttf') ||
        url.pathname.endsWith('.woff') ||
        url.pathname.endsWith('.woff2')) {
        event.respondWith(cacheFirst(request));
        return;
    }
    // Map tiles → Cache-First
    if (OSM_TILES_PATTERN.test(request.url) || CARTO_TILES_PATTERN.test(request.url)) {
        event.respondWith(cacheFirst(request));
        return;
    }
    // Individual route pages → Cache-First
    if (url.pathname.includes('/ruta/')) {
        event.respondWith(cacheFirst(request));
        return;
    }
    // HTML pages → Network-First with offline fallback
    event.respondWith(networkFirst(request));
});
// ─── Cache Strategies ─────────────────────────────────────────────────────────
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached)
        return cached;
    try {
        const response = await fetch(request);
        if (response?.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    }
    catch {
        return offlineFallback(request);
    }
}
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response?.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    }
    catch {
        const cached = await caches.match(request);
        if (cached)
            return cached;
        return offlineFallback(request);
    }
}
async function networkFirstWithCache(request) {
    try {
        const response = await fetch(request);
        if (response?.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    }
    catch {
        const cached = await caches.match(request);
        return cached ?? new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
}
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const fetchPromise = fetch(request).then((response) => {
        if (response?.ok)
            cache.put(request, response.clone());
        return response;
    }).catch(() => {
        return cached ?? new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    });
    return cached ?? fetchPromise;
}
async function offlineFallback(request) {
    if (request.mode === 'navigate') {
        const cache = await caches.open(CACHE_NAME);
        // Try lang-specific offline page
        const url = new URL(request.url);
        const langMatch = url.pathname.match(/^\/(es|en)\//);
        const lang = langMatch?.[1] ?? 'es';
        const langOffline = await cache.match(`/${lang}/offline`);
        if (langOffline)
            return langOffline;
        const genericOffline = await cache.match('/es/offline');
        if (genericOffline)
            return genericOffline;
    }
    return new Response('Sin conexión / Offline', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
}
export {};
