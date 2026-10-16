// ocp Service Worker SGIPAS — network-first con bypass de caché HTTP
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_VERSION = 'sgipas-v4';
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_CDN = `${CACHE_VERSION}-cdn`;

// Assets que no cambian (cache-first)
const ASSETS_INMUTABLES = [
    '/manifest.json',
    '/logo.png',
    '/cintillo_superior.png',
    '/assets/icons/icon-192x192.png',
    '/assets/icons/icon-512x512.png'
];

const ARCHIVOS_CDN = [
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3/dist/chartjs-adapter-date-fns.bundle.min.js',
    'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
    'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
];

self.addEventListener('install', (event) => {
    console.log('[sw] Instalando versión', CACHE_VERSION);
    event.waitUntil((async () => {
        const cacheStatic = await caches.open(CACHE_STATIC);
        const cacheCdn = await caches.open(CACHE_CDN);

        await Promise.allSettled(
            ASSETS_INMUTABLES.map(url =>
                cacheStatic.add(url).catch(err => console.warn('[sw] No cacheado:', url, err.message))
            )
        );

        await Promise.allSettled(
            ARCHIVOS_CDN.map(async (url) => {
                try {
                    const r = await fetch(url, { mode: 'cors' });
                    if (r && r.status === 200) return cacheCdn.put(url, r);
                } catch (e) { /* intentar no-cors */ }
                try {
                    const r = await fetch(url, { mode: 'no-cors' });
                    return cacheCdn.put(url, r);
                } catch (e) {
                    console.warn('[sw] No se pudo cachear CDN:', url);
                }
            })
        );

        console.log('[sw] Precacheo de assets completo');
        self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    console.log('[sw] Activando, limpiando cachés viejas');
    event.waitUntil((async () => {
        const nombres = await caches.keys();
        await Promise.all(
            nombres
                .filter(n => !n.startsWith(CACHE_VERSION))
                .map(n => {
                    console.log('[sw] Eliminando caché vieja:', n);
                    return caches.delete(n);
                })
        );
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;

    if (url.hostname.includes('supabase.co') ||
        url.pathname.startsWith('/rest/') ||
        url.pathname.startsWith('/auth/') ||
        url.pathname.startsWith('/storage/') ||
        url.pathname.startsWith('/realtime/')) {
        return;
    }

    if (request.headers.get('Upgrade') === 'websocket') return;

    if (url.origin === self.location.origin) {
        if (ASSETS_INMUTABLES.includes(url.pathname)) {
            event.respondWith(cacheFirst(request, CACHE_STATIC));
            return;
        }
        // JS, HTML, CSS: network-first con BYPASS de caché HTTP
        event.respondWith(networkFirstForzado(request, CACHE_STATIC));
        return;
    }

    if (ARCHIVOS_CDN.some(cdn => request.url.startsWith(cdn))) {
        event.respondWith(cacheFirst(request, CACHE_CDN));
        return;
    }

    event.respondWith(networkFirstForzado(request, CACHE_CDN));
});

// ocp Network-first con bypass de caché HTTP (cache: 'no-cache' fuerza revalidación)
async function networkFirstForzado(request, cacheName) {
    const cache = await caches.open(cacheName);
    try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response && response.status === 200) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        const cached = await cache.match(request);
        if (cached) return cached;

        if (request.headers.get('accept')?.includes('text/html')) {
            const offline = await caches.match('/index.html');
            if (offline) return offline;
        }

        return new Response('Recurso no disponible sin conexión', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }
}

async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        return new Response('Recurso no disponible sin conexión', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }
}

self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
