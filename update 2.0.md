# Update 2.0 — Admin Panel CSP, Service Worker, & Firebase v14 Fixes

## Summary of Fixes

This update resolves all Content Security Policy (CSP) violations, Service Worker crashes, and Firebase Admin SDK connection errors affecting the Kaghan Stay admin panel.

---

## 1. Firebase Admin SDK v14 Modular Refactoring
* **Root Cause**: `firebase-admin` version 14.x dropped legacy namespace support. The previous calls to `admin.firestore()` and `admin.auth()` returned `undefined` and crashed the functions with `TypeError: admin.firestore is not a function`.
* **Fix**:
  * Refactored `netlify/functions/_admin-init.js` to use the modular sub-path imports:
    ```javascript
    const { initializeApp, cert, getApps } = require('firebase-admin/app');
    const { getFirestore } = require('firebase-admin/firestore');
    const { getAuth } = require('firebase-admin/auth');
    ```
  * Changed the initialization and service retrieval logic to use destructured functions: `fdb = getFirestore();` and `auth = getAuth();`.
  * Updated all dependent Netlify functions to correctly consume the refactored modular exports.

---

## 2. Content Security Policy (CSP) Updates
* **Leaflet Maps**: Added `https://unpkg.com` to the `img-src` directive in `netlify.toml` to allow marker icon and shadow images to load.
* **Tailwind CSS**: Added `https://cdn.tailwindcss.com` to `connect-src` in `netlify.toml` to prevent connection blocking.
* **CartoCDN Tiles**: Added `https://*.basemaps.cartocdn.com` to `connect-src` in `netlify.toml` to prevent map tile requests from being blocked.

---

## 3. Service Worker Stabilization
* **Caching Adjustments**: Removed external CDN resources (like Tailwind, Font Awesome, and Google Fonts) from `ASSETS_TO_CACHE` because cross-origin fetches during service worker installation were blocked under the page's CSP, causing the install process to crash.
* **Fragile Bypass Fix**: Replaced the brittle `BYPASS_ORIGINS` domain list with a single robust origin check: `if (url.origin !== self.location.origin) { return; }`. This automatically bypasses the Service Worker cache for all cross-origin requests, preventing `TypeError: Failed to convert value to 'Response'` crashes.
* **Cache Version Bump**: Bumped the cache name to `kph-stay-cache-v7` to force clients to receive the fresh Service Worker.
