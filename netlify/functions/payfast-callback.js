// Netlify Serverless Function: PayFast Gateway Callback & Verification Handler
// Processes return redirects from PayFast, confirms payment in Firestore, processes partner redemptions, and redirects user to booking confirmation

const { fdb } = require('./_admin-init');
const { redeemGolootloCoupon } = require('./_golootlo-helper');

exports.handler = async (event, context) => {
    try {
        let params = {};

        // Parse GET query parameters
        if (event.queryStringParameters) {
            params = { ...event.queryStringParameters };
        }

        // Parse POST body (form-urlencoded or JSON)
        if (event.body) {
            try {
                if (event.headers['content-type']?.includes('application/json')) {
                    params = { ...params, ...JSON.parse(event.body) };
                } else {
                    const parsedBody = new URLSearchParams(event.body);
                    for (const [key, value] of parsedBody.entries()) {
                        params[key] = value;
                    }
                }
            } catch (e) {
                console.warn("Could not parse callback body:", e.message);
            }
        }

        console.log("PayFast Callback received payload:", JSON.stringify(params));

        const errCode = params.err_code || params.ERR_CODE || params.status_code || params.STATUS_CODE || params.code || '';
        const transactionId = params.transaction_id || params.TRANSACTION_ID || params.TransactionId || '';
        const basketId = params.basket_id || params.BASKET_ID || params.bookingId || params.booking_id || '';
        const origin = params.origin || 'https://kphstay.com';
        const cleanOrigin = origin.replace(/\/+$/, '');

        // If no basket ID, redirect back to booking page
        if (!basketId) {
            console.warn("PayFast callback received with no basket_id.");
            return {
                statusCode: 302,
                headers: {
                    Location: `${cleanOrigin}/booking.html?payment=error&message=No+booking+reference+found`
                },
                body: ''
            };
        }

        // Fetch booking from Firestore
        const bookingRef = fdb.collection('bookings').doc(basketId);
        const bookingDoc = await bookingRef.get();

        if (!bookingDoc.exists) {
            console.warn(`Booking ${basketId} not found in Firestore during PayFast callback.`);
            return {
                statusCode: 302,
                headers: {
                    Location: `${cleanOrigin}/booking.html?payment=error&bookingId=${encodeURIComponent(basketId)}&message=Booking+not+found`
                },
                body: ''
            };
        }

        const isSuccess = errCode === '00' || errCode === '0' || errCode === 'SUCCESS' || errCode === '000';

        if (isSuccess) {
            const nowIso = new Date().toISOString();
            const bookingData = bookingDoc.data() || {};

            // Update booking to Paid & Confirmed
            await bookingRef.update({
                status: 'confirmed',
                paymentStatus: 'paid',
                paymentMethod: 'payfast',
                paymentGateway: 'payfast',
                transactionId: transactionId || `PF-${Date.now()}`,
                paidAt: nowIso,
                updatedAt: nowIso,
                payfastResponse: {
                    err_code: errCode,
                    transaction_id: transactionId,
                    rdv_message_key: params.rdv_message_key || '',
                    timestamp: nowIso
                }
            });

            console.log(`✅ Booking ${basketId} successfully marked PAID via PayFast (Tx: ${transactionId})`);

            // If a Golootlo coupon was used for this booking, execute Golootlo server-side redemption
            const couponUsed = (bookingData.couponUsed || bookingData.couponCode || '').trim().toUpperCase();
            const couponProvider = bookingData.couponProvider || '';

            if (couponUsed && (couponProvider === 'golootlo' || couponUsed === 'KPHSTAY' || couponUsed.startsWith('GOL'))) {
                try {
                    const originalTotal = Number(bookingData.totalPrice || 0) + Number(bookingData.discount || 0);
                    await redeemGolootloCoupon({
                        code: couponUsed,
                        bookingId: basketId,
                        guestName: bookingData.guestName || 'Valued Guest',
                        guestMobile: bookingData.guestPhone || '',
                        guestEmail: bookingData.guestEmail || '',
                        totalAmount: originalTotal,
                        discountedAmount: Number(bookingData.discount || 0)
                    });
                } catch (gErr) {
                    console.warn(`[PayFast Callback] Golootlo redemption trigger notice for booking ${basketId}:`, gErr.message);
                }
            }

            // Redirect customer to booking confirmation modal
            return {
                statusCode: 302,
                headers: {
                    Location: `${cleanOrigin}/booking.html?payment=success&bookingId=${encodeURIComponent(basketId)}&txId=${encodeURIComponent(transactionId)}`
                },
                body: ''
            };
        } else {
            // Payment failed or was cancelled by user
            await bookingRef.update({
                paymentStatus: 'failed',
                updatedAt: new Date().toISOString(),
                payfastResponse: {
                    err_code: errCode,
                    error_message: params.message || params.err_msg || 'Transaction declined or cancelled',
                    timestamp: new Date().toISOString()
                }
            });

            console.warn(`⚠️ PayFast payment failed for booking ${basketId} (Error Code: ${errCode})`);

            return {
                statusCode: 302,
                headers: {
                    Location: `${cleanOrigin}/booking.html?payment=failed&bookingId=${encodeURIComponent(basketId)}&errCode=${encodeURIComponent(errCode)}`
                },
                body: ''
            };
        }
    } catch (err) {
        console.error("PayFast callback critical error:", err);
        return {
            statusCode: 302,
            headers: {
                Location: `https://kphstay.com/booking.html?payment=error&message=${encodeURIComponent(err.message || 'Server error')}`
            },
            body: ''
        };
    }
};
