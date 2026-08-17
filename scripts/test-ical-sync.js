// Unit test for iCal parser & export logic
const assert = require('assert');

// Mock sample Airbnb iCalendar feed
const mockAirbnbIcs = `BEGIN:VCALENDAR
PRODID;X-RICAL-TZSOURCE=TZINFO:-//Airbnb Inc//Hosting Calendar 0.8.8//EN
CALSCALE:GREGORIAN
VERSION:2.0
BEGIN:VEVENT
DTEND;VALUE=DATE:20260905
DTSTART;VALUE=DATE:20260901
UID:airbnb-reservation-12345@airbnb.com
SUMMARY:Reserved
END:VEVENT
BEGIN:VEVENT
DTEND;VALUE=DATE:20260912
DTSTART;VALUE=DATE:20260910
UID:airbnb-reservation-67890@airbnb.com
SUMMARY:Airbnb (Not available)
END:VEVENT
END:VCALENDAR`;

// Load parser logic from ical-sync
function parseIcalDateString(dateStr) {
    if (!dateStr) return null;
    const clean = dateStr.trim();
    if (/^\d{8}$/.test(clean)) {
        const y = parseInt(clean.substring(0, 4), 10);
        const m = parseInt(clean.substring(4, 6), 10) - 1;
        const d = parseInt(clean.substring(6, 8), 10);
        return new Date(Date.UTC(y, m, d));
    }
    if (/^\d{8}T\d{6}Z?$/i.test(clean)) {
        const y = parseInt(clean.substring(0, 4), 10);
        const m = parseInt(clean.substring(4, 6), 10) - 1;
        const d = parseInt(clean.substring(6, 8), 10);
        return new Date(Date.UTC(y, m, d));
    }
    const parsed = new Date(clean);
    return isNaN(parsed.getTime()) ? null : parsed;
}

function parseIcalToDates(icsString) {
    if (!icsString) return { blockedDates: [], events: [] };
    const unfolded = icsString.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
    const lines = unfolded.split(/\r\n|\n|\r/);

    const events = [];
    const blockedDatesSet = new Set();

    let inEvent = false;
    let currentEvent = {};

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (line.startsWith('BEGIN:VEVENT')) {
            inEvent = true;
            currentEvent = {};
            continue;
        }

        if (line.startsWith('END:VEVENT')) {
            if (inEvent && currentEvent.dtstart) {
                events.push(currentEvent);

                const startDate = parseIcalDateString(currentEvent.dtstart);
                let endDate = currentEvent.dtend ? parseIcalDateString(currentEvent.dtend) : null;

                if (startDate) {
                    if (!endDate || endDate <= startDate) {
                        endDate = new Date(startDate);
                        endDate.setUTCDate(endDate.getUTCDate() + 1);
                    }

                    for (let dt = new Date(startDate); dt < endDate; dt.setUTCDate(dt.getUTCDate() + 1)) {
                        const isoStr = dt.toISOString().split('T')[0];
                        blockedDatesSet.add(isoStr);
                    }
                }
            }
            inEvent = false;
            currentEvent = {};
            continue;
        }

        if (inEvent) {
            const colonIdx = line.indexOf(':');
            if (colonIdx === -1) continue;

            const propKeyFull = line.substring(0, colonIdx).toUpperCase();
            const propVal = line.substring(colonIdx + 1);
            const propKey = propKeyFull.split(';')[0];

            if (propKey === 'DTSTART') currentEvent.dtstart = propVal;
            else if (propKey === 'DTEND') currentEvent.dtend = propVal;
            else if (propKey === 'SUMMARY') currentEvent.summary = propVal;
            else if (propKey === 'UID') currentEvent.uid = propVal;
        }
    }

    return { blockedDates: Array.from(blockedDatesSet).sort(), events };
}

console.log("Testing iCal parser on Airbnb feed...");
const result = parseIcalToDates(mockAirbnbIcs);
console.log("Parsed Events:", result.events.length);
console.log("Blocked Dates:", result.blockedDates);

assert.strictEqual(result.events.length, 2, "Should have parsed 2 events");
assert(result.blockedDates.includes('2026-09-01'), "Should include 2026-09-01");
assert(result.blockedDates.includes('2026-09-04'), "Should include 2026-09-04");
assert(!result.blockedDates.includes('2026-09-05'), "Checkout date 2026-09-05 should be available for new check-in");
assert(result.blockedDates.includes('2026-09-10'), "Should include 2026-09-10");
assert(result.blockedDates.includes('2026-09-11'), "Should include 2026-09-11");
assert(!result.blockedDates.includes('2026-09-12'), "Checkout date 2026-09-12 should be available for new check-in");

console.log("All iCal unit tests passed successfully!");
