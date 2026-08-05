// Kaghan Stay — sw.js Deprecation Handler
// Automatically unregisters this legacy worker without force-reloading pages.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
    event.waitUntil(self.registration.unregister());
});
