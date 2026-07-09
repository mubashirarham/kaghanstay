# Security & Quality Audit — `mubashirarham/kaghanstay`

**Target:** https://github.com/mubashirarham/kaghanstay
**Commit audited:** `90cbfd5` (main, 24 commits, full history reviewed)
**Stack:** Static HTML/JS/CSS front-end + Firebase Firestore (client SDK & REST) + Netlify Functions (Node) + Netlify Edge Functions (Deno) + Groq LLM concierge
**Audit date:** 2026-07-09
**Method:** Full clone, static review of every function/edge function, client bundle (`shared.js`), auth flow, booking flow, and complete git-history secret scan.

---

## 1. Executive summary

The application is a hotel-booking platform whose entire trust model runs in the browser. Authentication, authorization, pricing, and database writes are all performed client-side against a Firestore database that — based on the code paths that read and write it without any credential — is almost certainly configured with **open (public read/write) security rules**. Several Netlify Functions act as **unauthenticated email relays**, one of which will broadcast attacker-supplied HTML to every subscriber.

The single most damaging finding is that **the admin password is hard-coded in a publicly served JavaScript file** and users' passwords are stored and compared in **plaintext**. Anyone who opens DevTools can read the admin password or simply forge an admin session in `localStorage`.

**Findings: 5 Critical, 4 High, 5 Medium, 7 Low/functional.**

> **Root cause (fix this first):** two systemic design flaws produce most findings below —
> **(A)** Firestore security rules are not restricting access, and **(B)** all sensitive logic is client-side and therefore attacker-controlled. Fixing A and B collapses the majority of the Critical/High findings.

### Severity index

| ID | Severity | Title | Primary file(s) |
|----|----------|-------|-----------------|
| C-01 | 🔴 Critical | Open Firestore security rules (world read/write) | `assets/js/shared.js`, all `netlify/functions/*` |
| C-02 | 🔴 Critical | Hard-coded admin password + plaintext passwords in public JS | `assets/js/shared.js:177,269-277` |
| C-03 | 🔴 Critical | Client-side-only auth → trivial admin bypass | `assets/js/shared.js:724-790` |
| C-04 | 🔴 Critical | Unauthenticated mass-email / open relay | `netlify/functions/send-newsletter.js`, `admin-notify.js`, `booking-email.js`, `customer-reminders.js` |
| C-05 | 🔴 Critical | Unauthenticated booking creation & price tampering | `booking.html:1304`, `assets/js/shared.js:558`, `netlify/functions/chatbot.js:169` |
| H-01 | 🟠 High | Stored XSS via world-writable DB rendered with `innerHTML` | `assets/js/admin/*.js`, `netlify/functions/prerender.js` |
| H-02 | 🟠 High | Open CORS + LLM cost-abuse on chatbot | `netlify/functions/chatbot.js:394,230` |
| H-03 | 🟠 High | Rate limiter is per-instance in-memory & only on one route | `netlify/edge-functions/rate-limiter.js`, `netlify.toml` |
| H-04 | 🟠 High | Sensitive data / PII (incl. passwords) publicly readable | `assets/js/shared.js`, `netlify/functions/*` |
| M-01 | 🟡 Medium | Verbose error leakage to clients | all `netlify/functions/*` |
| M-02 | 🟡 Medium | Toothless Content-Security-Policy | `netlify.toml` |
| M-03 | 🟡 Medium | No input validation / email-flood vector | `netlify/functions/customer-reminders.js`, others |
| M-04 | 🟡 Medium | TOCTOU double-booking race | `netlify/functions/chatbot.js:135-169` |
| M-05 | 🟡 Medium | Hard-coded fallback-secret pattern | `netlify/functions/chatbot.js:5,230` |
| L-01 | ⚪ Low | Dead `localhost:3000` WhatsApp call in production | `netlify/functions/chatbot.js:183` |
| L-02 | ⚪ Low | `totalPrice.toLocaleString()` crashes on string input | `netlify/functions/booking-email.js` |
| L-03 | ⚪ Low | Inconsistent branding (Kaghan Stay / KPH / kphstay.com) | repo-wide |
| L-04 | ⚪ Low | Hard-coded recipient/phone constants | `netlify/functions/admin-notify.js` |
| L-05 | ⚪ Low | Unguarded `enablePersistence()` | `assets/js/shared.js:23` |
| L-06 | ⚪ Low | User-agent cloaking risks SEO penalty | `netlify/edge-functions/seo-filter.js` |
| L-07 | ⚪ Low | Redundant redirect rules | `netlify.toml` |

---

## 2. Critical findings

### C-01 — Open Firestore security rules (world read/write)

**Where:** `assets/js/shared.js` (client writes), and every REST caller: `netlify/functions/chatbot.js:71,85,169`, `send-newsletter.js`, `sitemap.js`, `prerender.js`.

**Evidence:** The Netlify Functions read *and write* Firestore through the plain REST endpoint with **no `Authorization` header**:

```js
// netlify/functions/chatbot.js
const res = await fetch(`${FIRESTORE_BASE_URL}/${collectionName}`);          // read, no auth
await fetch(`${FIRESTORE_BASE_URL}/${collectionName}/${docId}`, {            // write, no auth
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: ...
});
```

For these calls to succeed in production, the rules must allow anonymous access. The browser SDK likewise performs unauthenticated `.set()/.update()` on `rooms`, `users`, `bookings`, `coupons`, `newsletter`, etc.

**Impact:** Anyone on the internet can read, modify, or delete **any** document: dump all users (and their plaintext passwords — see C-02), rewrite room prices, forge/cancel bookings, poison blog content (see H-01), and harvest the subscriber list. This is the backbone that makes C-03, C-05, H-01, and H-04 exploitable.

**Fix:**
1. Add a real rules file and deploy it. Start deny-all, then open only what genuinely must be public-read.

```
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    // Public catalog content — read-only to the world, writes only via Admin SDK (server)
    match /rooms/{id}    { allow read: if true;  allow write: if false; }
    match /blogs/{id}    { allow read: if true;  allow write: if false; }
    match /categories/{id}{ allow read: if true; allow write: if false; }
    match /locations/{id}{ allow read: if true;  allow write: if false; }

    // Users: a user may read/update only their own doc; never expose passwords (see C-02)
    match /users/{uid} {
      allow read, update: if request.auth != null && request.auth.uid == uid;
      allow create:       if request.auth != null && request.auth.uid == uid;
      allow delete:       if false;
    }

    // Bookings, coupons, newsletter, reviews: no direct client access.
    // All mutations go through authenticated serverless functions using the Admin SDK.
    match /bookings/{id}   { allow read, write: if false; }
    match /coupons/{id}    { allow read, write: if false; }
    match /newsletter/{id} { allow read, write: if false; }
    match /reviews/{id}    { allow read: if true; allow write: if false; }
  }
}
```

2. In the Netlify Functions, replace anonymous REST with the **Firebase Admin SDK** (service-account key stored in a Netlify env var, never in the repo). The Admin SDK bypasses rules server-side, so the client no longer needs write access.
3. Migrate the browser login to **Firebase Authentication** (see C-03) so `request.auth` is populated.

---

### C-02 — Hard-coded admin password & plaintext password storage in public JS

**Where:** `assets/js/shared.js:172-188`, `:269-277`; also `assets/js/users.js:26-36`.

```js
// assets/js/shared.js  (served to every visitor)
const DEFAULT_USERS = [
  { id:'usr-admin', email:'tanzilminhas2007@gmail.com',
    password:'tanzil@minhas2007', role:'admin', ... },   // <-- plaintext admin password
  { id:'usr-guest', password:'guest123', role:'user', ... }
];
// ...and re-asserted at :269-277 during "migration"
```

**Impact:**
- The admin password ships in a static asset — `view-source` or the Network tab reveals it instantly. Full admin takeover.
- `register()` writes `password` straight into Firestore (`shared.js:744`) and `login()` compares it in plaintext (`shared.js:727`). Combined with C-01, **every user's plaintext password is world-readable**.

**Fix:**
- Remove all hard-coded credentials from client code (and rotate them — treat `tanzil@minhas2007` as burned).
- Never store or compare plaintext passwords. Move authentication to Firebase Auth (passwords hashed/managed by Google) or, if you keep custom auth, hash server-side with `bcrypt`/`argon2` in a function.
- Strip the `password` field from any `users` document that the client can read.
- Purge the secret from git history (`git filter-repo`) and force-push, since it exists in prior commits.

---

### C-03 — Client-side-only authentication and authorization (trivial admin bypass)

**Where:** `assets/js/shared.js:724` (`getCurrentUser` reads `localStorage`), `:727` (plaintext compare), `:766-790` (`guardRoute` reads `role` from `localStorage`).

```js
getCurrentUser: () => JSON.parse(localStorage.getItem(DB_KEYS.SESSION)),
login: async (email, password) => {
    const user = await db.getUserByEmail(email);
    if (user && user.password === password) { localStorage.setItem(SESSION, JSON.stringify(user)); ... }
},
guardRoute: (requiredRole) => {
    const user = db.getCurrentUser();
    if (requiredRole && user.role !== requiredRole) { /* redirect */ }
}
```

**Impact:** The session object (including `role`) lives in `localStorage` and is fully attacker-controlled. Becoming admin requires no password at all:

```js
// paste in DevTools console, then open /admin/
localStorage.setItem('kaghan_hotel_session',
  JSON.stringify({ id:'x', role:'admin', name:'x', email:'x' }));
```

`guardRoute` runs *after* the page loads and only redirects — the admin bundle and any data it fetches are already reachable. Authorization performed in the browser is not authorization.

**Fix:**
- Adopt **Firebase Authentication**; gate privileged pages/data with Firestore rules and/or server-side checks that read the verified `request.auth` token, not a client claim.
- Store the admin role as a **custom claim** set by a trusted backend, never in a client-writable `users` doc.
- Any admin-only action (mutating bookings, sending newsletters, editing inventory) must run in an authenticated serverless function that verifies the caller's ID token *server-side* before acting.

---

### C-04 — Unauthenticated mass-email / open relay

**Where:** `netlify/functions/send-newsletter.js`, `admin-notify.js`, `booking-email.js`, `customer-reminders.js`. None checks the caller's identity; `send-newsletter.js` even sets `Access-Control-Allow-Origin: *`.

**Worst case — `send-newsletter.js`:** it accepts an arbitrary `subject` and **raw `htmlBody`**, fetches every subscriber from Firestore, and BCC-blasts them:

```js
const subject = body.subject;
const htmlBody = body.htmlBody;          // attacker-controlled HTML, injected verbatim
// ...loads all newsletter subscribers...
await transporter.sendMail({ from:`"KPH Stay Lobby" <${user}>`, bcc: recipientEmails.join(', '),
    subject, html: htmlFormatted /* wraps htmlBody unescaped */ });
```

**Impact:** Any anonymous request can send **branded phishing to your entire subscriber base from your own domain/SMTP**, torching sender reputation and deliverability. `admin-notify` / `booking-email` / `customer-reminders` similarly let anyone trigger emails to arbitrary recipients with injected HTML (spam cannon + phishing + SMTP-quota exhaustion). `customer-reminders` accepts an unbounded `bookings[]` array — a single request can loop `sendMail` thousands of times.

**Fix:**
- Require authentication on every mail-sending function: verify a Firebase ID token (admin custom claim) for `send-newsletter`/`admin-notify`/`customer-reminders`; for `booking-email`, only send after the *server* has created the booking (don't accept arbitrary recipient+HTML from the client).
- Remove `Access-Control-Allow-Origin: *`; restrict to your own origin.
- Treat all interpolated values as untrusted: escape HTML, and for the newsletter store a template + variables rather than accepting raw HTML.
- Add per-IP and per-account rate limits and a hard cap on recipients per invocation.

---

### C-05 — Unauthenticated booking creation & client-side price tampering

**Where:** `booking.html:1304` (client builds `totalPrice: finalPrice`), `assets/js/shared.js:558-576` (`addBooking` writes it straight to Firestore), and `netlify/functions/chatbot.js:169` (chatbot `book_room` writes with no auth).

```js
// booking.html — price computed in the browser, then trusted
const booking = { ..., totalPrice: finalPrice, status:'confirmed', ... };
await KaghanDB.addBooking(booking, pdfBase64);
// shared.js
addBooking: async (booking) => { await fdb.collection('bookings').doc(booking.id).set(booking); }
```

**Impact:** Because pricing, coupon math (`booking.html:1116-1141`), and the write all happen client-side against an open DB, an attacker can book any room for **PKR 0** (or any value), self-issue coupons, forge `status:'confirmed'`, or spam the ledger — then trigger the email functions to mint a "paid" invoice PDF. No server ever validates the amount.

**Fix:**
- Compute price, validate coupons, check availability, and write the booking **on the server** (authenticated function + Admin SDK). The client should submit only `{roomId, dates, guestInfo, couponCode}`; the server derives the price from the DB.
- Block direct client writes to `bookings` (rules in C-01).
- In `chatbot.js`, route `book_room` through the same authenticated server booking path; do not let the LLM write to the ledger directly (see also H-01/M-04).

---

## 3. High findings

### H-01 — Stored XSS via world-writable DB rendered with `innerHTML`

**Where:** `innerHTML` sinks throughout the admin/user bundles — e.g. `assets/js/admin/inventory.js` (15), `settings.js` (10), `dashboard.js` (7), `bookings.js` (4), `coupons.js` (5), `reviews.js` (2), `assets/js/rooms.js` (7); plus server-side injection in `netlify/functions/prerender.js` (room/blog fields interpolated into HTML served to crawlers).

**Impact:** Since C-01 makes Firestore world-writable, an attacker can plant a payload (e.g. in a review, `guestName`, blog `content`, or room `name`) that executes when an **admin** opens the dashboard — stealing the admin session/localStorage and pivoting to full compromise. Prerendered pages inject the same unescaped data into HTML delivered to search engines.

**Fix:** Lock the DB (C-01) so only server code writes it; sanitize/escape all DB-derived strings before rendering — prefer `textContent`, or DOMPurify for rich fields; HTML-escape every interpolation in `prerender.js`. Add a strict CSP (M-02) as defense-in-depth.

---

### H-02 — Open CORS + LLM cost-abuse on the chatbot

**Where:** `netlify/functions/chatbot.js:394` (`Access-Control-Allow-Origin: '*'`), `:230` (`GROQ_API_KEY` used), `:305-330` (up to `maxLoops = 5` Groq calls per request).

**Impact:** Any website can invoke your concierge cross-origin, and each call fans out to as many as five Llama-3.3-70B completions plus Firestore reads/writes — an attacker can run up your Groq bill and create bookings at scale. No authentication and (effectively) no rate limit (H-03).

**Fix:** Restrict CORS to your origin; put the chatbot behind auth or a signed/session token + a working rate limit; cap tool-call loops and total tokens; alert on spend. Do not expose destructive tools (`book_room`) to anonymous callers.

---

### H-03 — Rate limiter is in-memory per-edge-instance and only on one route

**Where:** `netlify/edge-functions/rate-limiter.js` (module-level `Map`), `netlify.toml` (bound only to `/.netlify/functions/chatbot`).

**Impact:** Netlify Edge runs many isolated isolates across regions; each keeps its **own** `Map`, and it resets on cold start — so "20 req/min per IP" is neither global nor durable, and is bypassed by distribution or simply by cycling instances. Every other abusable function (newsletter, booking-email, admin-notify, reminders) has **no** limiter at all.

**Fix:** Use a shared store for counters (Netlify Blobs, Upstash/Redis, or a KV) keyed by IP+route; apply the limiter to all mutating/mail/LLM functions, not just the chatbot; keep IP-spoofing in mind (trust only Netlify's `x-nf-client-connection-ip`).

---

### H-04 — Sensitive data & PII publicly readable

**Where:** `users` collection (incl. plaintext `password`), `bookings` (names, emails, phones, stay dates), `newsletter` (emails) — all reachable per C-01; `getUserByEmail` runs in the browser (`shared.js`), so the client downloads user docs wholesale.

**Impact:** Mass credential and PII exposure (GDPR/data-protection liability), enabling account takeover and targeted phishing.

**Fix:** Rules from C-01; strip `password` from readable docs; never query users by arbitrary email from the client — do lookups server-side; minimize fields returned to the browser.

---

## 4. Medium findings

### M-01 — Verbose error leakage
`admin-notify.js`, `customer-reminders.js`, `booking-email.js`, `chatbot.js`, `send-newsletter.js` all return `error.message`/`details` to the client (e.g. `body: JSON.stringify({ error: err.message })`). This leaks internal paths, SMTP/Firestore errors, and stack hints. **Fix:** return a generic message + a correlation id; log details server-side only.

### M-02 — Toothless Content-Security-Policy
`netlify.toml` sets `Content-Security-Policy = "upgrade-insecure-requests"` only — no `default-src`/`script-src`, so it provides no XSS mitigation. **Fix:** add a real policy (`default-src 'self'`; explicit `script-src`/`connect-src`/`img-src` allowlists for Firebase, Groq, and any CDN; drop inline scripts or use nonces). Complements H-01.

### M-03 — No input validation / email-flood vector
Function inputs are used unvalidated. `customer-reminders.js` iterates an unbounded `bookings[]` calling `sendMail` per element; email templates interpolate `guestName`/`roomId`/`subject` without escaping. **Fix:** validate types/shapes (e.g. `zod`), cap array sizes and recipients, escape all interpolated values.

### M-04 — TOCTOU double-booking race
`chatbot.js:135-169` checks availability, then writes the booking as separate steps with no lock/transaction, so concurrent requests can double-book a room. The client booking path has the same gap. **Fix:** perform availability-check-and-write inside a Firestore transaction (Admin SDK) or use a uniqueness constraint on (roomId, date-range).

### M-05 — Hard-coded fallback-secret pattern
`chatbot.js:5` `const FALLBACK_GROQ_KEY = ''` with comment "Fallback Groq API Key provided by user", consumed at `:230`. It's empty in all history (good — verified), but the pattern invites a committed key. **Fix:** delete the fallback; require `process.env.GROQ_API_KEY` and fail closed if unset.

---

## 5. Low / functional issues (misfunctions)

| ID | Issue | Location | Fix |
|----|-------|----------|-----|
| L-01 | `fetch('http://localhost:3000/send-whatsapp')` runs in production and always fails | `chatbot.js:183` | Remove or point to a real WhatsApp/BSP endpoint via env var |
| L-02 | `totalPrice.toLocaleString()` throws `TypeError` if `totalPrice` arrives as a string → 500 | `booking-email.js` | Coerce: `Number(totalPrice || 0).toLocaleString()` |
| L-03 | Branding is inconsistent: "Kaghan Stay", "KPH Stay", domain `kphstay.com`, repo `kaghanstay`, mixed Islamabad/Nathia Gali/Kaghan copy | repo-wide (emails, `booking-email.js`, `send-newsletter.js`, HTML) | Pick one canonical brand/domain and normalize |
| L-04 | Hard-coded recipient `tanzilminhas2007@gmail.com` and scattered phone numbers (`+92 51 8461975`, `+92 300 1234567`, `+92 334 0091127`) | `admin-notify.js`, `customer-reminders.js`, `shared.js` | Move to env/config; reconcile numbers |
| L-05 | `enablePersistence()` unguarded beyond one `.catch` — can noisy-fail in multi-tab | `shared.js:23` | Handle `failed-precondition`/`unimplemented` explicitly or drop persistence |
| L-06 | User-agent cloaking (serving different HTML to bots) can trigger search-engine penalties | `seo-filter.js` | Ensure prerendered content matches user content; prefer SSR/prerender parity |
| L-07 | Redundant/duplicated redirect rules and `/index` → `/` handling | `netlify.toml` | Consolidate redirects |

---

## 6. Suggested remediation order

1. **C-02, C-03** — rotate/remove hard-coded admin creds; move auth to Firebase Auth (stops the bleeding).
2. **C-01** — deploy locked Firestore rules + Admin SDK in functions (removes the write-anywhere root cause).
3. **C-04** — authenticate all mail functions; kill `send-newsletter` raw-HTML/open-CORS.
4. **C-05** — server-side price/booking validation.
5. **H-01…H-04** — sanitize output, restrict CORS, real rate limiting, strip PII.
6. **M/L** — hardening and functional cleanup.

Re-run the verification in the appendix after each phase.

---

## 7. Agent remediation loop

This section is written for an autonomous coding agent (or a human) to work the findings above **iteratively** until the repo is clean. It defines a machine-followable state machine, a per-finding inner loop, and stop conditions. Treat every `FIX` step as untrusted until its `VERIFY` gate passes.

### 7.1 Global loop (state machine)

```
STATE: LOAD  -> parse this file's "Severity index" (Section 1) into an ordered queue Q,
                sorted by severity (Critical > High > Medium > Low), then by remediation
                order in Section 6.
STATE: SELECT-> if Q is empty: go DONE.
                else pop the highest-priority finding F from Q.
STATE: FIX   -> run the INNER LOOP (7.2) for F.
STATE: GATE  -> run VERIFY(F) (7.3). 
                if PASS: mark F done, append to CHANGELOG, go SELECT.
                if FAIL and attempts(F) < MAX_ATTEMPTS(=3): go FIX.
                if FAIL and attempts(F) == MAX_ATTEMPTS: mark F BLOCKED, 
                    record reason, go SELECT (do not stall the queue).
STATE: DONE  -> if any BLOCKED findings remain: emit report, exit non-zero.
                else run FULL-VERIFY (7.4); if clean exit zero, else loop back to LOAD.
```

### 7.2 Inner loop (per finding F)

Repeat for each finding until its VERIFY gate passes or MAX_ATTEMPTS is hit:

```
1. LOCATE   : open the file(s)/line(s) named in F. Confirm the vulnerable pattern is
              still present (code may have shifted — match on the code, not the line #).
2. PLAN     : write a one-line intent for the smallest change that removes the root cause.
              Prefer server-side / rules fixes over client-side patches.
3. EDIT     : apply the fix from the finding's "Fix" block. Do NOT introduce a new secret,
              a new `innerHTML` sink, or a new unauthenticated mutation.
4. SELF-CHECK (must ALL be true before leaving EDIT):
     [ ] no plaintext credential or API key added anywhere in tracked files
     [ ] no new `Access-Control-Allow-Origin: *` on a mutating/mail/LLM route
     [ ] every DB mutation this code path can reach requires a verified auth check
     [ ] all user/DB-derived strings are escaped before HTML rendering
     [ ] errors returned to clients are generic (no `error.message`)
5. VERIFY   : run 7.3 for F.
6. LOOP     : if VERIFY fails, revert to a clean state, increment attempts(F), go to 1.
```

### 7.3 Per-finding verify gate (examples)

Each gate is a concrete, automatable check. Extend as needed.

| Finding | VERIFY(F) passes when… |
|---------|------------------------|
| C-01 | `firestore.rules` exists, deploys, and a scripted anonymous write to `bookings/`/`users/` is **denied**; functions use Admin SDK (no unauthenticated `firestore.googleapis.com` write remains). |
| C-02 | `grep -rInE "password\s*[:=]\s*['\"]" assets/ netlify/` returns **0** plaintext creds; git history scrubbed; creds rotated. |
| C-03 | Forging `localStorage` session no longer grants `/admin/` data; server verifies Firebase ID token + admin claim. |
| C-04 | Anonymous POST to each mail function returns 401/403; `send-newsletter` no longer accepts raw `htmlBody`; CORS not `*`. |
| C-05 | Client cannot write `bookings`; server recomputes `totalPrice` from DB; a tampered price is rejected. |
| H-01 | No `innerHTML` receives unescaped DB data (DOMPurify/`textContent` in place); `prerender.js` escapes interpolations. |
| H-02 | Chatbot CORS restricted; auth/rate-limit enforced; loop/token caps present. |
| H-03 | Rate limiter uses shared store and applies to all mutating/mail/LLM routes. |
| H-04 | `users` docs served to clients contain no `password`; PII reads are server-gated. |
| M-01 | No function returns `error.message`/`details` to the client. |
| M-02 | Response carries a real CSP with `default-src`/`script-src` allowlists. |
| M-03 | Inputs schema-validated; arrays/recipients capped; interpolations escaped. |
| M-04 | Booking availability+write runs in a transaction; concurrent test can't double-book. |
| M-05 | No fallback-secret constant; missing `GROQ_API_KEY` fails closed. |
| L-01…L-07 | Item removed/fixed per the table in Section 5. |

### 7.4 Full-verify sweep (run once the queue is empty)

```bash
# 1. No plaintext secrets / creds anywhere tracked
grep -rInE "AIza|gsk_|sk-|password\s*[:=]\s*['\"]|SMTP_PASS\s*=" \
     --include='*.js' --include='*.html' --include='*.json' . | grep -v node_modules

# 2. No unauthenticated Firestore writes left in functions
grep -rn "firestore.googleapis.com" netlify/functions | grep -i "PATCH\|POST\|DELETE"

# 3. No wildcard CORS on mutating/mail/LLM routes
grep -rn "Access-Control-Allow-Origin.*\*" netlify

# 4. No raw error leakage
grep -rn "error.message\|details: error" netlify/functions

# 5. Dependency & rules sanity
npm audit --production ; test -f firestore.rules && echo "rules present"
```

Loop the whole process until: **the queue is empty, no finding is BLOCKED, and every command in 7.4 returns clean.** Emit a final CHANGELOG mapping each finding ID → commit(s) → VERIFY result.

### 7.5 Loop invariants (never violate while iterating)

- Never commit a secret; never widen Firestore rules to "fix" a failing test.
- Never convert a server-side check into a client-side one to make a gate pass.
- Prefer the smallest change that removes the **root cause**; a patch that only hides a symptom fails its gate.
- Keep each finding's fix in its own commit for auditability and easy rollback.

---

## 8. Appendix — how these findings were verified

- Full clone (`git rev-list --count HEAD` = 24) and history secret scan (`git log -p -S 'gsk_' / 'AIzaSy'`): only the public Firebase web key appears; **no Groq key was ever committed**.
- Every `netlify/functions/*.js` and `netlify/edge-functions/*.js` read end-to-end.
- Auth/session/booking flow traced across `assets/js/shared.js`, `booking.html`, `login.html`, and `assets/js/admin/*`.
- `innerHTML` sink inventory via `grep -rc innerHTML`.
- Firestore rules could not be fetched from this environment (Google domains are outside the sandbox allowlist); the **open-rules conclusion is inferred with high confidence** from unauthenticated REST reads *and writes* in the functions plus unauthenticated client SDK writes. **Confirm directly** in the Firebase console before/after remediation.