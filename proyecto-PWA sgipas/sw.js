// ocp Service Worker – network-first para archivos dinámicos, actualización inmediata
const CACHE_NAME = 'sgi-pas-v4';  // incrementa este número cada vez que hagas cambios importantes

// Archivos que se cachean y se sirven desde caché solo si no hay red (offline)
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
  // Los archivos JS y CSS NO se cachean aquí, se obtienen de la red primero
];

// Instalación: precargar recursos estáticos que raramente cambian
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  // Forzar que el SW se active inmediatamente sin esperar a que las pestañas viejas se cierren
  self.skipWaiting();
});

// Activación: limpiar cachés antiguas y tomar control de todas las pestañas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Estrategia: network-first para todo, excepto los recursos precargados que son offline-first
self.addEventListener('fetch', event => {
  // Para navegación (HTML), siempre red
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
    return;
  }

  // Para otros recursos (JS, CSS, imágenes): network-first, luego caché
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la respuesta es válida, la clonamos y la guardamos en caché
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});