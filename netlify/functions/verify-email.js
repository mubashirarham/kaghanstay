require('dotenv').config();
const { z } = require('zod');
const { fdb, auth, initError } = require('./_admin-init');

const VerifyPayloadSchema = z.object({
    token: z.string().optional(),
    email: z.string().email().optional(),
    otp: z.string().optional()
});

function normalizeEmail(email) {
    const trimmed = (email || '').trim().toLowerCase();
    const parts = trimmed.split('@');
    if (parts.length !== 2) return trimmed;
    let [local, domain] = parts;
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
        local = local.replace(/\./g, '').split('+')[0];
    }
    return `${local}@${domain}`;
}

exports.handler = async (event) => {
    const origin = event.headers.origin || event.headers.Origin || 'https://kphstay.com';
    const headers = {
        'Access-Control-Allow-Origin': origin.includes('kphstay.com') || origin.includes('localhost') ? origin : 'https://kphstay.com',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    if (initError) {
        console.error("[Verify Email API] Firebase init failure:", initError.message);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Authentication service unavailable.' }) };
    }

    try {
        let payload;
        try {
            payload = VerifyPayloadSchema.parse(JSON.parse(event.body || '{}'));
        } catch (vErr) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid payload format.' }) };
        }

        const { token, email, otp } = payload;
        let tokenSnap = null;
        let tokenRef = null;

        if (token) {
            tokenRef = fdb.collection('email_verifications').doc(token);
            tokenSnap = await tokenRef.get();
        } else if (email && otp) {
            const normalized = normalizeEmail(email);
            tokenRef = fdb.collection('email_verifications').doc(`otp_${normalized}`);
            tokenSnap = await tokenRef.get();
        } else {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Please provide either a verification token or a 6-digit OTP code.' }) };
        }

        if (!tokenSnap || !tokenSnap.exists) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid or expired verification code.' }) };
        }

        const tokenData = tokenSnap.data();
        const now = new Date();
        const expiresAt = new Date(tokenData.expiresAt);

        if (now > expiresAt) {
            await tokenRef.delete();
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Verification code has expired. Please request a new code.' }) };
        }

        if (otp && tokenData.otp !== otp.trim()) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Incorrect 6-digit verification code. Please check your email and try again.' }) };
        }

        // 1. Mark Firebase Auth email as verified
        await auth.updateUser(tokenData.uid, { emailVerified: true });

        // 2. Mark Firestore user doc as verified
        await fdb.collection('users').doc(tokenData.uid).set({
            verified: true,
            emailVerified: true,
            verifiedAt: now.toISOString()
        }, { merge: true });

        // Fetch full updated user document
        const userDoc = await fdb.collection('users').doc(tokenData.uid).get();
        const userData = userDoc.exists ? userDoc.data() : { id: tokenData.uid, uid: tokenData.uid, email: tokenData.email };

        // 3. Clean up verification documents
        await tokenRef.delete().catch(() => {});
        if (tokenData.token) {
            await fdb.collection('email_verifications').doc(tokenData.token).delete().catch(() => {});
        }
        if (tokenData.email) {
            await fdb.collection('email_verifications').doc(`otp_${tokenData.email}`).delete().catch(() => {});
        }

        console.log(`[Verify Email API] Account successfully verified for UID: ${tokenData.uid}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Your email address has been verified! Account activated.',
                user: userData
            })
        };

    } catch (err) {
        console.error("[Verify Email API] Verification error:", err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Verification failed. Please try again.' })
        };
    }
};
