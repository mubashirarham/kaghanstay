require('dotenv').config();
const adminModule = require('firebase-admin');
const admin = adminModule.default || adminModule;

// Initialize Firebase Admin SDK
const apps = admin.apps || [];
if (!apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
            })
        });
    } catch (e) {
        console.error("Firebase Admin SDK initialization failed:", e);
    }
}

const fdb = (admin.apps && admin.apps.length) ? admin.firestore() : null;
const auth = (admin.apps && admin.apps.length) ? admin.auth() : null;

exports.handler = async (event, context) => {
    // Enable CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': 'https://kphstay.com', // Restrict to production origin
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
            body: JSON.stringify({ error: 'Database service is currently unavailable.' })
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { roomId, checkIn, checkOut, guestName, guestEmail, guestPhone, couponCode, billingCycle, pdfBase64, idToken } = body;

        // 1. Basic validation
        if (!roomId || !checkIn || !checkOut || !guestName || !guestEmail) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': 'https://kphstay.com' },
                body: JSON.stringify({ error: 'Missing required reservation fields.' })
            };
        }

        const searchIn = new Date(checkIn);
        const searchOut = new Date(checkOut);
        const today = new Date();
        today.setHours(0,0,0,0);

        if (isNaN(searchIn.getTime()) || isNaN(searchOut.getTime()) || searchIn >= searchOut || searchIn < today) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': 'https://kphstay.com' },
                body: JSON.stringify({ error: 'Invalid check-in or check-out date parameters.' })
            };
        }

        // 2. Authenticate user if token is provided
        let userId = 'usr-guest-walkin';
        if (idToken && auth) {
            try {
                const decodedToken = await auth.verifyIdToken(idToken);
                userId = decodedToken.uid;
            } catch (authErr) {
                console.warn("Invalid ID Token provided, falling back to guest walk-in:", authErr);
            }
        }

        const bookingId = 'BK-' + Math.floor(1000 + Math.random() * 9000);
        let calculatedPrice = 0;
        let roomName = 'Luxury Suite';

        // 3. Perform Availability Check and Write inside Transaction to prevent TOCTOU race condition (M-04)
        await fdb.runTransaction(async (transaction) => {
            // A. Fetch Room detail to compute price server-side
            const roomRef = fdb.collection('rooms').doc(roomId);
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists) {
                throw new Error('Requested accommodation style not found.');
            }
            const room = roomDoc.data();
            roomName = room.name;

            // Compute stay duration
            const stayNights = Math.max(1, Math.ceil((searchOut - searchIn) / (1000 * 3600 * 24)));
            let rate = room.price || room.priceDaily || 0;
            let subtotal = 0;

            if (billingCycle === 'weekly' && room.priceWeekly) {
                rate = room.priceWeekly;
                subtotal = Math.round((rate / 7) * stayNights);
            } else if (billingCycle === 'monthly' && room.priceMonthly) {
                rate = room.priceMonthly;
                subtotal = Math.round((rate / 30) * stayNights);
            } else {
                rate = room.priceDaily || room.price || 0;
                subtotal = rate * stayNights;
            }

            const tax = Math.round(subtotal * 0.15); // 15% GST

            // Validate coupon
            let couponDiscount = 0;
            if (couponCode) {
                const couponRef = fdb.collection('coupons').doc(couponCode.toUpperCase());
                const couponDoc = await transaction.get(couponRef);
                if (couponDoc.exists) {
                    const coupon = couponDoc.data();
                    if (coupon.isActive) {
                        couponDiscount = Math.round(subtotal * ((coupon.discountPercentage || 0) / 100));
                        couponDiscount = Math.min(couponDiscount, subtotal);
                    }
                }
            }

            calculatedPrice = (subtotal + tax) - couponDiscount;

            // B. Overlap check
            const query = fdb.collection('bookings').where('roomId', '==', roomId);
            const bookingsSnap = await transaction.get(query);
            for (const doc of bookingsSnap.docs) {
                const b = doc.data();
                if (b.status !== 'cancelled') {
                    const bIn = new Date(b.checkIn);
                    const bOut = new Date(b.checkOut);
                    if (searchIn < bOut && searchOut > bIn) {
                        throw new Error('Suite is already reserved for the selected dates.');
                    }
                }
            }

            // C. Create Booking
            const newBooking = {
                id: bookingId,
                userId,
                roomId,
                guestName,
                guestEmail: guestEmail.toLowerCase().trim(),
                guestPhone,
                checkIn,
                checkOut,
                totalPrice: calculatedPrice,
                couponUsed: couponCode || null,
                status: 'confirmed',
                billingCycle: billingCycle || 'daily',
                createdAt: new Date().toISOString()
            };

            const bookingRef = fdb.collection('bookings').doc(bookingId);
            transaction.set(bookingRef, newBooking);
        });

        // 4. Dispatch Notifications (booking-email & admin-notify) and await them to prevent container freezing (502 Gateway errors)
        const host = event.headers.host || 'kphstay.com';
        const scheme = host.includes('localhost') ? 'http' : 'https';
        const payload = {
            booking: {
                id: bookingId,
                guestName,
                guestEmail,
                guestPhone,
                roomId,
                roomName,
                checkIn,
                checkOut,
                totalPrice: calculatedPrice
            },
            pdfAttachment: pdfBase64,
            internalSecret: process.env.INTERNAL_API_SECRET
        };

        try {
            await Promise.all([
                fetch(`${scheme}://${host}/.netlify/functions/booking-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(res => {
                    if (!res.ok) console.error(`Booking email function returned status ${res.status}`);
                }).catch(err => console.error("Async booking email dispatch failure:", err)),

                fetch(`${scheme}://${host}/.netlify/functions/admin-notify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(res => {
                    if (!res.ok) console.error(`Admin notify function returned status ${res.status}`);
                }).catch(err => console.error("Async admin alert dispatch failure:", err))
            ]);
        } catch (dispatchErr) {
            console.error("Notification dispatch failed:", dispatchErr);
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': 'https://kphstay.com',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Reservation confirmed successfully.',
                booking: { id: bookingId, totalPrice: calculatedPrice }
            })
        };

    } catch (err) {
        console.error("Reservation creation error:", err);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': 'https://kphstay.com',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: err.message || 'Failed to complete reservation.' })
        };
    }
};
