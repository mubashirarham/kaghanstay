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
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Bypass Firestore, Netlify API, and external cross-origin requests
    if (url.origin.includes('firestore.googleapis.com') || url.pathname.includes('/.netlify/')) return;

    // Bypass cross-origin requests — let browser handle them natively under page CSP
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html').then(r => r || new Response('Offline', { status: 503 }));
                }
                return new Response('', { status: 503 });
            });
        })
    );
});
