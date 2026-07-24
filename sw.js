// Kaghan Stay Service Worker for PWA Readiness & Offline Resilience
const CACHE_NAME = 'kaghan-stay-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/assets/css/style.css',
    '/assets/js/shared.js',
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
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Only handle GET requests and skip API / Firestore network requests
    if (event.request.method !== 'GET') return;
    if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('/.netlify/')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).catch(() => {
                // If offline and requesting page, return fallback
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
