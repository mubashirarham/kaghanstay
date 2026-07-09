const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
            })
        });
    } catch (e) {
        console.error("Firebase Admin SDK initialization failed in newsletter:", e);
    }
}

const fdb = admin.apps.length ? admin.firestore() : null;
const auth = admin.apps.length ? admin.auth() : null;

exports.handler = async (event, context) => {
    // Enable CORS for production origin only
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': 'https://kphstay.com',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    if (!fdb || !auth) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Database service is currently unavailable.' })
        };
    }

    try {
        // Authenticate Caller
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers: { 'Access-Control-Allow-Origin': 'https://kphstay.com' },
                body: JSON.stringify({ error: 'Unauthorized: Missing Authorization token.' })
            };
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(token);
        const userDoc = await fdb.collection('users').doc(decodedToken.uid).get();

        if (!userDoc.exists || userDoc.data().role !== 'admin') {
            return {
                statusCode: 403,
                headers: { 'Access-Control-Allow-Origin': 'https://kphstay.com' },
                body: JSON.stringify({ error: 'Forbidden: Admin authorization required.' })
            };
        }

        const body = JSON.parse(event.body || '{}');
        const subject = body.subject;
        const htmlBody = body.htmlBody;

        if (!subject || !htmlBody) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': 'https://kphstay.com' },
                body: JSON.stringify({ error: 'Subject and campaign content are required.' })
            };
        }

        // Retrieve SMTP settings
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = process.env.SMTP_PORT || 587;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;

        if (!smtpHost || !smtpUser || !smtpPass) {
            return {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': 'https://kphstay.com' },
                body: JSON.stringify({ error: 'SMTP credentials are not configured in environment variables.' })
            };
        }

        // Fetch subscribers from Firestore via Admin SDK
        const newsletterSnap = await fdb.collection('newsletter').get();
        const subscribers = [];
        newsletterSnap.forEach(doc => {
            const data = doc.data();
            if (data && data.email) {
                subscribers.push(data);
            }
        });

        if (subscribers.length === 0) {
            return {
                statusCode: 200,
                headers: { 'Access-Control-Allow-Origin': 'https://kphstay.com' },
                body: JSON.stringify({ message: 'No subscribers found in database. Broadcast canceled.', sentCount: 0 })
            };
        }

        const recipientEmails = subscribers.map(s => s.email.trim().toLowerCase());
        console.log(`[Newsletter Broadcast] Sending campaign "${subject}" to ${recipientEmails.length} subscribers.`);

        // Setup Nodemailer
        const transporter = nodemailer.createTransport({
            host: host,
            port: parseInt(port, 10),
            secure: parseInt(port, 10) === 465,
            auth: { user, pass }
        });

        // Broadcast layout styling template wrapper
        const htmlFormatted = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; background-color: #F8FAFC; padding: 30px; margin: 0; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
                .header { background: #0F172A; padding: 30px; text-align: center; border-bottom: 3px solid #D4AF37; }
                .header h1 { color: #ffffff; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
                .header p { color: #D4AF37; margin: 5px 0 0; font-size: 11px; letter-spacing: 3px; font-weight: bold; text-transform: uppercase; }
                .content { padding: 40px 30px; font-size: 14px; line-height: 1.6; color: #334155; }
                .footer { background: #F1F5F9; padding: 20px; text-align: center; font-size: 11px; color: #64748B; border-top: 1px solid #E2E8F0; }
                .footer a { color: #D4AF37; text-decoration: none; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>KPH Stay</h1>
                    <p>Luxury Resort & Apartments</p>
                </div>
                <div class="content">
                    ${htmlBody}
                </div>
                <div class="footer">
                    &copy; 2026 KPH Stay. Islamabad & Nathia Gali, Pakistan.<br>
                    You are receiving this because you subscribed to our newsletter updates.<br>
                    Need to unsubscribe? <a href="https://kphstay.com/contact">Contact Support</a>
                </div>
            </div>
        </body>
        </html>
        `;

        // Send via BCC to avoid leaking user list
        await transporter.sendMail({
            from: `"KPH Stay Lobby" <${user}>`,
            to: user, // send copy to self
            bcc: recipientEmails.join(', '),
            subject: subject,
            html: htmlFormatted
        });

        console.log(`[Newsletter Broadcast] Completed broadcasting to ${recipientEmails.length} subscribers.`);
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': 'https://kphstay.com',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: `Newsletter sent successfully to ${recipientEmails.length} subscribers.`, sentCount: recipientEmails.length })
        };

    } catch (err) {
        console.error('[Newsletter Broadcast Error]:', err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': 'https://kphstay.com' },
            body: JSON.stringify({ error: 'Failed to broadcast newsletter campaign.' })
        };
    }
};
