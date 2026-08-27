// Netlify Serverless Helper: PayFast Payment Gateway Integration
// Supports Sandbox (UAT) & Production Environments, Token Caching, and Checkout Sessions

const { fdb } = require('./_admin-init');

const DEFAULT_SANDBOX_CONFIG = {
    enabled: true,
    environment: 'sandbox', // 'sandbox' | 'production'
    merchantId: '14833',
    securedKey: 'rPcy4T7GQkSCFsHBLdn26s',
    merchantName: 'KPH Stay',
    currency: 'PKR',
    sandboxBaseUrl: 'https://ipguat.apps.net.pk/Ecommerce/api',
    productionBaseUrl: 'https://ipg.apps.net.pk/Ecommerce/api'
};

// In-memory token cache for Lambda reuse
let cachedToken = null;
let tokenExpiry = 0;

/**
 * Fetch PayFast settings from Firestore settings/payment with fallback to defaults/env
 */
async function getPayFastConfig() {
    try {
        const doc = await fdb.collection('settings').doc('payment').get();
        if (doc.exists) {
            const data = doc.data() || {};
            return {
                enabled: data.enabled !== false,
                environment: data.environment || process.env.PAYFAST_ENV || 'sandbox',
                merchantId: data.merchantId || process.env.PAYFAST_MERCHANT_ID || DEFAULT_SANDBOX_CONFIG.merchantId,
                securedKey: data.securedKey || process.env.PAYFAST_SECURED_KEY || DEFAULT_SANDBOX_CONFIG.securedKey,
                merchantName: data.merchantName || 'KPH Stay',
                currency: data.currency || 'PKR',
                sandboxBaseUrl: data.sandboxBaseUrl || DEFAULT_SANDBOX_CONFIG.sandboxBaseUrl,
                productionBaseUrl: data.productionBaseUrl || DEFAULT_SANDBOX_CONFIG.productionBaseUrl
            };
        }
    } catch (err) {
        console.warn("Could not read settings/payment, using defaults:", err.message);
    }

    return {
        ...DEFAULT_SANDBOX_CONFIG,
        merchantId: process.env.PAYFAST_MERCHANT_ID || DEFAULT_SANDBOX_CONFIG.merchantId,
        securedKey: process.env.PAYFAST_SECURED_KEY || DEFAULT_SANDBOX_CONFIG.securedKey,
        environment: process.env.PAYFAST_ENV || DEFAULT_SANDBOX_CONFIG.environment
    };
}

/**
 * Get the active API Base URL based on environment
 */
function getApiBaseUrl(config) {
    return config.environment === 'production'
        ? (config.productionBaseUrl || DEFAULT_SANDBOX_CONFIG.productionBaseUrl)
        : (config.sandboxBaseUrl || DEFAULT_SANDBOX_CONFIG.sandboxBaseUrl);
}

/**
 * Retrieve PayFast Access Token with multi-tier caching (Memory + Firestore) and fast recovery
 */
async function getAccessToken(config, forceRefresh = false) {
    const now = Date.now();
    
    // 1. Fast in-memory cache check
    if (!forceRefresh && cachedToken && tokenExpiry > (now + 60000)) {
        return cachedToken;
    }

    // 2. Firestore persistent cache check
    if (!forceRefresh && fdb) {
        try {
            const cacheDoc = await fdb.collection('settings').doc('payment_cache').get();
            if (cacheDoc.exists) {
                const cacheData = cacheDoc.data();
                if (cacheData.token && cacheData.merchantId === config.merchantId && cacheData.expiresAt > (now + 60000)) {
                    cachedToken = cacheData.token;
                    tokenExpiry = cacheData.expiresAt;
                    return cachedToken;
                }
            }
        } catch (dbErr) {
            console.warn("Firestore token cache read warning:", dbErr.message);
        }
    }

    const baseUrl = getApiBaseUrl(config);
    const url = `${baseUrl}/Transaction/GetAccessToken?MERCHANT_ID=${encodeURIComponent(config.merchantId)}&SECURED_KEY=${encodeURIComponent(config.securedKey)}`;

    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s fast timeout per attempt

            const res = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'KaghanStay-BookingEngine/1.0',
                    'Accept': 'application/json'
                }
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
                throw new Error(`PayFast Token API returned status ${res.status} ${res.statusText}`);
            }

            const data = await res.json();
            const token = data.ACCESS_TOKEN || data.token || data.access_token;
            if (!token) {
                throw new Error("PayFast did not return ACCESS_TOKEN in response: " + JSON.stringify(data));
            }

            cachedToken = token;
            tokenExpiry = now + (3600 * 1000); // 1 hour validity

            // Persist to Firestore for all lambda instances
            if (fdb) {
                fdb.collection('settings').doc('payment_cache').set({
                    token: cachedToken,
                    merchantId: config.merchantId,
                    environment: config.environment,
                    expiresAt: tokenExpiry,
                    updatedAt: new Date().toISOString()
                }).catch(e => console.warn("Could not persist payment_cache to Firestore:", e.message));
            }

            return token;
        } catch (err) {
            lastError = err;
            console.warn(`PayFast token request attempt ${attempt} notice:`, err.message);
            if (attempt < 3) {
                await new Promise(r => setTimeout(r, 600 * attempt));
            }
        }
    }

    // 3. Graceful Fallback: If network had temporary glitch, check if any stored token exists in Firestore
    if (fdb) {
        try {
            const cacheDoc = await fdb.collection('settings').doc('payment_cache').get();
            if (cacheDoc.exists && cacheDoc.data()?.token) {
                console.log("Using last saved PayFast token from persistent storage.");
                cachedToken = cacheDoc.data().token;
                return cachedToken;
            }
        } catch (_) {}
    }

    throw new Error(`Failed to acquire PayFast access token: ${lastError ? lastError.message : 'UAT server timeout'}`);
}

/**
 * Format Order Date (YYYY-MM-DD HH:mm:ss) in Pakistan Standard Time
 */
function formatOrderDate(dateObj = new Date()) {
    const now = new Date(dateObj.getTime() + (5 * 60 * 60 * 1000)); // UTC+5
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    const h = String(now.getUTCHours()).padStart(2, '0');
    const min = String(now.getUTCMinutes()).padStart(2, '0');
    const s = String(now.getUTCSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

/**
 * Create PostTransaction checkout payload for PayFast redirect/form submission
 */
async function createCheckoutSession(bookingData, originUrl = 'https://kphstay.com') {
    const config = await getPayFastConfig();
    const token = await getAccessToken(config);
    const baseUrl = getApiBaseUrl(config);
    const postTransactionUrl = `${baseUrl}/Transaction/PostTransaction`;

    const cleanOrigin = originUrl.replace(/\/+$/, '');
    const basketId = bookingData.id || bookingData.bookingId || `BK-${Date.now()}`;
    const amount = Number(bookingData.totalPrice || bookingData.totalAmount || 0).toFixed(2);
    const orderDate = formatOrderDate();

    const successUrl = `${cleanOrigin}/.netlify/functions/payfast-callback?origin=${encodeURIComponent(cleanOrigin)}&bookingId=${encodeURIComponent(basketId)}`;
    const failureUrl = `${cleanOrigin}/.netlify/functions/payfast-callback?origin=${encodeURIComponent(cleanOrigin)}&bookingId=${encodeURIComponent(basketId)}`;
    const checkoutUrl = `${cleanOrigin}/.netlify/functions/payfast-callback?origin=${encodeURIComponent(cleanOrigin)}&bookingId=${encodeURIComponent(basketId)}`;

    const formFields = {
        MERCHANT_ID: String(config.merchantId),
        MERCHANT_NAME: config.merchantName || 'KPH Stay',
        TOKEN: token,
        PROCCODE: '00',
        TXNAMT: amount,
        BASKET_ID: basketId,
        ORDER_DATE: orderDate,
        TXNDESC: `Reservation for ${bookingData.roomName || 'Luxury Suite'} (${bookingData.totalNights || 1} Night(s))`,
        SUCCESS_URL: successUrl,
        FAILURE_URL: failureUrl,
        CHECKOUT_URL: checkoutUrl,
        CUSTOMER_MOBILE_NO: (bookingData.guestPhone || '').replace(/\D/g, ''),
        CUSTOMER_EMAIL_ADDRESS: bookingData.guestEmail || '',
        CURRENCY_CODE: config.currency || 'PKR',
        VERSION: 'MERCHANT-CART-0.1'
    };

    return {
        postUrl: postTransactionUrl,
        formFields,
        basketId,
        amount,
        environment: config.environment
    };
}

module.exports = {
    DEFAULT_SANDBOX_CONFIG,
    getPayFastConfig,
    getAccessToken,
    createCheckoutSession,
    formatOrderDate
};
