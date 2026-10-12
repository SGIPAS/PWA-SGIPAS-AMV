// ocp Service Worker SGIPAS — caché offline + integración OneSignal

// ocp Integrar OneSignal dentro de este Service Worker (v16)
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// Versión del caché. Incrementar cuando se actualice el código
const CACHE_VERSION = 'sgipas-v1';
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_CDN = `${CACHE_VERSION}-cdn`;

// ocp Archivos propios (app shell)
const ARCHIVOS_PROPIOS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/logo.png',
    '/cintillo_superior.png',
    '/assets/icons/icon-192x192.png',
    '/assets/icons/icon-512x512.png',
    '/js/main.js',
    '/js/supabase-client.js',
    '/js/auth.js',
    '/js/push.js',
    '/js/notificaciones.js',
    '/js/realtime.js',
    '/js/utils-storage.js',
    '/js/modules/presencia.js',
    // Módulos
    '/js/modules/dashboard/index.js',
    '/js/modules/dashboard/panel.js',
    '/js/modules/dashboard/historicos.js',
    '/js/modules/dashboard/gerencial.js',
    '/js/modules/dashboard/utils.js',
    '/js/modules/operaciones/index.js',
    '/js/modules/operaciones/novedades.js',
    '/js/modules/operaciones/acido.js',
    '/js/modules/operaciones/ph.js',
    '/js/modules/operaciones/consumo.js',
    '/js/modules/operaciones/emisiones.js',
    '/js/modules/operaciones/motores.js',
    '/js/modules/operaciones/diferenciales.js',
    '/js/modules/operaciones/paradas.js',
    '/js/modules/operaciones/utils.js',
    '/js/modules/ordenes/index.js',
    '/js/modules/ordenes/listado.js',
    '/js/modules/ordenes/detalle.js',
    '/js/modules/ordenes/crear.js',
    '/js/modules/ordenes/avances.js',
    '/js/modules/ordenes/cierres.js',
    '/js/modules/ordenes/tablero.js',
    '/js/modules/ordenes/utils.js',
    '/js/modules/ssl/index.js',
    '/js/modules/ssl/emitir.js',
    '/js/modules/ssl/historial.js',
    '/js/modules/ssl/utils.js',
    '/js/modules/laboratorio/index.js',
    '/js/modules/laboratorio/utils.js',
    '/js/modules/laboratorio/lista.js',
    '/js/modules/laboratorio/acido.js',
    '/js/modules/laboratorio/azufre.js',
    '/js/modules/laboratorio/agua.js',
    '/js/modules/laboratorio/disposicion.js',
    '/js/modules/inventario/index.js',
    '/js/modules/inventario/movimientos.js',
    '/js/modules/inventario/fundicion.js',
    '/js/modules/inventario/produccion.js',
    '/js/modules/inventario/utils.js',
    '/js/modules/biblioteca/index.js',
    '/js/modules/biblioteca/ui.js',
    '/js/modules/biblioteca/operaciones.js',
    '/js/modules/biblioteca/utils.js',
    '/js/modules/bitacora/index.js',
    '/js/modules/bitacora/utils.js',
    '/js/modules/bitacora/generar.js',
    '/js/modules/rutinas/index.js',
    '/js/modules/rutinas/utils.js',
    '/js/modules/rutinas/checklist.js',
    '/js/modules/rutinas/auditoria.js',
    '/js/modules/reportes/index.js',
    '/js/modules/reportes/gestion.js',
    '/js/modules/reportes/emisiones.js',
    '/js/modules/reportes/utils.js',
    '/js/modules/usuarios/index.js',
    '/js/modules/usuarios/lista.js',
    '/js/modules/usuarios/formulario.js',
    '/js/modules/usuarios/acciones.js',
    '/js/modules/usuarios/utils.js',
    '/js/modules/disposicion/index.js',
    '/js/modules/disposicion/acido.js',
    '/js/modules/disposicion/agua.js',
    '/js/modules/disposicion/solidos.js',
    '/js/modules/disposicion/utils.js',
    '/js/modules/mantenimiento/index.js',
    '/js/modules/mantenimiento/utils.js',
    '/js/modules/mantenimiento/equipos/index.js',
    '/js/modules/mantenimiento/equipos/lista.js',
    '/js/modules/mantenimiento/equipos/formulario.js',
    '/js/modules/mantenimiento/equipos/detalle.js',
    '/js/modules/mantenimiento/equipos/evento-form.js',
    '/js/modules/mantenimiento/repuestos/index.js',
    '/js/modules/mantenimiento/repuestos/lista.js',
    '/js/modules/mantenimiento/repuestos/formulario.js',
    '/js/modules/mantenimiento/repuestos/detalle.js',
    '/js/modules/mantenimiento/repuestos/movimiento-form.js',
    '/js/modules/mantenimiento/movimientos/index.js'
];

// ocp Archivos CDN (librerías externas, casi nunca cambian)
const ARCHIVOS_CDN = [
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3/dist/chartjs-adapter-date-fns.bundle.min.js',
    'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
    'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js',
    'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js'
];

// ocp Instalar: precachear todo
self.addEventListener('install', (event) => {
    console.log('[sw] Instalando versión', CACHE_VERSION);
    event.waitUntil((async () => {
        const cacheStatic = await caches.open(CACHE_STATIC);
        const cacheCdn = await caches.open(CACHE_CDN);

        // Cachear propios (fallo individual no rompe el install)
        await Promise.allSettled(
            ARCHIVOS_PROPIOS.map(url =>
                cacheStatic.add(url).catch(err => console.warn('[sw] No se pudo cachear:', url, err.message))
            )
        );

        // Cachear CDNs
        await Promise.allSettled(
            ARCHIVOS_CDN.map(url =>
                cacheCdn.add(url).catch(err => console.warn('[sw] No se pudo cachear CDN:', url, err.message))
            )
        );

        console.log('[sw] Precacheo completo');
        self.skipWaiting();
    })());
});

// ocp Activar: limpiar cachés viejos
self.addEventListener('activate', (event) => {
    console.log('[sw] Activando');
    event.waitUntil((async () => {
        const nombres = await caches.keys();
        await Promise.all(
            nombres
                .filter(n => !n.startsWith(CACHE_VERSION))
                .map(n => caches.delete(n))
        );
        await self.clients.claim();
    })());
});

// ocp Fetch: interceptar todas las peticiones
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // ocp Ignorar métodos no-GET
    if (request.method !== 'GET') return;

    // ocp Ignorar llamadas a Supabase (API) — siempre van a red
    if (url.hostname.includes('supabase.co') ||
        url.pathname.startsWith('/rest/') ||
        url.pathname.startsWith('/auth/') ||
        url.pathname.startsWith('/storage/') ||
        url.pathname.startsWith('/realtime/')) {
        return;
    }

    // ocp Ignorar websockets
    if (request.headers.get('Upgrade') === 'websocket') return;

    // ocp Estrategia según tipo de recurso
    if (url.origin === self.location.origin) {
        // Recurso propio
        event.respondWith(cacheFirstConUpdate(request, CACHE_STATIC));
    } else if (ARCHIVOS_CDN.some(cdn => request.url.startsWith(cdn))) {
        // Recurso CDN conocido
        event.respondWith(cacheFirstConUpdate(request, CACHE_CDN));
    } else {
        // Otros recursos externos (Google Fonts, etc.)
        event.respondWith(networkFirstConCache(request, CACHE_CDN));
    }
});

// ocp Estrategia: cache first, actualizar en background
async function cacheFirstConUpdate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    // Si está en caché, devolverlo y actualizar en background
    if (cached) {
        fetch(request).then(response => {
            if (response && response.status === 200) {
                cache.put(request, response.clone());
            }
        }).catch(() => {}); // sin red → silencio
        return cached;
    }

    // No está en caché → intentar red
    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        // Sin red y sin caché → devolver HTML offline
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

// ocp Estrategia: network first, fallback a caché
async function networkFirstConCache(request, cacheName) {
    const cache = await caches.open(cacheName);
    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        const cached = await cache.match(request);
        if (cached) return cached;
        return new Response('Recurso no disponible sin conexión', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }
}

// ocp Mensaje para forzar skipWaiting (actualización desde el cliente)
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
