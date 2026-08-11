require('dotenv').config();
const { fdb, initError } = require('./_admin-init');
const { z } = require('zod');
const nodemailer = require('nodemailer');
const { isRateLimited } = require('./_rate-limiter');

const InquirySchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Invalid email address"),
    subject: z.string().min(2, "Subject is required").max(150),
    message: z.string().min(5, "Message must be at least 5 characters").max(2000)
});

function buildAdminInquiryEmail(name, email, subject, message, createdAt) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
            .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .header { background: #0f172a; padding: 24px; text-align: center; color: #ffffff; }
            .header h2 { margin: 0; font-size: 20px; font-weight: 700; }
            .header span { color: #d4af37; text-transform: uppercase; font-size: 11px; letter-spacing: 2px; }
            .body { padding: 32px; font-size: 14px; line-height: 1.6; color: #334155; }
            .field-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
            .field-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px; }
            .field-value { font-size: 14px; font-weight: 600; color: #0f172a; }
            .message-text { font-size: 14px; color: #1e293b; white-space: pre-wrap; margin: 0; }
            .footer { background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-t: 1px solid #e2e8f0; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header">
                <span>KPH STAY RESORT LOBBY</span>
                <h2>New Website Contact Inquiry</h2>
            </div>
            <div class="body">
                <div class="field-box">
                    <div class="field-label">Sender Name</div>
                    <div class="field-value">${name}</div>
                </div>
                <div class="field-box">
                    <div class="field-label">Sender Email</div>
                    <div class="field-value"><a href="mailto:${email}" style="color:#d4af37;text-decoration:none;">${email}</a></div>
                </div>
                <div class="field-box">
                    <div class="field-label">Subject</div>
                    <div class="field-value">${subject}</div>
                </div>
                <div class="field-box">
                    <div class="field-label">Date Received</div>
                    <div class="field-value">${new Date(createdAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })} PKT</div>
                </div>
                <div class="field-box">
                    <div class="field-label">Message Details</div>
                    <p class="message-text">${message}</p>
                </div>
            </div>
            <div class="footer">
                This message was logged to the Admin Dashboard and sent to info@kphstay.com.
            </div>
        </div>
    </body>
    </html>
    `;
}

function buildGuestAutoReplyEmail(name, subject) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
            .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .header { background: #0f172a; padding: 24px; text-align: center; color: #ffffff; }
            .header h2 { margin: 0; font-size: 20px; font-weight: 700; }
            .header span { color: #d4af37; text-transform: uppercase; font-size: 11px; letter-spacing: 2px; }
            .body { padding: 32px; font-size: 14px; line-height: 1.6; color: #334155; }
            .highlight { color: #d4af37; font-weight: 700; }
            .footer { background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-t: 1px solid #e2e8f0; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header">
                <span>KPH STAY</span>
                <h2>Inquiry Received</h2>
            </div>
            <div class="body">
                <p>Dear <strong>${name}</strong>,</p>
                <p>Thank you for reaching out to <strong>KPH Stay</strong>. We have received your inquiry regarding <em>"${subject}"</em>.</p>
                <p>Our front desk team and resort concierge review incoming messages promptly. You can expect a response within <span class="highlight">2 to 4 business hours</span>.</p>
                <p>If your matter is urgent or requires immediate booking assistance, please contact our lobby helpline directly at <strong>+92 334 009 1127</strong> or <strong>+92 51 8461975</strong>.</p>
                <br>
                <p>Warm regards,<br><strong>KPH Stay Lobby Team</strong><br>Islamabad & Nathia Gali, Pakistan</p>
            </div>
            <div class="footer">
                KPH Stay · Asian Arcade, Sector C, Bahria Enclave, Islamabad · info@kphstay.com
            </div>
        </div>
    </body>
    </html>
    `;
}

exports.handler = async (event, context) => {
    const origin = event.headers.origin || event.headers.Origin || '';
    let allowedOrigin = 'https://www.kphstay.com';
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('kphstay.com') || origin.includes('netlify.app')) {
        allowedOrigin = origin;
    }

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Access-Control-Allow-Origin': allowedOrigin },
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    const clientIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown-ip';
    if (await isRateLimited(`contact_${clientIp}`, 5, 300)) {
        return {
            statusCode: 429,
            headers: { 'Access-Control-Allow-Origin': allowedOrigin },
            body: JSON.stringify({ error: 'Too many contact requests. Please wait a few minutes before trying again.' })
        };
    }

    if (!fdb) {
        console.error('[submit-inquiry] Firebase Admin FDB not initialized.', initError);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': allowedOrigin },
            body: JSON.stringify({ error: 'Database service unavailable. Please try again.' })
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const validation = InquirySchema.safeParse(body);

        if (!validation.success) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                body: JSON.stringify({ error: 'Validation failed: ' + validation.error.errors.map(e => e.message).join(', ') })
            };
        }

        const { name, email, subject, message } = validation.data;
        const createdAt = new Date().toISOString();

        // Save to Firestore inquiries collection
        const docRef = await fdb.collection('inquiries').add({
            name,
            email,
            subject,
            message,
            createdAt,
            status: 'unread',
            read: false,
            source: 'website_contact_form'
        });

        console.log(`[submit-inquiry] Saved inquiry ${docRef.id} from ${email}`);

        // Send Email via Nodemailer to info@kphstay.com and Auto-reply to Guest
        const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
        const port = parseInt(process.env.SMTP_PORT || '465', 10);
        const user = process.env.SMTP_USER || 'info@kphstay.com';
        const pass = process.env.SMTP_PASS || 'Targit@2027';

        const officialEmail = 'info@kphstay.com';

        try {
            const transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass }
            });

            // 1. Send notification to official email info@kphstay.com
            await transporter.sendMail({
                from: `"KPH Stay Website" <${user}>`,
                to: officialEmail,
                replyTo: email,
                subject: `[Contact Inquiry] ${subject} - ${name}`,
                html: buildAdminInquiryEmail(name, email, subject, message, createdAt)
            });

            // 2. Send auto-acknowledgement email to guest
            await transporter.sendMail({
                from: `"KPH Stay Lobby" <${user}>`,
                to: email,
                subject: `We received your inquiry - KPH Stay`,
                html: buildGuestAutoReplyEmail(name, subject)
            }).catch(e => console.warn('[submit-inquiry] Auto-reply failed:', e.message));

            console.log(`[submit-inquiry] Email notifications sent for inquiry ${docRef.id}`);
        } catch (emailErr) {
            console.error('[submit-inquiry] Email dispatch failed (inquiry saved in database):', emailErr.message);
        }

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': allowedOrigin, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: true,
                message: 'Inquiry submitted successfully! Our team will contact you shortly.',
                id: docRef.id
            })
        };

    } catch (err) {
        console.error('[submit-inquiry] Server Error:', err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': allowedOrigin },
            body: JSON.stringify({ error: 'Failed to process inquiry. Please try again later.' })
        };
    }
};
