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
        console.error("Firebase Admin SDK initialization failed in subscribe-newsletter:", e);
    }
}

let fdb = null;
try {
    fdb = admin.firestore();
} catch (e) {
    console.error("Firebase services retrieval failed in subscribe-newsletter:", e);
}

const RequestSchema = z.object({
    email: z.string().email("Invalid email address format.")
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

    if (!fdb) {
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
                body: JSON.stringify({ error: validation.error.errors[0].message })
            };
        }

        const email = validation.data.email.toLowerCase().trim();

        // Check if already subscribed in a transaction or basic check
        const subscribersRef = fdb.collection('newsletter');
        const query = await subscribersRef.where('email', '==', email).limit(1).get();
        
        if (!query.empty) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                body: JSON.stringify({ error: 'This email is already subscribed to our newsletter.' })
            };
        }

        const subscriberId = 'sub-' + Math.floor(10000 + Math.random() * 90000);
        await subscribersRef.doc(subscriberId).set({
            id: subscriberId,
            email: email,
            subscribedAt: new Date().toISOString()
        });

        console.log(`[Newsletter Subscription] E-mail subscribed successfully: ${email}`);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Thank you for subscribing to our newsletter!'
            })
        };

    } catch (err) {
        console.error("Newsletter subscription error:", err);
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
