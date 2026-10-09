/* PITCH TALK offline helper. The version changes automatically whenever index.html changes. */
const VERSION = 'pt-61c9b6364c';
const CORE = ['./', './index.html', './manifest.webmanifest',
  './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];
const FONT_CACHE = 'pt-fonts';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((k) => k !== VERSION && k !== FONT_CACHE).map((k) => caches.delete(k))
  )).then(() => self.clients.claim()));
});
function isFont(url){ return url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'; }
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(req.mode === 'navigate'){
    // newest version when online, saved copy when offline
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone(); caches.open(VERSION).then((c) => c.put('./index.html', copy)); return res;
    }).catch(() => caches.match('./index.html', { ignoreSearch: true }).then((r) => r || caches.match('./'))));
    return;
  }
  if(isFont(url)){
    e.respondWith(caches.open(FONT_CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
      c.put(req, res.clone()); return res;
    }))));
    return;
  }
  if(url.origin === location.origin){
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
  }
});
self.addEventListener('message', (e) => {
  if(!e.data || e.data.type !== 'cache-urls') return;
  e.waitUntil(caches.open(FONT_CACHE).then((c) => Promise.all(e.data.urls.map((u) =>
    c.match(u).then((hit) => hit || fetch(u, { mode: 'cors' })
      .then((res) => c.put(u, res)).catch(() => {}))
  ))));
});
