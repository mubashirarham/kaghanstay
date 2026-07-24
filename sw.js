// Kaghan Stay Service Worker for PWA Readiness & Offline Resilience (v10)
const CACHE_NAME = 'kaghan-stay-v10';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/assets/css/style.css?v=10',
    '/assets/js/shared.js?v=10',
    '/assets/images/logo.png',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting obsolete cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Bypass Firestore, Netlify API, and external cross-origin requests
    if (url.origin.includes('firestore.googleapis.com') || url.pathname.includes('/.netlify/')) return;

    // Bypass cross-origin requests — let browser handle them natively under page CSP
    if (url.origin !== self.location.origin) return;

    // Network-First strategy for HTML & JS resources to ensure instant updates
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
                // Fallback to cache if network is offline or fails
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
