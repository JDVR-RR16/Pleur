// Minimale service worker: cache-first voor eigen assets, zodat de app offline werkt.
const CACHE = 'pleur-v8';
const ASSETS = [
  '.', 'index.html', 'css/style.css',
  'js/db.js', 'js/land.js', 'js/seed.js', 'js/scanner.js', 'js/app.js',
  'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-512.png',
];

self.addEventListener('install', e => {
  // 'reload' omzeilt de HTTP-cache van de browser: anders kan een update
  // stilletjes oude bestanden binnenhalen naast nieuwe.
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(
    ASSETS.map(u => fetch(u, { cache: 'reload' }).then(res => c.put(u, res)))
  )));
  self.skipWaiting();
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
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request))
  );
});
