# KPH Stay — Full Remediation & Cleanup Plan

> **Purpose:** Single source of truth for everything broken or fragile in the current codebase. Covers root causes, a structured fix plan, and execution order. No changes should be made until this plan is reviewed.

---

## Overview of Current Problems

The admin panel on `kphstay.com` has **three cascading root problems** that together cause multiple visible failures:

1. **Admin panel loads all dependencies from external CDNs** (TailwindCSS, Leaflet, ApexCharts, FullCalendar) — those CDNs are blocked by the Content Security Policy (CSP) on production.
2. **The Service Worker intercepts external CDN requests** and tries to re-fetch them, which itself violates the CSP — creating a second layer of failure.
3. **Tailwind CSS is loaded from CDN in production** — explicitly warned against by Tailwind, causes inconsistent rendering and CSP issues.

Everything else (map blank, description box missing, script errors, charts not loading) is a **symptom of these three root causes**.

---

## Problem Breakdown

### Problem 1 — TailwindCSS via CDN (Root Cause A)

| Detail | Info |
|---|---|
| **File** | `admin/index.html` line 9 |
| **Current** | `<script src="https://cdn.tailwindcss.com">` |
| **Impact** | Dev-only tool. Larger than a compiled build, triggers browser warnings, conflicts with CSP `connect-src` when the service worker intercepts it. |
| **Fix** | Self-host a compiled Tailwind CSS build as `assets/css/admin.css` via Tailwind CLI. |

---

### Problem 2 — Leaflet Map Blocked by CSP (Root Cause B)

| Detail | Info |
|---|---|
| **Files** | `netlify.toml`, `admin/index.html`, `assets/js/admin/inventory.js` |
| **Current** | Leaflet loaded from `https://unpkg.com`. Even though `connect-src` was updated to include `unpkg.com`, the **service worker still intercepts the request** and its own re-fetch is blocked by CSP. |
| **Error** | `Uncaught ReferenceError: L is not defined` at `inventory.js:337` — Leaflet JS never executes because the script tag fails silently. |
| **Fix** | Self-host Leaflet JS + CSS in `assets/vendor/leaflet/` — removes the CDN dependency entirely. |

---

### Problem 3 — Service Worker Intercepting CDN Requests (Root Cause C)

| Detail | Info |
|---|---|
| **File** | `service-worker.js` |
| **Current** | SW intercepts ALL GET requests including external CDN URLs. When SW tries to re-fetch these for its cache, the fetch runs under the page's CSP which blocks cross-origin fetches. This causes `TypeError: Failed to convert value to 'Response'`. |
| **Partial fix** | Cache bumped to v5, bypass list added — but this is fragile. Any new CDN dependency breaks it again. |
| **Fix** | Rewrite SW fetch handler to **only intercept same-origin requests**. All cross-origin requests pass directly to the browser. |

---

### Problem 4 — Room Description (Already Fixed)

| Detail | Info |
|---|---|
| **Status** | ✅ Fixed — Quill replaced with plain `<textarea>` in last commit. No further changes needed. |

---

### Problem 5 — ApexCharts and FullCalendar via CDN

| Detail | Info |
|---|---|
| **File** | `admin/index.html` lines 15–17 |
| **Current** | Both loaded from `cdn.jsdelivr.net` — external CDN. |
| **Impact** | `Failed to load resource: net::ERR_FAILED`. Dashboard charts and calendar won't render. |
| **Fix** | Self-host both in `assets/vendor/` OR add `typeof` guards so hard crashes are prevented. |

---

### Problem 6 — 404 Broken Images (`apartment_1bhk.jpg` etc.)

| Detail | Info |
|---|---|
| **File** | `assets/js/admin/inventory.js` (room card render) |
| **Current** | Default seeded rooms in Firestore point to local relative paths (`assets/images/apartment_1bhk.jpg`) which don't exist on the server. |
| **Impact** | Broken image icons in every room card. |
| **Fix** | Add `onerror` fallback to room card `<img>` tags + create a `placeholder.jpg` image. |

---

### Problem 7 — Firebase API Key in Source Code

| Detail | Info |
|---|---|
| **File** | `assets/js/shared.js` lines 9–17 |
| **Note** | This is **expected for Firebase Web SDK** — the client API key is a public identifier, not a secret. Security is enforced by Firestore rules and Firebase authorized domains. |
| **Action** | Add a comment clarifying this is intentional to avoid future confusion. |
| **Status** | ⚠️ Acceptable as-is, document only. |

---

### Problem 8 — Deprecated `enablePersistence()` Warning

| Detail | Info |
|---|---|
| **File** | `assets/js/shared.js` line 24 |
| **Current** | `fdb.enablePersistence()` is deprecated in Firebase 10.x — fires a console warning on every page load. |
| **Fix** | Wrap in try/catch with suppression comment, or migrate to `FirestoreSettings.cache`. |

---

## Execution Plan

### Phase 1 — Fix Service Worker (Highest Priority)

**Goal:** Stop the SW from intercepting anything it should not.

**File:** `service-worker.js`

- Rewrite the `fetch` event handler to **only respond to same-origin requests** using `url.origin === self.location.origin`.
- All cross-origin requests (CDNs, Firebase, external APIs) fall straight through to the browser.
- Remove the fragile `BYPASS_ORIGINS` array — superseded by the same-origin rule.
- Result: No more `TypeError: Failed to convert value to 'Response'` crashes.

---

### Phase 2 — Self-Host Leaflet

**Goal:** Leaflet map loads reliably without any CDN or CSP involvement.

**New files:**
- `assets/vendor/leaflet/leaflet.js` (v1.9.4, downloaded from unpkg)
- `assets/vendor/leaflet/leaflet.css` (v1.9.4)

**File:** `admin/index.html`

- Replace:
  ```html
  <link href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js">
  ```
- With:
  ```html
  <link href="../assets/vendor/leaflet/leaflet.css">
  <script src="../assets/vendor/leaflet/leaflet.js">
  ```

---

### Phase 3 — Replace Tailwind CDN with Compiled Build

**Goal:** Eliminate production Tailwind CDN, reduce CSP surface, fix Tailwind warning.

**Steps:**
1. Create `assets/css/admin-input.css` with `@tailwind` directives.
2. Run: `npx tailwindcss -i ./assets/css/admin-input.css -o ./assets/css/admin.css --content ./admin/index.html`
3. In `admin/index.html`, replace the CDN `<script src="https://cdn.tailwindcss.com">` with:
   ```html
   <link rel="stylesheet" href="../assets/css/admin.css">
   ```

---

### Phase 4 — Fix Broken Image 404s

**Goal:** Room cards never show broken image icons.

**File:** `assets/js/admin/inventory.js`

Add `onerror` to every room `<img>` tag in the render template:
```js
onerror="this.onerror=null;this.src='../assets/images/placeholder.jpg'"
```

**New file:** `assets/images/placeholder.jpg` — a simple branded placeholder (can be generated or downloaded).

---

### Phase 5 — Tighten CSP in `netlify.toml`

**Goal:** Once Phases 2 and 3 remove external CDN dependencies, remove those domains from the CSP.

**Remove from CSP:**
- `https://unpkg.com` (Leaflet now self-hosted)
- `https://cdn.tailwindcss.com` (now compiled locally)

This makes the policy significantly stricter and cleaner.

---

### Phase 6 — Suppress Firebase Deprecation Warning

**Goal:** Clean console, no noise for developers.

**File:** `assets/js/shared.js`

Replace the current `enablePersistence()` call with a suppressed version and add a comment.

---

## Execution Order

```
Phase 1 → Service Worker rewrite         (1 file, low risk, immediate)
Phase 2 → Self-host Leaflet              (2 new files + 1 file edit)
Phase 4 → Image fallback + placeholder   (1 line + 1 image, quick)
Phase 3 → Tailwind CLI build             (most effort, requires npm)
Phase 5 → CSP cleanup                   (after Phases 2 & 3 done)
Phase 6 → Firebase warning               (anytime, cosmetic)
```

---

## Files Changed Summary

| File | Phase | Change |
|---|---|---|
| `service-worker.js` | 1 | Rewrite fetch to same-origin only |
| `assets/vendor/leaflet/leaflet.js` | 2 | NEW — self-hosted |
| `assets/vendor/leaflet/leaflet.css` | 2 | NEW — self-hosted |
| `admin/index.html` | 2, 3 | Point to local vendor files, remove CDN tags |
| `assets/css/admin-input.css` | 3 | NEW — Tailwind input file |
| `assets/css/admin.css` | 3 | NEW — compiled Tailwind output |
| `assets/js/admin/inventory.js` | 4 | Add onerror fallback on img tags |
| `assets/images/placeholder.jpg` | 4 | NEW — placeholder image |
| `netlify.toml` | 5 | Remove CDN entries from CSP |
| `assets/js/shared.js` | 6 | Suppress Firebase deprecation warning |

---

## Already Working — Do NOT Change

| Feature | Status |
|---|---|
| Room description textarea | ✅ Fixed (last commit) |
| Settings delete category/location | ✅ Fixed via `window.safeFetch` |
| Admin CORS on production API | ✅ Working |
| Firestore security rules | ✅ Hardened |
| Chatbot excluded from admin panel | ✅ Working |
| Edge-level CORS preflight fix | ✅ Working (rate-limiter.js) |
| XSS escaping across admin JS | ✅ Done |
