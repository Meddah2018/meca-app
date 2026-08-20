// Minimal service worker — exists mainly to satisfy PWA installability criteria
// (Chrome/Android requires a registered SW with a fetch handler). Strategy is
// network-first for everything same-origin (falling back to cache only when
// offline), so app updates always reach installed users immediately instead
// of being masked by a stale cache. Cross-origin requests (Supabase API/
// storage) are left alone — those must never be served from cache.

const CACHE_NAME = 'mecapieces-shell-v2';
const SHELL_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon_pieces.ico',
  '/icon_pieces_32.png',
  '/icon_pieces_180.png',
  '/icon_pieces_192.png',
  '/icon_pieces_512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never intercept Supabase/API calls

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || (request.mode === 'navigate' ? caches.match('/') : undefined))
      )
  );
});
