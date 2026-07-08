require('dotenv').config();
const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const booking = body.booking;

        if (!booking) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No booking details provided in request body.' })
            };
        }

        const guestName = booking.guestName || 'Valued Guest';
        const guestEmail = booking.guestEmail || '';
        const bookingId = booking.id || 'BK-XXXX';
        const checkIn = booking.checkIn || '';
        const checkOut = booking.checkOut || '';
        const totalPrice = booking.totalPrice || 0;
        const roomName = booking.roomName || 'Luxury Suite';

        console.log(`[Invoice Emailer] Formatting invoice for ${guestName} (${guestEmail}) for booking ${bookingId}`);

        // Responsive Premium HTML Invoice Template
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                    background-color: #F8FAFC;
                    margin: 0;
                    padding: 40px 20px;
                    -webkit-font-smoothing: antialiased;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                    border: 1px solid #E2E8F0;
                }
                .header {
                    background-color: #0F172A;
                    padding: 40px 30px;
                    text-align: center;
                    border-bottom: 2px solid #D4AF37;
                }
                .logo-text {
                    color: #ffffff;
                    font-size: 24px;
                    font-weight: 800;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    margin: 0;
                }
                .logo-sub {
                    color: #D4AF37;
                    font-size: 11px;
                    letter-spacing: 3px;
                    text-transform: uppercase;
                    font-weight: 600;
                    margin-top: 5px;
                }
                .content {
                    padding: 40px 35px;
                }
                h1 {
                    font-size: 20px;
                    color: #0F172A;
                    margin-top: 0;
                    font-weight: 700;
                }
                p {
                    color: #64748B;
                    font-size: 14px;
                    line-height: 1.6;
                    font-weight: 300;
                }
                .ledger-card {
                    background-color: #F8FAFC;
                    border: 1px solid #F1F5F9;
                    border-radius: 16px;
                    padding: 24px;
                    margin: 30px 0;
                }
                .ledger-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px dashed #E2E8F0;
                    font-size: 13px;
                }
                .ledger-row:last-child {
                    border-bottom: none;
                    padding-top: 15px;
                    font-weight: bold;
                    font-size: 15px;
                }
                .label {
                    color: #64748B;
                }
                .value {
                    color: #0F172A;
                    text-align: right;
                }
                .total-label {
                    color: #0F172A;
                }
                .total-value {
                    color: #D4AF37;
                }
                .footer {
                    background-color: #0F172A;
                    padding: 30px;
                    text-align: center;
                    font-size: 11px;
                    color: #94A3B8;
                    border-top: 1px solid #1E293B;
                }
                .footer a {
                    color: #D4AF37;
                    text-decoration: none;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo-text">KPH</div>
                    <div class="logo-sub">Stay Resort & Apartments</div>
                </div>
                <div class="content">
                    <h1>Booking Confirmation Slip</h1>
                    <p>Dear ${guestName},</p>
                    <p>Thank you for choosing KPH Stay. We are pleased to confirm your reservation. Your accommodation details and financial summary are detailed below:</p>
                    
                    <div class="ledger-card">
                        <div class="ledger-row">
                            <span class="label">Reservation ID</span>
                            <span class="value" style="font-weight: 600; color: #D4AF37;">${bookingId}</span>
                        </div>
                        <div class="ledger-row">
                            <span class="label">Selected Accommodation</span>
                            <span class="value">${roomName}</span>
                        </div>
                        <div class="ledger-row">
                            <span class="label">Check-in Date</span>
                            <span class="value">${checkIn} (14:00 PM)</span>
                        </div>
                        <div class="ledger-row">
                            <span class="label">Check-out Date</span>
                            <span class="value">${checkOut} (12:00 PM)</span>
                        </div>
                        <div class="ledger-row">
                            <span class="label">Total Price Paid</span>
                            <span class="value total-value">PKR ${totalPrice.toLocaleString()}</span>
                        </div>
                    </div>

                    <p>If you have any questions or require check-in assistance or custom airport shuttle pickups, please contact our lobby support line at +92 51 8461975.</p>
                    <p>We look forward to welcoming you soon.</p>
                    <p style="margin-top: 30px; font-weight: 500; color: #0F172A;">Warmest regards,<br><span style="color: #D4AF37; font-size: 13px;">KPH Resort Concierge</span></p>
                </div>
                <div class="footer">
                    &copy; 2026 KPH Stay. Islamabad & Nathia Gali, Pakistan.<br>
                    Need assistance? <a href="https://kphstay.com/contact">Contact Lobby</a>
                </div>
            </div>
        </body>
        </html>
        `;

        // Check for SMTP variables
        const host = process.env.SMTP_HOST;
        const port = process.env.SMTP_PORT || 587;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (!host || !user || !pass) {
            console.warn("[Invoice Emailer] SMTP Credentials not configured in Netlify environment. Logging HTML content to console (Mock Delivery).");
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: "Mock delivery successful (SMTP variables not set). Invoice logged.",
                    bookingId
                })
            };
        }

        // Configure Nodemailer
        const transporter = nodemailer.createTransport({
            host: host,
            port: parseInt(port, 10),
            secure: parseInt(port, 10) === 465,
            auth: { user, pass }
        });

        // Send Email
        await transporter.sendMail({
            from: `"KPH Stay Lobby" <${user}>`,
            to: guestEmail,
            subject: `Resort Booking Confirmation Slip - ${bookingId}`,
            html: htmlContent
        });

        console.log(`[Invoice Emailer] Invoice email sent successfully to ${guestEmail} for booking ${bookingId}`);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Invoice email sent successfully.", bookingId })
        };

    } catch (err) {
        console.error("[Invoice Emailer Error]:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
};
