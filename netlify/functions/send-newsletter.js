require('dotenv').config();
const nodemailer = require('nodemailer');

// Convert Firestore REST values to JSON
function parseFirestoreValue(value) {
    if (!value) return null;
    if ('stringValue' in value) return value.stringValue;
    if ('integerValue' in value) return parseInt(value.integerValue, 10);
    if ('doubleValue' in value) return parseFloat(value.doubleValue);
    if ('booleanValue' in value) return value.booleanValue;
    if ('arrayValue' in value) {
        return (value.arrayValue.values || []).map(v => parseFirestoreValue(v));
    }
    if ('mapValue' in value) {
        const obj = {};
        const fields = value.mapValue.fields || {};
        for (const k in fields) {
            obj[k] = parseFirestoreValue(fields[k]);
        }
        return obj;
    }
    return null;
}

function parseFirestoreDoc(doc) {
    const fields = doc.fields || {};
    const obj = {};
    for (const key in fields) {
        obj[key] = parseFirestoreValue(fields[key]);
    }
    return obj;
}

exports.handler = async (event, context) => {
    // Enable CORS for dashboard testing
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const subject = body.subject;
        const htmlBody = body.htmlBody;

        if (!subject || !htmlBody) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Subject and campaign content are required.' })
            };
        }

        // Retrieve SMTP settings
        const host = process.env.SMTP_HOST;
        const port = process.env.SMTP_PORT || 587;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (!host || !user || !pass) {
            return {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'SMTP credentials are not configured in Netlify environment variables.' })
            };
        }

        // Fetch subscribers from Firestore REST API
        const firestoreUrl = 'https://firestore.googleapis.com/v1/projects/kaghan-properties/databases/(default)/documents/newsletter?pageSize=300';
        const dbRes = await fetch(firestoreUrl);
        if (!dbRes.ok) {
            throw new Error(`Failed to load subscribers from database: ${await dbRes.text()}`);
        }
        const dbData = await dbRes.json();
        const docs = dbData.documents || [];
        const subscribers = docs.map(parseFirestoreDoc).filter(s => s && s.email);

        if (subscribers.length === 0) {
            return {
                statusCode: 200,
                headers: { 'Access-Control-Allow-Origin': '*' },
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
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: `Newsletter sent successfully to ${recipientEmails.length} subscribers.`, sentCount: recipientEmails.length })
        };

    } catch (err) {
        console.error('[Newsletter Broadcast Error]:', err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: err.message })
        };
    }
};
