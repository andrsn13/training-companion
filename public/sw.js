// Network-first with cache fallback; app shell is precached on install so it works offline.
const C = 'training-v1';
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(async (c) => {
    const r = await fetch('./');
    await c.put('./', r.clone());
    const urls = [...(await r.text()).matchAll(/(?:src|href)="(\.[^"]+\.(?:js|css|png|svg|webmanifest))"/g)].map((m) => m[1]);
    await c.addAll(urls);
  }));
});
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((k) => Promise.all(k.filter((x) => x !== C).map((x) => caches.delete(x)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => {
    const copy = r.clone();
    caches.open(C).then((c) => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request).then((m) => m || caches.match('./'))));
});
