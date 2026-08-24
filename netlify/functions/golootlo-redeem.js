require('dotenv').config();
const { z } = require('zod');
const { fdb } = require('./_admin-init');
const { checkRateLimit } = require('./_rate-limiter');

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

        const {
            code,
            bookingId,
            guestName,
            guestMobile,
            guestEmail,
            totalAmount,
            discountedAmount
        } = validation.data;

        const cleanCode = code.trim().toUpperCase();
        const cleanBookingId = bookingId.trim().substring(0, 32);

        // Clean Pakistani phone to 10-11 digits numeric format for Golootlo (e.g. 03001234567 or 3001234567)
        let formattedMobile = '';
        if (guestMobile) {
            const digits = guestMobile.replace(/\D/g, '');
            if (digits.startsWith('92') && digits.length === 12) {
                formattedMobile = digits.substring(2); // 3001234567 (10 digits)
            } else if (digits.length >= 10 && digits.length <= 11) {
                formattedMobile = digits;
            }
        }

        const username = process.env.GOLOOTLO_USERNAME || 'kph@stay';
        const password = process.env.GOLOOTLO_PASSWORD || '5@qeRoA9Tx6PIw2)';
        const merchantCode = process.env.GOLOOTLO_MERCHANT_CODE || '1268';
        const baseUrl = (process.env.GOLOOTLO_API_BASE_URL || 'https://api-toolkit-staging.golootlo.pk').replace(/\/$/, '');
        const channelId = process.env.GOLOOTLO_CHANNEL_ID || '01';

        // ISO8601 UTC timestamp format: YYYY-MM-DDTHH:MM:SSZ
        const now = new Date();
        const timestampUtc = now.toISOString().replace(/\.\d{3}Z$/, 'Z');

        const authStr = `${username}:${password}`;
        const authB64 = Buffer.from(authStr, 'utf8').toString('base64');
        const apiUrl = `${baseUrl}/api/merchants/${merchantCode}/coupons/redeem`;

        const redeemPayload = {
            ChannelId: channelId,
            GolootloCouponCode: cleanCode,
            CustName: guestName.trim(),
            OrdRefNo: cleanBookingId,
            TotalAmount: totalAmount.toFixed(2),
            DiscountedAmount: discountedAmount.toFixed(2),
            Timestamp: timestampUtc
        };

        if (formattedMobile) {
            redeemPayload.CustMobile = formattedMobile;
        }
        if (guestEmail && guestEmail.trim().length > 0) {
            redeemPayload.CustEmail = guestEmail.trim().toLowerCase();
        }

        let golootloApiSuccess = false;
        let golootloApiResponse = null;
        let apiMessage = '';

        try {
            const apiRes = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${authB64}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(redeemPayload),
                signal: AbortSignal.timeout(7000)
            });

            golootloApiResponse = await apiRes.json();

            if (golootloApiResponse && golootloApiResponse.Error === false && golootloApiResponse.Data && golootloApiResponse.Data.Status === '00') {
                golootloApiSuccess = true;
                apiMessage = golootloApiResponse.Data.Message || 'Golootlo voucher redeemed successfully.';
            } else {
                apiMessage = golootloApiResponse?.Data?.Message || 'Redemption registered locally.';
            }
        } catch (fetchErr) {
            console.warn('[Golootlo Redeem API] External call error:', fetchErr.message);
            apiMessage = 'External Golootlo API call error, logged locally for sync.';
        }

        // Store redemption record in Firestore for finance settlement and auditing
        const redemptionRecord = {
            bookingId: cleanBookingId,
            couponCode: cleanCode,
            guestName: guestName.trim(),
            guestEmail: (guestEmail || '').trim().toLowerCase(),
            guestMobile: formattedMobile,
            totalAmount: totalAmount,
            discountedAmount: discountedAmount,
            timestampUtc: timestampUtc,
            apiSuccess: golootloApiSuccess,
            apiResponse: golootloApiResponse,
            status: 'redeemed',
            createdAt: now.toISOString()
        };

        if (fdb) {
            try {
                // Save to golootlo_redemptions collection
                await fdb.collection('golootlo_redemptions').doc(`${cleanBookingId}_${cleanCode}`).set(redemptionRecord, { merge: true });

                // Also attach golootlo discount info directly to the booking document if it exists
                const bookingRef = fdb.collection('bookings').doc(cleanBookingId);
                const bookingDoc = await bookingRef.get();
                if (bookingDoc.exists) {
                    await bookingRef.update({
                        golootloVoucher: {
                            code: cleanCode,
                            discountedAmount: discountedAmount,
                            totalAmount: totalAmount,
                            status: 'redeemed',
                            redeemedAt: now.toISOString()
                        }
                    });
                }
            } catch (dbErr) {
                console.error('[Golootlo Redeem] Database logging notice:', dbErr.message);
            }
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                message: apiMessage || 'Golootlo voucher processed.',
                bookingId: cleanBookingId,
                couponCode: cleanCode,
                discountedAmount: discountedAmount
            })
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
