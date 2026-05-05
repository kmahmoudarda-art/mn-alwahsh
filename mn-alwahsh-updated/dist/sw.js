const CACHE = 'mn-alwahsh-v1';

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/bg-game-horror.jpeg',
  '/bg-video.mp4',
  '/bg-setup.jpeg',
  '/bg-winner.jpeg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => {
      return Promise.allSettled(PRECACHE.map(url => cache.add(url).catch(() => {})));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET and cross-origin (Supabase API calls etc.)
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  // For navigation (HTML pages) — network first, fall back to cached /index.html
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For JS/CSS/images — cache first, update in background
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const networkFetch = fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
      return cached || networkFetch;
    })
  );
});
