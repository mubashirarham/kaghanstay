require('dotenv').config();
const { z } = require('zod');
const { checkRateLimit } = require('./_rate-limiter');
const { redeemGolootloCoupon } = require('./_golootlo-helper');

const RedeemSchema = z.object({
    code: z.string().min(5).max(12),
    bookingId: z.string().min(1).max(32),
    guestName: z.string().min(1),
    guestMobile: z.string().optional(),
    guestEmail: z.string().email().optional().or(z.literal('')),
    totalAmount: z.number().min(0),
    discountedAmount: z.number().min(0)
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

    // Rate Limiting
    const clientIp = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || event.headers['client-ip'] || '127.0.0.1';
    const rateCheck = await checkRateLimit(clientIp, 'golootlo_redeem', 20, 600);
    if (rateCheck.isLimited) {
        return {
            statusCode: 429,
            headers: { 'Access-Control-Allow-Origin': allowedOrigin },
            body: JSON.stringify({ success: false, error: 'Too many redemption attempts. Please try again later.' })
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const validation = RedeemSchema.safeParse(body);
        if (!validation.success) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                body: JSON.stringify({
                    success: false,
                    error: 'Validation failed: ' + validation.error.errors.map(e => e.message).join(', ')
                })
            };
        }

        const result = await redeemGolootloCoupon(validation.data);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(result)
        };

    } catch (err) {
        console.error('[Golootlo Redeem] Handler error:', err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': allowedOrigin },
            body: JSON.stringify({ success: false, error: 'Internal server error processing redemption.' })
        };
    }
};
