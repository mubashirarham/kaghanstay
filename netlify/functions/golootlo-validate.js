require('dotenv').config();
const { z } = require('zod');
const { checkRateLimit } = require('./_rate-limiter');

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

        const rawCode = validation.data.code.trim();
        const code = rawCode.toUpperCase();

        const username = process.env.GOLOOTLO_USERNAME || 'kph@stay';
        const password = process.env.GOLOOTLO_PASSWORD || '5@qeRoA9Tx6PIw2)';
        const merchantCode = process.env.GOLOOTLO_MERCHANT_CODE || '1268';
        const baseUrl = (process.env.GOLOOTLO_API_BASE_URL || 'https://api-toolkit-staging.golootlo.pk').replace(/\/$/, '');
        const channelId = process.env.GOLOOTLO_CHANNEL_ID || '01';
        const defaultCoupon = (process.env.GOLOOTLO_DEFAULT_COUPON || 'KPHSTAY1').toUpperCase();
        const discountPercentage = parseInt(process.env.GOLOOTLO_DISCOUNT_PERCENT || '15', 10);

        const authStr = `${username}:${password}`;
        const authB64 = Buffer.from(authStr, 'utf8').toString('base64');
        const apiUrl = `${baseUrl}/api/merchants/${merchantCode}/coupons/validate`;

        let apiSuccess = false;
        let apiMessage = '';

        try {
            const apiRes = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${authB64}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ChannelId: channelId,
                    GolootloCouponCode: code
                }),
                signal: AbortSignal.timeout(7000)
            });

            const data = await apiRes.json();
            
            if (data && data.Error === false && data.Data && data.Data.Status === '00') {
                apiSuccess = true;
                apiMessage = data.Data.Message || 'Golootlo coupon verified successfully.';
            } else if (code === defaultCoupon) {
                // Partner campaign code authorized for KPH Stay merchant
                apiSuccess = true;
                apiMessage = `Golootlo Partner Campaign Code ${defaultCoupon} Applied (${discountPercentage}% OFF)`;
            } else {
                apiMessage = data?.Data?.Message || 'Coupon code is invalid or expired.';
            }
        } catch (fetchErr) {
            console.warn('[Golootlo API] Validate request error:', fetchErr.message);
            // Fallback for partner default coupon if API is temporarily unreachable
            if (code === defaultCoupon) {
                apiSuccess = true;
                apiMessage = `Golootlo Partner Campaign Code ${defaultCoupon} Applied (${discountPercentage}% OFF)`;
            } else {
                return {
                    statusCode: 502,
                    headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                    body: JSON.stringify({ valid: false, error: 'Unable to reach Golootlo validation service. Please try again.' })
                };
            }
        }

        if (apiSuccess) {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': allowedOrigin,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    valid: true,
                    code: code,
                    discountPercentage: discountPercentage,
                    provider: 'golootlo',
                    message: apiMessage
                })
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                valid: false,
                error: apiMessage || 'Invalid or expired Golootlo coupon code.'
            })
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
