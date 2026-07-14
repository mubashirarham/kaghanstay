const { fdb, auth } = require('./_admin-init');
const nodemailer = require('nodemailer');
exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const internalSecret = body.internalSecret;
        let isAuthorized = false;

        // Check internal API secret first
        if (internalSecret && internalSecret === process.env.INTERNAL_API_SECRET) {
            isAuthorized = true;
        }

        // Check Firebase token if not authorized by secret
        if (!isAuthorized && auth && fdb) {
            const authHeader = event.headers.authorization || event.headers.Authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.split('Bearer ')[1];
                    const decodedToken = await auth.verifyIdToken(token);
                    const userDoc = await fdb.collection('users').doc(decodedToken.uid).get();
                    if (userDoc.exists && userDoc.data().role === 'admin') {
                        isAuthorized = true;
                    }
                } catch (authErr) {
                    console.warn("Reminders auth token verification failed:", authErr);
                }
            }
        }

        if (!isAuthorized) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Unauthorized direct execution.' })
            };
        }

        const { bookings, type } = body;

        if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No bookings provided.' })
            };
        }

        // Cap reminders to prevent email flood vector (M-03)
        if (bookings.length > 50) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Payload exceeds maximum limit of 50 bookings per call.' })
            };
        }

        if (!['checkin', 'checkout'].includes(type)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid reminder type. Use checkin or checkout.' })
            };
        }

        console.log(`[Customer Reminders] Processing ${bookings.length} ${type} emails.`);

        // Setup Nodemailer
        let transporter = null;
        if (process.env.SMTP_HOST && process.env.SMTP_USER) {
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
        } else {
            console.warn('[Customer Reminders] SMTP not configured. Simulating emails in logs.');
        }

        let sentCount = 0;

        for (const booking of bookings) {
            if (!booking.guestEmail) continue;

            const isCheckIn = type === 'checkin';
            const subject = isCheckIn 
                ? `Welcome to Kaghan Stay! Your upcoming stay details 🏔️`
                : `Thank you for staying with us! Safe travels 🚗`;

            const htmlContent = `
            <div style="font-family: Helvetica, sans-serif; background-color: #F8FAFC; padding: 40px; border-radius: 12px; color: #0F172A; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #0F172A; margin: 0;">Kaghan Stay</h1>
                    <span style="color: #D4AF37; font-size: 10px; letter-spacing: 2px; text-transform: uppercase;">Premium Resort</span>
                </div>
                
                <h2 style="color: #0F172A; border-bottom: 2px solid #D4AF37; padding-bottom: 10px;">
                    ${isCheckIn ? 'Your Journey Begins Soon!' : 'Hope You Had a Great Stay!'}
                </h2>
                <p><strong>Hi ${booking.guestName},</strong></p>
                
                ${isCheckIn ? `
                <p>We are thrilled to welcome you to Kaghan Stay! This is a quick reminder that your reservation for the <strong>${booking.roomId}</strong> starts on <strong>${booking.checkIn}</strong>.</p>
                <p>Check-in time is from 2:00 PM onwards. If you need any assistance with directions or require special arrangements before your arrival, please let us know!</p>
                ` : `
                <p>Thank you for choosing Kaghan Stay! We hope you enjoyed your time in the beautiful mountains.</p>
                <p>Your check-out was today (<strong>${booking.checkOut}</strong>). We would love to hear about your experience! Please consider logging into your account and leaving a review for your room.</p>
                `}
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #E2E8F0;">
                    <p style="margin: 5px 0; font-size: 13px;"><strong>Booking Ref:</strong> ${booking.id}</p>
                </div>
                
                <p style="color: #64748B; font-size: 13px; line-height: 1.6;">
                    Warm regards,<br>
                    <strong>The Kaghan Stay Team</strong><br>
                    Contact: +92 300 1234567
                </p>
            </div>
            `;

            if (transporter) {
                await transporter.sendMail({
                    from: `"Kaghan Stay" <${process.env.SMTP_USER}>`,
                    to: booking.guestEmail,
                    subject: subject,
                    html: htmlContent
                });
            } else {
                console.log(`[Customer Reminders] MOCKED EMAIL to ${booking.guestEmail}:\n${htmlContent}`);
            }
            sentCount++;
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: `Successfully processed ${sentCount} reminders.` })
        };

    } catch (error) {
        console.error('Error sending customer reminders:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};
