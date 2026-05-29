/* ═══════════════════════════════════════════════════════════
   SILLAGE — sw.js
   Cache-first service worker for offline support
   Cache version: bump CACHE_VERSION to force refresh
   ═══════════════════════════════════════════════════════════ */

const CACHE_VERSION = 'sillage-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './data/fragrances.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Outfit:wght@300;400;500;600&display=swap',
];

// ─── INSTALL: pre-cache all app shell assets ─────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => {
        // Cache local files strictly; fonts may fail in dev — ignore
        const localUrls  = PRECACHE_URLS.filter(u => !u.startsWith('http'));
        const remoteUrls = PRECACHE_URLS.filter(u => u.startsWith('http'));

        return cache.addAll(localUrls)
          .then(() => Promise.allSettled(remoteUrls.map(u => cache.add(u))));
      })
      .then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE: delete old caches ─────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── FETCH: cache-first with network fallback ─────────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-http(s) requests (chrome-extension etc.)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;

        return fetch(event.request)
          .then(response => {
            // Cache successful responses for same-origin + fonts
            if (
              response.ok &&
              (event.request.url.startsWith(self.location.origin) ||
               event.request.url.includes('fonts.googleapis.com') ||
               event.request.url.includes('fonts.gstatic.com'))
            ) {
              const clone = response.clone();
              caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => {
            // Offline fallback: return cached index.html for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});
