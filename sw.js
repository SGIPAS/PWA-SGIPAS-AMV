// ocp Service Worker SGIPAS — network-first con filtrado de esquema y manejo de errores
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_VERSION = 'sgipas-v6';
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_CDN = `${CACHE_VERSION}-cdn`;

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

// CDNs que sabemos que no envían CORS → van directo a no-cors
const CDN_SIN_CORS = ['https://cdn.tailwindcss.com'];

// ocp Utilidad: intentar cachear sin romper si falla
async function intentarCachear(cache, request, response) {
    try {
        await cache.put(request, response);
        return true;
    } catch (e) {
        console.warn('[sw] No cacheado:', request.url, '-', e.message);
        return false;
    }
}

self.addEventListener('install', (event) => {
    console.log('[sw] Instalando versión', CACHE_VERSION);
    event.waitUntil((async () => {
        const cacheStatic = await caches.open(CACHE_STATIC);
        const cacheCdn = await caches.open(CACHE_CDN);

        await Promise.allSettled(
            ASSETS_INMUTABLES.map(url =>
                cacheStatic.add(url).catch(err =>
                    console.warn('[sw] Asset no cacheado:', url, '-', err.message)
                )
            )
        );

        await Promise.allSettled(
            ARCHIVOS_CDN.map(async (url) => {
                // Si es un CDN conocido sin CORS, ir directo a no-cors
                if (CDN_SIN_CORS.includes(url)) {
                    try {
                        const r = await fetch(url, { mode: 'no-cors' });
                        return cacheCdn.put(url, r);
                    } catch (e) {
                        console.warn('[sw] CDN no cacheado (no-cors):', url);
                        return;
                    }
                }
                // Otros CDNs: intentar CORS primero, fallback a no-cors
                try {
                    const r = await fetch(url, { mode: 'cors' });
                    if (r && r.status === 200) return cacheCdn.put(url, r);
                } catch (e) { /* fallback */ }
                try {
                    const r = await fetch(url, { mode: 'no-cors' });
                    return cacheCdn.put(url, r);
                } catch (e) {
                    console.warn('[sw] CDN no cacheado:', url);
                }
            })
        );

        console.log('[sw] Precacheo completo');
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

    // === FILTRO CRÍTICO: solo procesar http/https ===
    // Extensiones del navegador (chrome-extension://, moz-extension://, etc.)
    // no son cacheables. Sin este filtro, cache.put() lanza TypeError.
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return;
    }

    if (request.method !== 'GET') return;

    // Ignorar llamadas a Supabase (van directo a red)
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
        event.respondWith(networkFirstForzado(request, CACHE_STATIC));
        return;
    }

    if (ARCHIVOS_CDN.some(cdn => request.url.startsWith(cdn))) {
        event.respondWith(cacheFirst(request, CACHE_CDN));
        return;
    }

    event.respondWith(networkFirstForzado(request, CACHE_CDN));
});

// ocp Network-first con bypass de caché HTTP
async function networkFirstForzado(request, cacheName) {
    const cache = await caches.open(cacheName);
    try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response && response.status === 200 && response.type !== 'opaque') {
            // Solo cachear respuestas no-opacas (permite leerlas y clonarlas)
            await intentarCachear(cache, request, response.clone());
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
        if (response && response.status === 200 && response.type !== 'opaque') {
            await intentarCachear(cache, request, response.clone());
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
