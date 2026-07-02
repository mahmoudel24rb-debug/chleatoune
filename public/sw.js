// Service worker : met le jeu en cache pour qu'il se lance hors-ligne
// (et que la PWA « Ajouter au Dock » fonctionne comme une vraie app).
// Stratégie : réseau d'abord (toujours à jour), cache en secours.

const CACHE = 'chleatoune-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;
  event.respondWith(
    fetch(event.request)
      .then((reponse) => {
        const copie = reponse.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copie));
        return reponse;
      })
      .catch(() =>
        caches.match(event.request, { ignoreSearch: true }).then(
          (enCache) => enCache ?? caches.match('index.html')
        )
      )
  );
});
