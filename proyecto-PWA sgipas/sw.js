// ocp Service Worker – caché y soporte offline (v3)
const CACHE_NAME = 'sgi-pas-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/js/main.js',
  '/js/auth.js',
  '/js/supabase-client.js',
  '/js/notificaciones.js',
  '/js/app.js',                       // por si existe
  '/js/modules/biblioteca/index.js',
  '/js/modules/biblioteca/operaciones.js',
  '/js/modules/biblioteca/ui.js',
  '/js/modules/biblioteca/utils.js',
  '/js/modules/operaciones/acido.js',
  '/js/modules/operaciones/consumo.js',
  '/js/modules/operaciones/diferenciales.js',
  '/js/modules/operaciones/emisiones.js',
  '/js/modules/operaciones/fundicion.js',
  '/js/modules/operaciones/index.js',
  '/js/modules/operaciones/motores.js',
  '/js/modules/operaciones/novedades.js',
  '/js/modules/operaciones/ph.js',
  '/js/modules/operaciones/tendencias.js',
  '/js/modules/operaciones/utils.js',
  '/js/modules/ordenes/avances.js',
  '/js/modules/ordenes/cierres.js',
  '/js/modules/ordenes/crear.js',
  '/js/modules/ordenes/detalle.js',
  '/js/modules/ordenes/index.js',
  '/js/modules/ordenes/listado.js',
  '/js/modules/ordenes/tablero.js',
  '/js/modules/ordenes/utils.js',
  '/js/modules/ssl/emitir.js',
  '/js/modules/ssl/historial.js',
  '/js/modules/ssl/index.js',
  '/js/modules/ssl/utils.js',
  '/js/modules/usuarios/acciones.js',
  '/js/modules/usuarios/formulario.js',   // si se llama "formularios.js", renombra la línea
  '/js/modules/usuarios/index.js',
  '/js/modules/usuarios/lista.js',
  '/js/modules/usuarios/utils.js',
  '/js/modules/presencia.js',
  '/js/modules/seguridad.js',             // por si aún existe
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

// ocp Instalación: precargar recursos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// ocp Activación: limpiar cachés antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
});

// ocp Estrategia cache-first: responder desde caché, si no, red
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});