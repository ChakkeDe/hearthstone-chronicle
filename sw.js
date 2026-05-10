const CACHE = 'hc-v23';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './version.json',
  './styles/main.css',
  './src/pwa.js',
  './src/game.js',
  './src/data/progression.js',
  './src/data/buildings.js',
  './src/data/research.js',
  './src/data/combat.js',
  './src/data/heroes.js',
  './src/data/map.js',
];

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
  // Network-first strategy for HTML and JS — always try network first
  // Only fall back to cache if truly offline
  if(e.request.url.includes('.html') || e.request.url.includes('.js') || e.request.url.includes('version.json') || e.request.url.endsWith('/')){
    e.respondWith(
      fetch(e.request)
        .then(response => {
          // Update cache with fresh version
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache-first for images and other assets (they don't change often)
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

// Listen for skip waiting message
self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
