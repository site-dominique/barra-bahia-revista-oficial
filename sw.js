// Service Worker - Barra Bahia Revista PWA
const CACHE_NAME = 'barra-bahia-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/tooplate-living-parallax.css',
  '/tooplate-living-scripts.js',
  '/voice-assistant.js',
  '/manifest.json'
];

// Install - Cache arquivos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Activate - Limpa cache antigo
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch - Serve do cache se offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
