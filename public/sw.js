import { CACHE_VERSION } from './generated/buildInfo.js';
const CACHE_NAME = `cancunmueve-${CACHE_VERSION}`;
const CRITICAL_ASSETS = [
    '/',
    '/en/about',
    '/es/about',
    '/en/community',
    '/es/community',
    '/en/wallet',
    '/es/wallet',
    '/en/rutas',
    '/es/rutas',
    '/en/home',
    '/es/home',
    '/en/offline',
    '/es/offline',
    '/vendor/leaflet/leaflet.js',
    '/vendor/leaflet/leaflet.css',
    '/wasm/route-calculator/route_calculator.js',
    '/wasm/route-calculator/route_calculator_bg.wasm',
    '/wasm/spatial-index/spatial_index.js',
    '/wasm/spatial-index/spatial_index_bg.wasm',
    '/data/master_routes.optimized.json',
    '/data/paradas.json',
    '/data/precios.json',
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
    '/icons/loader.svg'
];
const OSM_TILES_PATTERN = /^https:\/\/[a-c]\.tile\.openstreetmap\.org\/(1[1-8])\/.*\.png$/;
const CARTO_TILES_PATTERN = /^https:\/\/[a-d]\.basemaps\.cartocdn\.com\/.*\.png$/;
self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME)
        .then(cache => {
        return Promise.allSettled(CRITICAL_ASSETS.map(url => cache.add(url).catch(e => console.warn(`[SW] Failed: ${url}`, e))));
    })
        .then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING')
        self.skipWaiting();
});
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    if (request.method !== 'GET' || !url.protocol.startsWith('http'))
        return;
    if (url.pathname.includes('/data/') || url.pathname.includes('/api/')) {
        event.respondWith(staleWhileRevalidate(request));
    }
    else if (url.pathname.includes('/wasm/') ||
        url.pathname.includes('/icons/') ||
        url.pathname.endsWith('.wasm') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css') ||
        OSM_TILES_PATTERN.test(request.url) ||
        CARTO_TILES_PATTERN.test(request.url)) {
        event.respondWith(cacheFirst(request));
    }
    else {
        event.respondWith(networkFirst(request));
    }
});
async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached)
        return cached;
    try {
        const response = await fetch(request);
        if (response.ok)
            cache.put(request, response.clone());
        return response;
    }
    catch {
        return serveOffline(request);
    }
}
async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5000);
    try {
        const response = await fetch(request, { signal: controller.signal });
        clearTimeout(tid);
        if (response.ok)
            cache.put(request, response.clone());
        return response;
    }
    catch {
        clearTimeout(tid);
        const cached = await cache.match(request);
        return cached || serveOffline(request);
    }
}
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    // Network fetch with 3s timeout
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 3000);
    const fetchPromise = fetch(request, { signal: controller.signal })
        .then(response => {
        clearTimeout(tid);
        if (response.ok)
            cache.put(request, response.clone());
        return response;
    })
        .catch(() => {
        clearTimeout(tid);
        return cached || serveOffline(request);
    });
    // Return cached immediately, revalidate in background
    if (cached) {
        fetchPromise.catch(() => { }); // background revalidation, swallow
        return cached;
    }
    return fetchPromise;
}
async function serveOffline(request) {
    if (request.mode === 'navigate') {
        const cache = await caches.open(CACHE_NAME);
        const lang = request.url.includes('/en/') ? 'en' : 'es';
        const offlinePage = await cache.match(`/${lang}/offline`);
        if (offlinePage)
            return offlinePage;
    }
    return new Response('Offline', { status: 503 });
}
