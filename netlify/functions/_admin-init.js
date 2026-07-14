/**
 * _admin-init.js — Shared Firebase Admin SDK initialization
 *
 * Uses a SINGLE env var: FIREBASE_SERVICE_ACCOUNT_B64
 * Value = base64-encoded content of the service account JSON file.
 * This approach has zero private-key formatting issues.
 *
 * Fallback: still accepts the 3 individual env vars for backward compatibility.
 */
require('dotenv').config();
const adminModule = require('firebase-admin');
const admin = adminModule.default || adminModule;

let fdb = null;
let auth = null;
let initError = null;

try {
    if (!admin.apps || !admin.apps.length) {
        let credential;

        if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
            // Preferred: single base64-encoded service account JSON
            const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8');
            const serviceAccount = JSON.parse(json);
            credential = admin.credential.cert(serviceAccount);
        } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            // Fallback: 3 individual env vars
            credential = admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            });
        } else {
            const missing = ['FIREBASE_SERVICE_ACCOUNT_B64', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']
                .filter(v => !process.env[v]);
            throw new Error(`Missing Firebase env vars: ${missing.join(', ')}`);
        }

        admin.initializeApp({ credential });
        console.log('[Firebase Admin] Initialized successfully.');
    }

    fdb = admin.firestore();
    auth = admin.auth();
} catch (e) {
    if (e.code !== 'app/duplicate-app') {
        initError = e;
        console.error('[Firebase Admin] Initialization FAILED:', e.message);
    } else {
        // Already initialized (warm instance reuse) — just get handles
        try {
            fdb = admin.firestore();
            auth = admin.auth();
        } catch (inner) {
            initError = inner;
            console.error('[Firebase Admin] Could not get Firestore/Auth handles:', inner.message);
        }
    }
}

module.exports = { admin, fdb, auth, initError };
