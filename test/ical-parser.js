// Kaghan Stay - iCal (.ics) Parser & Utility Module

(function() {
    /**
     * Parses iCal date strings into JavaScript Date objects.
     * Supports formats: YYYYMMDD, YYYYMMDDTHHMMSS, YYYYMMDDTHHMMSSZ
     */
    function parseICalDate(dateStr) {
        if (!dateStr) return null;
        // Clean params like VALUE=DATE:
        const cleanStr = dateStr.includes(':') ? dateStr.split(':').pop() : dateStr;
        const trimmed = cleanStr.trim();
        
        const year = parseInt(trimmed.substring(0, 4), 10);
        const month = parseInt(trimmed.substring(4, 6), 10) - 1;
        const day = parseInt(trimmed.substring(6, 8), 10);

        if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

        if (trimmed.length > 8 && trimmed.includes('T')) {
            const timePart = trimmed.split('T')[1];
            const hour = parseInt(timePart.substring(0, 2), 10) || 0;
            const minute = parseInt(timePart.substring(2, 4), 10) || 0;
            const second = parseInt(timePart.substring(4, 6), 10) || 0;
            return new Date(Date.UTC(year, month, day, hour, minute, second));
        }

        return new Date(year, month, day);
    }

    /**
     * Format JavaScript Date to YYYY-MM-DD string
     */
    function formatDateIso(date) {
        if (!(date instanceof Date) || isNaN(date)) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    /**
     * Format JavaScript Date to iCal date format YYYYMMDD
     */
    function formatDateICal(date) {
        if (!(date instanceof Date) || isNaN(date)) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}${m}${d}`;
    }

    /**
     * Parses standard iCalendar (.ics) string content into structured events array.
     */
    function parseICS(icsContent) {
        const events = [];
        if (!icsContent || typeof icsContent !== 'string') return events;

        // Unfold folded lines (lines starting with space or tab)
        const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
        const lines = unfolded.split(/\r\n|\n|\r/);

        let currentEvent = null;

        for (let line of lines) {
            line = line.trim();
            if (line === 'BEGIN:VEVENT') {
                currentEvent = {};
            } else if (line === 'END:VEVENT') {
                if (currentEvent && currentEvent.dtstart && currentEvent.dtend) {
                    events.push(currentEvent);
                }
                currentEvent = null;
            } else if (currentEvent) {
                const colonIdx = line.indexOf(':');
                if (colonIdx !== -1) {
                    const keyPart = line.substring(0, colonIdx);
                    const valPart = line.substring(colonIdx + 1);
                    const propName = keyPart.split(';')[0].toUpperCase();

                    if (propName === 'SUMMARY') {
                        currentEvent.summary = valPart;
                    } else if (propName === 'DTSTART') {
                        currentEvent.dtstartRaw = valPart;
                        currentEvent.dtstart = parseICalDate(keyPart + ':' + valPart);
                    } else if (propName === 'DTEND') {
                        currentEvent.dtendRaw = valPart;
                        currentEvent.dtend = parseICalDate(keyPart + ':' + valPart);
                    } else if (propName === 'UID') {
                        currentEvent.uid = valPart;
                    } else if (propName === 'DESCRIPTION') {
                        currentEvent.description = valPart;
                    }
                }
            }
        }

        return events;
    }

    /**
     * Generates an array of ISO date strings (YYYY-MM-DD) for all days in a date range.
     */
    function getDatesInRange(startDate, endDate) {
        const dateArray = [];
        if (!startDate || !endDate) return dateArray;
        
        let curr = new Date(startDate);
        const last = new Date(endDate);

        // Reset times for accurate day comparison
        curr.setHours(0, 0, 0, 0);
        last.setHours(0, 0, 0, 0);

        while (curr < last) {
            dateArray.push(formatDateIso(curr));
            curr.setDate(curr.getDate() + 1);
        }
        return dateArray;
    }

    /**
     * Generates a valid iCalendar (.ics) string from an array of reservations.
     */
    function generateICSFeed(roomTitle, bookings) {
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Kaghan Stay//Airbnb iCal Sync v1.0//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            `X-WR-CALNAME:${roomTitle || 'Kaghan Stay Suite'}`
        ];

        (bookings || []).forEach((b, idx) => {
            const startDate = new Date(b.checkIn);
            const endDate = new Date(b.checkOut);
            if (isNaN(startDate) || isNaN(endDate)) return;

            const uid = b.id || `kaghan-booking-${idx}-${Date.now()}@kphstay.com`;
            const summary = b.guestName ? `Reserved - ${b.guestName}` : 'Kaghan Stay Reservation - Booked';

            lines.push('BEGIN:VEVENT');
            lines.push(`UID:${uid}`);
            lines.push(`DTSTAMP:${formatDateICal(new Date())}T000000Z`);
            lines.push(`DTSTART;VALUE=DATE:${formatDateICal(startDate)}`);
            lines.push(`DTEND;VALUE=DATE:${formatDateICal(endDate)}`);
            lines.push(`SUMMARY:${summary}`);
            lines.push(`DESCRIPTION:Booking confirmed via Kaghan Stay Website.`);
            lines.push('STATUS:CONFIRMED');
            lines.push('END:VEVENT');
        });

        lines.push('END:VCALENDAR');
        return lines.join('\r\n');
    }

    window.KaghanICal = {
        parseICalDate,
        formatDateIso,
        formatDateICal,
        parseICS,
        getDatesInRange,
        generateICSFeed
    };
})();
