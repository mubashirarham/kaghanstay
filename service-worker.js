const CACHE_NAME = 'kph-stay-cache-v10';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/rooms.html',
  '/blog.html',
  '/booking.html',
  '/login.html',
  '/404.html',
  '/contact.html',
  '/terms.html',
  '/privacy.html',
  '/manifest.json',
  '/assets/css/style.css?v=10',
  '/assets/js/rooms.js?v=10',
  '/assets/images/logo.png'
];

// Install Event - Pre-cache core shell resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static app shell assets...');
      const promises = ASSETS_TO_CACHE.map((url) => {
        const isExternal = url.startsWith('http');
        const request = isExternal ? new Request(url, { mode: 'no-cors' }) : url;
        return fetch(request).then((response) => {
          return cache.put(url, response);
        }).catch((err) => {
          console.warn(`[Service Worker] Failed to cache: ${url}`, err);
        });
      });
      return Promise.all(promises);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Purging obsolete cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network-First caching strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass Firestore, Netlify API, and external cross-origin requests
  if (url.origin.includes('firestore.googleapis.com') || url.pathname.includes('/.netlify/')) return;

  // Bypass cross-origin requests
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html').then(r => r || new Response('Offline', { status: 503 }));
          }
          return new Response('', { status: 503 });
        });
      })
  );
});
