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
        console.error("Firebase Admin SDK initialization failed in create-review:", e);
    }
}

let fdb = null;
let auth = null;
try {
    fdb = admin.firestore();
    auth = admin.auth();
} catch (e) {
    console.error("Firebase services retrieval failed in create-review:", e);
}

const RequestSchema = z.object({
    review: z.object({
        roomId: z.string().min(1, "Room ID is required"),
        rating: z.number().min(1).max(5),
        comment: z.string().min(1, "Comment is required"),
        guestName: z.string().min(1, "Guest name is required")
    }),
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

        const { review, idToken } = validation.data;

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
        const reviewId = fdb.collection('reviews').doc().id;
        const newReview = {
            id: reviewId,
            userId: uid,
            roomId: review.roomId,
            rating: review.rating,
            comment: review.comment,
            guestName: review.guestName,
            createdAt: new Date().toISOString()
        };

        // Run transaction to add review and update room rating to prevent TOCTOU/race condition
        await fdb.runTransaction(async (transaction) => {
            const roomRef = fdb.collection('rooms').doc(review.roomId);
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists) {
                throw new Error("Target accommodation style does not exist.");
            }

            // Create the review
            const reviewRef = fdb.collection('reviews').doc(reviewId);
            transaction.set(reviewRef, newReview);

            // Fetch reviews to calculate average
            const reviewsQuery = fdb.collection('reviews').where('roomId', '==', review.roomId);
            const reviewsSnap = await transaction.get(reviewsQuery);
            
            let totalRating = review.rating;
            let count = 1;
            
            reviewsSnap.forEach(doc => {
                const rData = doc.data();
                if (doc.id !== reviewId) { // avoid double counting if somehow query includes new doc
                    totalRating += rData.rating;
                    count++;
                }
            });

            const newRating = count > 0 ? parseFloat((totalRating / count).toFixed(1)) : 5.0;

            transaction.update(roomRef, {
                rating: newRating,
                reviewsCount: count
            });
        });

        console.log(`[Review Creation] Review added for room: ${review.roomId} by user: ${uid}`);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Review created successfully.'
            })
        };

    } catch (err) {
        console.error("Create review error:", err);
        const isExpected = err.message === 'Target accommodation style does not exist.';
        return {
            statusCode: isExpected ? 400 : 500,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: isExpected ? err.message : 'Internal Server Error' })
        };
    }
};
