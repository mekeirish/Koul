const CACHE_NAME = 'koul-v1.0.0';
const OFFLINE_URL = 'koul-neo-perfect.html';
 
// Liste des ressources à mettre en cache pour le PWA
const STATIC_CACHE_URLS = [
  '/',
  '/koul-neo-perfect.html',
  '/manifest.json',
  'https://www.gstatic.com/firebasejs/9.17.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.17.1/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/9.17.1/firebase-messaging-compat.js',
  'https://maps.googleapis.com/maps/api/js?key=AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg&libraries=places&callback=initMap'
];
 
// Installation du service worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installation en cours...');
 
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Mise en cache des ressources statiques');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[Service Worker] Installation terminée');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Erreur lors de l\'installation:', error);
      })
  );
});
 
// Activation du service worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activation en cours...');
 
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Suppression de l\'ancien cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation terminée');
        return self.clients.claim();
      })
  );
});
 
// Stratégie de cache : Network First avec fallback au cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
 
  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }
 
  // Stratégie pour les ressources Firebase (toujours réseau)
  if (url.hostname.includes('firebaseio.com') || url.hostname.includes('googleapis.com')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          console.log('[Service Worker] Firebase indisponible, utilisation du cache');
          return caches.match(request);
        })
    );
    return;
  }
 
  // Stratégie pour les pages principales (HTML)
  if (request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Mettre en cache la réponse si elle est valide
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback au cache ou page offline
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }
 
  // Stratégie pour les ressources statiques (CSS, JS, images)
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          // Si dans le cache, le retourner
          if (response) {
            return response;
          }
 
          // Sinon, le chercher sur le réseau
          return fetch(request)
            .then((response) => {
              // Mettre en cache si valide
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, responseClone);
                });
              }
              return response;
            })
            .catch(() => {
              // Pour les images, retourner une image placeholder
              if (request.destination === 'image') {
                return new Response(
                  '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#ccc"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#666">Image</text></svg>',
                  { headers: { 'Content-Type': 'image/svg+xml' } }
                );
              }
            });
        })
    );
    return;
  }
 
  // Stratégie par défaut : Cache First avec Network fallback
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
 
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
      })
  );
});
 
// Gestion des messages (pour les notifications push)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Notification push reçue:', event);
 
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification Koul',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiMwZDExMTciLz4KPGNpcmNsZSBjeD0iOTYiIGN5PSI4MCIgcj0iMzAiIGZpbGw9IiNmZmNjMDAiLz4KPHBhdGggZD0iTTYwIDEyMEg5NlYxNDBIMTIwVjEyMEgxMDBWMTA4SDg0VjEyMEg2MFoiIGZpbGw9IiNmZmNjMDAiLz4KPHBhdGggZD0iTTc2IDgwQzc2IDg2LjYyNzQgODEuMzcyNiA5MiA4OCA5MkM5NC42Mjc0IDkyIDEwMCA4Ni42Mjc0IDEwMCA4MEMxMDAgNzMuMzcyNiA5NC42Mjc0IDY4IDg4IDY4QzgxLjM3MjYgNjggNzYgNzMuMzcyNiA3NiA4MFoiIGZpbGw9IiMwZDExMTciLz4KPC9zdmc+',
    badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzYiIGN5PSIzNiIgcj0iMzYiIGZpbGw9IiNmZmNjMDAiLz4KPC9zdmc+',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'Voir',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDQuNUwxNi41IDlMMTUuNSAzLjVIMTIuNUw0LjUgOUwxMiA0LjVaIiBmaWxsPSIjZmZjYzAwIi8+Cjwvc3ZnPg=='
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUgN0wxOSAyMU03IDE5TDMgNUw3IDVaIiBzdHJva2U9IiNmZmNjMDAiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4='
      }
    ],
    requireInteraction: false,
    silent: false,
    tag: 'koul-notification'
  };
 
  event.waitUntil(
    self.registration.showNotification('Koul', options)
  );
});
 
// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification cliquée:', event);
 
  event.notification.close();
 
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Ne rien faire, juste fermer
  } else {
    // Clic par défaut - ouvrir l'application
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});
 
// Gestion de la synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Synchronisation en arrière-plan:', event.tag);
 
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Logique de synchronisation des données offline
      performBackgroundSync()
    );
  }
});
 
// Fonction de synchronisation en arrière-plan
async function performBackgroundSync() {
  try {
    // Récupérer les données offline du localStorage
    const offlineData = await getOfflineData();
 
    if (offlineData && offlineData.length > 0) {
      // Synchroniser chaque donnée
      for (const data of offlineData) {
        await syncData(data);
      }
 
      // Nettoyer les données synchronisées
      await clearOfflineData();
    }
  } catch (error) {
    console.error('[Service Worker] Erreur de synchronisation:', error);
  }
}
 
// Fonctions utilitaires pour la gestion offline
async function getOfflineData() {
  // Implémentation à adapter selon votre stockage
  return [];
}
 
async function syncData(data) {
  // Implémentation de la synchronisation avec Firebase
  console.log('[Service Worker] Synchronisation des données:', data);
}
 
async function clearOfflineData() {
  // Nettoyer les données synchronisées
  console.log('[Service Worker] Nettoyage des données offline');
}
 
// Gestion de la mise à jour du service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
 
// Nettoyage périodique du cache
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_CLEANUP') {
    cleanupCache();
  }
});
 
async function cleanupCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
 
    // Supprimer les anciennes entrées (plus de 30 jours)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
 
    for (const request of requests) {
      const response = await cache.match(request);
      if (response && response.headers.get('date')) {
        const responseDate = new Date(response.headers.get('date')).getTime();
        if (responseDate < thirtyDaysAgo) {
          await cache.delete(request);
        }
      }
    }
  } catch (error) {
    console.error('[Service Worker] Erreur lors du nettoyage du cache:', error);
  }
}
 
