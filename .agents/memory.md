# Workspace Memory Log

This file serves as the persistence memory for AI agents working on the Kaghan Stay project. 

> [!IMPORTANT]
> **RULE FOR AGENTS:** You MUST update this file after completing any task, modifying configurations, adding features, or resolving security vulnerabilities. Keep the records updated so that future agent invocations have a continuous history of work performed, decisions made, and system configurations.

## Last Updated
* **Date:** 2026-07-17
* **Status:** Secure booking, serverless rescheduling flow, and Firestore rules lockdown complete.

## Project Context Summary
* **Project Name:** Kaghan Stay (Resort Booking Platform)
* **Stack:** Static HTML/JS/CSS + Firebase Firestore (Client SDK & REST) + Netlify Functions (Node.js) + Netlify Edge Functions (Deno) + Groq LLM Chatbot
* **Major Goal:** Systematically remediate security vulnerabilities outlined in [fixing.md](file:///d:/Kaghan%20Stay/fixing.md) (e.g., Firestore rules, auth verification, secure email sending, inputs sanitization, and rate limiting).

## Task History & Decisions Memory

### 1. Workspace Configuration (2026-07-13)
* **Action:** Created agent customization rules and skills directories.
* **Paths Created:**
  * [.agents/](file:///d:/Kaghan%20Stay/.agents) (native customization root)
  * [.agent/](file:///d:/Kaghan%20Stay/.agent) (user-requested fallback directory)
* **Files Added:**
  * `AGENTS.md` (Project rules and security principles)
  * `skills/security_remediation/SKILL.md` (Security loop state machine)
  * `skills/firebase_admin/SKILL.md` (Admin SDK and Rules guide)
  * `skills/secure_coding/SKILL.md` (XSS prevention, CORS, and CSP guidelines)
  * `skills/chatbot_concierge/SKILL.md` (Secure LLM tool calling, loop caps, and TOCTOU prevention)
  * `skills/input_validation/SKILL.md` (Payload validation using Zod)
  * `README.md` (Structure guide)
  * `memory.md` (This persistent memory log)

### 2. Rooms Page Bug Fixing (2026-07-13)
* **Resolved Issues:**
  * **RangeError (Maximum call stack size exceeded):** Renamed local `renderNavbar` function inside `booking.html` to `renderBookingNavbar` and updated call sites to prevent infinite self-recursion shadowing `window.renderNavbar`.
  * **CSP Connection Block:** Added CDNs (`https://cdn.tailwindcss.com`, `https://cdnjs.cloudflare.com`, `https://fonts.googleapis.com`, `https://fonts.gstatic.com`) to the `connect-src` directive in `netlify.toml`'s Content Security Policy. This allows the Service Worker (`service-worker.js`) to cache assets successfully.
  * **502 Bad Gateway (create-booking):** Modified `netlify/functions/create-booking.js` and `netlify/functions/chatbot.js` to run queries transactionally (`transaction.get(query)`) and `await` outbound `fetch` requests (`Promise.all`) before returning the handler's response. This prevents the serverless environments from abruptly freezing and killing pending sockets.

### 3. Cloudinary Upload Widget & Hardcore Mobile Responsiveness (2026-07-13)
* **Resolved Issues:**
  * **Cloudinary Widget Blocked by CSP:** Allowed `https://*.cloudinary.com` domains in `script-src`, `connect-src`, and `frame-src` Content-Security-Policy directives in `netlify.toml`.
  * **Hardcore Mobile Responsiveness:**
    * Created `responcive.md` detailing the mobile responsiveness remediation plan.
    * Added `viewport-fit=cover` to viewports of all 13 HTML files to support notch safe-area calculations on bezel-less iPhones and Androids.
    * Fixed iOS focus auto-zoom bug by raising input/select/textarea font-size to `16px` on viewport width < 1024px in `assets/css/style.css`.
    * Implemented safe-area spacing padding calculations for headers, drawers, bottom navbars, and chatbot elements using CSS variables (`env(safe-area-inset-*)`).
    * Configured `-webkit-tap-highlight-color: transparent` globally for high-end native touch-response aesthetics.

### 4. Admin Panel & CSP Customizations (2026-07-13)
* **Resolved Issues:**
  * **CSP Inline Font Blocked:** Added `data:` to the `font-src` directive in `netlify.toml` to support base64 encoded inline fonts in stylesheets.
  * **CSP Source Maps Blocked:** Added `https://www.gstatic.com` to the `connect-src` directive in `netlify.toml` to permit DevTools downloading Firebase source maps.
  * **502 Bad Gateway (send-newsletter):** Fixed ReferenceErrors in `netlify/functions/send-newsletter.js` where the local SMTP credentials variables (`smtpHost`, `smtpPort`, `smtpUser`, `smtpPass`) were mismatched as `host`, `port`, `user`, and `pass` in nodemailer.
  * **Firebase Admin Interop crash:** Added interop checking (`adminModule.default || adminModule` and safe check `admin.apps && admin.apps.length`) in all 5 Firebase Admin SDK serverless functions (`create-booking.js`, `setup-db.js`, `send-newsletter.js`, `customer-reminders.js`, and `chatbot.js`) to prevent `TypeError: Cannot read properties of undefined (reading 'length')` in Node.js environments where modules wrap exports in a default object.
  * **Admin Chatbot Removal:** Added a pathname check `window.location.pathname.includes('/admin/')` in `shared.js:injectChatbot` to automatically suppress the AI chatbot widget from injecting on any administrator panel dashboard page.
  * **Hyperlinked Navbar Logo:** Wrapped the navbar brand logo with an `<a href="index.html">` tag across all 11 public pages of the main website.

### 5. Category Navigation & Mock Data Cleaning (2026-07-13)
* **Resolved Issues:**
  * **Category Navigation Bug:** Fixed selector in `filterIndexRooms` in `index.html`. It was querying `#index-category-bar button` which did not exist, preventing category active highlights. Corrected it to target `#index-categories-container button`.
  * **Mock Data Removal:** Removed unused fallback/mock arrays (`DEFAULT_CATEGORIES`, `DEFAULT_LOCATIONS`, `DEFAULT_COUPONS`, `DEFAULT_ROOMS`, and `DEFAULT_BOOKINGS`) from `assets/js/shared.js` to ensure the application relies purely on active database synchronizations rather than client-side mock leaks.

### 6. Admin Panel Map & Rich-Text Editor Fix (2026-07-13)
* **Resolved Issues:**
  * **Leaflet Map and Quill Editor blocked by CSP:** Found that Leaflet map files (`https://unpkg.com`) and Quill rich text editor resources (`https://cdn.quilljs.com`) were being blocked from loading by the Content-Security-Policy header, causing maps to hide and descriptions to be uneditable.
  * **CSP Fix:** Updated the CSP inside `netlify.toml` to:
    * Allow `https://unpkg.com` and `https://cdn.quilljs.com` inside `script-src` and `style-src` directives.
    * Allow `https://cdn.quilljs.com` in `font-src` directive for editor icons/fonts.
    * Allow `https://*.basemaps.cartocdn.com` in `img-src` directive to permit map tiles from rendering.
  * **Service Worker CORS Caching Error:** Fixed a fetch failure in `service-worker.js` during the `install` event when pre-caching Tailwind CDN and other third-party assets. Rewrote the install event handler to fetch external resources individually with `mode: 'no-cors'` to avoid CORS blockages, and bumped the cache identifier to `kph-stay-cache-v4` to force immediate registration updates.

### 7. Booking Hardening, Serverless Rescheduling, & Rules Lockdown (2026-07-17)
* **Resolved Issues:**
  * **Server-side Upgrades Calculation (C-05):** Integrated the custom premium upgrades system into `netlify/functions/create-booking.js` to dynamically fetch, validate, and add upgrade costs on the server, eliminating client-side price tampering.
  * **Forced Booking Claims Check:** Added check for the `force` overrides flag in `create-booking.js` and verified custom claims to restrict forced bookings to verified admin accounts.
  * **Serverless Rescheduling Flow:** Created `netlify/functions/reschedule-booking.js` to process date modifications transactionally on the server, enforcing dynamic loyalty points discount calculations and overlap date validation.
  * **Admin Mutations Migration:** Migrated all remaining client direct Firestore write APIs (rooms addition/edits, blog posts, reviews deletion, newsletter deletion) to use the `callAdminAction` wrapper communicating securely via the `admin-action.js` serverless function.
  * **Firestore Rules Hardening (C-01):** Deployed a strict lockdown on `firestore.rules` denying direct client writes on catalog (`rooms`, `blogs`, `upgrades`, etc.) and restricting `bookings` updates to status updates only (cancellation) for the booking owner.
  * **WhatsApp Floating Concierge Widget:** Injected a dynamic, floating WhatsApp chat-bubble launcher widget (`injectWhatsApp()`) on the bottom-right of the public pages, positioned vertically above the AI chatbot trigger. Added mutual auto-close rules so that opening one widget automatically collapses the other, maintaining a clean layout. Excluded the widget from the admin panel view.
  * **Reversion of Housekeeping Manager:** Completely removed all tab navigation buttons, managers, stats cards, and scripts for housekeeping in the admin dashboard.
  * **Advanced Metrics Charts:** Added two new ApexCharts widgets to the admin overview dashboard tab (`#room-revenue-chart` and `#occupancy-trend-chart`) demonstrating Suite Revenue Contribution (horizontal bars) and Occupancy Rate Timeline (weekly area curve) metrics dynamically derived from bookings and room inventory details.
  * **Home Page Search & Layout Fixes:** Corrected overlap error on the Category Filter section by replacing the negative margin block wrapper, upgraded select menus to beautiful custom glassmorphic selector boxes, and rerouted the search widget submit action to perform live check-in/out and location filtering directly on the home page with a smooth-scroll window slide.
  * **Skeleton Loader Integration:** Implemented premium skeleton loading states across the guest suites grid, categories list, blog articles list, and reservation upgrades container (`index.html`, `rooms.html`, `blog.html`, `booking.html`, and `assets/js/rooms.js`).

## Active / Next Tasks
1. Test and verify email notifications and newsletters dispatch stability on production.
2. Complete audit on remaining Low/Medium findings (e.g. Rate limiting, CSP strictness).
3. Validate user accounts registration and claims flow in the production environment.

---

### 8. Kaghan Stay → Airbnb-Grade UX Conversion (`convert.md`) (2026-07-23)
* **Status:** Implemented all 13 phases specified in `convert.md`.
* **Phases Completed:**
  * **Phase 1 (Global Shell & Navigation):** Added `renderMobileTabBar()` in `assets/js/shared.js` to inject a persistent mobile bottom navigation bar (`Explore`, `Wishlists`, `Trips`, `Notifications`, `Account`) respecting `env(safe-area-inset-bottom)`. Added Airbnb design tokens to `style.css`.
  * **Phase 2 (Search & Discovery):** Created reusable `assets/js/search-widget.js` providing a two-month side-by-side interactive datepicker calendar overlay, flexible dates selector, and guest counter stepper while preserving hidden inputs contract (`#search-check-in`, `#search-check-out`).
  * **Phase 3 (Browse / Listings Grid + Map):** Added heart/save button to all room cards in `assets/js/rooms.js` and `index.html`. Upgraded Leaflet map markers to custom price-bubble pills (`.leaflet-price-bubble`) with hover sync.
  * **Phase 4 (Listing Detail Page - PDP):** Added PDP heart button next to title in `room-details.html`, integrated search widget range picker, and added sub-ratings breakdown container.
  * **Phase 5 (Checkout & Booking Flow):** Polished receipt itemization syntax and cancellation policy line in `booking.html`.
  * **Phase 6 (Wishlists & Saved Stays):** Created `assets/js/wishlist.js`, added `KaghanDB.getWishlist()` and `KaghanDB.toggleWishlistItem()` in `shared.js`, updated `firestore.rules` with owner-scoped `match /wishlists/{uid}` security rule.
  * **Phase 7 (Guest Auth / Onboarding):** Converted registration card in `login.html` into a 2-step wizard with password strength meter, match feedback, and post-signup welcome screen.
  * **Phase 8 (Guest Dashboard):** Added Wishlists rendering and tabbed organization in `user/index.html`.
  * **Phase 9 (Reviews Sub-Ratings & Depth):** Updated `netlify/functions/create-review.js` Zod schema and handler to validate and store `subRatings` map in Firestore.
  * **Phase 10 (Admin Listing Wizard):** Added 6-step wizard step navigation (`setAddRoomStep(stepNum)`) in `assets/js/admin/inventory.js`.
  * **Phase 12 (Notifications):** Created `assets/js/notifications.js` for in-app guest notifications and added owner-scoped rule `match /notifications/{uid}` in `firestore.rules`.
  * **Phase 13 (Polish & Accessibility Pass):** Replaced native `alert()` calls with `KaghanUI.showToast()` across `contact.html`, `shared.js`, and `newsletter.js`.

### 9. Airbnb Listing Availability Calendar & Admin Date Blocking (2026-07-23)
* **Status:** Implemented guest availability calendar & admin date blocking.
* **Features Implemented:**
  * **Shared DB & Helpers:** Added `KaghanDB.getRoomAvailability(roomId)` and updated `isRoomAvailable` in [`assets/js/shared.js`](file:///d:/Kaghan%20Stay/assets/js/shared.js) to compile active guest reservations + `room.blockedDates`.
  * **Guest PDP Calendar:** Added real-time 2-month side-by-side interactive Availability Calendar card (`#pdp-calendar-container`) in [`room-details.html`](file:///d:/Kaghan%20Stay/room-details.html) with color coding (Green = Available, Red/Strikethrough = Booked/Blocked, Gold = Selected).
  * **Search Widget Range Validation:** Updated [`assets/js/search-widget.js`](file:///d:/Kaghan%20Stay/assets/js/search-widget.js) datepicker to disable booked/blocked dates and prevent selecting date ranges that overlap unavailable periods.
  * **Admin Date Blocking Tool:** Added `"Calendar"` button to room inventory cards and built `#admin-room-calendar-modal` in [`admin/index.html`](file:///d:/Kaghan%20Stay/admin/index.html) and [`assets/js/admin/inventory.js`](file:///d:/Kaghan%20Stay/assets/js/admin/inventory.js). Admin can click any date to toggle block state, view guest reservations tooltips, use quick presets ("Block Next Weekend"), and save changes securely via `admin-action.js`.

### 10. Real-Time Client & Admin Messaging Module (2026-07-23)
* **Status:** Implemented real-time bi-directional messaging system between Guests and Host/Admin.
* **Features Implemented:**
  * **Firestore Security Rules:** Added `match /chats/{guestUid}` and `match /chats/{guestUid}/messages/{msgId}` in [`firestore.rules`](file:///d:/Kaghan%20Stay/firestore.rules) enforcing guest owner-isolation (`request.auth.uid == guestUid` or Admin).
  * **Messaging Engine:** Created [`assets/js/messaging.js`](file:///d:/Kaghan%20Stay/assets/js/messaging.js) supporting `onSnapshot` real-time listeners for single guest streams and all-threads admin feed, message sending, and unread flags.
  * **Admin Messaging Center:** Created [`assets/js/admin/messaging.js`](file:///d:/Kaghan%20Stay/assets/js/admin/messaging.js) and added `#view-messages` in [`admin/index.html`](file:///d:/Kaghan%20Stay/admin/index.html) with thread switcher, guest details header, live chat stream, and reply box.
  * **Guest Chat Interfaces:** Added Live Host Chat card in [`user/index.html`](file:///d:/Kaghan%20Stay/user/index.html) and slide-over chat drawer in [`room-details.html`](file:///d:/Kaghan%20Stay/room-details.html).

### 11. Hero Search Custom Dropdowns & Rooms Page Filter Reroute (2026-07-23)
* **Status:** Fixed Hero search dropdowns, stay duration tag selection, and rooms page filter redirection.
* **Features Implemented:**
  * **Custom Dropdown CSS & JS:** Added `.custom-dropdown` and `.dropdown-menu` glassmorphism rules to [`assets/css/style.css`](file:///d:/Kaghan%20Stay/assets/css/style.css) and built `window.toggleCustomDropdown()` in [`index.html`](file:///d:/Kaghan%20Stay/index.html).
  * **Selectable Stay Duration Tags:** Added `window.selectHeroStayType()` supporting Daily, Weekly (-15%), and Monthly (-35%) selections updating `#hero-stay-type`.
  * **Suite Style Selection:** Added Suite Style custom dropdown (`#dropdown-type`) to hero search form.
  * **Filter Search Redirection & Parsing:** Updated `handleHeroSearchSubmit()` in [`index.html`](file:///d:/Kaghan%20Stay/index.html) to construct query parameters (`rooms.html?location=...&type=...&checkin=...&checkout=...&guests=...&stayType=...`) and enhanced `loadParams()` in [`assets/js/rooms.js`](file:///d:/Kaghan%20Stay/assets/js/rooms.js) to auto-apply all URL search filters on page load.

