const CACHE = 'restorder-v14';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'seed.js', 'manifest.webmanifest',
  'icons/logo.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'icons/logos/chef.png', 'icons/logos/mille.png', 'icons/logos/del.png', 'icons/logos/frutus.png', 'icons/logos/farutex.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// sieć najpierw (świeże wersje), cache jako zapas offline
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
