# KPH Stay → Airbnb-Grade UX Conversion Plan

> **Purpose:** This is a single source-of-truth brief for an AI coding agent (Claude Code, Cursor, etc.) working inside the `kaghanstay` repository. It explains what to change, why, in what order, and — just as importantly — what **not** to build. Paste this whole file into the agent's context (or point it at `convert.md` in the repo root) before starting work.
>
> Feed it to the agent exactly like the existing `fixing.md` / `update.md` / `responcive.md` docs in this repo — same repo, same conventions, same "read first, then act" discipline.

---

## 0. Read This First (Ground Rules for the Agent)

1. **This is a single-vendor booking site, not a marketplace.** KPH Stay ("Kaghan Stay") has exactly **one owner/operator (the Admin)**. There is no "become a host" flow, no multiple sellers, no host payouts, no host onboarding, no multi-tenant inventory. Every property/room/apartment in the system belongs to the same business. **Airbnb is the reference for UX patterns only — not for the business model.** See §2 "Do NOT Build" for explicit guardrails.
2. **Do not clone Airbnb's brand.** No Airbnb logo, no "Airbnb" wordmark, no literal copy of Airbnb's Cereal font or belo-pink color (#FF385C) branding, no copied marketing copy. We are borrowing **information architecture and interaction patterns** (search bar shape, calendar picker behavior, card grid rhythm, PDP layout, checkout stepper, wishlist heart, etc.), rendered in KPH Stay's own **gold (`#C5A059`) / deep emerald (`#0F382C`) / near-black (`#0B0F19`)** identity, which is already defined in `assets/css/style.css`. Keep it.
3. **Verify the current file state yourself before changing anything.** This repo contains several historical planning/log docs (`fixing.md`, `update.md`, `update 2.0.md`, `progress.md`, `.agents/memory.md`) written by prior agent sessions. **Some of their "resolved" claims do not match the code that is actually in the repo right now** — for example, `.agents/memory.md` claims Firestore rules were locked down on 2026-07-17, but `firestore.rules` in the current tree still contains `allow write: if true` on `rooms`, `bookings`, `users`, `coupons`, etc. **Treat those docs as historical narrative, not as ground truth.** Always `grep`/open the actual file before assuming a fix already happened.
4. **Respect `.agents/AGENTS.md` and `firestore.rules` security posture at all times**, especially while adding new features in this plan (wishlists, review sub-ratings, onboarding). Concretely:
   - No new client-side direct Firestore **writes** to catalog data (`rooms`, `blogs`, `upgrades`, `categories`, `locations`, `coupons`). Route all mutations through `netlify/functions/admin-action.js` (already the pattern used by `assets/js/admin/*.js` via `callAdminAction`).
   - Any brand-new Firestore collection this plan introduces (e.g. `wishlists`) must ship with a **scoped security rule** (owner-only read/write on their own uid), not a blanket `allow write: if true`. Do not copy the currently-open pattern into new collections even though it exists elsewhere in the file — that open pattern is a known critical vulnerability (`fixing.md`, finding **C-01**), not something to replicate.
   - Never store or compare plaintext passwords. All auth stays on Firebase Auth (per `AGENTS.md §1.B`).
   - No `innerHTML` for rendering dynamic/user-generated data (reviews, wishlist names, guest notes) — use `textContent` or the existing `KaghanSafe`/`escapeHTML`/`sanitizeHTML` helpers in `assets/js/shared.js`.
   - Any new external script/CDN (e.g. a date-picker library, if you choose not to hand-roll one) must be added to the `Content-Security-Policy` header in `netlify.toml` (`script-src`, `style-src`, `connect-src`, `font-src` as applicable) or the browser will silently block it — this has bitten this project repeatedly (see `update.md`, `update 2.0.md`).
   - Follow `responcive.md`'s existing mobile rules: `viewport-fit=cover`, 16px inputs on <1024px, `env(safe-area-inset-*)` padding, `-webkit-tap-highlight-color: transparent`. New components must comply, not regress.
5. **This is a static HTML/CSS/vanilla-JS site — no build step, no framework.** Stack recap: plain HTML pages + Tailwind via CDN (Play/JIT) + `assets/css/style.css` for design tokens + vanilla JS modules (`assets/js/*.js`) + Firebase Firestore (client SDK for reads) + Netlify Functions (Node, Firebase Admin SDK for writes) + Netlify Edge Functions (Deno) + Leaflet (maps) + Cloudinary (image upload widget) + TinyMCE/Quill (rich text) + ApexCharts + FullCalendar (admin only) + Groq LLM chatbot. **Keep building in this stack.** Do not introduce React/Vue/a bundler/npm build pipeline as part of this UX conversion — that is a separate, much larger migration and is out of scope here.
6. **Extend, don't rewrite.** Large parts of this codebase are already deliberately built to *look* Airbnb-inspired (category pill bar, map-toggle listings grid, glassmorphic search widget, skeleton loaders, stay-duration pricing tiers, "Guest Favorite" badge, sticky booking card + mobile sticky bar on the PDP, a 4-step stepper on `booking.html`). Read §1 below carefully so you build on top of that work instead of duplicating it.

---

## 1. Current State — What's Already There (Don't Rebuild This)

| Area | File(s) | What exists today |
|---|---|---|
| Design tokens | `assets/css/style.css` | Gold/emerald/near-black palette as CSS vars, `Outfit` (display), `Inter` (body), `Playfair Display` (serif accents), spacing/shadow/radius/easing tokens already defined under `:root`. |
| Global shell | `assets/js/shared.js` | `window.KaghanDB` (Firestore CRUD wrapper: `getRooms`, `getBookings`, `getReviews`, `addBooking`, `login`, `register`, etc.), `window.KaghanUI` (incl. `showToast()` — a working toast system, use it instead of `alert()`), `window.KaghanSafe`/`escapeHTML`/`sanitizeHTML`, `renderNavbar()`, `injectChatbot()`, `injectWhatsApp()`, `injectCookieBanner()`, `openFilterSidebar()/closeFilterSidebar()`, `setupScrollAnimations()`, `downloadPDFInvoice()`. |
| Home / discovery | `index.html` | Hero with glassmorphic search widget (stay-type tags: Daily/Weekly(-15%)/Monthly(-35%), location dropdown, **native** `<input type="date">` for check-in/out, guests select), "Category Filter Bar (Airbnb Style)" pill rail (`#index-categories-container`), featured suites grid with skeletons, amenities grid, testimonials, dynamic blog feed, locations showcase, stats section, FAQ accordion. |
| Browse / listings | `rooms.html`, `assets/js/rooms.js` | Filter sidebar (search text, location, price range slider, amenity checkboxes, sort), mobile filter drawer, category pill rail, **`toggleMapMode()`** split map/grid toggle backed by Leaflet (`#rooms-map`), pagination, "no results" fallback state, listing "details modal". |
| Listing detail (PDP) | `room-details.html` | Gallery with main image + arrows + thumbnail strip + lightbox, badges (category, "Guest Favorite"), rating pill, stay-duration rate bar (daily/weekly/monthly), highlights/specs row, overview, amenities grid, rules, Leaflet location map, reviews grid + gated review form, **sticky right-column booking card** with stay-type tabs, date inputs, guest select, live price breakdown, primary CTA, "more listings" feed, and a **mobile sticky bottom bar**. This is structurally already an Airbnb-style PDP. |
| Checkout | `booking.html`, `assets/js/shared.js` | A **4-step progress stepper** (Dates → Guest Details → Upgrades → Confirm) rendered as one scrolling page with an interactive month calendar (`#calendar-days-grid`), room-picker cards, billing-cycle box for monthly stays, reserved-dates warning box, guest info form, dynamically-loaded upgrades from Firestore, coupon code box, payment method selection, live price summary sidebar, and a receipt/confirmation modal with WhatsApp share + PDF invoice download. |
| Auth | `login.html` | Single card, two tabs (Login / Register), no multi-step flow, no password strength/verification feedback beyond basic HTML5 validation. |
| Guest dashboard | `user/index.html` | Single page: stat cards (active bookings, nights stayed, total spend), active + previous bookings tables, cancel/reschedule modals (reschedule hits `netlify/functions/reschedule-booking.js`), review submission modal, right-column profile form. No Wishlists tab exists. |
| Admin panel | `admin/index.html`, `assets/js/admin/*.js` | Sidebar-tab SPA-style dashboard: Overview (ApexCharts revenue/occupancy), Calendar (FullCalendar), Bookings (search, status pills, bulk actions), **Rooms** (`openAddRoomModal()` — currently one long modal form, not a wizard), Guests, Newsletter/Subscribers, Reviews, Blogs, Coupons, Settings. Mutations go through `admin-action.js`. |
| Booking lookup | `track.html` | Standalone "track my booking" lookup page (booking ID/email), separate from the logged-in dashboard — useful for guests who booked without an account. |
| Notifications | `netlify/functions/booking-email.js`, `admin-notify.js`, `customer-reminders.js`, `send-newsletter.js` | Email-based notifications exist; no in-app notification center; WhatsApp floating widget + Groq AI chatbot widget exist on public pages (suppressed on `/admin/`). |
| Wishlist / Save | — | **Does not exist anywhere in the codebase.** No heart icon, no saved-stays collection, no UI. This is the biggest structural gap vs. Airbnb. |
| Review depth | `assets/js/admin/reviews.js`, `assets/js/user/reviews.js` | Reviews are a single star rating (1–5) + free-text comment + admin reply. No sub-category ratings (cleanliness/accuracy/communication/location/value/check-in) like Airbnb. |

---

## 2. Do NOT Build (Explicit Guardrails)

Because "make it like Airbnb" is an easy instruction to over-apply, the agent must **not**:

- Build a "become a host" / host application / host onboarding flow of any kind.
- Add a second role between "guest" and "admin" (no "host" role, no "co-host", no per-property owner accounts). The only roles are **guest** and **admin**, exactly as `firestore.rules`' `isAdmin()` helper and `users.role` field already imply.
- Allow any account other than the Admin's own claim-verified account to create, edit, price, or delist a room/apartment.
- Build multi-currency / multi-language switching (KPH Stay is PKR/English-only; not part of this brief).
- Introduce a payment marketplace / split-payout / commission system. Payment collection stays exactly as architected today (manual/bank/cash or whatever `booking.html`'s current "Payment Selection" block already supports) — only the **presentation** of pricing/checkout should get an Airbnb-style makeover, not the settlement logic.
- Replace Firebase/Netlify/Tailwind-CDN/vanilla-JS with a different stack. No React rewrite, no Next.js, no bundler.
- Copy Airbnb's literal visual identity (pink/red brand color, Cereal font, logo, "Airbnb" name anywhere in copy, review "Superhost" trademarked term — use an original equivalent like "KPH Signature Stay" or "Guest Favorite" which already exists in `room-details.html`).

---

## 3. Product Vision for This Conversion

KPH Stay should **feel** the way a modern short-stay booking app feels — fast, visual, confident about pricing, generous with whitespace, calendar-first, mobile-first, save-for-later friendly, with a checkout that feels like progress instead of a form — while being explicit everywhere that it is **one curated property brand**, not an open marketplace. Concretely, target these outcomes:

1. **Search feels alive.** A compact, sticky, pill-shaped search bar that expands into a full calendar + guest picker overlay, on every page, not just the homepage hero.
2. **Every property card and every gallery has a save/heart action**, with a real "Wishlists" destination.
3. **Dates are chosen on a real calendar**, never a native date input, anywhere a guest picks check-in/check-out (hero search, rooms filter, PDP booking card, reschedule modal).
4. **The PDP reads like a story**, not a spec sheet: hero gallery grid → title/rating/location → key facts → host-style "About this stay" (attributed to KPH Stay/the resort, not a personal host) → amenities → house rules → map → reviews with category breakdown → sticky reserve panel.
5. **Checkout feels like 4 short, calm screens**, not one long scroll — build on the stepper that already exists in `booking.html` rather than replacing it.
6. **The guest dashboard is organized like Trips / Wishlists / Account**, not one dense page.
7. **Admin "add a room" is a guided, multi-step publishing wizard** (Structure → Photos → Amenities & Description → Pricing & Availability → Review & Publish), even though there is still only one publisher (the Admin).
8. **Empty states, loading states, and micro-copy are warm and specific**, not generic "No data" text.

---

## 4. Design System Adjustments

Keep every existing CSS variable in `assets/css/style.css`. Add to it (do not replace it) the following Airbnb-pattern primitives, still themed in KPH Stay colors:

```css
/* Add inside :root, alongside existing tokens */
--card-radius: 1.25rem;                 /* Airbnb-style large rounded cards */
--pill-radius: 999px;                   /* search bar / filter pills */
--hover-lift: translateY(-4px);
--transition-card: transform 0.25s var(--ease-smooth), box-shadow 0.25s var(--ease-smooth);
--heart-idle: rgba(11,15,25,0.55);
--heart-active: #DC2626;                /* reuse existing --accent-red, don't invent a new red */
--divider: #EDEDED;
```

Component conventions to apply consistently across every page touched in this plan:

- **Cards:** `border-radius: var(--card-radius)`, `overflow:hidden`, subtle `box-shadow: var(--shadow-sm)` at rest, `var(--shadow-lg)` + `var(--hover-lift)` on hover, image at top with `aspect-ratio: 4/3` (or `1/1` for square thumbnails), heart icon top-right over the image, price bolded, one-line title + location + rating on one line.
- **Search pill (collapsed state):** a single rounded-full bar with 3 segments separated by thin vertical dividers — "Where" / "Check in — Check out" / "Guests" — plus a circular gold search button. Clicking any segment opens the relevant picker (location autocomplete, calendar, or stepper).
- **Calendar picker:** two-month side-by-side view on desktop, single-month swipeable on mobile, range-select by clicking start then end date, disabled/greyed dates for unavailable ranges (source from `KaghanDB.isRoomAvailable`/booked-dates data already used by `booking.html`'s calendar), a small price-per-night label under each date when a specific room is already selected (optional enhancement, PDP only), minimum-stay hint text under the calendar footer.
- **Icons:** keep Font Awesome (already loaded); prefer the `-light`/`-regular` weight for a thinner, Airbnb-like line-icon feel where available; heart icon is `fa-regular fa-heart` idle / `fa-solid fa-heart` active with a quick scale-bounce keyframe on toggle.
- **Buttons:** primary CTA stays the existing gold gradient; secondary/ghost buttons get fully-rounded pill shape with 1px border for filters and chips.

---

## 5. Feature Conversion Plan (Phased, File-by-File)

Work through phases in order — each phase is shippable and testable on its own. Update `.agents/memory.md` after each phase with what actually changed (per the existing rule at the top of that file), and be honest in that log — this plan's whole §0.3 exists because a prior agent wasn't.

### Phase 1 — Global Shell & Navigation
**Files:** `assets/js/shared.js` (`renderNavbar`, add new `renderMobileTabBar`), `assets/css/style.css`, all public HTML pages (nav include point).

- [ ] Add a **persistent mobile bottom tab bar** for logged-in guests, injected the same way `injectWhatsApp()`/`injectChatbot()` are injected today (a `renderMobileTabBar()` function called from `initializeSharedUI()`), with 4–5 tabs: **Explore** (`index.html`/`rooms.html`), **Wishlists** (new, Phase 6), **Trips** (`user/index.html`), **Inbox** (Phase 12, can stub/hide until built), **Account**. Respect `env(safe-area-inset-bottom)` per `responcive.md`. Hide it entirely on `/admin/*` (same pattern already used to exclude the chatbot from admin).
- [ ] For logged-out visitors, keep the current hamburger drawer nav but add a small "Log in / Sign up" pill on desktop nav (already exists as `#auth-links` — just restyle to a rounded outline pill).
- [ ] Add a persistent, **compact sticky search pill** that appears in the navbar once the hero search scrolls out of view on `index.html` and permanently at the top of `rooms.html`. Clicking it opens the full search/calendar overlay (built in Phase 2).

### Phase 2 — Search & Discovery (Home)
**Files:** `index.html`, new `assets/js/search-widget.js` (extract search logic out of inline `<script>` in `index.html` into its own module so it can be reused by `rooms.html` and the sticky pill from Phase 1).

- [ ] Replace the two native `<input type="date">` fields in the hero search (`#search-check-in`, `#search-check-out`) with a single **"Check in — Check out" trigger button** that opens a custom calendar overlay component (see §4 calendar spec). Store the selected range in hidden inputs with the same IDs (`#search-check-in`, `#search-check-out`) so existing downstream code (`filterIndexRooms`, `hero-search-form` submit handler) keeps working without modification.
- [ ] Add a **"Flexible dates"** toggle next to the calendar trigger ("Exact dates" / "± 1 day" / "± 3 days" / "I'm flexible") — purely a UX affordance; only "Exact dates" needs to actually constrain the query for v1, the rest can be visual until the availability search backend supports fuzzy ranges.
- [ ] Add a **guest counter stepper** (adults / children, + / − buttons with min/max clamps) replacing the plain `#search-guests` `<select>`, again preserving the existing element `id` and value format so `rooms.js`/`shared.js` filtering logic doesn't need to change.
- [ ] Keep the existing stay-type tag selector (`selectHeroStayType`) — it's already a good Airbnb-style segmented control, just restyle border/radius to match §4.
- [ ] Verify `filterIndexRooms`'s category bar bug fix mentioned in `.agents/memory.md` (`#index-categories-container button` selector) is still correct in the current file before building on top of it.

### Phase 3 — Browse / Listings Grid + Map
**Files:** `rooms.html`, `assets/js/rooms.js`.

- [ ] Add a **heart/save button** to every room card in `#rooms-grid` (top-right corner over the image, per §4). Wire it to a new `toggleWishlist(roomId)` function (built in Phase 6). Reflect saved state immediately (optimistic UI) then reconcile with Firestore.
- [ ] Upgrade `rooms-map`/`toggleMapMode()`: instead of plain default Leaflet pins, render **custom price-bubble markers** (small rounded pill showing e.g. "PKR 25k") that open a mini listing-card popover on click/tap (image thumbnail, title, rating, price, "View" link to `room-details.html?id=...`). Sync hover: hovering a grid card should highlight/bounce its corresponding map pin, and vice versa (use a shared `roomId → marker` map object).
- [ ] On desktop ≥1280px, consider making the map persistently visible alongside the grid (Airbnb default) rather than only via toggle, while keeping `toggleMapMode()`'s hide option for users who prefer full-width grid. Keep the mobile behavior as a full-screen map toggle (current behavior is already correct for mobile — don't change that).
- [ ] Replace the numbered pagination (`#rooms-pagination`) with **infinite scroll** (IntersectionObserver on a sentinel div) for the grid view; keep numbered pagination as a fallback specifically for the map-split view where infinite scroll would be disorienting against a fixed map viewport.
- [ ] Reuse the new `search-widget.js` calendar/guest-picker component (Phase 2) inside the filter sidebar's date fields if/when date filtering is added here — check current filters first; if `rooms.html` doesn't yet filter by date, that's out of scope for this UX pass unless trivial to wire to `isRoomAvailable`.

### Phase 4 — Listing Detail Page (PDP)
**Files:** `room-details.html`.

- [ ] Convert the single main-image + thumbnail-strip gallery into an **Airbnb-style photo grid teaser** on desktop: one large image left, 2×2 smaller images right, with a "Show all photos" button opening the existing lightbox (`lightboxImageIdx` logic already present — reuse it, just add a full-grid entry view before the single-image lightbox view). On mobile, keep the current swipeable single-image + counter behavior — that part is already right.
- [ ] Add a **heart/save button** next to the share/contact icons near the title.
- [ ] Rename "Overview" copy tone to read like an "About this stay" narrative section (copy/microcopy task, not structural) — attribute it to **"KPH Stay"** as the operator, never to a personal "host" persona.
- [ ] Replace the two native date inputs in the booking card (`#card-checkin`, `#card-checkout`) with the shared calendar-range component from Phase 2, scoped to this room's actual booked/unavailable dates (pull from the same source `booking.html`'s calendar already uses for reserved dates).
- [ ] Add a **rating breakdown** under the existing rating pill: 5–6 sub-bars (Cleanliness, Accuracy, Check-in, Communication, Location, Value) — see Phase 9 for the data model change this depends on. If sub-ratings aren't populated yet for older reviews, gracefully fall back to showing only the overall star average (don't show empty/zero bars).
- [ ] Keep the sticky right-column booking card and the mobile sticky bottom bar exactly where they are structurally — they already match Airbnb's PDP reserve-panel pattern. Only restyle to §4 tokens and swap the date inputs as above.

### Phase 5 — Checkout / Booking Flow
**Files:** `booking.html`.

- [ ] Keep the existing 4-step stepper (`#stepper-progress-bar`, `step-node-2/3/4`) and its state machine in the inline script — it is already structurally correct. The task here is **visual and flow polish**, not a rebuild:
  - [ ] On mobile, present each step as a **full-viewport "screen"** (hide the other steps' sections instead of just visually de-emphasizing them) so it feels like Airbnb's checkout screens rather than one long scroll with a decorative stepper. On desktop, the current two-column (form + sticky price sidebar) scrolling layout is fine to keep.
  - [ ] Replace `#book-check-in`/`#book-check-out` native inputs with the shared calendar component; keep the existing `#calendar-days-grid` interactive calendar as the *source of truth* if it already does everything the shared component would — don't build two competing calendar widgets on the same page. Prefer consolidating on whichever implementation is more complete once you've read both.
  - [ ] Ensure the price breakdown line items read exactly like an Airbnb receipt: `Nightly rate × nights`, `Stay discount (if any)`, `Upgrades/add-ons`, `Taxes/fees`, `Coupon discount`, bold `Total`. Most of these rows already exist (`#calc-base-subtotal`, `#calc-discount-row`, `#calc-addons-row`, `#coupon-discount-row`, `#calc-total`) — just confirm ordering/labeling matches this convention and fill any missing row.
  - [ ] Add a short **cancellation-policy line** near the CTA on step 4 (e.g. "Free cancellation before [date] — see full policy") sourced from whatever policy text already exists in `terms.html`/`refund.html`; link to it rather than duplicating legal copy.

### Phase 6 — Wishlists / Saved Stays (New Feature)
**Files:** new `assets/js/wishlist.js`, `firestore.rules`, `netlify/functions/` (only if you decide writes need server mediation — see below), `user/index.html`, `rooms.html`, `room-details.html`, `index.html`.

This is the single biggest net-new feature in this plan.

- [ ] **Data model:** a `wishlists/{uid}` document per user, containing an array (or subcollection `wishlists/{uid}/items/{roomId}`) of saved room IDs with a `savedAt` timestamp. A subcollection is preferable at scale (avoids growing-array write contention) but a single array field is simpler and adequate for this project's size — pick the array approach unless you have a specific reason not to, to keep it consistent with this codebase's otherwise-simple data shapes.
- [ ] **Security rule to add to `firestore.rules`** (this is user-owned data, not catalog data, so *direct client writes gated by ownership* are appropriate here — unlike rooms/bookings/coupons which must go through `admin-action.js`):
  ```
  match /wishlists/{uid} {
    allow read: if request.auth != null && request.auth.uid == uid;
    allow write: if request.auth != null && request.auth.uid == uid;
  }
  ```
  Do this **in addition to**, not instead of, actually fixing the currently-open rules on `rooms`/`bookings`/`users`/`coupons` per `fixing.md` C-01 — that fix is a prerequisite piece of security debt this plan surfaces but does not itself resolve; flag it back to the human if it's out of scope for this pass, but do not make it worse.
- [ ] Add `KaghanDB.getWishlist()`, `KaghanDB.toggleWishlistItem(roomId)` methods in `assets/js/shared.js` alongside the existing CRUD methods, following the same `async` style as `getRooms`/`addReview` etc.
- [ ] Wire the heart buttons added in Phases 3–4 to these methods. Logged-out users clicking the heart should get a friendly prompt ("Log in to save your favorite stays") via `KaghanUI.showToast` or a small modal, then deep-link to `login.html` with a return-to param.
- [ ] Add a **"Wishlists" section** to `user/index.html` (or, if the dashboard is restructured into tabs per Phase 8, a dedicated `Wishlists` tab): a card grid of saved rooms, each with the same card component used elsewhere (§4), an "Unsave" heart, and empty state copy like "No saved stays yet — tap the heart on any suite to keep it here."

### Phase 7 — Guest Auth / Onboarding
**Files:** `login.html`.

Keep this lightweight — KPH Stay is a low-friction booking site, not a marketplace requiring ID verification. The goal is a calmer, more guided *feel*, not more steps for their own sake.

- [ ] Split the existing single "Register" form into **two short screens within the same modal/card**: Screen 1 collects name + email/phone + "Continue"; Screen 2 collects password + confirm + a one-line "By continuing you agree to our Terms & Privacy" (link to existing `terms.html`/`privacy.html`) + submit. This mirrors Airbnb's segmented signup feel without adding real friction (still 2 screens, same fields as today, same `handleRegister(event)` handler at the end — just split visually with a lightweight local JS step-index, no new backend work needed).
- [ ] Add inline password strength/match feedback (client-side only, cosmetic) under `#reg-pass`/`#reg-confirm`.
- [ ] After successful registration, redirect to a short one-time **welcome screen** ("Welcome to KPH Stay, {name} — start exploring stays" with a primary CTA to `rooms.html`) instead of dropping straight into the dashboard. This is the one truly new "onboarding step" in this phase and is enough to deliver the Airbnb-signup *feel* without over-building.
- [ ] Leave the Login tab structurally as-is; only apply §4 restyling.

### Phase 8 — Guest Dashboard ("Trips" / "Wishlists" / "Account")
**Files:** `user/index.html`, `assets/js/user/*.js`.

- [ ] Restructure `user/index.html` from one dense page into a **tabbed layout** (top tabs on desktop, or use the new mobile bottom tab bar from Phase 1 to deep-link into each section): **Trips** (today's active/previous bookings tables — this content already exists, just move it under this tab), **Wishlists** (Phase 6 output), **Account** (the existing profile form + password change).
- [ ] Keep all existing modals (`cancel-confirm-modal`, `reschedule-modal`, `review-modal`) and their handlers in `assets/js/user/bookings.js`/`reviews.js` untouched — only the page chrome around them changes.
- [ ] Add empty-state illustrations/copy for a guest with zero trips yet ("Your next stay starts here" + CTA to `rooms.html`), matching the tone in Phase 6's empty wishlist state.

### Phase 9 — Reviews Depth
**Files:** `room-details.html` (review form + display), `user/index.html`/`assets/js/user/reviews.js` (submission), `assets/js/admin/reviews.js` (admin view), `assets/js/shared.js` (`addReview`, `getReviewsByRoomId`), `netlify/functions/create-review.js`.

- [ ] Extend the review submission form (`#submit-review-form` in `room-details.html`, and the equivalent in `user/index.html`'s `#review-modal`) to collect **sub-ratings**: Cleanliness, Accuracy, Check-in, Communication, Location, Value (1–5 each, e.g. star rows or sliders), in addition to the existing overall rating + comment.
- [ ] Update the Firestore review document shape to store these as a `subRatings: { cleanliness, accuracy, checkin, communication, location, value }` map; keep `rating` as the overall score for backward compatibility with existing reviews that lack sub-ratings.
- [ ] Update `netlify/functions/create-review.js`'s validation (per `AGENTS.md §1.D` — structured input validation) to accept and range-check the new fields without breaking submissions that omit them (older client caches, etc. — though since this is same-deploy, mainly guard against malformed payloads).
- [ ] Render the aggregate sub-rating bars on the PDP per Phase 4's task, computed client-side from `getReviewsByRoomId` (average each sub-field across reviews that have it) rather than requiring a new server aggregation job — this matches the project's current "compute on read" style seen elsewhere (e.g. average rating for the rating pill).
- [ ] Update the admin Reviews tab (`assets/js/admin/reviews.js`) to display the sub-rating breakdown per review so the Admin can see the same detail a guest sees.

### Phase 10 — Admin Listing Wizard ("Property Studio")
**Files:** `admin/index.html` (Rooms view / `openAddRoomModal`), `assets/js/admin/inventory.js`, `netlify/functions/admin-action.js`.

This is the single biggest **admin-side** change, converting today's one long "Add Room" modal form into an Airbnb-style guided multi-step publishing flow. Remember: **this wizard is for the one Admin account only** — it is not a public "list your property" flow, and must remain behind the existing `/admin/` auth + custom-claims gate. Do not expose any part of it outside `/admin/`.

- [ ] Read the current `openAddRoomModal()` implementation and full field list in `assets/js/admin/inventory.js` before restructuring, so no existing field (pricing tiers, amenities, highlights, images, location map pin, description, category, capacity, etc.) is dropped.
- [ ] Rebuild the modal as a **step-indicator wizard** with these steps (naming can be adjusted to match existing field groupings, but the grouping should be):
  1. **Structure** — property/category type, location, capacity (guests/bedrooms/bathrooms/beds), map pin (Leaflet picker already used elsewhere in the app).
  2. **Photos** — Cloudinary multi-upload widget (already integrated per `.agents/memory.md`), with drag-to-reorder and a "set as cover photo" action on hover.
  3. **Amenities & Highlights** — the existing amenities checkbox/tag set + key-highlight bullets.
  4. **Description** — the existing rich-text field (confirm current editor: `.agents/memory.md` says Quill was integrated, but `update.md`'s "Problem 4" note says Quill was reverted to a plain `<textarea>` — **verify which is actually in the current file before touching it**, per §0.3 of this plan).
  5. **Pricing & Availability** — daily/weekly/monthly rate tiers (already modeled — see stay-duration discount logic reused across `index.html`/`room-details.html`/`booking.html`), plus any blackout/availability controls.
  6. **Review & Publish** — a read-only summary of steps 1–5 with an explicit "Publish" button that calls the existing `admin-action.js` mutation path.
- [ ] Add a persistent **step progress indicator** at the top of the modal (numbered circles + connecting line, visually consistent with `booking.html`'s stepper for brand cohesion) and Back/Next buttons; allow jumping back to any completed step.
- [ ] Preserve all existing validation and the server-side mutation call — this is a UI restructuring of an existing form, not a new backend feature. All writes must continue to go through `admin-action.js`; do not add any new direct client Firestore writes for rooms.
- [ ] Apply the same wizard pattern to the "Edit Room" flow, defaulting to whichever step contains the field the Admin most recently touched isn't necessary — defaulting to Step 1 is fine for edits.

### Phase 11 — Admin Calendar & Pricing View
**Files:** `admin/index.html` (`#admin-calendar`), `assets/js/admin/dashboard.js` (or wherever FullCalendar is initialized — locate it before editing).

- [ ] Enhance the existing FullCalendar view to show **per-day price and booked/available status** color-coding across the Admin's rooms (Airbnb host-calendar style), with the ability to click a date range and bulk-adjust price or block dates — only if FullCalendar's plugin set already loaded (`update 2.0.md` confirms FullCalendar is present) supports this without adding new CDN dependencies; if a plugin is needed, add its CDN to CSP per §0.4 first.
- [ ] This phase is lower priority than Phases 1–10 — treat it as a stretch goal once the guest-facing conversion is complete and tested.

### Phase 12 — Notifications / Messaging (Light-Touch, Optional)
**Files:** new, minimal.

Do **not** build a full two-way real-time chat inbox — that's a disproportionate amount of new surface area (and new security surface) for a single-property booking site, and isn't what "Inbox" needs to mean here. Instead:

- [ ] Add a simple **in-app notification bell** in the navbar for logged-in guests, backed by a `notifications/{uid}` collection (same ownership-scoped rule pattern as Phase 6's wishlists) populated server-side by existing flows that already send emails (`booking-email.js`, `reschedule-booking.js`, admin reply-to-review) — i.e., write an in-app notification doc at the same point those functions already send an email, rather than building a new trigger system.
- [ ] The "Inbox" tab stubbed into the Phase 1 mobile tab bar can simply route to this notification list for now. A real bidirectional messaging system is out of scope for this conversion; note it as a future idea in `.agents/memory.md` rather than building it.

### Phase 13 — Microcopy, Empty States, Motion & Accessibility Pass
**Files:** all touched pages.

- [ ] Sweep every new/changed empty state (no bookings, no wishlist items, no search results, no reviews yet) for warm, specific copy — one sentence of context + one clear CTA, matching the tone already used in `#no-rooms-fallback`, `active-bookings-empty-state`, etc.
- [ ] Sweep every new interactive element (heart, calendar day cells, stepper nodes, wizard steps) for `aria-label`s and keyboard focus states — the existing codebase already cares about accessibility touches (`aria-label="Close Menu"` on the mobile drawer close button is a good existing example to match).
- [ ] Replace any remaining `alert()` calls introduced or touched during this project with `KaghanUI.showToast()` for consistency (it already exists and is used elsewhere — don't reintroduce native alerts).
- [ ] Confirm every new component honors `responcive.md`'s mobile rules (16px form inputs, safe-area padding, `-webkit-tap-highlight-color: transparent`) — this is easy to forget on hand-rolled components like the calendar picker and the wizard.

---

## 6. New/Changed Data Model Summary

| Collection/Field | Status | Notes |
|---|---|---|
| `wishlists/{uid}` | **New** | Owner-scoped read/write rule (Phase 6). |
| `notifications/{uid}` | **New, optional** | Owner-scoped read; server-only create (Phase 12). |
| `reviews/{id}.subRatings` | **New field** | Map of 6 sub-scores; optional/backward-compatible (Phase 9). |
| `rooms`, `bookings`, `users`, `coupons`, `blogs`, `categories`, `locations`, `upgrades`, `subscribers`, `newsletters` | **Existing — currently open (`allow write: if true`) in `firestore.rules`** | Not this plan's primary scope, but do not add any new client write path to these collections while implementing the phases above; keep using `admin-action.js` for all admin mutations, and flag the open-rules issue to the human if a full remediation pass isn't already scheduled. |

---

## 7. Suggested Execution Order

1. Phase 1 (shell/nav) → unlocks Phase 6's tab bar entry point early.
2. Phase 2 (home search) → produces the reusable calendar/guest-picker component everything else needs.
3. Phase 3 (browse/map) and Phase 4 (PDP) in parallel — both consume Phase 2's calendar component and both need the heart button, so land Phase 6's data layer (`wishlist.js` + rule) just before or alongside them.
4. Phase 6 (wishlists) data layer + UI.
5. Phase 5 (checkout polish).
6. Phase 7 (auth) and Phase 8 (dashboard) together — both touch the guest identity/account experience.
7. Phase 9 (reviews depth) — feeds back into Phase 4's rating breakdown, so land it before considering Phase 4 fully "done."
8. Phase 10 (admin wizard) — independent of the guest-facing work; can be done by a second agent/session in parallel to everything above.
9. Phase 11 (admin calendar) and Phase 12 (notifications) — stretch goals, do last.
10. Phase 13 (polish pass) — sweep continuously, and again fully at the end.

---

## 8. Acceptance Checklist

Before calling any phase "done," confirm:

- [ ] No native `<input type="date">` remains anywhere a guest picks stay dates (hero search, rooms filter, PDP booking card, booking.html, reschedule modal) — all replaced by the shared calendar component.
- [ ] Every room/listing card, everywhere one is rendered (home featured grid, rooms grid, map popover, PDP "more listings" feed), has a working heart/save button reflecting real wishlist state for logged-in users.
- [ ] `firestore.rules` contains a scoped rule for every new collection added (no new `allow write: if true`).
- [ ] No new `innerHTML` assignment of unsanitized dynamic content was introduced (check every new render function against `AGENTS.md §1.D`).
- [ ] Any new CDN/script is present in `netlify.toml`'s CSP, and the service worker (`service-worker.js`) is not re-broken by it (per `update.md`/`update 2.0.md`'s history of this exact failure mode — same-origin-only caching should already protect against this if v7's fix is intact; verify it still is).
- [ ] The Admin "Add/Edit Room" flow is fully gated behind `/admin/` auth + custom claims; no new public entry point into it exists.
- [ ] Mobile (`<768px`) pass on every changed page: safe-area insets respected, tap targets ≥44px, 16px inputs, bottom tab bar doesn't overlap the mobile sticky booking bar on the PDP or the mobile filter bar on `rooms.html` — check z-index stacking explicitly.
- [ ] `.agents/memory.md` updated with an honest, specific account of what changed in this pass, following its existing log format — including calling out anything from this plan that was intentionally deferred or found to already differ from a prior log entry.

---

## 9. One-Line Prompts (If You Need to Hand Phases to an Agent Individually)

- *"Implement Phase 2 of `convert.md`: replace the native date inputs in `index.html`'s hero search with a reusable calendar range-picker component in a new `assets/js/search-widget.js`, preserving the existing `#search-check-in`/`#search-check-out` element IDs and value contract used by `filterIndexRooms`."*
- *"Implement Phase 6 of `convert.md`: add a wishlist feature — `wishlists/{uid}` collection with an owner-scoped Firestore rule, `KaghanDB.getWishlist()`/`toggleWishlistItem()` in `shared.js`, heart buttons on all room cards, and a Wishlists section in `user/index.html`."*
- *"Implement Phase 10 of `convert.md`: convert the Admin 'Add Room' modal in `assets/js/admin/inventory.js`/`admin/index.html` into a 6-step wizard (Structure, Photos, Amenities & Highlights, Description, Pricing & Availability, Review & Publish), keeping all writes routed through `admin-action.js` and the flow fully inside `/admin/`."*

Use the same phase-by-phase framing for any phase not listed here — the pattern is: cite the phase number, name the primary files, and restate the one non-negotiable constraint that phase depends on (existing element IDs, security rule scoping, or admin-only gating).
