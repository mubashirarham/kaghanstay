// Netlify Serverless Function: PayFast Online Checkout Endpoint
// Handles reservation validation, creates pending booking in Firestore, and generates signed PayFast checkout form

const { fdb } = require('./_admin-init');
const { createCheckoutSession, getPayFastConfig } = require('./_payfast-helper');
const { checkRateLimit } = require('./_rate-limiter');

const ALLOWED_ORIGINS = [
    'https://kphstay.com',
    'https://www.kphstay.com',
    'https://kaghanstay.netlify.app',
    'http://localhost:8888',
    'http://127.0.0.1:8888',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

function getCorsHeaders(event) {
    const origin = event.headers.origin || event.headers.Origin || '';
    const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.netlify.app') || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : 'https://kphstay.com',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
}

exports.handler = async (event, context) => {
    const corsHeaders = getCorsHeaders(event);

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method Not Allowed. POST required.' })
        };
    }

    // Rate Limiting by IP
    const clientIp = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || '127.0.0.1';
    const rateLimit = await checkRateLimit(clientIp, 'payfast-checkout', 15, 60); // 15 checkouts per minute
    if (rateLimit.isLimited) {
        return {
            statusCode: 429,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Too many checkout attempts. Please wait a moment and try again.' })
        };
    }

    try {
        const config = await getPayFastConfig();
        if (!config.enabled) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'PayFast online payment is currently disabled by administrator.' })
            };
        }

        const body = JSON.parse(event.body || '{}');
        const {
            bookingId,
            roomId,
            roomName,
            guestName,
            guestEmail,
            guestPhone,
            adults = 2,
            children = 0,
            infants = 0,
            checkIn,
            checkOut,
            totalNights = 1,
            totalPrice = 0,
            discount = 0,
            couponUsed = null,
            couponProvider = null,
            upgrades = [],
            billingCycle = 'daily',
            userId = 'usr-guest-walkin'
        } = body;

        // Validation
        if (!roomId || !guestName || !guestEmail || !guestPhone || !checkIn || !checkOut || !totalPrice) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Missing required booking fields for payment initiation.' })
            };
        }

        if (Number(totalPrice) <= 0) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Total amount must be greater than zero.' })
            };
        }

        // Validate Phone format (Pakistani 03...)
        const cleanPhone = guestPhone.replace(/\D/g, '');
        if (!cleanPhone.startsWith('03') || cleanPhone.length < 11) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Please provide a valid Pakistani mobile number starting with 03.' })
            };
        }

        // Double Booking Check in Firestore
        const existingBookingsSnap = await fdb.collection('bookings')
            .where('roomId', '==', roomId)
            .get();

        const requestedIn = new Date(checkIn);
        const requestedOut = new Date(checkOut);

        let isConflict = false;
        existingBookingsSnap.forEach(doc => {
            const b = doc.data();
            if (b.status === 'cancelled' || b.id === bookingId) return;
            const bIn = new Date(b.checkIn);
            const bOut = new Date(b.checkOut);
            // Overlap check
            if (requestedIn < bOut && requestedOut > bIn) {
                isConflict = true;
            }
        });

        if (isConflict) {
            return {
                statusCode: 409,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Selected suite is no longer available for these dates. Please choose another date range.' })
            };
        }

        // Generate unique booking ID if not provided
        const finalBookingId = bookingId || ('BK-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase());

        // Prepare Firestore Booking Record
        const bookingRecord = {
            id: finalBookingId,
            userId,
            roomId,
            roomName: roomName || 'KPH Stay Suite',
            guestName: guestName.trim(),
            guestEmail: guestEmail.trim().toLowerCase(),
            guestPhone: cleanPhone,
            adults: Number(adults) || 2,
            children: Number(children) || 0,
            infants: Number(infants) || 0,
            checkIn,
            checkOut,
            totalNights: Number(totalNights) || 1,
            totalPrice: Number(totalPrice),
            discount: Number(discount) || 0,
            couponUsed: couponUsed || null,
            couponProvider: couponProvider || null,
            upgrades: Array.isArray(upgrades) ? upgrades : [],
            status: 'pending_payment',
            paymentStatus: 'unpaid',
            paymentMethod: 'payfast',
            paymentGateway: 'payfast',
            billingCycle,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Save pending booking to Firestore
        await fdb.collection('bookings').doc(finalBookingId).set(bookingRecord);

        // Determine client origin for PayFast return URLs
        const originHeader = event.headers.origin || event.headers.Origin || 'https://kphstay.com';

        // Generate PayFast Checkout Session
        const session = await createCheckoutSession({
            ...bookingRecord,
            id: finalBookingId
        }, originHeader);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                bookingId: finalBookingId,
                environment: session.environment,
                postUrl: session.postUrl,
                formFields: session.formFields,
                amount: session.amount
            })
        };
    } catch (err) {
        console.error("PayFast checkout handler error:", err);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Failed to initiate PayFast checkout. ' + (err.message || '')
            })
        };
    }
};
