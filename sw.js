// Offline cache for the Kids Flashcard app.
// Strategy: precache the app shell on install; cache-first for everything
// else (content + media) so each asset becomes available offline once fetched.
const VERSION = 'v10';
const SHELL = 'shell-' + VERSION;
const RUNTIME = 'runtime-' + VERSION;

const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon.svg',
  './decks.json',
  './content/animals/cards.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== SHELL && k !== RUNTIME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        // Cache successful same-origin content/media for offline reuse.
        if (resp.ok && e.request.url.startsWith(self.location.origin)) {
          const copy = resp.clone();
          caches.open(RUNTIME).then(c => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
