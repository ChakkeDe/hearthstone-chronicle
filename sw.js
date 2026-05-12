const CACHE = 'hc-v48';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './version.json',
  './icon-192.png',
  './icon-512.png',
  './styles/main.css',
  './src/pwa.js',
  './src/save.js',
  './src/game.js',
  './src/data/progression.js',
  './src/data/buildings.js',
  './src/data/research.js',
  './src/data/combat.js',
  './src/data/heroes.js',
  './src/data/map.js',
  './assets/barracks.jpg',
  './assets/citadel.jpg',
  './assets/city.jpg',
  './assets/farm.jpg',
  './assets/hospital.jpg',
  './assets/ironworks.jpg',
  './assets/lumber.jpg',
  './assets/market.jpg',
  './assets/mine.jpg',
  './assets/tower.jpg',
];

// Release checklist for the PWA shell:
// 1. Bump CACHE here.
// 2. Keep CACHE aligned with CACHE_VERSION in src/game.js.
// 3. Keep CACHE aligned with the cache field in version.json.
// 4. Update APP_VERSION in src/game.js and the app field in version.json if the
//    release also changes the visible app version.

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // HTML, JS, and version.json are network-first so the app shell can pick up
  // fresh deployments quickly and the client can detect new releases instead of
  // getting stuck on an old cached page.
  if(e.request.url.includes('.html') || e.request.url.includes('.js') || e.request.url.includes('version.json') || e.request.url.endsWith('/')){
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Images and static assets are cache-first because they change less often,
  // benefit from fast repeat loads, and should stay available offline.
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return response;
      });
    })
  );
});

// The page can request immediate activation after the user confirms an update.
self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
