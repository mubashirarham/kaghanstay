const { fdb } = require('./_admin-init');
const { z } = require('zod');

const CouponSchema = z.object({
    code: z.string().min(1, "Coupon code is required")
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
                'Access-Control-Allow-Headers': 'Content-Type',
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
            body: JSON.stringify({ error: 'Database service unavailable' })
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const validation = CouponSchema.safeParse(body);
        if (!validation.success) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                body: JSON.stringify({ valid: false, error: 'Coupon code is required.' })
            };
        }

        const code = validation.data.code.trim().toUpperCase();
        const couponDoc = await fdb.collection('coupons').doc(code).get();

        if (couponDoc.exists) {
            const data = couponDoc.data();
            if (data.isActive !== false) {
                return {
                    statusCode: 200,
                    headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                    body: JSON.stringify({
                        valid: true,
                        code: data.code || code,
                        discountPercentage: data.discountPercentage || 0
                    })
                };
            }
        }

        // Fallback: Query by 'code' field
        const querySnap = await fdb.collection('coupons').where('code', '==', code).where('isActive', '==', true).limit(1).get();
        if (!querySnap.empty) {
            const data = querySnap.docs[0].data();
            return {
                statusCode: 200,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                body: JSON.stringify({
                    valid: true,
                    code: data.code || code,
                    discountPercentage: data.discountPercentage || 0,
                    provider: 'kaghan'
                })
            };
        }

        // Golootlo Coupon Validation Fallback (5-12 chars)
        if (code.length >= 5 && code.length <= 12) {
            const defaultCoupon = (process.env.GOLOOTLO_DEFAULT_COUPON || 'KPHSTAY1').toUpperCase();
            const discountPercentage = parseInt(process.env.GOLOOTLO_DISCOUNT_PERCENT || '15', 10);
            
            const username = process.env.GOLOOTLO_USERNAME || 'kph@stay';
            const password = process.env.GOLOOTLO_PASSWORD || '5@qeRoA9Tx6PIw2)';
            const merchantCode = process.env.GOLOOTLO_MERCHANT_CODE || '1268';
            const baseUrl = (process.env.GOLOOTLO_API_BASE_URL || 'https://api-toolkit-staging.golootlo.pk').replace(/\/$/, '');
            const channelId = process.env.GOLOOTLO_CHANNEL_ID || '01';

            const authStr = `${username}:${password}`;
            const authB64 = Buffer.from(authStr, 'utf8').toString('base64');
            const apiUrl = `${baseUrl}/api/merchants/${merchantCode}/coupons/validate`;

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
                    return {
                        statusCode: 200,
                        headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                        body: JSON.stringify({
                            valid: true,
                            code: code,
                            discountPercentage: discountPercentage,
                            provider: 'golootlo',
                            message: data.Data.Message || `Golootlo ${discountPercentage}% discount verified!`
                        })
                    };
                }
            } catch (gErr) {
                console.warn('[validate-coupon] Golootlo fallback check warning:', gErr.message);
            }

            // If it matches partner code directly
            if (code === defaultCoupon) {
                return {
                    statusCode: 200,
                    headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                    body: JSON.stringify({
                        valid: true,
                        code: code,
                        discountPercentage: discountPercentage,
                        provider: 'golootlo',
                        message: `Golootlo Partner Deal (${discountPercentage}% OFF)`
                    })
                };
            }
        }

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': allowedOrigin },
            body: JSON.stringify({ valid: false, error: 'Invalid or expired promotional code.' })
        };
    } catch (err) {
        console.error("Validate coupon error:", err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': allowedOrigin },
            body: JSON.stringify({ valid: false, error: 'Error validating coupon.' })
        };
    }
};
