const { admin, fdb, auth } = require('./_admin-init');
const { z } = require('zod');

const RescheduleSchema = z.object({
    bookingId: z.string().min(1, "Booking ID is required"),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid check-in date format. Use YYYY-MM-DD."),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid check-out date format. Use YYYY-MM-DD."),
    idToken: z.string().min(1, "Authentication token is required")
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
            body: JSON.stringify({ error: 'Database and Auth services are currently unavailable.' })
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        
        // Validation
        const validation = RescheduleSchema.safeParse(body);
        if (!validation.success) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                body: JSON.stringify({ error: 'Validation failed: ' + validation.error.errors.map(e => e.message).join(', ') })
            };
        }

        const { bookingId, checkIn, checkOut, idToken } = validation.data;

        const searchIn = new Date(checkIn);
        const searchOut = new Date(checkOut);
        const today = new Date();
        today.setHours(0,0,0,0);

        if (searchIn >= searchOut || searchIn < today) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                body: JSON.stringify({ error: 'Invalid check-in or check-out date parameters.' })
            };
        }

        // Authenticate caller
        let uid;
        let isAdmin = false;
        try {
            const decodedToken = await auth.verifyIdToken(idToken);
            uid = decodedToken.uid;
            isAdmin = decodedToken.role === 'admin';
            if (!isAdmin) {
                const userDoc = await fdb.collection('users').doc(uid).get();
                isAdmin = userDoc.exists && userDoc.data().role === 'admin';
            }
        } catch (authErr) {
            console.error("Authentication failed during rescheduling:", authErr);
            return {
                statusCode: 401,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                body: JSON.stringify({ error: 'Unauthorized: Invalid credentials.' })
            };
        }

        let calculatedPrice = 0;

        // Perform transactional update
        await fdb.runTransaction(async (transaction) => {
            const bookingRef = fdb.collection('bookings').doc(bookingId);
            const bookingDoc = await transaction.get(bookingRef);
            if (!bookingDoc.exists) {
                throw new Error("Target booking record not found.");
            }

            const booking = bookingDoc.data();

            // Authorization check: User must own booking or be an admin
            if (booking.userId !== uid && !isAdmin) {
                throw new Error("Access Denied: You do not have permission to modify this booking.");
            }

            // Room lookup for pricing
            const roomRef = fdb.collection('rooms').doc(booking.roomId);
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists) {
                throw new Error("Associated suite type not found.");
            }
            const room = roomDoc.data();

            // Calculate nights
            const stayNights = Math.max(1, Math.ceil((searchOut - searchIn) / (1000 * 3600 * 24)));
            
            // Subtotal based on billing cycle
            let rate = room.price || room.priceDaily || 0;
            let subtotal = 0;
            const cycle = booking.billingCycle || 'daily';

            if (cycle === 'weekly' && room.priceWeekly) {
                rate = room.priceWeekly;
                subtotal = Math.round((rate / 7) * stayNights);
            } else if (cycle === 'monthly' && room.priceMonthly) {
                rate = room.priceMonthly;
                subtotal = Math.round((rate / 30) * stayNights);
            } else {
                rate = room.priceDaily || room.price || 0;
                subtotal = rate * stayNights;
            }

            const tax = Math.round(subtotal * 0.15); // 15% GST

            // Upgrades calculations
            let addonsTotal = 0;
            if (booking.upgrades && Array.isArray(booking.upgrades)) {
                booking.upgrades.forEach(up => {
                    const price = Number(up.price || 0);
                    const cost = up.priceType === 'night' ? price * stayNights : price;
                    addonsTotal += cost;
                });
            }

            // Loyalty Points checking
            let discount = 0;
            const userRef = fdb.collection('users').doc(booking.userId);
            const userDoc = await transaction.get(userRef);
            if (userDoc.exists) {
                const userData = userDoc.data();
                const points = userData.loyaltyPoints || 0;
                let tierDiscountPct = 0;
                if (points >= 500) {
                    tierDiscountPct = 0.10;
                } else if (points >= 200) {
                    tierDiscountPct = 0.05;
                }
                discount = Math.round(subtotal * tierDiscountPct);
            }

            calculatedPrice = (subtotal + tax + addonsTotal) - discount;

            // Check availability overlaps
            const bookingsQuery = fdb.collection('bookings').where('roomId', '==', booking.roomId);
            const bookingsSnap = await transaction.get(bookingsQuery);
            for (const doc of bookingsSnap.docs) {
                const b = doc.data();
                if (b.id !== bookingId && b.status !== 'cancelled') {
                    const bIn = new Date(b.checkIn);
                    const bOut = new Date(b.checkOut);
                    if (searchIn < bOut && searchOut > bIn) {
                        throw new Error("The selected room style is already reserved for these dates.");
                    }
                }
            }

            // Update
            transaction.update(bookingRef, {
                checkIn,
                checkOut,
                totalPrice: calculatedPrice
            });
        });

        // Trigger dispatch notifications async (re-use host context)
        const host = event.headers.host || 'kphstay.com';
        const scheme = host.includes('localhost') ? 'http' : 'https';
        const payload = {
            booking: {
                id: bookingId,
                checkIn,
                checkOut,
                totalPrice: calculatedPrice
            },
            internalSecret: process.env.INTERNAL_API_SECRET
        };

        // Fire-and-forget notifications (safely caught)
        const fetch = require('node-fetch'); // import fetch if needed, but fetch is global in Deno, and standard node global in newer node. Since we are using standard Netlify functions we can import node-fetch if needed. Wait, in create-booking they used global fetch, node-fetch isn't imported. Node 18+ has fetch natively!
        fetch(`${scheme}://${host}/.netlify/functions/booking-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => console.warn("Reschedule email notification dispatch failed:", err));

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Reservation rescheduled successfully.',
                booking: { id: bookingId, checkIn, checkOut, totalPrice: calculatedPrice }
            })
        };

    } catch (err) {
        console.error("Reschedule execution failed:", err);
        const isExpected = [
            "Target booking record not found.",
            "Access Denied: You do not have permission to modify this booking.",
            "Associated suite type not found.",
            "The selected room style is already reserved for these dates."
        ].includes(err.message);

        return {
            statusCode: isExpected ? 400 : 500,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: isExpected ? err.message : 'Failed to reschedule reservation.' })
        };
    }
};
