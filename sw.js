const CACHE_NAME = 'koul-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Nécessaire pour que le navigateur considère l'app comme PWA
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
