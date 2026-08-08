require('dotenv').config();
const nodemailer = require('nodemailer');

function formatPKR(val) {
    const num = Number(val || 0);
    return num.toLocaleString('en-PK', { maximumFractionDigits: 0 });
}

function buildInvoiceHTML(booking) {
    const b = booking || {};
    const bookingId = b.id || 'KPH-BOOK-9842';
    const invoiceNo = b.invoiceNo || `KPH-INV-${(bookingId).replace(/^KPH-BOOK-|^BK-/, '')}`;
    const invoiceDate = b.invoiceDate || (b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));
    const bookingSource = b.bookingSource || 'KPHStay.com';

    // Guest Information
    const guestName = b.guestName || 'Valued Guest';
    const guestPhone = b.guestPhone || 'N/A';
    const guestEmail = b.guestEmail || b.email || 'N/A';
    const cnicPassport = b.cnicPassport || b.cnic || b.passport || 'Verified at Check-in';
    const nationality = b.nationality || 'Pakistani';
    const address = b.address || 'N/A';

    // Reservation Details
    const propertyName = b.propertyName || b.roomName || 'KPH Stay Luxury Suite';
    const unitNo = b.unitNo || b.apartmentNo || b.roomId || 'Suite A';
    const roomType = b.roomType || '1 Bedroom';
    const checkIn = b.checkIn || 'N/A';
    const checkInTime = b.checkInTime || '2:00 PM';
    const checkOut = b.checkOut || 'N/A';
    const checkOutTime = b.checkOutTime || '12:00 PM';

    let nights = b.totalNights || b.nights;
    if (!nights && checkIn !== 'N/A' && checkOut !== 'N/A') {
        const d1 = new Date(checkIn);
        const d2 = new Date(checkOut);
        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
            nights = Math.max(1, Math.ceil((d2 - d1) / (1000 * 3600 * 24)));
        } else {
            nights = 1;
        }
    }
    nights = nights || 1;

    const adults = b.adults || 2;
    const children = b.children || 0;

    // Charges Breakdown
    const grandTotal = Number(b.grandTotal || b.totalPrice || 0);
    const accomCharges = b.accomCharges !== undefined ? Number(b.accomCharges) : (b.subtotal ? Number(b.subtotal) : grandTotal);
    const cleaningFee = Number(b.cleaningFee || 0);
    const extraGuestCharges = Number(b.extraGuestCharges || 0);
    const extraMattress = Number(b.extraMattress || 0);
    const kitchenUsageCharges = Number(b.kitchenUsageCharges || 0);
    const securityDeposit = Number(b.securityDeposit || 0);
    const laundryService = Number(b.laundryService || 0);
    const otherCharges = Number(b.otherCharges || (b.upgradesTotal || 0));

    const subtotal = b.subtotal !== undefined ? Number(b.subtotal) : (accomCharges + cleaningFee + extraGuestCharges + extraMattress + kitchenUsageCharges + laundryService + otherCharges);
    const discount = Number(b.discount || b.discountAmount || 0);
    const tax = b.tax !== undefined ? Number(b.tax) : 0;
    const advancePaid = b.advancePaid !== undefined ? Number(b.advancePaid) : (b.paymentStatus === 'PAID' ? grandTotal : Number(b.advanceAmount || 0));
    const balanceDue = b.balanceDue !== undefined ? Number(b.balanceDue) : Math.max(0, grandTotal - advancePaid);

    // Payment Details
    const paymentMethod = b.paymentMethod || 'Credit/Debit Card';
    const transactionNo = b.transactionNo || b.paymentRef || b.id || 'N/A';
    const paymentStatus = (b.paymentStatus || (balanceDue === 0 ? 'PAID' : (advancePaid > 0 ? 'PARTIALLY PAID' : 'UNPAID'))).toUpperCase();

    // Checkbox Renderers
    const renderCheckbox = (label, isChecked, isBold = false) => {
        const box = isChecked ? '&#9745;' : '&#9633;';
        const color = isChecked ? '#0F172A' : '#64748B';
        const text = isBold ? `<strong>${label}</strong>` : label;
        return `<span style="display: inline-block; margin-right: 14px; font-size: 12px; color: ${color};">${box} ${text}</span>`;
    };

    const renderStatusBox = (statusName) => {
        const isChecked = paymentStatus === statusName;
        const box = isChecked ? '&#9745;' : '&#9633;';
        const color = isChecked ? (statusName === 'PAID' ? '#10B981' : (statusName === 'PARTIALLY PAID' ? '#F59E0B' : '#EF4444')) : '#94A3B8';
        return `<span style="display: inline-block; margin-right: 14px; font-size: 13px; font-weight: bold; color: ${color};">${box} ${statusName}</span>`;
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Booking Invoice - KPH Stay</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #F1F5F9;
            margin: 0;
            padding: 30px 15px;
            color: #0F172A;
            -webkit-font-smoothing: antialiased;
        }
        .invoice-card {
            max-width: 780px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
            border: 1px solid #E2E8F0;
        }
        .header-banner {
            background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
            padding: 35px 30px;
            text-align: center;
            border-bottom: 3px solid #C5A059;
            color: #ffffff;
        }
        .brand-title {
            font-size: 28px;
            font-weight: 900;
            letter-spacing: 3px;
            margin: 0;
            color: #ffffff;
            text-transform: uppercase;
        }
        .brand-sub {
            color: #C5A059;
            font-size: 12px;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-top: 6px;
            font-weight: 600;
        }
        .brand-contacts {
            margin-top: 10px;
            font-size: 12px;
            color: #94A3B8;
        }
        .brand-contacts a {
            color: #C5A059;
            text-decoration: none;
        }
        .invoice-body {
            padding: 35px;
        }
        .doc-title {
            text-align: center;
            font-size: 22px;
            font-weight: 800;
            color: #0F172A;
            letter-spacing: 2px;
            margin: 0 0 25px 0;
            text-transform: uppercase;
        }
        .section-header {
            font-size: 13px;
            font-weight: 800;
            color: #0F172A;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 2px solid #F1F5F9;
            padding-bottom: 6px;
            margin-top: 25px;
            margin-bottom: 12px;
        }
        .grid-2 {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .grid-2 td {
            padding: 5px 0;
            font-size: 13px;
            vertical-align: top;
        }
        .label {
            color: #64748B;
            font-weight: 600;
        }
        .val {
            color: #0F172A;
            font-weight: 700;
        }
        .table-charges {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            margin-bottom: 20px;
        }
        .table-charges th {
            background-color: #F8FAFC;
            color: #475569;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 10px 12px;
            border-bottom: 2px solid #E2E8F0;
            text-align: left;
        }
        .table-charges td {
            padding: 10px 12px;
            border-bottom: 1px solid #F1F5F9;
            font-size: 13px;
            color: #1E293B;
        }
        .totals-box {
            width: 330px;
            margin-left: auto;
            background-color: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 25px;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            padding: 4px 0;
            color: #475569;
        }
        .totals-row.grand {
            border-top: 2px solid #CBD5E1;
            margin-top: 8px;
            padding-top: 8px;
            font-weight: 800;
            font-size: 15px;
            color: #0F172A;
        }
        .totals-row.grand .amount {
            color: #C5A059;
        }
        .totals-row.due {
            font-weight: 800;
            font-size: 14px;
            color: #DC2626;
            border-top: 1px dashed #CBD5E1;
            margin-top: 6px;
            padding-top: 6px;
        }
        .checklist {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 10px;
            padding: 15px;
            font-size: 12px;
            line-height: 1.9;
            color: #334155;
        }
        .terms-box {
            background-color: #FFFDF5;
            border: 1px solid #FEF08A;
            border-radius: 10px;
            padding: 15px;
            font-size: 11px;
            line-height: 1.7;
            color: #713F12;
            margin-top: 20px;
        }
        .terms-box ul {
            margin: 6px 0 0 0;
            padding-left: 18px;
        }
        .signatures {
            margin-top: 40px;
            width: 100%;
            border-collapse: collapse;
        }
        .signatures td {
            width: 50%;
            text-align: center;
            vertical-align: bottom;
            padding: 10px;
        }
        .sig-line {
            border-top: 1px solid #94A3B8;
            margin: 40px auto 8px auto;
            width: 80%;
        }
        .sig-label {
            font-size: 12px;
            font-weight: 700;
            color: #475569;
        }
        .footer-banner {
            background-color: #0F172A;
            color: #94A3B8;
            text-align: center;
            padding: 25px 20px;
            font-size: 12px;
            border-top: 1px solid #1E293B;
        }
        .footer-brand {
            color: #C5A059;
            font-weight: 800;
            font-size: 14px;
            letter-spacing: 1px;
        }
    </style>
</head>
<body>
    <div class="invoice-card">
        <!-- Header Banner -->
        <div class="header-banner">
            <div class="brand-title">KPH STAY</div>
            <div class="brand-sub">Luxury Apartments &amp; Vacation Rentals</div>
        </div>

        <div class="invoice-body">
            <div class="doc-title">BOOKING INVOICE</div>

            <!-- Top Invoice & Booking Metadata -->
            <div style="margin: 15px 0 20px 0; padding: 12px 18px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                        <td width="50%"><span class="label">Invoice No:</span> <strong style="color: #0F172A; font-size: 13px;">${invoiceNo}</strong></td>
                        <td width="50%"><span class="label">Booking ID:</span> <strong style="color: #C5A059; font-size: 13px;">${bookingId}</strong></td>
                    </tr>
                    <tr>
                        <td style="padding-top: 6px;"><span class="label">Invoice Date:</span> <strong style="color: #0F172A;">${invoiceDate}</strong></td>
                        <td style="padding-top: 6px;"><span class="label">Booking Source:</span> <strong style="color: #0F172A;">${bookingSource}</strong></td>
                    </tr>
                </table>
            </div>

            <!-- Guest & Reservation Details -->
            <div class="section-header">Guest Information</div>
            <table class="grid-2">
                <tr>
                    <td width="50%"><span class="label">Guest Name:</span> <span class="val">${guestName}</span></td>
                    <td width="50%"><span class="label">Phone Number:</span> <span class="val">${guestPhone}</span></td>
                </tr>
                <tr>
                    <td><span class="label">Email Address:</span> <span class="val">${guestEmail}</span></td>
                    <td><span class="label">CNIC / Passport No.:</span> <span class="val">${cnicPassport}</span></td>
                </tr>
                <tr>
                    <td><span class="label">Nationality:</span> <span class="val">${nationality}</span></td>
                    <td><span class="label">Address:</span> <span class="val">${address}</span></td>
                </tr>
                <tr>
                    <td width="50%" style="padding-top: 8px;"><span class="label">Property Name:</span> <span class="val">${propertyName}</span></td>
                    <td width="50%" style="padding-top: 8px;"><span class="label">Apartment / Unit No.:</span> <span class="val">${unitNo}</span></td>
                </tr>
                <tr>
                    <td colspan="2" style="padding-top: 4px; padding-bottom: 4px;">
                        <span class="label" style="display: inline-block; margin-right: 8px;">Room Type:</span>
                        ${renderCheckbox('Studio', roomType.toLowerCase().includes('studio'))}
                        ${renderCheckbox('1 Bedroom', roomType.toLowerCase().includes('1 bed') || roomType.toLowerCase().includes('1bedroom') || roomType.toLowerCase().includes('1-bed'))}
                        ${renderCheckbox('2 Bedroom', roomType.toLowerCase().includes('2 bed') || roomType.toLowerCase().includes('2bedroom') || roomType.toLowerCase().includes('2-bed'))}
                        ${renderCheckbox('3 Bedroom', roomType.toLowerCase().includes('3 bed') || roomType.toLowerCase().includes('3bedroom') || roomType.toLowerCase().includes('3-bed'))}
                        ${renderCheckbox('Penthouse', roomType.toLowerCase().includes('penthouse'))}
                    </td>
                </tr>
                <tr>
                    <td><span class="label">Check-in Date:</span> <span class="val">${checkIn} (${checkInTime})</span></td>
                    <td><span class="label">Check-out Date:</span> <span class="val">${checkOut} (${checkOutTime})</span></td>
                </tr>
                <tr>
                    <td><span class="label">Total Nights:</span> <span class="val">${nights}</span></td>
                    <td><span class="label">Total Guests:</span> Adults <span class="val">${adults}</span>, Children <span class="val">${children}</span></td>
                </tr>
            </table>

            <!-- Charges Table -->
            <div class="section-header">Charges</div>
            <table class="table-charges">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th style="text-align: center;">Qty</th>
                        <th style="text-align: right;">Rate (PKR)</th>
                        <th style="text-align: right;">Amount (PKR)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Accommodation Charges (${propertyName})</strong></td>
                        <td style="text-align: center;">${nights}</td>
                        <td style="text-align: right;">${formatPKR(nights > 0 ? accomCharges / nights : accomCharges)}</td>
                        <td style="text-align: right;"><strong>${formatPKR(accomCharges)}</strong></td>
                    </tr>
                    ${cleaningFee > 0 ? `
                    <tr>
                        <td>Cleaning Fee</td>
                        <td style="text-align: center;">1</td>
                        <td style="text-align: right;">${formatPKR(cleaningFee)}</td>
                        <td style="text-align: right;">${formatPKR(cleaningFee)}</td>
                    </tr>` : ''}
                    ${extraGuestCharges > 0 ? `
                    <tr>
                        <td>Extra Guest Charges</td>
                        <td style="text-align: center;">1</td>
                        <td style="text-align: right;">${formatPKR(extraGuestCharges)}</td>
                        <td style="text-align: right;">${formatPKR(extraGuestCharges)}</td>
                    </tr>` : ''}
                    ${extraMattress > 0 ? `
                    <tr>
                        <td>Extra Mattress</td>
                        <td style="text-align: center;">1</td>
                        <td style="text-align: right;">${formatPKR(extraMattress)}</td>
                        <td style="text-align: right;">${formatPKR(extraMattress)}</td>
                    </tr>` : ''}
                    ${kitchenUsageCharges > 0 ? `
                    <tr>
                        <td>Kitchen Usage Charges</td>
                        <td style="text-align: center;">1</td>
                        <td style="text-align: right;">${formatPKR(kitchenUsageCharges)}</td>
                        <td style="text-align: right;">${formatPKR(kitchenUsageCharges)}</td>
                    </tr>` : ''}
                    ${securityDeposit > 0 ? `
                    <tr>
                        <td>Security Deposit (Refundable)</td>
                        <td style="text-align: center;">1</td>
                        <td style="text-align: right;">${formatPKR(securityDeposit)}</td>
                        <td style="text-align: right;">${formatPKR(securityDeposit)}</td>
                    </tr>` : ''}
                    ${laundryService > 0 ? `
                    <tr>
                        <td>Laundry Service</td>
                        <td style="text-align: center;">1</td>
                        <td style="text-align: right;">${formatPKR(laundryService)}</td>
                        <td style="text-align: right;">${formatPKR(laundryService)}</td>
                    </tr>` : ''}
                    ${otherCharges > 0 ? `
                    <tr>
                        <td>Other Charges / Upgrades</td>
                        <td style="text-align: center;">1</td>
                        <td style="text-align: right;">${formatPKR(otherCharges)}</td>
                        <td style="text-align: right;">${formatPKR(otherCharges)}</td>
                    </tr>` : ''}
                </tbody>
            </table>

            <!-- Totals Box -->
            <div class="totals-box">
                <div class="totals-row">
                    <span>Subtotal:</span>
                    <span>PKR ${formatPKR(subtotal)}</span>
                </div>
                <div class="totals-row">
                    <span>Discount:</span>
                    <span>PKR ${formatPKR(discount)}</span>
                </div>
                <div class="totals-row">
                    <span>Tax (if applicable):</span>
                    <span>PKR ${formatPKR(tax)}</span>
                </div>
                <div class="totals-row grand">
                    <span>Grand Total:</span>
                    <span class="amount">PKR ${formatPKR(grandTotal)}</span>
                </div>
                <div class="totals-row">
                    <span>Advance Paid:</span>
                    <span>PKR ${formatPKR(advancePaid)}</span>
                </div>
                <div class="totals-row due">
                    <span>Balance Due:</span>
                    <span>PKR ${formatPKR(balanceDue)}</span>
                </div>
            </div>

            <!-- Payment Details -->
            <div class="section-header">Payment Details</div>
            <div style="font-size: 13px; margin-bottom: 8px;">
                <span class="label" style="display: block; margin-bottom: 4px;">Payment Method:</span>
                ${renderCheckbox('Cash', paymentMethod.toLowerCase().includes('cash'))}
                ${renderCheckbox('Bank Transfer', paymentMethod.toLowerCase().includes('bank'))}
                ${renderCheckbox('JazzCash', paymentMethod.toLowerCase().includes('jazzcash'))}
                ${renderCheckbox('Easypaisa', paymentMethod.toLowerCase().includes('easypaisa'))}
                ${renderCheckbox('Credit/Debit Card', paymentMethod.toLowerCase().includes('card') || paymentMethod.toLowerCase().includes('credit'))}
            </div>
            <table class="grid-2">
                <tr>
                    <td width="60%"><span class="label">Transaction / Reference No.:</span> <span class="val">${transactionNo}</span></td>
                    <td width="40%"><span class="label">Payment Status:</span> ${renderStatusBox('PAID')} ${renderStatusBox('PARTIALLY PAID')} ${renderStatusBox('UNPAID')}</td>
                </tr>
            </table>

            <!-- Guest Requirements -->
            <div class="section-header">Guest Requirements</div>
            <div class="checklist">
                <div>&#9745; Original CNIC / Passport Verified</div>
                <div>&#9745; Security Deposit Received</div>
                <div>&#9745; House Rules Explained</div>
                <div>&#9745; Apartment Keys / Smart Lock Access Shared</div>
                <div>&#9745; Wi-Fi Details Provided</div>
            </div>

            <!-- Terms & Conditions -->
            <div class="terms-box">
                <strong>Terms &amp; Conditions</strong>
                <div style="font-weight: bold; margin-top: 4px; margin-bottom: 4px;">Check-in Time: 2:00 PM &nbsp;|&nbsp; Check-out Time: 12:00 PM</div>
                <ul>
                    <li>Original CNIC/Passport is mandatory for every guest.</li>
                    <li>All guests must be registered before entering the property.</li>
                    <li>Security deposit (if applicable) is refundable after checkout inspection.</li>
                    <li>Any damage, missing items, or excessive cleaning charges will be deducted accordingly.</li>
                    <li>Smoking is prohibited unless permitted in designated areas.</li>
                    <li>Cancellation and refund policy applies according to the booking terms.</li>
                    <li>By signing this invoice, the guest agrees to all KPH Stay policies.</li>
                </ul>
            </div>
        </div>

        <!-- Footer Banner -->
        <div class="footer-banner">
            <div class="footer-brand">KPH STAY</div>
            <div style="margin-top: 4px; font-weight: 500; color: #E2E8F0;">
                Thank you for choosing KPH Stay. We look forward to hosting you again!
            </div>
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
