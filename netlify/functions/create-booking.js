const { admin, fdb, auth, generateBookingId, resolveIsAdmin } = require('./_admin-init');
const { z } = require('zod');

const BookingSchema = z.object({
    roomId: z.string().min(1, "Room ID is required"),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid check-in date format. Use YYYY-MM-DD."),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid check-out date format. Use YYYY-MM-DD."),
    guestName: z.string().min(1, "Guest name is required"),
    guestEmail: z.string().email("Invalid email address."),
    guestPhone: z.string().optional().nullable(),
    couponCode: z.string().optional().nullable(),
    billingCycle: z.string().optional().nullable(),
    pdfBase64: z.string().optional().nullable(),
    idToken: z.string().optional().nullable(),
    upgrades: z.array(z.string()).optional().nullable(),
    force: z.boolean().optional().nullable()
});

exports.handler = async (event, context) => {
    const origin = event.headers.origin || event.headers.Origin || '';
    let allowedOrigin = 'https://kphstay.com';
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        allowedOrigin = origin;
    }

    // Enable CORS
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
        
        // Zod validation
        const validation = BookingSchema.safeParse(body);
        if (!validation.success) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                body: JSON.stringify({ error: 'Validation failed: ' + validation.error.errors.map(e => e.message).join(', ') })
            };
        }

        const { roomId, checkIn, checkOut, guestName, guestEmail, guestPhone, couponCode, billingCycle, pdfBase64, idToken, upgrades, force } = validation.data;

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

        // 2. Authenticate user if token is provided
        let userId = 'usr-guest-walkin';
        let isAdmin = false;
        if (idToken && auth) {
            try {
                const decodedToken = await auth.verifyIdToken(idToken);
                userId = decodedToken.uid;
                isAdmin = await resolveIsAdmin(decodedToken, fdb);
            } catch (authErr) {
                console.warn("Invalid ID Token provided, falling back to guest walk-in:", authErr);
            }
        }

        let bookingId = '';
        let calculatedPrice = 0;
        let roomName = 'Luxury Suite';

        // 3. Perform Availability Check and Write inside Transaction to prevent TOCTOU race condition (M-04)
        await fdb.runTransaction(async (transaction) => {
            // Allocate unique booking ID with collision check
            let allocatedId = generateBookingId();
            let attempts = 0;
            let existingDoc = await transaction.get(fdb.collection('bookings').doc(allocatedId));
            while (existingDoc.exists && attempts < 5) {
                allocatedId = generateBookingId();
                existingDoc = await transaction.get(fdb.collection('bookings').doc(allocatedId));
                attempts++;
            }
            if (existingDoc.exists) {
                throw new Error('Could not allocate a unique booking ID, please retry.');
            }
            bookingId = allocatedId;

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

            // Fetch upgrades
            let dbUpgrades = [];
            const upgradesQuery = fdb.collection('upgrades');
            const upgradesSnap = await upgradesQuery.get();
            upgradesSnap.forEach(doc => dbUpgrades.push({ id: doc.id, ...doc.data() }));
            if (dbUpgrades.length === 0) {
                dbUpgrades = [
                    {
                        id: 'upgrade-airport-shuttle',
                        name: 'Airport VIP Transfer',
                        price: 5000,
                        priceType: 'flat'
                    },
                    {
                        id: 'upgrade-dining-breakfast',
                        name: 'In-suite Dining Package',
                        price: 2500,
                        priceType: 'night'
                    },
                    {
                        id: 'upgrade-spa-tray',
                        name: 'Organic Spa Amenities Tray',
                        price: 1500,
                        priceType: 'flat'
                    }
                ];
            }

            let addonsTotal = 0;
            const selectedUpgradesDetails = [];
            if (upgrades && Array.isArray(upgrades)) {
                upgrades.forEach(upId => {
                    const matched = dbUpgrades.find(u => u.id === upId);
                    if (matched) {
                        const price = Number(matched.price || 0);
                        const cost = matched.priceType === 'night' ? price * stayNights : price;
                        addonsTotal += cost;
                        selectedUpgradesDetails.push({
                            id: matched.id,
                            name: matched.name,
                            price: price,
                            priceType: matched.priceType || 'flat'
                        });
                    }
                });
            }

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

            calculatedPrice = (subtotal + tax + addonsTotal) - couponDiscount;

            // B. Overlap check (Bypass if forced by admin)
            if (!force || !isAdmin) {
                const query = fdb.collection('bookings').where('roomId', '==', roomId);
                const bookingsSnap = await query.get();
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
                upgrades: selectedUpgradesDetails,
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
                'Access-Control-Allow-Origin': allowedOrigin,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Reservation confirmed successfully.',
                booking: { id: bookingId, totalPrice: calculatedPrice }
            })
        };

    } catch (err) {
        console.error("Reservation creation error:", err);
        const isExpected = ['Requested accommodation style not found.', 'Suite is already reserved for the selected dates.'].includes(err.message);
        return {
            statusCode: isExpected ? 400 : 500,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: isExpected ? err.message : 'Failed to complete reservation.' })
        };
    }
};
