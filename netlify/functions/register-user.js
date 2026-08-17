require('dotenv').config();
const { z } = require('zod');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { fdb, auth, initError } = require('./_admin-init');
const { checkRateLimit } = require('./_rate-limiter');

const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
    'tempmail.com', 'tempmail.net', 'temp-mail.org', '10minutemail.com', '10minutemail.net',
    'yopmail.com', 'yopmail.fr', 'yopmail.net', 'dispostable.com', 'trashmail.com',
    'trashmail.net', 'sharklasers.com', 'grr.la', 'fakeinbox.com', 'burnermail.io',
    'getairmail.com', 'throwawaymail.com', 'mohmal.com', 'crazymailing.com',
    'armyspy.com', 'cuvox.de', 'dayrep.com', 'fleckens.hu', 'gustr.com',
    'jourrapide.com', 'rhyta.com', 'superrito.com', 'teleworm.us', 'einrot.com',
    'fakemailgenerator.com', 'maildrop.cc', 'nada.ltd', 'getnada.com', 'inboxbear.com',
    'tempinbox.com', 'zillamail.com', 'crazymail.com', 'dropmail.me', '10mail.org',
    'burnermail.com', 'fakemail.net', 'emailondeck.com', 'generator.email',
    'tempail.com', 'minutemailbox.com', 'internxt.com', 'mailsac.com', 'tempm.com',
    'mytemp.email', 'tempmailaddress.com', 'burner.email', 'disposablemail.com'
]);

const RegisterSchema = z.object({
    name: z.string().min(2, "Full name must be at least 2 characters.").max(80, "Name is too long."),
    email: z.string().email("Invalid email address.").max(120, "Email address is too long."),
    password: z.string().min(6, "Password must be at least 6 characters.").max(100, "Password is too long."),
    phone: z.string().optional().default(''),
    turnstileToken: z.string().optional()
});

function getClientIp(event) {
    const headers = event.headers || {};
    return headers['x-nf-client-connection-ip'] || 
           headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           headers['client-ip'] || 
           '127.0.0.1';
}

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

function isDisposableEmail(email) {
    const domain = (email.split('@')[1] || '').toLowerCase().trim();
    if (!domain) return true;
    if (DISPOSABLE_DOMAINS.has(domain)) return true;
    if (domain.endsWith('.xyz') || domain.endsWith('.top') || domain.endsWith('.tk') || domain.endsWith('.ml') || domain.endsWith('.ga') || domain.endsWith('.cf')) {
        return true;
    }
    return false;
}

async function verifyTurnstile(token, clientIp) {
    const secretKey = (process.env.TURNSTILE_SECRET_KEY || '').trim();
    const isDev = process.env.NODE_ENV === 'development' || (clientIp && (clientIp === '127.0.0.1' || clientIp === '::1'));

    if (!secretKey || secretKey === 'dummy_key' || secretKey === 'your_secret_key') {
        if (isDev) {
            console.warn("[Register API] TURNSTILE_SECRET_KEY not set; allowing local dev bypass.");
            return { success: true };
        }
        return { success: false, message: "Security challenge service configuration missing." };
    }

    if (!token) {
        if (isDev) {
            console.warn("[Register API] CAPTCHA token missing in local dev mode; allowing dev fallback.");
            return { success: true };
        }
        return { success: false, message: "Cloudflare Turnstile security check is required. Please complete the CAPTCHA." };
    }

    try {
        const params = new URLSearchParams();
        params.append('secret', secretKey);
        params.append('response', token);
        if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') {
            params.append('remoteip', clientIp);
        }

        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: params
        });
        const data = await response.json();

        if (data.success === true) {
            return { success: true };
        }

        console.warn("[Register API] Cloudflare Turnstile validation failed:", data);
        if (isDev) {
            console.warn("[Register API] Bypassing Turnstile failure in local dev mode.");
            return { success: true };
        }

        const errDetail = data['error-codes']?.join(', ') || 'Security verification failed.';
        return { success: false, message: `Security verification failed (${errDetail}). Please refresh and complete the check.` };
    } catch (err) {
        console.error("[Register API] Turnstile verification error:", err);
        if (isDev) return { success: true };
        return { success: false, message: "Unable to verify security challenge. Please try again." };
    }
}

function buildVerificationEmailHTML(name, email, otpCode, verifyUrl) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verify Your Email - KPH Stay</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0b111e; color: #e2e8f0; margin: 0; padding: 40px 20px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <!-- Header -->
        <tr>
            <td align="center" style="padding: 40px 30px 20px 30px; background-color: #0b111e; border-bottom: 1px solid #1e293b;">
                <h1 style="color: #D4AF37; font-size: 28px; font-weight: 700; letter-spacing: 2px; margin: 0; text-transform: uppercase;">KPH STAY</h1>
                <p style="color: #94a3b8; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin: 4px 0 0 0;">Luxury Mountain Retreat & Resort</p>
            </td>
        </tr>

        <!-- Content -->
        <tr>
            <td style="padding: 40px 40px 30px 40px;">
                <h2 style="color: #ffffff; font-size: 22px; margin: 0 0 16px 0;">Welcome, ${name}!</h2>
                <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
                    Thank you for joining the KPH Stay Loyalty Circle. To complete your registration for <strong>${email}</strong>, please enter your 6-digit verification code below:
                </p>

                <!-- OTP Code Display Card -->
                <div style="background-color: #0b111e; border: 1px solid #D4AF37; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0;">
                    <p style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0;">Your 6-Digit Verification Code</p>
                    <div style="color: #D4AF37; font-size: 38px; font-weight: bold; letter-spacing: 12px; font-family: monospace; line-height: 1.2;">${otpCode}</div>
                    <p style="color: #64748b; font-size: 12px; margin: 10px 0 0 0;">Enter this code directly in the registration window</p>
                </div>

                <div style="text-align: center; margin: 30px 0 10px 0;">
                    <p style="color: #94a3b8; font-size: 13px; margin-bottom: 16px;">Or click the button below to verify instantly:</p>
                    <a href="${verifyUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-weight: bold; color: #0b111e; background-color: #D4AF37; font-size: 14px; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; border-radius: 12px;">Verify Account Link</a>
                </div>
            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td align="center" style="padding: 24px 30px; background-color: #080d1a; border-top: 1px solid #1e293b;">
                <p style="color: #64748b; font-size: 12px; margin: 0;">
                    This verification code expires in 20 minutes. If you did not request this account, please ignore this email.
                </p>
                <p style="color: #475569; font-size: 11px; margin: 8px 0 0 0;">
                    &copy; ${new Date().getFullYear()} KPH Stay. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
}

exports.handler = async (event) => {
    const origin = event.headers.origin || event.headers.Origin || 'https://kphstay.com';
    const headers = {
        'Access-Control-Allow-Origin': origin.includes('kphstay.com') || origin.includes('localhost') ? origin : 'https://kphstay.com',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    if (initError) {
        console.error("[Register API] Firebase init failure:", initError.message);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Authentication service temporarily unavailable.' }) };
    }

    const clientIp = getClientIp(event);

    try {
        // 1. Rate Limiting Check (IP-based)
        const rateLimitResult = await checkRateLimit(clientIp, 'register', 8, 900);
        if (rateLimitResult.isLimited) {
            return {
                statusCode: 429,
                headers,
                body: JSON.stringify({ error: 'Too many registration attempts. Please wait 15 minutes before trying again.' })
            };
        }

        // 2. Input Schema Validation
        let payload;
        try {
            payload = RegisterSchema.parse(JSON.parse(event.body || '{}'));
        } catch (vErr) {
            const firstMsg = vErr.errors?.[0]?.message || 'Invalid input parameters.';
            return { statusCode: 400, headers, body: JSON.stringify({ error: firstMsg }) };
        }

        const { name, email, password, phone, turnstileToken } = payload;
        const normalized = normalizeEmail(email);

        // Rate limit per target email (Max 3 attempts per 15 minutes)
        const emailRateLimit = await checkRateLimit(normalized, 'reg_email', 3, 900);
        if (emailRateLimit.isLimited) {
            return {
                statusCode: 429,
                headers,
                body: JSON.stringify({ error: 'Too many registration requests for this email address. Please check your inbox or try again in 15 minutes.' })
            };
        }

        // 3. Reject Disposable / Throwaway / Suspicious Emails
        if (isDisposableEmail(normalized)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Disposable or temporary email addresses are not allowed. Please provide a standard email address.' })
            };
        }

        // 4. Cloudflare Turnstile Verification
        const turnstileRes = await verifyTurnstile(turnstileToken, clientIp);
        if (!turnstileRes.success) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: turnstileRes.message || 'CAPTCHA verification failed. Please refresh and try again.' }) };
        }

        // 5. Check if user already exists and is active/verified
        try {
            const existingUser = await auth.getUserByEmail(normalized);
            if (existingUser && existingUser.emailVerified) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'An account with this email address already exists. Please log in or reset your password.' })
                };
            }
        } catch (_) {}

        // 6. Generate Verification Token & 6-Digit OTP Code
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        // 20 Minutes Expiration Window
        const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

        // 7. Store ONLY in temporary email_verifications stage
        // NOTE: User creation in Firebase Auth and Firestore users collection does NOT happen here.
        // It ONLY happens after the user successfully enters the 2-step verification OTP in verify-email.js.
        const pendingData = {
            name: name.trim(),
            email: normalized,
            rawEmail: email.trim(),
            password: password,
            phone: (phone || '').trim(),
            otp: otpCode,
            token: verificationToken,
            attempts: 0,
            createdAt: new Date().toISOString(),
            expiresAt: expiresAt
        };

        // Token doc lookup
        await fdb.collection('email_verifications').doc(verificationToken).set(pendingData);

        // OTP lookup doc by email
        await fdb.collection('email_verifications').doc(`otp_${normalized}`).set(pendingData);

        // 8. Send Verification Email via SMTP (info@kphstay.com)
        const siteUrl = process.env.SITE_URL || 'https://kphstay.com';
        const verifyUrl = `${siteUrl}/login.html?action=verify-email&token=${verificationToken}`;

        const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
        const port = parseInt(process.env.SMTP_PORT || '465', 10);
        const smtpUser = process.env.SMTP_USER || 'info@kphstay.com';
        const smtpPass = process.env.SMTP_PASS || 'Targit@2027';

        const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development' || clientIp === '127.0.0.1';

        try {
            const transporter = nodemailer.createTransport({
                host: host,
                port: port,
                secure: port === 465,
                auth: { user: smtpUser, pass: smtpPass },
                connectionTimeout: 8000
            });

            const mailOptions = {
                from: `"KPH Stay Guest Portal" <${smtpUser}>`,
                to: normalized,
                subject: `Your 6-Digit Verification Code [${otpCode}] | KPH Stay`,
                html: buildVerificationEmailHTML(name, normalized, otpCode, verifyUrl)
            };

            await transporter.sendMail(mailOptions);
            console.log(`[Register API] Verification email with OTP [${otpCode}] sent to ${normalized}`);
        } catch (emailErr) {
            console.error(`[Register API] Email dispatch notice (${host}:${port}):`, emailErr.message);
            if (isDev) {
                console.warn(`[Register API DEV FALLBACK] Dev 6-Digit OTP Code for ${normalized}: ${otpCode}`);
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                requiresOtp: true,
                devOtp: isDev ? otpCode : undefined,
                email: normalized,
                message: `We've sent a 6-digit verification code to ${normalized}. Please enter it below to complete your registration.`
            })
        };

    } catch (err) {
        console.error("[Register API] Unexpected error:", err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Registration failed. Please try again later.' })
        };
    }
};

