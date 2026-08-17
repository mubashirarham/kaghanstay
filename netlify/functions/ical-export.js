// Netlify Serverless Function: iCalendar (.ics) Export Feed for Airbnb & OTAs
// Compliant with RFC 5545 standard for multi-channel calendar synchronization.

const { fdb } = require('./_admin-init');

// Helper to format Date to iCal Date format YYYYMMDD
function formatIcalDate(dateInput) {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// Helper to format Date to iCal Datetime format YYYYMMDDTHHMMSSZ
function formatIcalDateTime(dateInput) {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

exports.handler = async (event, context) => {
    // Enable CORS for external calendar clients
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    const params = event.queryStringParameters || {};
    const roomId = params.roomId || params.id || params.room;

    if (!roomId) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'text/plain' },
            body: 'Error: roomId query parameter is required. Example: ?roomId=room-123'
        };
    }

    if (!fdb) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/plain' },
            body: 'Error: Database connection unavailable.'
        };
    }

    try {
        // 1. Fetch Room Metadata
        let roomData = null;
        let cleanRoomId = roomId;

        const directRoomDoc = await fdb.collection('rooms').doc(roomId).get();
        if (directRoomDoc.exists) {
            roomData = directRoomDoc.data();
            cleanRoomId = directRoomDoc.id;
        } else {
            // Try querying by slug or custom ID
            const slugSnap = await fdb.collection('rooms').where('slug', '==', roomId).limit(1).get();
            if (!slugSnap.empty) {
                roomData = slugSnap.docs[0].data();
                cleanRoomId = slugSnap.docs[0].id;
            }
        }

        const roomName = (roomData && roomData.name) ? roomData.name.replace(/[\r\n,]/g, ' ') : `Suite ${cleanRoomId}`;

        // 2. Fetch Confirmed Direct Bookings for this Room
        const bookingsSnap = await fdb.collection('bookings')
            .where('roomId', '==', cleanRoomId)
            .get();

        const events = [];
        const nowIcal = formatIcalDateTime(new Date());

        bookingsSnap.forEach(doc => {
            const b = doc.data();
            // Skip cancelled bookings
            if (b.status === 'cancelled' || b.paymentStatus === 'refunded') return;

            if (b.checkIn && b.checkOut) {
                const dtStart = formatIcalDate(b.checkIn);
                const dtEnd = formatIcalDate(b.checkOut);

                if (dtStart && dtEnd) {
                    events.push({
                        uid: `kaghan-booking-${doc.id}@kphstay.com`,
                        dtstamp: nowIcal,
                        dtstart: dtStart,
                        dtend: dtEnd,
                        summary: `Reserved (Kaghan Stay Direct #${doc.id.slice(-6)})`,
                        description: `Direct guest reservation for ${roomName} via Kaghan Stay Portal.`
                    });
                }
            }
        });

        // 3. Fetch Admin Blocked Dates
        const blockedDates = (roomData && Array.isArray(roomData.blockedDates)) ? roomData.blockedDates : [];
        if (blockedDates.length > 0) {
            // Group contiguous blocked dates into single VEVENT ranges
            const sortedDates = [...new Set(blockedDates)].sort();
            let currentRangeStart = null;
            let currentRangeEnd = null;

            sortedDates.forEach((dateStr, idx) => {
                const dt = new Date(dateStr + 'T00:00:00Z');
                if (isNaN(dt.getTime())) return;

                if (!currentRangeStart) {
                    currentRangeStart = new Date(dt);
                    currentRangeEnd = new Date(dt);
                    currentRangeEnd.setUTCDate(currentRangeEnd.getUTCDate() + 1);
                } else {
                    const expectedNext = new Date(currentRangeEnd);
                    if (dt.toISOString().split('T')[0] === expectedNext.toISOString().split('T')[0]) {
                        currentRangeEnd.setUTCDate(currentRangeEnd.getUTCDate() + 1);
                    } else {
                        // Push completed range
                        events.push({
                            uid: `kaghan-block-${cleanRoomId}-${formatIcalDate(currentRangeStart)}@kphstay.com`,
                            dtstamp: nowIcal,
                            dtstart: formatIcalDate(currentRangeStart),
                            dtend: formatIcalDate(currentRangeEnd),
                            summary: `Blocked by Host (Kaghan Stay)`,
                            description: `Host maintenance or administrative block for ${roomName}.`
                        });
                        currentRangeStart = new Date(dt);
                        currentRangeEnd = new Date(dt);
                        currentRangeEnd.setUTCDate(currentRangeEnd.getUTCDate() + 1);
                    }
                }
            });

            if (currentRangeStart && currentRangeEnd) {
                events.push({
                    uid: `kaghan-block-${cleanRoomId}-${formatIcalDate(currentRangeStart)}@kphstay.com`,
                    dtstamp: nowIcal,
                    dtstart: formatIcalDate(currentRangeStart),
                    dtend: formatIcalDate(currentRangeEnd),
                    summary: `Blocked by Host (Kaghan Stay)`,
                    description: `Host maintenance or administrative block for ${roomName}.`
                });
            }
        }

        // 4. Construct RFC 5545 compliant VCALENDAR text
        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Kaghan Stay Resort Management//Listing Availability Feed//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            `X-WR-CALNAME:Kaghan Stay - ${roomName}`,
            'X-WR-TIMEZONE:Asia/Karachi'
        ];

        events.forEach(ev => {
            icsContent.push(
                'BEGIN:VEVENT',
                `UID:${ev.uid}`,
                `DTSTAMP:${ev.dtstamp}`,
                `DTSTART;VALUE=DATE:${ev.dtstart}`,
                `DTEND;VALUE=DATE:${ev.dtend}`,
                `SUMMARY:${ev.summary}`,
                `DESCRIPTION:${ev.description}`,
                'STATUS:CONFIRMED',
                'TRANSP:OPAQUE',
                'END:VEVENT'
            );
        });

        icsContent.push('END:VCALENDAR');

        const icsString = icsContent.join('\r\n') + '\r\n';

        headers['Content-Disposition'] = `inline; filename="kaghan-${cleanRoomId}.ics"`;

        return {
            statusCode: 200,
            headers,
            body: icsString
        };

    } catch (err) {
        console.error("iCal Export error:", err);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/plain' },
            body: `Error generating calendar feed: ${err.message}`
        };
    }
};
