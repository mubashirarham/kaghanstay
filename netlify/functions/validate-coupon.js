const { fdb } = require('./_admin-init');
const { z } = require('zod');
const { validateGolootloCoupon } = require('./_golootlo-helper');

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

        // 1. Check Kaghan Stay Firestore Database Coupons
        if (fdb) {
            try {
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
                                discountPercentage: data.discountPercentage || 0,
                                provider: 'kaghan'
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
            } catch (dbErr) {
                console.warn('[validate-coupon] Firestore lookup warning:', dbErr.message);
            }
        }

        // 2. Fallback: Golootlo Partner Coupon Validation (5-12 characters)
        if (code.length >= 5 && code.length <= 12) {
            const golootloResult = await validateGolootloCoupon(code);
            if (golootloResult.valid) {
                return {
                    statusCode: 200,
                    headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                    body: JSON.stringify(golootloResult)
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
