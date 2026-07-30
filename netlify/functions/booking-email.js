require('dotenv').config();
const nodemailer = require('nodemailer');

function formatPKR(val) {
    const num = Number(val || 0);
    return num.toLocaleString('en-PK', { maximumFractionDigits: 0 });
}

function buildInvoiceHTML(booking) {
    const bookingId = booking.id || 'BK-9842';
    const guestName = booking.guestName || 'Valued Guest';
    const guestCountry = booking.nationality || booking.address || 'Pakistan';
    const adults = booking.adults || 2;
    const children = booking.children || 0;
    const checkInTime = booking.checkInTime || '2:00 PM';
    
    // Format checkin / checkout dates nicely
    const formatNiceDate = (dateStr) => {
        if (!dateStr || dateStr === 'N/A') return 'N/A';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
        } catch (_) {
            return dateStr;
        }
    };

    const checkInFormatted = formatNiceDate(booking.checkIn);
    const checkOutFormatted = formatNiceDate(booking.checkOut);

    let nights = booking.totalNights || booking.nights;
    if (!nights && booking.checkIn && booking.checkOut) {
        const d1 = new Date(booking.checkIn);
        const d2 = new Date(booking.checkOut);
        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
            nights = Math.max(1, Math.ceil((d2 - d1) / (1000 * 3600 * 24)));
        } else {
            nights = 1;
        }
    }
    nights = nights || 1;

    const propertyName = booking.propertyName || booking.roomName || 'KPH Stay Luxury Suite';
    const mealPlan = booking.mealPlan || 'Complimentary In-suite Breakfast';

    const grandTotal = Number(booking.grandTotal || booking.totalPrice || 0);
    const accomCharges = booking.accomCharges !== undefined ? Number(booking.accomCharges) : (booking.subtotal ? Number(booking.subtotal) : grandTotal);
    const cleaningFee = Number(booking.cleaningFee || 0);
    const upgradesTotal = Number(booking.upgradesTotal || (booking.otherCharges || 0));
    const tax = booking.tax !== undefined ? Number(booking.tax) : Math.round(accomCharges * 0.15);
    const discount = Number(booking.discount || booking.discountAmount || 0);
    const advancePaid = booking.advancePaid !== undefined ? Number(booking.advancePaid) : (booking.paymentStatus === 'PAID' ? grandTotal : Number(booking.advanceAmount || 0));
    const paymentStatus = (booking.paymentStatus || (grandTotal - advancePaid === 0 ? 'PAID' : 'PARTIALLY PAID')).toUpperCase();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Booking Confirmation Invoice - KPH Stay</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #F8FAFC;
            margin: 0;
            padding: 30px 15px;
            color: #1F2937;
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
        }
        .invoice-card {
            max-width: 720px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
            border: 1px solid #E5E7EB;
        }
        .top-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 20px;
        }
        .brand-logo {
            font-size: 30px;
            font-weight: 900;
            color: #0B0F19;
            letter-spacing: -0.5px;
            line-height: 1;
        }
        .brand-logo .dot {
            color: #C5A059;
        }
        .brand-sub {
            font-size: 10px;
            font-weight: 800;
            color: #C5A059;
            letter-spacing: 2.5px;
            text-transform: uppercase;
            margin-top: 5px;
        }
        .header-meta {
            text-align: right;
        }
        .booking-num-label {
            font-size: 13px;
            color: #6B7280;
        }
        .booking-num-val {
            font-size: 17px;
            font-weight: 800;
            color: #0B0F19;
            letter-spacing: 0.5px;
        }
        .divider {
            border-top: 1px solid #E5E7EB;
            margin: 22px 0;
        }
        .info-grid {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .info-col {
            width: 48%;
        }
        .info-group {
            margin-bottom: 16px;
        }
        .info-label {
            font-size: 12px;
            color: #6B7280;
            margin-bottom: 2px;
        }
        .info-val {
            font-size: 14px;
            font-weight: 500;
            color: #111827;
        }
        .info-val-bold {
            font-size: 15px;
            font-weight: 700;
            color: #0B0F19;
        }
        .price-summary-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding: 4px 0;
        }
        .price-large {
            font-size: 22px;
            font-weight: 900;
            color: #0B0F19;
            margin-top: 2px;
        }
        .breakdown-title {
            font-size: 16px;
            font-weight: 800;
            color: #0B0F19;
            margin-bottom: 3px;
        }
        .breakdown-sub {
            font-size: 13px;
            color: #6B7280;
            margin-bottom: 16px;
        }
        .line-item-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
        }
        .line-item-table td {
            padding: 10px 0;
            font-size: 13px;
            color: #1F2937;
        }
        .line-item-table .item-label {
            color: #4B5563;
        }
        .line-item-table .item-val {
            text-align: right;
            font-weight: 600;
        }
        .total-row td {
            font-size: 16px;
            font-weight: 800;
            color: #0B0F19;
            border-top: 1px solid #E5E7EB;
            padding-top: 14px;
        }
        .badge-paid {
            display: inline-block;
            background-color: #ECFDF5;
            color: #059669;
            border: 1px solid #A7F3D0;
            padding: 3px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .footer-note {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            font-size: 11px;
            color: #9CA3AF;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="invoice-card">
        <!-- Top Header -->
        <div class="top-header">
            <div>
                <div class="brand-logo">KPH Stay<span class="dot">.</span>com</div>
                <div class="brand-sub">Luxury Suites &amp; Mountain Resorts</div>
            </div>
            <div class="header-meta">
                <div class="booking-num-label">Booking number:</div>
                <div class="booking-num-val">${bookingId}</div>
            </div>
        </div>

        <div class="divider"></div>

        <!-- 2 Column Guest & Checkin Info -->
        <div class="info-grid">
            <div class="info-col">
                <div class="info-group">
                    <div class="info-label">Guest information:</div>
                    <div class="info-val-bold">${guestName}</div>
                    <div class="info-val">${guestCountry}</div>
                </div>
                <div class="info-group">
                    <div class="info-label">Total guests:</div>
                    <div class="info-val">${adults} adults${children ? `, ${children} children` : ''}</div>
                </div>
                <div class="info-group">
                    <div class="info-label">Total units/rooms:</div>
                    <div class="info-val">1</div>
                </div>
                <div class="info-group">
                    <div class="info-label">Preferred language:</div>
                    <div class="info-val">English</div>
                </div>
                <div class="info-group">
                    <div class="info-label">Approximate arrival time:</div>
                    <div class="info-val">${checkInTime}</div>
                </div>
            </div>

            <div class="info-col" style="text-align: right;">
                <div class="info-group">
                    <div class="info-label">Check-in:</div>
                    <div class="info-val-bold">${checkInFormatted}</div>
                </div>
                <div class="info-group">
                    <div class="info-label">Check-out:</div>
                    <div class="info-val-bold">${checkOutFormatted}</div>
                </div>
                <div class="info-group">
                    <div class="info-label">Length of stay:</div>
                    <div class="info-val-bold">${nights} night${nights > 1 ? 's' : ''}</div>
                </div>
                <div class="info-group">
                    <div class="info-label">Payment status:</div>
                    <div style="margin-top: 4px;"><span class="badge-paid">&#10004; ${paymentStatus}</span></div>
                </div>
            </div>
        </div>

        <div class="divider"></div>

        <!-- Total Price Summary Bar -->
        <div class="price-summary-row">
            <div>
                <div class="info-label">Total price:</div>
                <div class="price-large">PKR ${formatPKR(grandTotal)}</div>
            </div>
            <div style="text-align: right;">
                <div class="info-label">Advance Paid:</div>
                <div class="info-val-bold" style="color: #059669;">PKR ${formatPKR(advancePaid)}</div>
            </div>
        </div>

        <div class="divider"></div>

        <!-- Detailed Unit/Room Breakdown -->
        <div>
            <div class="breakdown-title">${propertyName}</div>
            <div class="breakdown-sub">${mealPlan}</div>

            <table class="line-item-table">
                <tr>
                    <td class="item-label">${booking.checkIn && booking.checkOut ? `${booking.checkIn} - ${booking.checkOut}` : 'Stay Period'} &nbsp;&bull;&nbsp; Standard Member Rate</td>
                    <td class="item-val">1 x PKR ${formatPKR(accomCharges)}</td>
                </tr>
                ${cleaningFee ? `
                <tr>
                    <td class="item-label">Cleaning &amp; Housekeeping Service</td>
                    <td class="item-val">PKR ${formatPKR(cleaningFee)}</td>
                </tr>
                ` : ''}
                ${upgradesTotal ? `
                <tr>
                    <td class="item-label">Add-on Upgrades &amp; Luxury Packages</td>
                    <td class="item-val">PKR ${formatPKR(upgradesTotal)}</td>
                </tr>
                ` : ''}
                <tr>
                    <td class="item-label">TAX (GST 15%)</td>
                    <td class="item-val">PKR ${formatPKR(tax)}</td>
                </tr>
                ${discount ? `
                <tr style="color: #059669;">
                    <td class="item-label" style="color: #059669; font-weight: 600;">Discount (${booking.couponCode || 'PROMO'})</td>
                    <td class="item-val">-PKR ${formatPKR(discount)}</td>
                </tr>
                ` : ''}
                <tr class="total-row">
                    <td>Total unit/room price</td>
                    <td class="item-val">PKR ${formatPKR(grandTotal)}</td>
                </tr>
            </table>
        </div>

        <div class="footer-note">
            KPH Stay Resort &amp; Spa &bull; Official Confirmation Receipt &bull; www.kphstay.com &bull; support@kphstay.com
        </div>
    </div>
</body>
</html>`;
}

const CANONICAL_INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || 'kphstay_internal_secret_2026';

async function sendBookingEmail(booking, pdfAttachment) {
    if (!booking) {
        throw new Error('No booking details provided');
    }

    const guestName = booking.guestName || 'Valued Guest';
    const guestEmail = (booking.guestEmail || booking.email || '').toLowerCase().trim();
    const bookingId = booking.id || 'BK-XXXX';

    if (!guestEmail) {
        throw new Error('No guest email address specified for booking invoice');
    }

    console.log(`[Invoice Emailer] Formatting invoice for ${guestName} (${guestEmail}) for booking ${bookingId}`);

    const htmlContent = buildInvoiceHTML(booking);

    // SMTP Configuration with Hostinger fallbacks
    const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const user = process.env.SMTP_USER || 'info@kphstay.com';
    const pass = process.env.SMTP_PASS || 'Targit@2027';

    // Configure Nodemailer
    const transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: port === 465,
        auth: { user, pass }
    });

    const mailOptions = {
        from: `"KPH Stay Lobby" <${user}>`,
        to: guestEmail,
        subject: `Official Booking Confirmation & Invoice - ${bookingId} | KPH STAY`,
        html: htmlContent
    };

    if (pdfAttachment) {
        const base64Data = pdfAttachment.includes('base64,') ? pdfAttachment.split('base64,')[1] : pdfAttachment;
        if (base64Data) {
            mailOptions.attachments = [
                {
                    filename: `KPH-Stay-Invoice-${bookingId}.pdf`,
                    content: base64Data,
                    encoding: 'base64'
                }
            ];
        }
    }

    // Send Email
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Invoice Emailer] Invoice email sent successfully to ${guestEmail} for booking ${bookingId}. MessageID: ${info.messageId}`);
    return { message: "Invoice email sent successfully.", messageId: info.messageId, bookingId };
}

exports.sendBookingEmail = sendBookingEmail;

exports.handler = async (event, context) => {
    const origin = event.headers.origin || event.headers.Origin || '';
    let allowedOrigin = 'https://kphstay.com';
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('kphstay.com') || origin.includes('netlify.app')) {
        allowedOrigin = origin;
    }

    // CORS preflight support
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
            body: 'Method Not Allowed' 
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const internalSecret = body.internalSecret;

        // Allow if secret matches OR if request originates from an allowed origin
        const isAuthorizedSecret = internalSecret && (internalSecret === CANONICAL_INTERNAL_SECRET || internalSecret === process.env.INTERNAL_API_SECRET);
        const isOriginAllowed = origin.includes('kphstay.com') || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('netlify.app');

        if (!isAuthorizedSecret && !isOriginAllowed) {
            return {
                statusCode: 403,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Forbidden: Unauthorized direct api execution.' })
            };
        }

        const booking = body.booking || body;
        const pdfAttachment = body.pdfAttachment || booking.pdfAttachment;

        const result = await sendBookingEmail(booking, pdfAttachment);

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': allowedOrigin, 'Content-Type': 'application/json' },
            body: JSON.stringify(result)
        };

    } catch (err) {
        console.error("[Invoice Emailer Error]:", err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': allowedOrigin, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal Server Error: ' + err.message })
        };
    }
};
