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
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Please provide either a verification token or a 6-digit verification code.' }) };
        }

        if (!tokenSnap || !tokenSnap.exists) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid or expired verification code. Please register again.' }) };
        }

        const tokenData = tokenSnap.data();
        const now = new Date();
        const expiresAt = new Date(tokenData.expiresAt);

        // 1. Check expiration
        if (now > expiresAt) {
            await tokenRef.delete().catch(() => {});
            if (tokenData.token) await fdb.collection('email_verifications').doc(tokenData.token).delete().catch(() => {});
            if (tokenData.email) await fdb.collection('email_verifications').doc(`otp_${tokenData.email}`).delete().catch(() => {});
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Verification code has expired. Please register again.' }) };
        }

        // 2. Check failed attempts / Brute-force protection
        const currentAttempts = (tokenData.attempts || 0);
        if (currentAttempts >= 5) {
            await tokenRef.delete().catch(() => {});
            if (tokenData.token) await fdb.collection('email_verifications').doc(tokenData.token).delete().catch(() => {});
            if (tokenData.email) await fdb.collection('email_verifications').doc(`otp_${tokenData.email}`).delete().catch(() => {});
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Too many incorrect attempts. For security reasons, please start registration again.' }) };
        }

        // 3. Verify OTP code match
        if (otp && tokenData.otp !== otp.trim()) {
            await tokenRef.update({ attempts: currentAttempts + 1 }).catch(() => {});
            const remaining = 5 - (currentAttempts + 1);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: `Incorrect 6-digit verification code. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)` })
            };
        }

        // 4. Verification Successful! NOW AND ONLY NOW create or activate user in Firebase Auth & Firestore
        const userEmail = tokenData.email;
        const userName = tokenData.name || userEmail.split('@')[0];
        const userPhone = tokenData.phone || '';
        const rawEmail = tokenData.rawEmail || userEmail;

        let userRecord = null;
        try {
            // Check if user already exists in Firebase Auth
            const existingUser = await auth.getUserByEmail(userEmail);
            if (existingUser) {
                if (tokenData.password) {
                    await auth.updateUser(existingUser.uid, {
                        password: tokenData.password,
                        displayName: userName,
                        emailVerified: true
                    });
                } else {
                    await auth.updateUser(existingUser.uid, { emailVerified: true });
                }
                userRecord = existingUser;
            }
        } catch (_) {}

        if (!userRecord) {
            // Create the authenticated user in Firebase Auth
            userRecord = await auth.createUser({
                email: userEmail,
                password: tokenData.password || undefined,
                displayName: userName,
                emailVerified: true
            });
        }

        // 5. Create / update the permanent user document in Firestore 'users' collection
        const finalUserData = {
            id: userRecord.uid,
            uid: userRecord.uid,
            name: userName,
            email: userEmail,
            rawEmail: rawEmail,
            phone: userPhone,
            role: 'user',
            verified: true,
            emailVerified: true,
            loyaltyPoints: 100,
            verifiedAt: now.toISOString(),
            createdAt: now.toISOString()
        };

        await fdb.collection('users').doc(userRecord.uid).set(finalUserData, { merge: true });

        // 6. Clean up temporary verification documents
        await tokenRef.delete().catch(() => {});
        if (tokenData.token) {
            await fdb.collection('email_verifications').doc(tokenData.token).delete().catch(() => {});
        }
        if (tokenData.email) {
            await fdb.collection('email_verifications').doc(`otp_${tokenData.email}`).delete().catch(() => {});
        }

        console.log(`[Verify Email API] User officially registered and verified: ${userEmail} (UID: ${userRecord.uid})`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Your email address has been verified! Your account is now active.',
                user: finalUserData
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

