const { admin, fdb, auth, generateBookingId, resolveIsAdmin } = require('./_admin-init');
const { z } = require('zod');

const BookingSchema = z.object({
    roomId: z.string().min(1, "Room ID is required"),
    checkIn: z.string().min(1, "Check-in date is required"),
    checkOut: z.string().min(1, "Check-out date is required"),
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
            headers: { 'Access-Control-Allow-Origin': allowedOrigin, 'Content-Type': 'application/json' },
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
                headers: { 'Access-Control-Allow-Origin': allowedOrigin, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Validation failed: ' + validation.error.errors.map(e => e.message).join(', ') })
            };
        }

        const { roomId, checkIn, checkOut, guestName, guestEmail, guestPhone, couponCode, billingCycle, pdfBase64, idToken, upgrades, force } = validation.data;

        // Clean date strings (extract YYYY-MM-DD if ISO format passed)
        const checkInStr = checkIn.includes('T') ? checkIn.split('T')[0] : checkIn;
        const checkOutStr = checkOut.includes('T') ? checkOut.split('T')[0] : checkOut;

        const searchIn = new Date(checkInStr);
        const searchOut = new Date(checkOutStr);
        const today = new Date();
        today.setHours(0,0,0,0);

        if (isNaN(searchIn.getTime()) || isNaN(searchOut.getTime()) || searchIn >= searchOut || searchIn < today) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Invalid check-in or check-out date parameters.' })
            };
        }

        // Authenticate user if token is provided
        let userId = 'usr-guest-walkin';
        let isAdmin = false;
        if (idToken && auth) {
            try {
                const decodedToken = await auth.verifyIdToken(idToken);
                userId = decodedToken.uid;
                isAdmin = await resolveIsAdmin(decodedToken, fdb);
            } catch (authErr) {
                console.warn("Invalid ID Token provided, falling back to guest walk-in:", authErr.message);
            }
        }

        // 1. Fetch Room detail outside transaction
        const roomRef = fdb.collection('rooms').doc(roomId);
        const roomDoc = await roomRef.get();
        if (!roomDoc.exists) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Requested accommodation style not found.' })
            };
        }
        const room = roomDoc.data();
        const roomName = room.name || 'Luxury Suite';

        // 2. Perform Overlap check outside transaction
        if (!force || !isAdmin) {
            const bookingsSnap = await fdb.collection('bookings').where('roomId', '==', roomId).get();
            for (const doc of bookingsSnap.docs) {
                const b = doc.data();
                if (b.status !== 'cancelled') {
                    const bIn = new Date(b.checkIn);
                    const bOut = new Date(b.checkOut);
                    if (searchIn < bOut && searchOut > bIn) {
                        return {
                            statusCode: 400,
                            headers: { 'Access-Control-Allow-Origin': allowedOrigin, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ error: 'Suite is already reserved for the selected dates.' })
                        };
                    }
                }
            }
        }

        // 3. Calculate pricing & addons
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

        // Fetch upgrades outside transaction
        let dbUpgrades = [];
        const upgradesSnap = await fdb.collection('upgrades').get();
        upgradesSnap.forEach(doc => dbUpgrades.push({ id: doc.id, ...doc.data() }));
        if (dbUpgrades.length === 0) {
            dbUpgrades = [
                { id: 'upgrade-airport-shuttle', name: 'Airport VIP Transfer', price: 5000, priceType: 'flat' },
                { id: 'upgrade-dining-breakfast', name: 'In-suite Dining Package', price: 2500, priceType: 'night' },
                { id: 'upgrade-spa-tray', name: 'Organic Spa Amenities Tray', price: 1500, priceType: 'flat' }
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
            const couponDoc = await couponRef.get();
            if (couponDoc.exists) {
                const coupon = couponDoc.data();
                if (coupon.isActive) {
                    couponDiscount = Math.round(subtotal * ((coupon.discountPercentage || 0) / 100));
                    couponDiscount = Math.min(couponDiscount, subtotal);
                }
            }
        }

        const calculatedPrice = (subtotal + tax + addonsTotal) - couponDiscount;
        let bookingId = '';

        // 4. Run transactional write only
        await fdb.runTransaction(async (transaction) => {
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

            const newBooking = {
                id: bookingId,
                userId,
                roomId,
                guestName,
                guestEmail: guestEmail.toLowerCase().trim(),
                guestPhone: guestPhone || '',
                checkIn: checkInStr,
                checkOut: checkOutStr,
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

        // 5. Dispatch Notifications
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
                checkIn: checkInStr,
                checkOut: checkOutStr,
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
                }).catch(err => console.error("Async booking email dispatch failure:", err.message)),

                fetch(`${scheme}://${host}/.netlify/functions/admin-notify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(res => {
                    if (!res.ok) console.error(`Admin notify function returned status ${res.status}`);
                }).catch(err => console.error("Async admin alert dispatch failure:", err.message))
            ]);
        } catch (dispatchErr) {
            console.error("Notification dispatch failed:", dispatchErr.message);
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
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: err.message || 'Failed to complete reservation.' })
        };
    }
};
