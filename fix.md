# KPH Stay (kaghanstay) — Full Remediation Plan for AI Coding Agents

> Target agent: Antigravity (or any autonomous coding agent operating on this repo).
> Repo audited: `github.com/mubashirarham/kaghanstay` (public marketing site + `/admin` panel + `/user` panel + `netlify/functions` backend).
> This document is self-contained: every issue lists the exact root cause, the affected files, a concrete fix, and a verification step you can run yourself. Do not skip verification — a fix that is not verified is not done.

---

## 0. Agent Execution Protocol (READ THIS FIRST — this defines the loop)

You will work through the **Master Checklist** in Section 7, top to bottom, **one issue at a time**, in **priority order (P0 → P1 → P2 → P3)**. Do not batch unrelated fixes into one commit. Do not "improve" things that aren't on this list without flagging them separately at the end — stay scoped.

```
LOOP (repeat until Section 7 has zero rows that are not "✅ Verified"):

  1. SELECT the highest-priority row in Section 7 whose status is not "✅ Verified".
     - Priority order: P0 > P1 > P2 > P3. Within the same priority, go top-to-bottom.

  2. READ the full contents of every file listed in that issue's "Files" field
     BEFORE editing anything. Line numbers given in this document are
     approximate (captured at audit time) — always re-locate the exact code
     by content/function name, not by blindly trusting the line number.

  3. APPLY the fix exactly as described in that issue's "Fix" section.
     - If you find a strictly better fix that achieves the same security/
       functional guarantee, you may use it — but never ship something
       WEAKER than what is specified (especially for P0/P1 security items).
     - If the fix touches a shared file (firestore.rules, shared.js,
       _admin-init.js, netlify.toml), grep the whole repo first for every
       other place that depends on the thing you're changing, so you don't
       silently break a sibling feature.

  4. VERIFY using the exact steps/commands in that issue's "Verification"
     section. Re-run the "Quick Re-Scan Commands" in Section 8 relevant to
     that issue too.
     - If verification PASSES: mark the row "✅ Verified" in Section 7,
       commit with message `fix(<ID>): <one-line description>`, go to step 1.
     - If verification FAILS: re-read the fix, adjust, retry (max 3 attempts).
       If still failing after 3 attempts, mark the row "⚠️ Blocked" with a
       one-line note of what's failing, and move on — do not get stuck.

  5. Every time you complete 5 issues (or finish an entire priority tier,
     whichever comes first), STOP and run the FULL regression sweep in
     Section 6 (desktop + mobile viewport, across Main Site / Admin / User
     Panel) — not just the single-issue verification. This catches
     cross-file regressions that per-issue checks miss.

  6. When every row in Section 7 is "✅ Verified" or explicitly "⚠️ Blocked"
     with human follow-up noted, run the FULL regression sweep (Section 6)
     one final time end-to-end, then produce a short summary of what was
     fixed, what is blocked, and what (Section 9, "Not Fixed By Design")
     was intentionally left out of scope.

END LOOP
```

**Non-negotiable rules for this repo specifically:**
- Never weaken `firestore.rules`, `netlify.toml` CSP, or any `verifyIdToken`/`isAdmin` check to make a fix "easier." These are the actual security boundary of the app.
- Never remove a security check because it "seems redundant" without confirming (via grep across the whole repo) that nothing else relies on the gap you'd be opening.
- After any `firestore.rules` change, if the Firebase CLI is available, run `firebase deploy --only firestore:rules --project <project>` (or the emulator equivalent) — a rules file edited but not deployed fixes nothing.
- Treat `admin/index.html`, `assets/js/admin/*.js` as the **Admin Panel**, `user/*.html` + `assets/js/user/*.js` as the **User Panel**, and every other root-level `.html` file + `assets/js/{rooms,shared,newsletter,messaging,wishlist,search-widget,notifications,users}.js` as the **Main/Public Site**. `netlify/functions/*` and `netlify/edge-functions/*` are the **Backend**. Every issue below tags which surface(s) it touches.

---

## 1. Repository Map

| Path | Role |
|---|---|
| `index.html`, `rooms.html`, `room-details.html`, `booking.html`, `blog.html`, `contact.html`, `login.html`, `track.html`, `terms.html`, `privacy.html`, `refund.html`, `cookies.html`, `404.html` | **Main public site** |
| `admin/index.html` + `assets/js/admin/*.js` | **Admin Panel** (single-page app in one HTML file) |
| `user/*.html` + `assets/js/user/*.js` | **User Panel** (guest dashboard) |
| `assets/js/shared.js` | Shared Firebase init, `KaghanDB` data-access layer, `KaghanUI` helpers, `KaghanSafe` sanitization, auth/session/route-guard logic, chatbot widget — loaded on **every** page |
| `netlify/functions/*.js` | Serverless backend (Firebase Admin SDK) — bookings, admin actions, chatbot, newsletter, notifications |
| `netlify/edge-functions/*.js` | Edge middleware: IP rate limiter, SEO filter |
| `firestore.rules` | Firestore security rules — the actual authorization boundary for all direct client↔Firestore access |
| `netlify.toml` | Redirects, CSP/security headers, edge function bindings |
| `assets/css/style.css` | Global stylesheet, hand-written responsive overrides on top of Tailwind CDN |

---

## 2. Severity Legend

- **P0 — Critical security.** Exploitable today by any regular visitor/user. Fix before anything else.
- **P1 — High.** Serious functional breakage or a security gap that needs a specific precondition.
- **P2 — Medium.** UI/UX inconsistency, duplication, or a moderate hardening gap.
- **P3 — Low.** Polish, accessibility, maintainability.

---

## 3. P0 — Critical Security Issues

### SEC-01 — Any user can grant themselves Admin (privilege escalation)
**Surface:** Backend + Admin Panel + Main Site (auth) · **Files:** `firestore.rules`, `assets/js/shared.js` (`DB.updateUser`, `guardRoute`), `netlify/functions/admin-action.js`, `netlify/functions/reschedule-booking.js`

**Root cause:** `firestore.rules` has:
```
match /users/{uid} {
  allow update: if isOwner(uid) || isAdmin();
}
```
with **no restriction on which fields** can change. `isAdmin()` itself falls back to reading `role` from this exact same document. `DB.updateUser()` in `shared.js` only strips the `password` field before writing — `role` and `loyaltyPoints` pass straight through. So any authenticated user can run, from their own browser console:
```js
firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).update({role: 'admin'});
```
…and both the client route guard (`guardRoute`, backed by a localStorage session cache) **and** the server-side check in `admin-action.js`/`reschedule-booking.js`/`create-booking.js` (which fall back to reading this same Firestore field when there's no custom claim) will now treat them as a real administrator — full read/write on rooms, bookings, users, coupons, and the ability to create more admin accounts.

**Fix:**
1. In `firestore.rules`, lock the sensitive fields on the `users` collection:
```
match /users/{uid} {
  allow read: if isOwner(uid) || isAdmin();
  allow create: if isAuthenticated() && request.auth.uid == uid
                && (!('role' in request.resource.data) || request.resource.data.role == 'user');
  allow update: if isAdmin() || (
    isOwner(uid) &&
    (!('role' in request.resource.data) || request.resource.data.role == resource.data.role) &&
    (!('loyaltyPoints' in request.resource.data) || request.resource.data.loyaltyPoints == resource.data.loyaltyPoints)
  );
  allow delete: if isAdmin();
}
```
   This lets a user keep editing `name`/`phone`/etc. on their own doc, but any write that tries to change `role` or `loyaltyPoints` is rejected unless the request is already coming from an admin.
2. Defense-in-depth on the client: in `assets/js/shared.js`, update `DB.updateUser()` to also strip `role` and `loyaltyPoints` from `updatedData` unless the caller is an admin performing the update through the admin flow (which should go through `admin-action.js`'s `updateBookingDetails`/dedicated user-role action instead of the generic client `updateUser`, not direct Firestore writes).
3. Longer-term hardening (track as follow-up, not blocking): stop trusting the Firestore `role` field as a fallback in `admin-action.js`, `create-booking.js`, `reschedule-booking.js`, `track-booking.js`, and `chatbot.js`. Make Firebase custom claims (`decodedToken.role`) the single source of truth, set exclusively via `auth.setCustomUserClaims()` in `admin-action.js`'s `createUser` action (already done there) and a new admin-only "change role" action — never via a plain Firestore doc write.
4. Deploy the rules: `firebase deploy --only firestore:rules`.

**Verification:**
- With a non-admin test account signed in, attempt the console command above. Expect `FirebaseError: Missing or insufficient permissions`.
- Confirm a genuine admin (via `admin-action.js`'s `createUser`) can still be created and can still log into `/admin/`.
- Confirm a regular user can still successfully update their own name/phone from `user/profile.html`.

---

### SEC-02 — Clients can write directly to `bookings`, bypassing price calculation and availability checks
**Surface:** Backend + Main Site + User Panel · **Files:** `firestore.rules` (`bookings` match block)

**Root cause:**
```
match /bookings/{id} {
  allow create: if isAuthenticated();
  allow update: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());
}
```
allows **any** authenticated user to create or update a booking document directly through the Firestore client SDK — with no validation of price, dates, or status. The intended, safe path is `netlify/functions/create-booking.js`, which recalculates price server-side inside a transaction and checks for date overlaps. The Firestore rule bypasses all of that: a user can open devtools and do
```js
firebase.firestore().collection('bookings').add({userId: myUid, roomId: 'apt-studio-101', status: 'confirmed', totalPrice: 0, checkIn: '2026-08-01', checkOut: '2026-08-05'});
```
and get a free, fully "confirmed" reservation that the admin panel will display as legitimate.

**Fix:** All booking creation and mutation for non-admins must happen through the trusted serverless functions (which use the Admin SDK and are **not** subject to these rules at all). Tighten the rules to close the direct-write path:
```
match /bookings/{id} {
  allow read: if isAuthenticated() && (resource.data.userId == request.auth.uid || isAdmin());
  allow create: if false; // Only create-booking.js / chatbot.js (Admin SDK) may create bookings.
  allow update: if isAdmin() || (
    isAuthenticated() && resource.data.userId == request.auth.uid &&
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status']) &&
    request.resource.data.status == 'cancelled' &&
    resource.data.status == 'confirmed'
  );
  allow delete: if isAdmin();
}
```
This still allows a guest to self-cancel a confirmed booking (status flip only, nothing else), but blocks fabricating or tampering with price/dates/status in any other way.

**Verification:**
- As a non-admin, attempt the raw `.add()` call above from the console. Expect a permissions error.
- Confirm `booking.html`'s real checkout flow (which calls `create-booking.js`) still successfully creates a booking.
- Confirm a user can still cancel their own upcoming booking from `user/trips.html` (should now go through whatever UI action maps to the allowed `status → cancelled` update, or via `admin-action.js` if that's the actual cancel path — check `assets/js/user/bookings.js` for the current cancel handler and make sure it satisfies the new rule).

---

### SEC-03 — Booking IDs are a 9,000-value random space with no collision check → silent overwrite + trivial enumeration
**Surface:** Backend (Main Site + User Panel + Admin Panel booking flows) · **Files:** `netlify/functions/create-booking.js` (~line 96), `netlify/functions/chatbot.js` (`bookRoomTool`, ~line 77)

**Root cause:** Both functions generate booking IDs the same fragile way:
```js
const bookingId = 'BK-' + Math.floor(1000 + Math.random() * 9000);
```
That's only **9,000 possible IDs total**, generated with no existence check before `transaction.set()`/`.set()` — which **overwrites** any existing document at that path. By the birthday paradox, once the platform has done a few hundred bookings, there is a substantial and rising chance a new booking silently overwrites and destroys an older confirmed booking's guest/date/price data. Separately, the tiny ID space makes every booking trivially guessable (see SEC-04).

**Fix:**
1. Create one shared ID generator in `netlify/functions/_admin-init.js` and export it:
```js
const crypto = require('crypto');
function generateBookingId() {
  return 'BK-' + crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 hex chars, ~1.1 x 10^12 combinations
}
module.exports = { /* ...existing exports..., */ generateBookingId };
```
2. In both `create-booking.js` and `chatbot.js`, replace the inline `Math.random()` line with a call to `generateBookingId()`, generated **inside** the transaction, and add a collision guard before writing:
```js
let bookingId = generateBookingId();
let attempts = 0;
let existing = await transaction.get(fdb.collection('bookings').doc(bookingId));
while (existing.exists && attempts < 5) {
  bookingId = generateBookingId();
  existing = await transaction.get(fdb.collection('bookings').doc(bookingId));
  attempts++;
}
if (existing.exists) {
  throw new Error('Could not allocate a unique booking ID, please retry.');
}
```
3. This also removes the duplicated ID-generation logic (see DUP-02) — both functions now call the same helper, so they can never drift apart again.

**Verification:**
- Write a throwaway Node script that calls `generateBookingId()` 200,000 times and confirms zero collisions.
- Create two bookings back-to-back through the real booking flow and confirm they get different, non-sequential-looking IDs.
- Confirm `track.html` (booking tracking) still works with the new ID format.

---

### SEC-04 — `track-booking.js` lets anyone enumerate every booking's guest name, dates, and price (IDOR)
**Surface:** Backend + Main Site (`track.html`) · **Files:** `netlify/functions/track-booking.js`, `track.html`

**Root cause:** The endpoint accepts only `{ bookingId }`, with **no second factor**, and returns guest name (partially obscured), room, dates, price, and status for whatever ID is supplied. Combined with SEC-03's tiny/guessable ID space (pre-fix: only 9,000 combinations), the only obstacle is the generic edge rate limiter (20 req/min/IP) — trivially defeated by distributing requests across IPs, or just tolerated (≈7.5 hours from a single IP to sweep every possible ID pre-fix).

**Fix:**
1. Update the request schema in `track-booking.js` to require a second identifying factor:
```js
const RequestSchema = z.object({
  bookingId: z.string().min(1),
  contact: z.string().min(3) // guest email OR phone, matched below
});
```
2. After loading `bookingData`, verify the contact matches before returning anything:
```js
const providedContact = contact.trim().toLowerCase();
const emailMatch = (bookingData.guestEmail || '').toLowerCase() === providedContact;
const phoneMatch = (bookingData.guestPhone || '').replace(/\D/g, '') === providedContact.replace(/\D/g, '');
if (!emailMatch && !phoneMatch) {
  return { statusCode: 404, headers: {...}, body: JSON.stringify({ error: 'Reservation not found. Please verify the ID and contact details.' }) };
}
```
Use the **same generic error** whether the ID doesn't exist or the contact doesn't match, so the response never confirms/denies that a given ID exists.
3. Update `track.html` to add an email/phone input alongside the booking ID input, and send both fields in the request.

**Verification:**
- Track a real booking with the correct ID but a wrong email → expect the generic 404, not the booking data.
- Track it with the correct ID and correct email/phone → expect success.
- Confirm this is layered on top of the SEC-03 fix (larger ID space) — both must ship together.

---

### SEC-05 — `setup-db.js` fails open if `SETUP_SECRET` isn't configured
**Surface:** Backend · **Files:** `netlify/functions/setup-db.js` (~line 120-124)

**Root cause:**
```js
const secret = event.queryStringParameters ? event.queryStringParameters.secret : null;
if (process.env.SETUP_SECRET && secret !== process.env.SETUP_SECRET) {
  return { statusCode: 403, body: 'Forbidden: Invalid setup secret.' };
}
```
If the `SETUP_SECRET` environment variable was never set in the Netlify deploy (easy to forget, and there's no startup check forcing it), this whole database-seeding endpoint becomes **unauthenticated and publicly callable**.

**Fix:** Fail closed instead of open:
```js
if (!process.env.SETUP_SECRET || secret !== process.env.SETUP_SECRET) {
  return { statusCode: 403, body: 'Forbidden: Invalid or missing setup secret.' };
}
```
Additionally, since this endpoint has no legitimate reason to be reachable in a live production deployment after initial launch, gate the entire handler behind an explicit opt-in flag and default to disabled:
```js
if (process.env.ENABLE_SETUP_ENDPOINT !== 'true') {
  return { statusCode: 404, body: 'Not Found' };
}
```
placed as the very first check in the handler, before the secret check.

**Verification:** Call `/.netlify/functions/setup-db` with no `secret` query param, in an environment where `SETUP_SECRET`/`ENABLE_SETUP_ENDPOINT` are unset. Expect `404` (or `403`), never `200`.

---

## 4. P1 — High Severity Issues

### SEC-06 — Coupons collection is fully publicly readable
**Surface:** Backend + Main Site (`booking.html`) · **Files:** `firestore.rules` (`coupons` match block), booking coupon-apply logic in `assets/js` referenced from `booking.html`

**Root cause:** `match /coupons/{id} { allow read: if true; }` exposes every coupon's code, discount %, and active flag to anyone who opens devtools — including inactive/future promo codes never announced publicly.

**Fix:**
1. Add a new server function `netlify/functions/validate-coupon.js`: accepts `{ code }`, queries `coupons` where `code == code.toUpperCase() && isActive == true` via the Admin SDK, and returns only `{ valid: true, discountPercentage }` or `{ valid: false }` — never the full collection.
2. Update the coupon-apply handler used by `booking.html` (find it via `grep -n "coupon-code-input\|applyCoupon" assets/js/*.js`) to call this new function instead of reading the cached/synced `coupons` collection.
3. Lock the rule down: `match /coupons/{id} { allow read, write: if isAdmin(); }`.

**Verification:** Confirm the network tab shows no more Firestore reads on `/coupons` from a logged-out/non-admin session; confirm applying `WELCOME10` (or whatever active code exists) at checkout still discounts the total via the new function; confirm an inactive/made-up code shows an error and cannot be discovered by brute force faster than the coupon's own value would justify (rate-limited like every other function).

---

### SEC-07 / FUNC-01 — Newsletter signups go to the wrong collection and silently vanish
**Surface:** Backend + Main Site + Admin Panel · **Files:** `assets/js/shared.js` (`subscribeNewsletter`, `deleteNewsletterSubscriber`), `assets/js/newsletter.js`, `netlify/functions/subscribe-newsletter.js`, `assets/js/admin/dashboard.js`, `netlify/functions/send-newsletter.js`, `netlify/functions/admin-action.js` (`deleteNewsletterSubscriber` action), `firestore.rules`

**Root cause:** The public footer widget (`assets/js/newsletter.js`) calls `KaghanDB.subscribeNewsletter(email)`, which writes directly to a Firestore collection called **`subscribers`**. Every other part of the system — the admin dashboard's subscriber count/list (`admin/dashboard.js`), the real-time listener in `shared.js`, `admin-action.js`'s delete-subscriber action, and the actual email-sending function `send-newsletter.js` — all read from a **different** collection called **`newsletter`**. The purpose-built `netlify/functions/subscribe-newsletter.js` (which has proper validation and benefits from the edge rate limiter) is never called by any front-end code — it's dead code. Net effect: every newsletter signup on the live site silently disappears from the admin's perspective and never receives a newsletter email, while bypassing all server-side validation/rate-limiting (since it's a direct, unauthenticated Firestore client write).

**Fix:**
1. Standardize on the **`newsletter`** collection (used in 4 of the 6 places already).
2. Rewrite `assets/js/newsletter.js`'s submit handler to call the serverless function instead of the client DB helper:
```js
const res = await fetch(getApiUrl('/.netlify/functions/subscribe-newsletter'), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email })
});
if (!res.ok) throw new Error((await res.json()).error || 'Subscription failed.');
```
3. Delete `DB.subscribeNewsletter` / `DB.deleteNewsletterSubscriber` from `shared.js` (confirmed via repo-wide grep that nothing else calls them), or repoint them to `newsletter` purely as a safety net if you're not confident about removing them yet.
4. In `firestore.rules`, remove the now-unused public `subscribers` match block. If direct client creation of subscriber docs must remain possible for some other reason, repoint it to `newsletter` with `allow create: if false` (force everything through the Admin-SDK function), otherwise delete the block outright.

**Verification:** Submit the footer newsletter form on a live/staging deploy. Confirm a new document appears in `newsletter` (not `subscribers`). Confirm it shows up in the admin dashboard's subscriber count and in the recipient list the next time `send-newsletter.js` runs (dry-run/log check is fine, don't actually spam real inboxes during testing).

---

### FUNC-02 — DOMPurify only loaded on the Admin Panel; every public page's "sanitized" HTML silently degrades to escaped text
**Surface:** Main Site + User Panel (every page) · **Files:** every public/user HTML `<head>` (see list below), `assets/js/shared.js` (`KaghanSafe.sanitizeHTML`)

**Root cause:** `KaghanSafe.sanitizeHTML()` in `shared.js` is written to use `DOMPurify.sanitize()` when available and fall back to plain `escapeHTML()` otherwise. The `<script>` tag for DOMPurify is present **only** in `admin/index.html`. But `sanitizeHTML` is used by:
- `assets/js/rooms.js` (room descriptions on `rooms.html` and `room-details.html`) — rich text saved via the admin's editor renders as **raw escaped tags** on the public site instead of formatted HTML.
- `assets/js/shared.js`'s chatbot bubble renderer (`appendMessage`/`appendMessageSilent`) — loaded on **every page** via the floating chat widget. It does `msg.replace(/\n/g, '<br>')` and then sanitizes; without DOMPurify, the escape fallback also escapes the `<br>` it just inserted, so multi-line chatbot messages show the literal text `&lt;br&gt;` instead of a line break, on every page except `/admin/`.

**Fix:** Add the same DOMPurify `<script>` tag used in `admin/index.html` (e.g. `<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js"></script>`) to the `<head>` of every public/user page, placed before `assets/js/shared.js` loads. Add it to: `index.html`, `rooms.html`, `room-details.html`, `booking.html`, `blog.html`, `contact.html`, `login.html`, `track.html`, `terms.html`, `privacy.html`, `refund.html`, `cookies.html`, `404.html`, and every file under `user/`. Also add it to `netlify.toml`'s CSP `script-src`/`style-src` if the exact CDN host isn't already covered (check — `cdnjs.cloudflare.com` already appears to be allowlisted, so this should be a pure addition, no CSP change needed — verify).

**Verification:** On a public page (e.g. `index.html`, not `/admin/`), open the chat widget and send a message with a line break; confirm it renders as an actual line break, not literal `<br>` text. Edit a room description in the admin's rich text editor with bold text or a bullet list, save, then view that room on `rooms.html`/`room-details.html` and confirm formatting renders instead of visible tags.

---

## 5. P2 — Medium Priority Issues

### SEC-08 — TinyMCE cloud API key hardcoded/exposed in `admin/index.html`
**Surface:** Admin Panel · **Files:** `admin/index.html` (`<script src="https://cdn.tiny.cloud/1/<KEY>/tinymce/7/tinymce.min.js">`)
**Fix:** Either (a) confirm in the TinyMCE Cloud dashboard that this key is domain-restricted to only `kphstay.com` (and localhost for dev) so exposure is low-risk-by-design, and add a code comment saying so; or (b) switch to the self-hosted TinyMCE "Community" bundle (no cloud key, no CDN dependency at all — this also removes one more moving part from the CSP/CDN fragility already tracked in `update.md`).
**Verification:** Confirm rich-text editing still works on the admin's Inventory/Blogs screens after whichever option is chosen; if switching to self-hosted, confirm zero requests to `cdn.tiny.cloud` in the network tab.

### SEC-09 — CSP still allows `'unsafe-inline'` and `'unsafe-eval'`
**Surface:** All three surfaces · **Files:** `netlify.toml`
**Fix (incremental — do not attempt in one pass):**
1. First, try removing just `'unsafe-eval'` from `script-src` and reload every page (admin, main, user) with devtools console open. Modern builds of TinyMCE/ApexCharts/FullCalendar/Leaflet typically don't need `eval`. If nothing breaks, ship this alone as a quick win.
2. Track removing `'unsafe-inline'` as a separate, larger follow-up: it requires converting every `onclick="Module.method(...)"` inline handler (there are many, especially in `admin/index.html`) to `addEventListener` + `data-*` attributes, plus adding nonces/hashes for any remaining inline `<style>`/`<script>` blocks. Do not attempt this in the same pass as everything else in this document — flag it in Section 9 as a tracked follow-up unless explicitly asked to do the full refactor.
**Verification:** After removing `unsafe-eval` only, load every page in all three surfaces and confirm zero new CSP violation errors in the console.

### SEC-10 — Inconsistent output escaping: `cat.image` not escaped like every sibling value
**Surface:** Main Site · **Files:** `assets/js/rooms.js` (category image render, ~line 191)
**Fix:** Change
```js
`<img src="${cat.image}" class="...">`
```
to
```js
`<img src="${KaghanSafe.escapeHTML(cat.image)}" class="...">`
```
to match every other dynamic `src`/text interpolation in the same file.
**Verification:** `grep -n '<img src="\${' assets/js/rooms.js` — confirm every match now wraps its variable in `KaghanSafe.escapeHTML(...)`.

### FUNC-03 — Newsletter widget breaks silently if the footer heading text ever changes
**Surface:** Main Site · **Files:** `assets/js/newsletter.js`
**Root cause:** `setupNewsletter()` finds the newsletter form by scanning every `<h4>` in the footer and string-matching `.textContent.trim().toLowerCase() === 'newsletter'`. If that heading is ever reworded, translated, or restyled into a different tag, the click handler is never attached and the button silently does nothing (no console error).
**Fix:** Add a stable hook to the footer markup on every page instead of relying on text content — e.g. wrap the newsletter form container with `data-newsletter-form` — then update the JS:
```js
document.querySelectorAll('[data-newsletter-form]').forEach(container => { /* existing logic, using container directly instead of newsletterContainer */ });
```
Find every page's footer with `grep -rl "Newsletter</h4>" .` and add the attribute to each.
**Verification:** Temporarily rename the heading text in a local test copy; confirm the signup form still works via the new attribute-based selector (proves independence from the text content).

### FUNC-04 — Dead stub file `assets/js/admin/housekeeping.js`
**Surface:** Admin Panel · **Files:** `assets/js/admin/housekeeping.js` (1 line: `// Reverted housekeeping module. This file is no longer active.`), confirmed unreferenced anywhere in `admin/index.html`.
**Fix:** Delete the file. If a real Housekeeping module was actually intended to ship, that's a product decision to confirm with the repo owner first — don't silently rebuild a feature that was deliberately reverted.
**Verification:** `grep -r "housekeeping" admin/ assets/js/` returns nothing after deletion.

### FUNC-05 — Unused `framer-motion` dependency
**Surface:** Backend/build · **Files:** `package.json`, `package-lock.json`
**Root cause:** `framer-motion` (a React animation library) is listed as a dependency but this is a plain HTML/JS site with no React and no import of it anywhere.
**Fix:** `npm uninstall framer-motion`.
**Verification:** `grep -r "framer-motion" --include="*.js" --include="*.html" .` returns nothing; `npm ls framer-motion` reports it's not installed; Netlify build still succeeds.

### FUNC-06 / DUP-02b — Inconsistent admin-check logic across serverless functions
**Surface:** Backend · **Files:** `netlify/functions/_admin-init.js`, `admin-action.js`, `create-booking.js`, `reschedule-booking.js`, `track-booking.js`, `chatbot.js`
**Root cause:** `admin-action.js` resolves admin status as "custom claim OR Firestore doc fallback," but `reschedule-booking.js` only checks the custom claim (`decodedToken.role === 'admin'`). An admin whose custom claim hasn't been (re-)issued would be silently denied admin behavior specifically in the reschedule flow, while being treated correctly everywhere else.
**Fix:** Add one shared helper to `_admin-init.js`:
```js
async function resolveIsAdmin(decodedToken, fdb) {
  if (decodedToken.role === 'admin') return true;
  const doc = await fdb.collection('users').doc(decodedToken.uid).get();
  return doc.exists && doc.data().role === 'admin';
}
module.exports = { /* ...existing..., */ resolveIsAdmin };
```
Replace every duplicated inline version of this check (in `admin-action.js`, `create-booking.js`, `reschedule-booking.js`, `track-booking.js`, `chatbot.js`) with a call to this one helper. This also resolves the duplicate-logic concern raised in DUP-02.
**Verification:** `grep -n "role === 'admin'" netlify/functions/*.js` — confirm each remaining occurrence is either inside `_admin-init.js` itself or is comparing the *result* of `resolveIsAdmin(...)`, not reimplementing the fallback.

### DUP-01 — Booking status badge/color logic duplicated across admin and user panels
**Surface:** Admin Panel + User Panel · **Files:** `assets/js/admin/bookings.js`, `assets/js/user/bookings.js`
**Fix:** Add one helper to `shared.js`:
```js
window.KaghanUI = window.KaghanUI || {};
KaghanUI.getStatusBadge = function(status) {
  const map = {
    confirmed: { label: 'Confirmed', classes: 'text-emerald-600 border-emerald-200 bg-emerald-50/20' },
    completed: { label: 'Completed', classes: 'text-blue-600 border-blue-200 bg-blue-50/20' },
    cancelled: { label: 'Cancelled', classes: 'text-rose-600 border-rose-200 bg-rose-50/20' }
  };
  return map[status] || { label: status, classes: 'text-slate-600 border-slate-200 bg-slate-50/20' };
};
```
Refactor both `admin/bookings.js` and `user/bookings.js` to call `KaghanUI.getStatusBadge(booking.status)` instead of re-deriving colors inline.
**Verification:** Change one color in the new shared helper only; confirm both the admin bookings table and the user trips page reflect the updated color (proves single source of truth).

---

## 6. UI/UX & Mobile Issues (Desktop + Mobile, All Surfaces)

### UX-01 — Inconsistent phone input type breaks mobile keyboard on User Panel
**Surface:** User Panel (mobile) · **Files:** `user/profile.html`
**Root cause:** `booking.html` and `login.html` correctly use `<input type="tel" ... maxlength="12">` for phone numbers, but `user/profile.html`'s equivalent field uses `<input type="text" id="profile-phone" ...>` — on mobile this brings up the full QWERTY keyboard instead of the numeric/phone keypad, inconsistent with the rest of the app.
**Fix:** Change to `<input type="tel" id="profile-phone" maxlength="12" inputmode="tel" ...>` to exactly match the pattern used in `booking.html`/`login.html`.
**Verification:** On a mobile device/emulator, focus the profile phone field and confirm the numeric/phone keypad appears.

### UX-02 — Missing `alt` text on dynamically rendered room-card images
**Surface:** Main Site + Admin Panel + User Panel · **Files:** `assets/js/rooms.js` (2 occurrences), `assets/js/admin/inventory.js`, `assets/js/user/dashboard.js`
**Root cause:** Room-card `<img>` tags generated in these files have no `alt` attribute — screen readers announce nothing, and it's a missed image-SEO opportunity on the public site.
**Fix:** Add contextual alt text to every dynamically generated room-card image, e.g.:
```js
`<img src="${KaghanSafe.escapeHTML(room.image)}" alt="${KaghanSafe.escapeHTML(room.name || 'Room photo')}" class="...">`
```
Apply the equivalent pattern in each of the 4 locations identified.
**Verification:** Run an accessibility scan (axe DevTools or Lighthouse) on `rooms.html`, `room-details.html`, the admin Inventory screen, and `user/index.html` before and after; confirm the "images must have alt text" violation count on these views drops to 0.

### UX-03 — A handful of static `<img>` tags also missing `alt`
**Surface:** Main Site · **Files:** one each in `index.html`, `booking.html`, `room-details.html`
**Fix:** `grep -o '<img[^>]*>' <file> | grep -v 'alt='` to locate each, then add a descriptive `alt`.
**Verification:** Re-run the same grep; expect zero matches.

### UX-04 — Conflicting `767px`/`768px` breakpoints cause inconsistent styling at exactly 768px width (e.g., iPad portrait)
**Surface:** All three surfaces (mobile/tablet) · **Files:** `assets/css/style.css` (25 `@media` blocks; note the two directly conflicting ones — one uses `max-width:767px` for the admin bottom-nav toggle, another uses `max-width:768px` for responsive typography, just a few lines apart)
**Fix:** Pick one canonical value for "below desktop" across the entire file — recommended: `max-width: 767px` (matches Tailwind's own `md` breakpoint semantics, since Tailwind's `md:` prefix activates at `768px` and up). Then find-and-replace every `@media (max-width:768px)` / `@media (max-width: 768px)` in `style.css` to `767px`, so a device at exactly 768px consistently falls into the "desktop" bucket everywhere, with no split.
**Verification:** `grep -n "max-width:767\|max-width: 767\|max-width:768\|max-width: 768" assets/css/style.css` — confirm only one of the two numeric values remains anywhere in the file. Test the site at an exact 768px viewport width in devtools and confirm no visually half-broken section (e.g., type sizing correct for desktop while a sibling nav element is still in mobile mode, or vice versa).

### UX-05 — Heavy `!important` overrides targeting Tailwind's own utility class names are fragile against the planned CDN→self-hosted migration
**Surface:** All three surfaces · **Files:** `assets/css/style.css` (111 `!important` occurrences total, several directly overriding `.py-24`, `.py-32`, `.pt-32`, `.pb-20`, `.py-16` by name for mobile spacing)
**Root cause:** This project's own `update.md` already documents a plan to stop loading Tailwind from the CDN and self-host a compiled build instead. When that happens, any Tailwind utility class not actually used in the HTML gets purged from the compiled CSS, and any renamed/restructured internal class would silently stop matching these override selectors — mobile padding would regress with no build error and no console warning.
**Fix (do now, low-risk):** Convert these specific overrides to semantic custom classes applied directly on the elements instead of hijacking Tailwind's class names, e.g. replace `.py-24{...!important}` with a `.section-padding-lg{...}` class added to the actual `<section>` elements that need it, removing the dependency on Tailwind's naming entirely.
**Verification:** After the change, confirm visually (at mobile widths) that section spacing is unchanged from before. Add a note to this repo's own `update.md`/`progress.md` that this specific fragility is now resolved, so it isn't re-flagged as a blocker during the future Tailwind self-hosting migration.

### UX-06 — `login.html` has one more `<input>` than `<label>`
**Surface:** Main Site · **Files:** `login.html`
**Fix:** `grep -n "<label\|<input" login.html` to line up every input's `id` against a corresponding `<label for="...">`; identify the one missing and add a proper label (use a visually-hidden `.sr-only` label if the design intentionally relies on a placeholder).
**Verification:** Run axe DevTools on `login.html`; confirm the "form elements must have labels" violation is resolved.

### MOB-01 — Admin Panel data tables need explicit mobile-viewport verification
**Surface:** Admin Panel (mobile, 375–414px widths) · **Files:** `admin/index.html`, `assets/js/admin/{bookings,guests,inventory,messaging,settings}.js`, `assets/css/style.css` (`#admin-bottom-nav`)
**Why this needs agent action, not just a grep:** Wide data-table-style layouts are a common source of horizontal-scroll/clipping bugs on narrow phones, and this can't be fully confirmed by reading source — it needs a rendered viewport check.
**Fix steps:**
1. Render `admin/index.html` at a 375px-wide viewport (devtools device emulation or an actual test harness) for each of: Bookings, Guests, Inventory, Messaging, Settings.
2. For any table/grid wider than the viewport, wrap it in a horizontally-scrollable container (`overflow-x-auto` on a wrapper div) if it isn't already, or add a card-based responsive layout for screens below `767px` (matching the now-standardized breakpoint from UX-04).
3. Confirm the fixed `#admin-bottom-nav` (visible under 767px) never visually overlaps the last row/button of any scrollable list — the main content container needs `padding-bottom` reserved equal to the nav's rendered height plus `env(safe-area-inset-bottom)`.
**Verification:** At 375px and 390px widths, confirm the page **body** never scrolls horizontally (only deliberately-scrollable table wrappers may), and the bottom nav never covers interactive content.

### MOB-02 — User Panel needs the same mobile-viewport verification
**Surface:** User Panel (mobile) · **Files:** `user/index.html`, `user/trips.html`, `user/wishlists.html`, `user/notifications.html`, `user/support.html`, `user/profile.html`
**Fix/Verification:** Apply the identical protocol from MOB-01 to each `/user/*.html` page — check booking cards, trip timelines, and forms for horizontal overflow, and confirm every tappable control (buttons, icons, nav items) has a touch target of at least ~44×44px at mobile widths.

---

## 7. Master Checklist (agent updates this table as it works)

| ID | Title | Priority | Surface | Status |
|---|---|---|---|---|
| SEC-01 | Privilege escalation via unrestricted `role` field | P0 | Backend/Admin/Main | ✅ Verified |
| SEC-02 | Direct client writes to `bookings` bypass price/availability checks | P0 | Backend/Main/User | ✅ Verified |
| SEC-03 | Booking ID collision + tiny ID space | P0 | Backend | ✅ Verified |
| SEC-04 | `track-booking.js` IDOR / enumeration | P0 | Backend/Main | ✅ Verified |
| SEC-05 | `setup-db.js` fails open without `SETUP_SECRET` | P0 | Backend | ✅ Verified |
| SEC-06 | Coupons collection publicly readable | P1 | Backend/Main | ✅ Verified |
| SEC-07/FUNC-01 | Newsletter collection mismatch (`subscribers` vs `newsletter`) | P1 | Backend/Main/Admin | ✅ Verified |
| FUNC-02 | DOMPurify missing on public pages breaks rich text + chatbot line breaks | P1 | Main/User | ✅ Verified |
| SEC-08 | TinyMCE API key hardcoded/exposed | P2 | Admin | ✅ Verified |
| SEC-09 | CSP allows `unsafe-eval`/`unsafe-inline` | P2 | All | ✅ Verified |
| SEC-10 | `cat.image` not escaped (inconsistent with sibling code) | P2 | Main | ✅ Verified |
| FUNC-03 | Newsletter widget DOM lookup is text-content-fragile | P2 | Main | ✅ Verified |
| FUNC-04 | Dead stub `housekeeping.js` | P2 | Admin | ✅ Verified |
| FUNC-05 | Unused `framer-motion` dependency | P2 | Build | ✅ Verified |
| FUNC-06/DUP-02b | Inconsistent admin-check logic across functions | P2 | Backend | ✅ Verified |
| DUP-01 | Duplicated status-badge color logic | P2 | Admin/User | ✅ Verified |
| UX-01 | `profile.html` phone field wrong input type | P2 | User (mobile) | ✅ Verified |
| UX-02 | Missing `alt` on dynamic room-card images | P2 | Main/Admin/User | ✅ Verified |
| UX-03 | Missing `alt` on a few static images | P3 | Main | ✅ Verified |
| UX-04 | Conflicting 767/768px breakpoints | P2 | All (mobile) | ✅ Verified |
| UX-05 | Fragile `!important` overrides on Tailwind class names | P3 | All | ✅ Verified |
| UX-06 | `login.html` missing one label | P3 | Main | ✅ Verified |
| MOB-01 | Admin Panel mobile table/viewport verification | P2 | Admin (mobile) | ✅ Verified |
| MOB-02 | User Panel mobile viewport verification | P2 | User (mobile) | ✅ Verified |

Status values to use: `☐ Not Started` → `🔧 In Progress` → `✅ Verified`, or `⚠️ Blocked (<reason>)` if stuck after 3 fix attempts.

---

## 8. Quick Re-Scan Commands (run before AND after each fix)

```bash
# SEC-01: confirm no direct client path can set role/loyaltyPoints unchecked
grep -n "collection('users')" assets/js/*.js assets/js/*/*.js

# SEC-02: confirm no direct client writes to bookings remain unguarded
grep -n "collection('bookings')" assets/js/*.js assets/js/*/*.js

# SEC-03/DUP-02: confirm both booking-creation paths use one shared ID generator
grep -rn "Math.random() \* 9000\|generateBookingId" netlify/functions/*.js

# SEC-06: confirm no client-side reads of the full coupons collection remain
grep -rn "collection('coupons')" assets/js/*.js assets/js/*/*.js

# SEC-07/FUNC-01: confirm only ONE collection name is used for newsletter data
grep -rn "collection('newsletter')\|collection('subscribers')" --include="*.js" .

# FUNC-02: confirm DOMPurify is now loaded everywhere sanitizeHTML is used
grep -rl "sanitizeHTML" assets/js/*.js assets/js/*/*.js
grep -rl "DOMPurify" *.html user/*.html admin/*.html

# FUNC-04/FUNC-05: confirm dead code/deps removed
grep -r "housekeeping" admin/ assets/js/
grep -r "framer-motion" --include="*.js" --include="*.html" .

# FUNC-06: confirm admin-check logic isn't duplicated inline anymore
grep -n "role === 'admin'" netlify/functions/*.js

# UX-04: confirm only one canonical mobile breakpoint value remains
grep -n "max-width:767\|max-width: 767\|max-width:768\|max-width: 768" assets/css/style.css

# General duplicate-ID sanity check (should always return nothing — keep it that way)
for f in $(find . -name "*.html" -not -path "./node_modules/*"); do
  dups=$(grep -o 'id="[^"]*"' "$f" 2>/dev/null | sort | uniq -c | awk '$1>1');
  if [ -n "$dups" ]; then echo "=== $f ==="; echo "$dups"; fi;
done
```

---

## 9. Not Fixed By Design / Explicitly Out of Scope for This Pass

Track anything you deliberately deferred here, with a one-line reason, so it isn't silently lost:
- Full removal of CSP `'unsafe-inline'` (SEC-09 part 2) — requires refactoring every inline `onclick="..."` handler in `admin/index.html`; too large to bundle with this pass, tracked as a standalone follow-up.
- Migrating Tailwind off the CDN entirely (already tracked separately in this repo's own `update.md`) — UX-05 makes the current CSS resilient to that migration but does not perform the migration itself.
- Any change to Firebase Auth custom-claims-only role model (SEC-01 step 3) beyond the immediate rules fix — noted as a longer-term hardening recommendation, not required for SEC-01 to be considered resolved.

---

## 10. Full Regression Sweep (run per Section 0, step 5 and step 6)

For **each** of Main Site, Admin Panel, and User Panel, at both a desktop width (≥1280px) and a mobile width (375–414px):
1. Load the primary page(s) for that surface with the browser console open — zero new console errors vs. before your changes.
2. Log in as a **regular user** and confirm: booking creation/cancellation, profile edit, wishlist, chat widget, newsletter signup all still work end-to-end.
3. Log in as an **admin** and confirm: room/category/coupon CRUD, booking status changes, messaging, blog CRUD, newsletter subscriber list, and user creation still work end-to-end.
4. Re-run every command in Section 8.
5. Spot-check the specific fixes from the last 5 issues you completed by re-doing their individual "Verification" steps once more, now in the context of the full app rather than in isolation.
