const CACHE_NAME = 'kph-stay-cache-v6';
// Only cache same-origin static assets.
// External CDN resources must NOT be pre-cached: the SW fetch() runs under the
// page CSP and any cross-origin fetch is blocked, causing install failures.
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
  '/assets/css/style.css',
  '/assets/js/shared.js',
  '/assets/js/rooms.js',
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

// Fetch Event - Stale-While-Revalidate caching strategy
self.addEventListener('fetch', (event) => {
  // Bypassing non-GET requests (e.g. POST chatbot, Firestore updates)
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Bypass Google Firestore API endpoints and external analytics (handled natively or ignored)
  if (url.origin.includes('firestore.googleapis.com') || url.origin.includes('google-analytics.com')) {
    return;
  }

  // Bypass ALL external / cross-origin requests — let the browser handle them
  // directly. The SW fetch() runs under the page CSP so any cross-origin fetch
  // that is not in connect-src will be blocked and produce a TypeError.
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve from cache immediately, and fetch updated asset in the background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch((err) => console.log('[Service Worker] Background fetch failed (offline state):', err));
        
        return cachedResponse;
      }

      // If not cached, retrieve over network
      return fetch(event.request)
        .then((networkResponse) => {
          // Cache successful responses for local static files
          if (networkResponse.status === 200 && (url.origin === location.origin || url.origin.includes('unsplash.com'))) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html').then(r => r || new Response('Offline', { status: 503 }));
          }
          // For non-navigation requests (scripts, styles, images) return empty 503
          return new Response('', { status: 503 });
        });
    })
  );
});
