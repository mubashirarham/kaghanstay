require('dotenv').config();
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

let fdb = null;
let auth = null;
let initError = null;

try {
    const apps = getApps();
    if (!apps || !apps.length) {
        let credential;

        if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
            // Preferred: single base64-encoded service account JSON
            const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8');
            const serviceAccount = JSON.parse(json);
            credential = cert(serviceAccount);
        } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            // Fallback: 3 individual env vars
            credential = cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            });
        } else {
            const missing = ['FIREBASE_SERVICE_ACCOUNT_B64', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']
                .filter(v => !process.env[v]);
            throw new Error(`Missing Firebase env vars: ${missing.join(', ')}`);
        }

        initializeApp({ credential });
        console.log('[Firebase Admin] Initialized successfully.');
    }

    fdb = getFirestore();
    auth = getAuth();
} catch (e) {
    initError = e;
    console.error('[Firebase Admin] Initialization FAILED:', e.message);
}

module.exports = { fdb, auth, initError };
