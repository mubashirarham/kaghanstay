require('dotenv').config();
const nodemailer = require('nodemailer');

function formatPKR(val) {
    const num = Number(val || 0);
    return num.toLocaleString('en-PK', { maximumFractionDigits: 0 });
}

function buildInvoiceHTML(booking) {
    const bookingId = booking.id || 'KPH-BOOK-0000';
    const invoiceNo = booking.invoiceNo || `KPH-INV-${(booking.id || '').replace(/^KPH-BOOK-|^BK-/, '')}`;
    const invoiceDate = booking.invoiceDate || (booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));
    const bookingSource = booking.bookingSource || 'KPHStay.com';

    // Guest Information
    const guestName = booking.guestName || 'Valued Guest';
    const guestPhone = booking.guestPhone || 'N/A';
    const guestEmail = booking.guestEmail || 'N/A';
    const cnicPassport = booking.cnicPassport || booking.cnic || booking.passport || 'Verified at Check-in';
    const nationality = booking.nationality || 'Pakistani';
    const address = booking.address || 'N/A';

    // Reservation Details
    const propertyName = booking.propertyName || booking.roomName || 'KPH Stay Luxury Suite';
    const unitNo = booking.unitNo || booking.apartmentNo || booking.roomId || 'Suite A';
    const roomType = booking.roomType || '1 Bedroom';
    const checkIn = booking.checkIn || 'N/A';
    const checkInTime = booking.checkInTime || '2:00 PM';
    const checkOut = booking.checkOut || 'N/A';
    const checkOutTime = booking.checkOutTime || '12:00 PM';
    
    let nights = booking.totalNights || booking.nights;
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

    const adults = booking.adults || 2;
    const children = booking.children || 0;

    // Charges Breakdown
    const grandTotal = Number(booking.grandTotal || booking.totalPrice || 0);
    const accomCharges = booking.accomCharges !== undefined ? Number(booking.accomCharges) : (booking.subtotal ? Number(booking.subtotal) : grandTotal);
    const cleaningFee = Number(booking.cleaningFee || 0);
    const extraGuestCharges = Number(booking.extraGuestCharges || 0);
    const extraMattress = Number(booking.extraMattress || 0);
    const kitchenUsageCharges = Number(booking.kitchenUsageCharges || 0);
    const securityDeposit = Number(booking.securityDeposit || 0);
    const laundryService = Number(booking.laundryService || 0);
    const otherCharges = Number(booking.otherCharges || (booking.upgradesTotal || 0));

    const subtotal = booking.subtotal !== undefined ? Number(booking.subtotal) : (accomCharges + cleaningFee + extraGuestCharges + extraMattress + kitchenUsageCharges + laundryService + otherCharges);
    const discount = Number(booking.discount || booking.discountAmount || 0);
    const tax = booking.tax !== undefined ? Number(booking.tax) : 0;
    const advancePaid = booking.advancePaid !== undefined ? Number(booking.advancePaid) : (booking.paymentStatus === 'PAID' ? grandTotal : Number(booking.advanceAmount || 0));
    const balanceDue = booking.balanceDue !== undefined ? Number(booking.balanceDue) : Math.max(0, grandTotal - advancePaid);

    // Payment details
    const paymentMethod = booking.paymentMethod || 'Credit/Debit Card';
    const transactionNo = booking.transactionNo || booking.paymentRef || booking.id || 'N/A';
    const paymentStatus = (booking.paymentStatus || (balanceDue === 0 ? 'PAID' : (advancePaid > 0 ? 'PARTIALLY PAID' : 'UNPAID'))).toUpperCase();

    // Checkbox Renderers
    const renderSourceBox = (name) => {
        const isChecked = bookingSource.toLowerCase().includes(name.toLowerCase());
        return `<span style="display: inline-block; margin-right: 12px; font-size: 13px; color: ${isChecked ? '#0F172A' : '#64748B'};">${isChecked ? '&#9745;' : '&#9633;'} <strong>${name}</strong></span>`;
    };

    const renderRoomTypeBox = (name) => {
        const isChecked = roomType.toLowerCase().includes(name.toLowerCase());
        return `<span style="display: inline-block; margin-right: 12px; font-size: 12px; color: ${isChecked ? '#0F172A' : '#64748B'};">${isChecked ? '&#9745;' : '&#9633;'} ${name}</span>`;
    };

    const renderPaymentMethodBox = (name) => {
        const isChecked = paymentMethod.toLowerCase().includes(name.toLowerCase());
        return `<span style="display: inline-block; margin-right: 12px; font-size: 12px; color: ${isChecked ? '#0F172A' : '#64748B'};">${isChecked ? '&#9745;' : '&#9633;'} ${name}</span>`;
    };

    const renderStatusBox = (name) => {
        const isChecked = paymentStatus === name;
        const color = name === 'PAID' ? '#10B981' : (name === 'PARTIALLY PAID' ? '#F59E0B' : '#EF4444');
        return `<span style="display: inline-block; margin-right: 12px; font-size: 13px; font-weight: bold; color: ${isChecked ? color : '#94A3B8'};">${isChecked ? '&#9745;' : '&#9633;'} ${name}</span>`;
    };

    return `
    <!DOCTYPE html>
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
                border-bottom: 3px solid #D4AF37;
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
                color: #D4AF37;
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
                color: #D4AF37;
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
                font-size: 14px;
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
                padding: 6px 0;
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
                width: 320px;
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
                color: #D4AF37;
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
                line-height: 1.8;
                color: #334155;
            }
            .terms-box {
                background-color: #FFFDF5;
                border: 1px solid #FEF08A;
                border-radius: 10px;
                padding: 15px;
                font-size: 11px;
                line-height: 1.6;
                color: #713F12;
                margin-top: 20px;
            }
            .terms-box ul {
                margin: 6px 0 0 0;
                padding-left: 18px;
            }
            .signatures {
                margin-top: 45px;
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
                color: #D4AF37;
                font-weight: 800;
                font-size: 14px;
                letter-spacing: 1px;
            }
        </style>
    </head>
    <body>
        <div class="invoice-card">
            <!-- Header -->
            <div class="header-banner">
                <div class="brand-title">KPH STAY</div>
                <div class="brand-sub">Luxury Apartments &amp; Vacation Rentals</div>
                <div class="brand-contacts">
                    Website: <a href="https://www.kphstay.com">www.kphstay.com</a> &nbsp;|&nbsp; Email: <a href="mailto:info@kphstay.com">info@kphstay.com</a>
                </div>
            </div>

            <!-- Body -->
            <div class="invoice-body">
                <div class="doc-title">BOOKING INVOICE</div>

                <!-- Company Information -->
                <div class="section-header">Company Information</div>
                <table class="grid-2">
                    <tr>
                        <td width="50%"><span class="label">Invoice No:</span> <span class="val">${invoiceNo}</span></td>
                        <td width="50%"><span class="label">Booking ID:</span> <span class="val">${bookingId}</span></td>
                    </tr>
                    <tr>
                        <td><span class="label">Invoice Date:</span> <span class="val">${invoiceDate}</span></td>
                        <td><span class="label">Booking Source:</span></td>
                    </tr>
                    <tr>
                        <td colspan="2" style="padding-top: 4px;">
                            ${renderSourceBox('KPHStay.com')}
                            ${renderSourceBox('Direct Booking')}
                            ${renderSourceBox('WhatsApp')}
                            ${renderSourceBox('Airbnb')}
                            ${renderSourceBox('Booking.com')}
                        </td>
                    </tr>
                </table>

                <!-- Guest Information -->
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
                </table>

                <!-- Reservation Details -->
                <div class="section-header">Reservation Details</div>
                <table class="grid-2">
                    <tr>
                        <td width="50%"><span class="label">Property Name:</span> <span class="val">${propertyName}</span></td>
                        <td width="50%"><span class="label">Apartment / Unit No.:</span> <span class="val">${unitNo}</span></td>
                    </tr>
                    <tr>
                        <td colspan="2" style="padding-top: 4px; padding-bottom: 8px;">
                            <span class="label" style="display: block; margin-bottom: 4px;">Room Type:</span>
                            ${renderRoomTypeBox('Studio')}
                            ${renderRoomTypeBox('1 Bedroom')}
                            ${renderRoomTypeBox('2 Bedroom')}
                            ${renderRoomTypeBox('3 Bedroom')}
                            ${renderRoomTypeBox('Penthouse')}
                        </td>
                    </tr>
                    <tr>
                        <td><span class="label">Check-in Date:</span> <span class="val">${checkIn}</span> (<span class="val">${checkInTime}</span>)</td>
                        <td><span class="label">Check-out Date:</span> <span class="val">${checkOut}</span> (<span class="val">${checkOutTime}</span>)</td>
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
                            <td><strong>Accommodation Charges</strong> (${propertyName})</td>
                            <td style="text-align: center;">${nights}</td>
                            <td style="text-align: right;">${formatPKR(nights > 0 ? accomCharges / nights : accomCharges)}</td>
                            <td style="text-align: right;"><strong>${formatPKR(accomCharges)}</strong></td>
                        </tr>
                        <tr>
                            <td>Cleaning Fee</td>
                            <td style="text-align: center;">${cleaningFee > 0 ? 1 : 0}</td>
                            <td style="text-align: right;">${formatPKR(cleaningFee)}</td>
                            <td style="text-align: right;">${formatPKR(cleaningFee)}</td>
                        </tr>
                        <tr>
                            <td>Extra Guest Charges</td>
                            <td style="text-align: center;">${extraGuestCharges > 0 ? 1 : 0}</td>
                            <td style="text-align: right;">${formatPKR(extraGuestCharges)}</td>
                            <td style="text-align: right;">${formatPKR(extraGuestCharges)}</td>
                        </tr>
                        <tr>
                            <td>Extra Mattress</td>
                            <td style="text-align: center;">${extraMattress > 0 ? 1 : 0}</td>
                            <td style="text-align: right;">${formatPKR(extraMattress)}</td>
                            <td style="text-align: right;">${formatPKR(extraMattress)}</td>
                        </tr>
                        <tr>
                            <td>Kitchen Usage Charges</td>
                            <td style="text-align: center;">${kitchenUsageCharges > 0 ? 1 : 0}</td>
                            <td style="text-align: right;">${formatPKR(kitchenUsageCharges)}</td>
                            <td style="text-align: right;">${formatPKR(kitchenUsageCharges)}</td>
                        </tr>
                        <tr>
                            <td>Security Deposit (Refundable)</td>
                            <td style="text-align: center;">${securityDeposit > 0 ? 1 : 0}</td>
                            <td style="text-align: right;">${formatPKR(securityDeposit)}</td>
                            <td style="text-align: right;">${formatPKR(securityDeposit)}</td>
                        </tr>
                        <tr>
                            <td>Laundry Service</td>
                            <td style="text-align: center;">${laundryService > 0 ? 1 : 0}</td>
                            <td style="text-align: right;">${formatPKR(laundryService)}</td>
                            <td style="text-align: right;">${formatPKR(laundryService)}</td>
                        </tr>
                        <tr>
                            <td>Other Charges / Addons</td>
                            <td style="text-align: center;">${otherCharges > 0 ? 1 : 0}</td>
                            <td style="text-align: right;">${formatPKR(otherCharges)}</td>
                            <td style="text-align: right;">${formatPKR(otherCharges)}</td>
                        </tr>
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
                <div style="font-size: 13px; margin-bottom: 10px;">
                    <span class="label" style="display: block; margin-bottom: 6px;">Payment Method:</span>
                    ${renderPaymentMethodBox('Cash')}
                    ${renderPaymentMethodBox('Bank Transfer')}
                    ${renderPaymentMethodBox('JazzCash')}
                    ${renderPaymentMethodBox('Easypaisa')}
                    ${renderPaymentMethodBox('Credit/Debit Card')}
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
                    <ul>
                        <li>Check-in Time: 2:00 PM</li>
                        <li>Check-out Time: 12:00 PM</li>
                        <li>Original CNIC/Passport is mandatory for every guest.</li>
                        <li>All guests must be registered before entering the property.</li>
                        <li>Security deposit (if applicable) is refundable after checkout inspection.</li>
                        <li>Any damage, missing items, or excessive cleaning charges will be deducted accordingly.</li>
                        <li>Smoking is prohibited unless permitted in designated areas.</li>
                        <li>Cancellation and refund policy applies according to the booking terms.</li>
                        <li>By signing this invoice, the guest agrees to all KPH Stay policies.</li>
                    </ul>
                </div>

                <!-- Signatures -->
                <table class="signatures">
                    <tr>
                        <td>
                            <div class="sig-line"></div>
                            <div class="sig-label">Guest Signature</div>
                        </td>
                        <td>
                            <div class="sig-line"></div>
                            <div class="sig-label">Authorized Signature &amp; Stamp</div>
                        </td>
                    </tr>
                </table>
            </div>

            <!-- Footer -->
            <div class="footer-banner">
                <div class="footer-brand">KPH STAY</div>
                <div style="margin: 4px 0 8px 0; color: #E2E8F0;">Luxury Apartments &amp; Vacation Rentals</div>
                <div>&#127760; www.kphstay.com &nbsp;|&nbsp; &#128231; info@kphstay.com</div>
                <div style="margin-top: 10px; font-weight: 500; color: #D4AF37;">
                    Thank you for choosing KPH Stay. We look forward to hosting you again!
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const internalSecret = body.internalSecret;

        if (!internalSecret || internalSecret !== process.env.INTERNAL_API_SECRET) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'Forbidden: Unauthorized direct api execution.' })
            };
        }

        const booking = body.booking;
        const pdfAttachment = body.pdfAttachment; // base64 string

        if (!booking) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No booking details provided in request body.' })
            };
        }

        const guestName = booking.guestName || 'Valued Guest';
        const guestEmail = booking.guestEmail || '';
        const bookingId = booking.id || 'BK-XXXX';

        console.log(`[Invoice Emailer] Formatting invoice for ${guestName} (${guestEmail}) for booking ${bookingId}`);

        const htmlContent = buildInvoiceHTML(booking);

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

        const mailOptions = {
            from: `"KPH Stay Lobby" <${user}>`,
            to: guestEmail,
            subject: `Booking Invoice - ${bookingId} | KPH STAY`,
            html: htmlContent
        };

        if (pdfAttachment) {
            const base64Data = pdfAttachment.split('base64,')[1] || pdfAttachment;
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
        await transporter.sendMail(mailOptions);

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
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};
