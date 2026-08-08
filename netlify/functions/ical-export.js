// Netlify Serverless Function: iCal Export Feed (.ics)
// Exposes website reservations in standard iCalendar format for Airbnb / OTA calendar import.

function formatDateICal(date) {
    if (!(date instanceof Date) || isNaN(date)) return '';
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}${m}${d}`;
}

exports.handler = async (event, context) => {
    try {
        const roomId = event.queryStringParameters.roomId || 'test-suite-1';
        const roomName = event.queryStringParameters.roomName || 'Kaghan Royal Mountain Suite';

        // Sample / Mock reservations for test environment
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 10);
        const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 15);
        
        const sampleBookings = [
            {
                id: 'kaghan-res-001',
                guestName: 'Direct Guest (Kaghan Stay)',
                checkIn: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).toISOString(),
                checkOut: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5).toISOString()
            },
            {
                id: 'kaghan-res-002',
                guestName: 'Direct Guest (Website)',
                checkIn: nextMonth.toISOString(),
                checkOut: nextMonthEnd.toISOString()
            }
        ];

        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Kaghan Stay//iCal Export Endpoint v1.0//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            `X-WR-CALNAME:${roomName}`
        ];

        sampleBookings.forEach((b) => {
            const start = new Date(b.checkIn);
            const end = new Date(b.checkOut);
            if (isNaN(start) || isNaN(end)) return;

            lines.push('BEGIN:VEVENT');
            lines.push(`UID:${b.id}@kphstay.com`);
            lines.push(`DTSTAMP:${formatDateICal(new Date())}T000000Z`);
            lines.push(`DTSTART;VALUE=DATE:${formatDateICal(start)}`);
            lines.push(`DTEND;VALUE=DATE:${formatDateICal(end)}`);
            lines.push(`SUMMARY:${b.guestName || 'Reserved'}`);
            lines.push(`DESCRIPTION:Confirmed booking on Kaghan Stay website.`);
            lines.push('STATUS:CONFIRMED');
            lines.push('END:VEVENT');
        });

        lines.push('END:VCALENDAR');
        const icsBody = lines.join('\r\n');

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': `attachment; filename="${roomId}.ics"`,
                'Access-Control-Allow-Origin': '*'
            },
            body: icsBody
        };
    } catch (err) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: err.message || 'Failed to generate iCal feed' })
        };
    }
};
