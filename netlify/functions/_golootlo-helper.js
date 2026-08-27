require('dotenv').config();
const { fdb } = require('./_admin-init');

/**
 * Golootlo API Configuration & Integration Helper
 * Compliant with official Golootlo Coupon Redemption API Specifications
 */

function getGolootloConfig() {
    const username = process.env.GOLOOTLO_USERNAME || 'kph@stay';
    const password = process.env.GOLOOTLO_PASSWORD || '5@qeRoA9Tx6PIw2)';
    const merchantCode = process.env.GOLOOTLO_MERCHANT_CODE || '1268';
    const baseUrl = (process.env.GOLOOTLO_API_BASE_URL || 'https://api-toolkit-staging.golootlo.pk').replace(/\/+$/, '');
    const channelId = process.env.GOLOOTLO_CHANNEL_ID || '01';
    const defaultCoupon = (process.env.GOLOOTLO_DEFAULT_COUPON || 'KPHSTAY').toUpperCase();
    const discountPercentage = parseInt(process.env.GOLOOTLO_DISCOUNT_PERCENT || '15', 10);

    const authStr = `${username}:${password}`;
    const authHeader = `Basic ${Buffer.from(authStr, 'utf8').toString('base64')}`;

    return {
        username,
        password,
        merchantCode,
        baseUrl,
        channelId,
        defaultCoupon,
        discountPercentage,
        authHeader,
        validateUrl: `${baseUrl}/api/merchants/${merchantCode}/coupons/validate`,
        redeemUrl: `${baseUrl}/api/merchants/${merchantCode}/coupons/redeem`
    };
}

/**
 * Clean & format Pakistani or international phone numbers to 10-11 numeric digits for Golootlo
 * Returns empty string if phone number is not 10-11 digits
 */
function formatMobileNumber(phone) {
    if (!phone || typeof phone !== 'string') return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('92') && digits.length === 12) {
        return digits.substring(2); // 3001234567 (10 digits)
    }
    if (digits.length >= 10 && digits.length <= 11) {
        return digits;
    }
    return '';
}

/**
 * Generate UTC ISO8601 timestamp string: YYYY-MM-DDTHH:MM:SSZ
 */
function getUtcTimestamp(date = new Date()) {
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Validate a Golootlo coupon code via Golootlo Staging / Production API
 */
async function validateGolootloCoupon(rawCode) {
    if (!rawCode || typeof rawCode !== 'string') {
        return { valid: false, error: 'Coupon code is required.' };
    }

    const code = rawCode.trim().toUpperCase();
    if (code.length < 5 || code.length > 12) {
        return { valid: false, error: 'Golootlo coupon code must be 5–12 characters.' };
    }

    const config = getGolootloConfig();

    try {
        const response = await fetch(config.validateUrl, {
            method: 'POST',
            headers: {
                'Authorization': config.authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ChannelId: config.channelId,
                GolootloCouponCode: code
            }),
            signal: AbortSignal.timeout(8000)
        });

        const data = await response.json().catch(() => null);

        if (data && data.Error === false && data.Data && data.Data.Status === '00') {
            return {
                valid: true,
                code: code,
                discountPercentage: config.discountPercentage,
                provider: 'golootlo',
                message: data.Data.Message || `Golootlo ${config.discountPercentage}% discount verified!`
            };
        }

        const errMsg = data?.Data?.Message || (data && data.Error ? 'Invalid or expired Golootlo coupon.' : 'Coupon code is invalid.');
        return {
            valid: false,
            code: code,
            error: errMsg
        };
    } catch (err) {
        console.warn('[Golootlo API] Validation network warning:', err.message);
        // Fallback for partner default coupon during temporary upstream outage
        if (code === config.defaultCoupon) {
            return {
                valid: true,
                code: code,
                discountPercentage: config.discountPercentage,
                provider: 'golootlo',
                message: `Golootlo Partner Deal (${config.discountPercentage}% OFF)`
            };
        }
        return {
            valid: false,
            error: 'Unable to reach Golootlo validation service. Please try again.'
        };
    }
}

/**
 * Redeem a Golootlo coupon for a confirmed room reservation.
 * Includes idempotency check, payload sanitization, external API dispatch, and Firestore audit persistence.
 */
async function redeemGolootloCoupon({
    code,
    bookingId,
    guestName,
    guestMobile = '',
    guestEmail = '',
    totalAmount = 0,
    discountedAmount = 0
}) {
    if (!code || !bookingId || !guestName) {
        return {
            success: false,
            error: 'Missing required redemption parameters (code, bookingId, guestName).'
        };
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanBookingId = String(bookingId).trim().substring(0, 32);
    const cleanGuestName = String(guestName).trim();
    const formattedMobile = formatMobileNumber(guestMobile);
    const cleanEmail = (guestEmail || '').trim().toLowerCase();
    const totalNum = Math.max(0, Number(totalAmount) || 0);
    const discountNum = Math.max(0, Number(discountedAmount) || 0);
    const timestampUtc = getUtcTimestamp();
    const config = getGolootloConfig();

    const redemptionDocId = `${cleanBookingId}_${cleanCode}`;

    // 1. Idempotency Check: Avoid duplicate redemptions if already executed
    if (fdb) {
        try {
            const existingSnap = await fdb.collection('golootlo_redemptions').doc(redemptionDocId).get();
            if (existingSnap.exists && existingSnap.data().apiSuccess === true) {
                console.log(`[Golootlo Redeem] Booking ${cleanBookingId} already redeemed with code ${cleanCode}. Returning cached result.`);
                return {
                    success: true,
                    message: 'Golootlo voucher already redeemed.',
                    bookingId: cleanBookingId,
                    couponCode: cleanCode,
                    discountedAmount: discountNum,
                    alreadyRedeemed: true
                };
            }
        } catch (checkErr) {
            console.warn('[Golootlo Redeem] Idempotency check warning:', checkErr.message);
        }
    }

    // 2. Build official Golootlo API Payload
    const redeemPayload = {
        ChannelId: config.channelId,
        GolootloCouponCode: cleanCode,
        CustName: cleanGuestName,
        OrdRefNo: cleanBookingId,
        TotalAmount: totalNum.toFixed(2),
        DiscountedAmount: discountNum.toFixed(2),
        Timestamp: timestampUtc
    };

    if (formattedMobile) {
        redeemPayload.CustMobile = formattedMobile;
    }
    if (cleanEmail && cleanEmail.includes('@')) {
        redeemPayload.CustEmail = cleanEmail;
    }

    let golootloApiSuccess = false;
    let golootloApiResponse = null;
    let apiMessage = '';

    try {
        console.log(`[Golootlo Redeem] Dispatching redemption to Golootlo API for booking ${cleanBookingId}...`);
        const apiRes = await fetch(config.redeemUrl, {
            method: 'POST',
            headers: {
                'Authorization': config.authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(redeemPayload),
            signal: AbortSignal.timeout(8000)
        });

        golootloApiResponse = await apiRes.json().catch(() => null);

        if (golootloApiResponse && golootloApiResponse.Error === false && golootloApiResponse.Data && golootloApiResponse.Data.Status === '00') {
            golootloApiSuccess = true;
            apiMessage = golootloApiResponse.Data.Message || 'Coupon code applied successfully.';
            console.log(`[Golootlo Redeem] Successfully redeemed code ${cleanCode} for booking ${cleanBookingId}: ${apiMessage}`);
        } else {
            apiMessage = golootloApiResponse?.Data?.Message || (golootloApiResponse?.Error ? 'Golootlo redemption returned error status.' : 'Redemption recorded locally.');
            console.warn(`[Golootlo Redeem] Golootlo API response:`, golootloApiResponse);
        }
    } catch (fetchErr) {
        console.warn('[Golootlo Redeem API] External call error:', fetchErr.message);
        apiMessage = 'External Golootlo API call error, logged locally for reconciliation.';
    }

    // 3. Store redemption record in Firestore for finance auditing & partner reconciliation
    const nowIso = new Date().toISOString();
    const redemptionRecord = {
        bookingId: cleanBookingId,
        couponCode: cleanCode,
        guestName: cleanGuestName,
        guestEmail: cleanEmail,
        guestMobile: formattedMobile,
        totalAmount: totalNum,
        discountedAmount: discountNum,
        timestampUtc: timestampUtc,
        apiSuccess: golootloApiSuccess,
        apiResponse: golootloApiResponse,
        status: golootloApiSuccess ? 'redeemed' : 'logged',
        createdAt: nowIso
    };

    if (fdb) {
        try {
            await fdb.collection('golootlo_redemptions').doc(redemptionDocId).set(redemptionRecord, { merge: true });

            // Attach voucher details directly to booking document if it exists
            const bookingRef = fdb.collection('bookings').doc(cleanBookingId);
            const bookingDoc = await bookingRef.get();
            if (bookingDoc.exists) {
                await bookingRef.update({
                    golootloVoucher: {
                        code: cleanCode,
                        discountedAmount: discountNum,
                        totalAmount: totalNum,
                        status: golootloApiSuccess ? 'redeemed' : 'logged',
                        redeemedAt: nowIso,
                        apiMessage: apiMessage
                    },
                    updatedAt: nowIso
                });
            }
        } catch (dbErr) {
            console.error('[Golootlo Redeem] Firestore logging error:', dbErr.message);
        }
    }

    return {
        success: true,
        apiSuccess: golootloApiSuccess,
        message: apiMessage || 'Golootlo voucher processed.',
        bookingId: cleanBookingId,
        couponCode: cleanCode,
        discountedAmount: discountNum
    };
}

module.exports = {
    getGolootloConfig,
    formatMobileNumber,
    getUtcTimestamp,
    validateGolootloCoupon,
    redeemGolootloCoupon
};
