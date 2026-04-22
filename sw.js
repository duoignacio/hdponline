const CACHE = 'hdp-v2'; // ← bump this number on every deploy (v3, v4, etc.)
const ASSETS = [
  './',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Firebase y Google Fonts: siempre desde la red
  if(e.request.url.includes('firebaseio.com') ||
     e.request.url.includes('firebasejs') ||
     e.request.url.includes('googleapis.com') ||
     e.request.url.includes('gstatic.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status: 503})));
    return;
  }

  // HTML: network-first — siempre intenta buscar la versión más nueva
  // Si no hay red, cae al caché como respaldo
  if(e.request.mode === 'navigate' || e.request.url.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Todo lo demás (JS, CSS, fuentes locales): cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});