const CACHE = 'orbittroniz-v2';
const FILES = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

// Install - Cache files
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

// Activate
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE ? caches.delete(k) : null))).then(() => self.clients.claim()));
});

// Fetch - Offline Support
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(res => {
        let copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

// Background Sync
self.addEventListener('sync', e => {
  if (e.tag === 'sync-data') {
    e.waitUntil(Promise.resolve());
  }
});

// Periodic Sync
self.addEventListener('periodicsync', e => {
  if (e.tag === 'update-content') {
    e.waitUntil(Promise.resolve());
  }
});

// Push Notifications
self.addEventListener('push', e => {
  const data = e.data ? e.data.text() : 'Orbittroniz - New Tools Available!';
  e.waitUntil(self.registration.showNotification('Orbittroniz', {
    body: data,
    icon: '/icon-192.png',
    badge: '/icon-192.png'
  }));
});
