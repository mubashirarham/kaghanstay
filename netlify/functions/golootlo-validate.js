require('dotenv').config();
const { z } = require('zod');
const { checkRateLimit } = require('./_rate-limiter');
const { validateGolootloCoupon } = require('./_golootlo-helper');

const ValidateSchema = z.object({
    code: z.string().min(5, "Golootlo coupon code must be 5–12 characters").max(12, "Golootlo coupon code must be 5–12 characters")
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
    const rateCheck = await checkRateLimit(clientIp, 'golootlo_validate', 30, 600);
    if (rateCheck.isLimited) {
        return {
            statusCode: 429,
            headers: { 'Access-Control-Allow-Origin': allowedOrigin },
            body: JSON.stringify({ valid: false, error: 'Too many coupon validation attempts. Please try again later.' })
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const validation = ValidateSchema.safeParse(body);
        if (!validation.success) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                body: JSON.stringify({
                    valid: false,
                    error: validation.error.errors[0]?.message || 'Invalid coupon code format (must be 5–12 characters).'
                })
            };
        }

        const rawCode = validation.data.code;
        const result = await validateGolootloCoupon(rawCode);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(result)
        };

    } catch (err) {
        console.error('[Golootlo Validate] Unexpected handler error:', err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': allowedOrigin },
            body: JSON.stringify({ valid: false, error: 'Internal server error validating coupon.' })
        };
    }
};
