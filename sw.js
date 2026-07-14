// Service worker pro appku MEZNO 2026.
// Strategie: HTML/stránka = network-first (online vždy čerstvý obsah, offline fallback),
// statické assety (ikony, manifest) = cache-first. Verze se mění při každém deployi,
// takže se SW spolehlivě aktualizuje a stará cache se smaže.
const VERSION = '20260714-232124';
const CACHE = 'mezno-' + VERSION;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isHtml(request) {
  return request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (isHtml(event.request)) {
    // network-first: zkus síť, ulož čerstvou verzi; offline → cache
    event.respondWith(
      fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match(event.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // ostatní (ikony, manifest): cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
