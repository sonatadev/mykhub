/**
 * Enough of a service worker to open the app without a connection: the shell
 * and the bundles are kept in a cache, while everything to do with data goes
 * to the network and, when there is none, to the copy of the document the
 * editor keeps in IndexedDB.
 */

const CACHE = 'mykhub-shell-v1';
const SHELL = ['/', '/index.html', '/share.html', '/share-space.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Notes, uploads and the collaboration socket are never served from a
  // stale cache: out-of-date content here would be worse than none.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/') || url.pathname.startsWith('/collab')) return;

  // The bundles carry a content hash, so a hit is always the right file.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Pages: the network decides, so a deploy is picked up immediately; the
  // cache is what is left when there is no network.
  if (request.mode === 'navigate' || SHELL.includes(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE);
          return (await cache.match(request)) || (await cache.match('/index.html')) || Response.error();
        })
    );
  }
});
