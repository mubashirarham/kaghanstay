const { getStore } = require('@netlify/blobs');

/**
 * Durable Rate Limiter using Netlify Blobs
 * @param {string} ip - Client IP address
 * @param {string} action - Action identifier (e.g. 'register', 'login')
 * @param {number} limit - Maximum allowed requests within window (default: 10)
 * @param {number} windowSeconds - Time window in seconds (default: 900 = 15 mins)
 * @returns {Promise<{ isLimited: boolean, current: number, resetTime: number }>}
 */
async function checkRateLimit(ip, action = 'register', limit = 10, windowSeconds = 900) {
    const cleanIp = (ip || '127.0.0.1').replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${action}_${cleanIp}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    // Bypass rate limiting on local development / localhost IP
    if (cleanIp === '127.0.0.1' || cleanIp === '_1' || cleanIp === 'localhost' || !process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
        return { isLimited: false, current: 1, resetTime: now + windowMs };
    }

    try {
        const store = getStore({ name: 'rate-limits' });
        const existingData = await store.get(key, { type: 'json' });

        let currentData = existingData || { count: 0, resetTime: now + windowMs };

        // If window has expired, reset counter
        if (now > currentData.resetTime) {
            currentData = { count: 1, resetTime: now + windowMs };
        } else {
            currentData.count += 1;
        }

        await store.setJSON(key, currentData);

        return {
            isLimited: currentData.count > limit,
            current: currentData.count,
            resetTime: currentData.resetTime
        };
    } catch (err) {
        console.warn(`[Rate Limiter] Netlify Blobs store error (${err.message}). Defaulting to permissive mode.`);
        return { isLimited: false, current: 1, resetTime: now + windowMs };
    }
}

module.exports = { checkRateLimit };
