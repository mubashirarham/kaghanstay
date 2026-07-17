const { admin, fdb } = require('./_admin-init');
const { z } = require('zod');

const RequestSchema = z.object({
    bookingId: z.string().min(1, "Booking ID is required")
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
                body: JSON.stringify({ error: 'Validation failed: ' + validation.error.errors.map(e => e.message).join(', ') })
            };
        }

        const { bookingId } = validation.data;
        const cleanBookingId = bookingId.trim().toUpperCase();

        const bookingDoc = await fdb.collection('bookings').doc(cleanBookingId).get();
        if (!bookingDoc.exists) {
            return {
                statusCode: 404,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                body: JSON.stringify({ error: 'Reservation not found. Please verify the ID.' })
            };
        }

        const bookingData = bookingDoc.data();

        // Retrieve room details for room name
        const roomDoc = await fdb.collection('rooms').doc(bookingData.roomId).get();
        const roomName = roomDoc.exists ? roomDoc.data().name : 'Premium Suite';
        const roomImage = roomDoc.exists ? roomDoc.data().image : '';

        // Obscure guest name and protect PII (email/phone)
        const rawName = bookingData.guestName || 'Valued Guest';
        const nameParts = rawName.split(' ');
        let obscuredName = nameParts[0];
        if (nameParts.length > 1) {
            obscuredName += ' ' + nameParts[nameParts.length - 1].charAt(0) + '.';
        }

        // Calculate dynamic tracking stage progress
        const todayStr = new Date().toISOString().split('T')[0];
        const checkIn = bookingData.checkIn;
        const checkOut = bookingData.checkOut;
        
        let stage = 'confirmed'; // default
        let stageLabel = 'Confirmed';
        let progressPercent = 25;
        let detailsMessage = 'Your reservation is confirmed. We are looking forward to hosting you!';

        if (bookingData.status === 'cancelled') {
            stage = 'cancelled';
            stageLabel = 'Cancelled';
            progressPercent = 0;
            detailsMessage = 'This booking has been cancelled.';
        } else if (todayStr > checkOut) {
            stage = 'completed';
            stageLabel = 'Checked Out';
            progressPercent = 100;
            detailsMessage = 'Thank you for staying at KPH Stay! We hope you had a luxurious experience.';
        } else if (todayStr >= checkIn && todayStr <= checkOut) {
            stage = 'checked_in';
            stageLabel = 'Checked In';
            progressPercent = 75;
            detailsMessage = 'Welcome to KPH Stay! Your stay is currently active.';
        } else {
            // Stay is in the future
            // Show as "Assigned & Prepared" if checkin is within 2 days
            const checkInDate = new Date(checkIn);
            const todayDate = new Date(todayStr);
            const daysToStay = Math.ceil((checkInDate - todayDate) / (1000 * 3600 * 24));
            
            if (daysToStay <= 2) {
                stage = 'assigned';
                stageLabel = 'Room Prepared';
                progressPercent = 50;
                detailsMessage = 'Your luxury suite is being prepared and inspected for your arrival.';
            } else {
                stage = 'confirmed';
                stageLabel = 'Confirmed';
                progressPercent = 25;
                detailsMessage = 'Your reservation is confirmed. Pre-arrival inspection starts 48 hours before check-in.';
            }
        }

        const responsePayload = {
            id: bookingData.id,
            guestName: obscuredName,
            roomName: roomName,
            roomImage: roomImage,
            checkIn: checkIn,
            checkOut: checkOut,
            totalPrice: bookingData.totalPrice,
            status: bookingData.status,
            stage: stage,
            stageLabel: stageLabel,
            progressPercent: progressPercent,
            detailsMessage: detailsMessage,
            billingCycle: bookingData.billingCycle || 'daily',
            createdAt: bookingData.createdAt
        };

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                booking: responsePayload
            })
        };

    } catch (err) {
        console.error("Booking tracking error:", err);
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
