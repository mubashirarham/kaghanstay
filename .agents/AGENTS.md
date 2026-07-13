# Kaghan Stay Project Rules & Guidelines

Welcome to the Kaghan Stay project agent rules. These rules ensure that all modifications to the Kaghan Stay codebase are secure, high-quality, and align with the remediation requirements specified in the project audit (`fixing.md`).

## 1. Security First Principles

All development and remediation must strictly adhere to the following security rules:

### A. Firebase and Database Security
* **No Direct Write Access:** The Firestore database must not be writeable from the client side without authentication and validation.
* **Firestore Security Rules:** Maintain and respect the `firestore.rules` configuration. Every query and document access must go through the appropriate security constraints.
* **Server-side Mutations:** All database updates, creation, and mutations must be executed through Netlify Serverless Functions using the Firebase Admin SDK. The client SDK should only perform authenticated, read-only queries for authorized public catalog data.

### B. Authentication & Authorization
* **No Client-side Role Trust:** Never trust role configuration stored in `localStorage` or other client-side storage.
* **Firebase Authentication:** All authentication must use Firebase Auth. Do not implement custom login systems that store passwords in Firestore.
* **Plaintext Passwords:** Plaintext passwords must never be stored in the database, passed through API calls, or printed in logs. All passwords must be managed by Firebase Auth.
* **Custom Claims:** Admin roles and other security clearances must be managed via Firebase Auth custom claims, verified server-side on each request.

### C. Serverless Function Security
* **No Wildcard CORS:** Never set `Access-Control-Allow-Origin: *` for any serverless function that handles database writes, emails, or AI interactions. Always restrict origins to the primary application domain.
* **Authentication Gating:** Serverless functions handling sensitive actions must verify the caller's Firebase ID token before performing any business logic.
* **Generic Error Messages:** Do not return detailed errors or stack traces to the client. Log verbose errors server-side and return generic error summaries to the client (preventing information disclosure).

### D. Input Validation & Escaping (XSS Prevention)
* **DOM Injection:** Avoid using `innerHTML` to render dynamic data from the database. Use `textContent`, `innerText`, or sanitize using a library like DOMPurify if HTML rendering is required.
* **Prerendering Safety:** Any data interpolated into static pages or prerendered HTML must be properly HTML-escaped.
* **Input Schema Validation:** Use structured validation (e.g., Zod) for all API payloads before executing logic. Cap arrays and limit requests to prevent resources/memory exhaustion.

### E. Rate Limiting and Cost Management
* **Durable Rate Limiting:** Rate limiters must use shared storage (e.g., Netlify Blobs, KV, or Redis) rather than in-memory variables which reset per instance.
* **API Key Integrity:** API keys (such as Groq API Key, Firebase service account keys, etc.) must never be hardcoded in files. They must be loaded dynamically from environment variables.

---

## 2. Code Quality & Standards

### A. HTML / CSS / JS Development
* **Modern Design:** Keep the frontend visual design premium, utilizing CSS variables, responsive typography, and clean layout patterns.
* **Consistent Branding:** Ensure all templates, emails, and client copy refer consistently to "Kaghan Stay" (or its chosen canonical brand).

### B. Edge Functions
* Use Netlify Edge Functions for routing, filtering, and light processing only.
* Ensure Edge Functions are secure and do not bypass serverless function security policies.
