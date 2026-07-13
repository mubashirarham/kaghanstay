---
name: Firebase Admin SDK Integration
description: A skill to guide the integration of Firebase Admin SDK and writing secure Firestore rules.
---

# Firebase Admin SDK & Rules Guide

This skill handles database connectivity, server-side data mutation, and database protection rules.

## Core Guidelines

### 1. Writing Firestore Rules (`firestore.rules`)
* Keep the rules file at the root: [firestore.rules](file:///d:/Kaghan%20Stay/firestore.rules).
* Enforce deny-by-default logic.
* Ensure client reads of dynamic content are public only when necessary (e.g., `rooms` catalog).
* Restrict all writes to administrative operations or authenticated owners.

### 2. Using Firebase Admin SDK in Netlify Functions
* Do not access Firestore via anonymous REST endpoints on client or server.
* Initialize the Firebase Admin SDK inside Netlify functions:
  ```javascript
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    });
  }
  const db = admin.firestore();
  ```
* Ensure service account credentials are loaded via environment variables, never hardcoded.

### 3. Verification
* Test rules by running a script or test suite attempting anonymous access to write protected collections (`bookings`, `users`).
