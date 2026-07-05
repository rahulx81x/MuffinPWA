const CACHE_NAME = 'my-finance-app-v3';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './config.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache the live Google Sheet data - always fetch fresh
  if (url.hostname.includes('google.com') || url.hostname.includes('googleusercontent.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  const isAppAsset = event.request.mode === 'navigate' || /\.(?:html|js|css|json)$/i.test(url.pathname);

  if (isAppAsset) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then(response => response || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
