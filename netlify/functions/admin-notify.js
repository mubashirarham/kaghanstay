require('dotenv').config();
const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const booking = body.booking;
        const pdfAttachment = body.pdfAttachment; // base64 string

        if (!booking) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No booking details provided.' })
            };
        }

        console.log(`[Admin Notifier] Sending alert for new booking: ${booking.id}`);

        // Responsive HTML Template for Admin Alert
        const htmlContent = `
        <div style="font-family: Helvetica, sans-serif; background-color: #F8FAFC; padding: 40px; border-radius: 12px; color: #0F172A; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0;">
            <h2 style="color: #0F172A; border-bottom: 2px solid #D4AF37; padding-bottom: 10px;">New Booking Alert 🚨</h2>
            <p><strong>Hi Tanzil,</strong></p>
            <p>A new booking has just been confirmed on Kaghan Stay!</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #E2E8F0;">
                <p style="margin: 5px 0;"><strong>Booking ID:</strong> ${booking.id}</p>
                <p style="margin: 5px 0;"><strong>Guest Name:</strong> ${booking.guestName}</p>
                <p style="margin: 5px 0;"><strong>Guest Email:</strong> ${booking.guestEmail}</p>
                <p style="margin: 5px 0;"><strong>Phone:</strong> ${booking.guestPhone}</p>
                <p style="margin: 5px 0;"><strong>Room:</strong> ${booking.roomId}</p>
                <p style="margin: 5px 0;"><strong>Dates:</strong> ${booking.checkIn} to ${booking.checkOut}</p>
                <p style="margin: 5px 0;"><strong>Total Revenue:</strong> PKR ${booking.totalPrice}</p>
            </div>
            
            <p style="color: #64748B; font-size: 12px; margin-top: 30px;">
                This is an automated message from your Kaghan Stay Serverless Backend.
            </p>
        </div>
        `;

        // Check if SMTP is configured, else log the output for demo purposes
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
            console.warn('[Admin Notifier] SMTP not configured. Simulating email send in logs.');
            console.log(htmlContent);
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Admin alert simulated successfully (SMTP not configured).' })
            };
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const mailOptions = {
            from: `"Kaghan Stay Alerts" <${process.env.SMTP_USER}>`,
            to: 'tanzilminhas2007@gmail.com',
            subject: `New Booking Confirmed: ${booking.id}`,
            html: htmlContent
        };

        if (pdfAttachment) {
            // pdfAttachment is a data URI, we need to split it
            const base64Data = pdfAttachment.split('base64,')[1];
            if (base64Data) {
                mailOptions.attachments = [
                    {
                        filename: `Invoice-${booking.id}.pdf`,
                        content: base64Data,
                        encoding: 'base64'
                    }
                ];
            }
        }

        await transporter.sendMail(mailOptions);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Admin alert sent successfully.' })
        };

    } catch (error) {
        console.error('Error sending admin alert:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
        };
    }
};
