require('dotenv').config();
const adminModule = require('firebase-admin');
const admin = adminModule.default || adminModule;
const { z } = require('zod');

// Initialize Firebase Admin SDK
try {
    if (!admin.apps || !admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
            })
        });
    }
} catch (e) {
    if (e.code !== 'app/duplicate-app') {
        console.error("Firebase Admin SDK initialization failed in register-profile:", e);
    }
}

let fdb = null;
let auth = null;
try {
    fdb = admin.firestore();
    auth = admin.auth();
} catch (e) {
    console.error("Firebase services retrieval failed in register-profile:", e);
}

const RequestSchema = z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().optional(),
    idToken: z.string().min(1, "ID token is required")
});

exports.handler = async (event, context) => {
    const origin = event.headers.origin || event.headers.Origin || '';
    let allowedOrigin = 'https://kphstay.com';
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        allowedOrigin = origin;
    }
    
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    if (!fdb || !auth) {
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': allowedOrigin },
            body: JSON.stringify({ error: 'Database service is currently unavailable.' })
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const validation = RequestSchema.safeParse(body);
        if (!validation.success) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                body: JSON.stringify({ error: 'Validation failed: ' + validation.error.errors.map(e => e.message).join(', ') })
            };
        }

        const { name, phone, idToken } = validation.data;

        // Verify Firebase ID Token
        let decodedToken;
        try {
            decodedToken = await auth.verifyIdToken(idToken);
        } catch (authErr) {
            console.error("ID token verification failed:", authErr);
            return {
                statusCode: 401,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                body: JSON.stringify({ error: 'Unauthorized: Invalid ID Token.' })
            };
        }

        const uid = decodedToken.uid;
        const email = (decodedToken.email || '').toLowerCase().trim();

        const newUser = {
            id: uid,
            name,
            email,
            role: 'user', // Default role is always user
            phone: phone || '',
            loyaltyPoints: 100 // Signup loyalty bonus
        };

        await fdb.collection('users').doc(uid).set(newUser);

        console.log(`[User Registration] Profile created in Firestore for UID: ${uid}, Email: ${email}`);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Profile created successfully.',
                user: newUser
            })
        };

    } catch (err) {
        console.error("User profile registration error:", err);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};
