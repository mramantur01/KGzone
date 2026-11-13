// KGzone service worker: lets the site install as an app and open without a connection.
// Pages: network first (fresh listings), cached copy when offline. Built assets (hashed names)
// and photos: cache first. API calls are never cached.
const VERSION = 'kgz-v2';
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/_vercel/')) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  if (/^\/(assets|cars|parts)\//.test(url.pathname) || /\.(png|jpg|jpeg|webp|svg|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
          return res;
        })
      )
    );
  }
});

// Phone notifications (web push): new messages, offers on requests, answers, orders
self.addEventListener('push', (e) => {
  let data = { title: 'KGzone', body: '', url: '/kabinet' };
  try { data = { ...data, ...e.data.json() }; } catch { if (e.data) data.body = e.data.text(); }
  e.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: '/icon-192.png', badge: '/favicon-48.png', data: { url: data.url } }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.location.origin));
      if (open) { open.navigate(url).catch(() => undefined); return open.focus(); }
      return self.clients.openWindow(url);
    })
  );
});
