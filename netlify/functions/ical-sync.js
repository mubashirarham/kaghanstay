// Netlify Serverless Function: 2-Way Airbnb & OTA Calendar Synchronization
// Ingests external iCalendar (.ics) feeds from Airbnb / Booking.com, parses dates, and locks them in Firestore.

const { fdb, auth, resolveIsAdmin } = require('./_admin-init');
const https = require('https');
const http = require('http');

// Helper to fetch URL content with redirects
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const protocol = parsedUrl.protocol === 'http:' ? http : https;

        const req = protocol.get(url, { headers: { 'User-Agent': 'KaghanStay-CalendarSync/2.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                // Follow redirect
                return resolve(fetchUrl(res.headers.location));
            }
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            }

            let data = '';
            res.setEncoding('utf8');
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });

        req.on('error', reject);
        req.setTimeout(12000, () => {
            req.destroy();
            reject(new Error('iCal URL request timed out after 12 seconds.'));
        });
    });
}

// Parses iCal date representation into a JS Date UTC
function parseIcalDateString(dateStr) {
    if (!dateStr) return null;
    const clean = dateStr.trim();

    // Format: YYYYMMDD
    if (/^\d{8}$/.test(clean)) {
        const y = parseInt(clean.substring(0, 4), 10);
        const m = parseInt(clean.substring(4, 6), 10) - 1;
        const d = parseInt(clean.substring(6, 8), 10);
        return new Date(Date.UTC(y, m, d));
    }

    // Format: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
    if (/^\d{8}T\d{6}Z?$/i.test(clean)) {
        const y = parseInt(clean.substring(0, 4), 10);
        const m = parseInt(clean.substring(4, 6), 10) - 1;
        const d = parseInt(clean.substring(6, 8), 10);
        return new Date(Date.UTC(y, m, d));
    }

    // Fallback standard parse
    const parsed = new Date(clean);
    return isNaN(parsed.getTime()) ? null : parsed;
}

// RFC 5545 iCal Parser
function parseIcalToDates(icsString) {
    if (!icsString) return { blockedDates: [], events: [] };

    // 1. Unfold multiline iCal values
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

                // Compute all individual dates between start and end
                const startDate = parseIcalDateString(currentEvent.dtstart);
                let endDate = currentEvent.dtend ? parseIcalDateString(currentEvent.dtend) : null;

                if (startDate) {
                    if (!endDate || endDate <= startDate) {
                        endDate = new Date(startDate);
                        endDate.setUTCDate(endDate.getUTCDate() + 1);
                    }

                    // Loop from check-in up to check-out (excluding departure date per standard hotel convention)
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

            // Clean property name from parameters (e.g. DTSTART;VALUE=DATE -> DTSTART)
            const propKey = propKeyFull.split(';')[0];

            if (propKey === 'DTSTART') {
                currentEvent.dtstart = propVal;
            } else if (propKey === 'DTEND') {
                currentEvent.dtend = propVal;
            } else if (propKey === 'SUMMARY') {
                currentEvent.summary = propVal;
            } else if (propKey === 'UID') {
                currentEvent.uid = propVal;
            } else if (propKey === 'STATUS') {
                currentEvent.status = propVal;
            }
        }
    }

    const sortedBlockedDates = Array.from(blockedDatesSet).sort();
    return { blockedDates: sortedBlockedDates, events };
}

// Core Sync Logic used by both API calls and Scheduled Cron Worker
async function syncRoomsCore({ roomId, all }) {
    if (!fdb) {
        throw new Error('Database service unavailable');
    }

    let targetDocs = [];
    if (roomId && !all) {
        const doc = await fdb.collection('rooms').doc(roomId).get();
        if (!doc.exists) {
            throw new Error(`Room ${roomId} not found.`);
        }
        targetDocs.push(doc);
    } else {
        const allSnap = await fdb.collection('rooms').get();
        targetDocs = allSnap.docs;
    }

    const syncResults = [];
    const nowIso = new Date().toISOString();

    for (const doc of targetDocs) {
        const rData = doc.data();
        const roomCleanId = doc.id;
        const airbnbUrl = (rData.airbnbIcalUrl || rData.icalUrl || '').trim();

        if (!airbnbUrl) {
            syncResults.push({
                roomId: roomCleanId,
                name: rData.name || roomCleanId,
                synced: false,
                reason: 'No Airbnb/iCal URL configured'
            });
            continue;
        }

        try {
            // Fetch external iCal Feed
            const icsContent = await fetchUrl(airbnbUrl);
            const { blockedDates: airbnbBlocked, events: airbnbEvents } = parseIcalToDates(icsContent);

            // Preserve manual admin blocked dates
            const adminBlocked = Array.isArray(rData.adminBlockedDates) 
                ? rData.adminBlockedDates 
                : (Array.isArray(rData.blockedDates) ? rData.blockedDates.filter(d => !(rData.airbnbBlockedDates || []).includes(d)) : []);

            // Combined unique blocked dates
            const combinedBlocked = Array.from(new Set([...adminBlocked, ...airbnbBlocked])).sort();

            // Update Firestore Room Document
            await fdb.collection('rooms').doc(roomCleanId).update({
                airbnbBlockedDates: airbnbBlocked,
                airbnbEvents: airbnbEvents.slice(0, 50),
                adminBlockedDates: adminBlocked,
                blockedDates: combinedBlocked,
                lastIcalSync: nowIso,
                icalSyncStatus: 'success',
                icalSyncError: null
            });

            syncResults.push({
                roomId: roomCleanId,
                name: rData.name || roomCleanId,
                synced: true,
                blockedDatesCount: airbnbBlocked.length,
                eventsCount: airbnbEvents.length,
                lastIcalSync: nowIso
            });

        } catch (err) {
            console.error(`Error syncing iCal for room ${roomCleanId}:`, err);
            await fdb.collection('rooms').doc(roomCleanId).update({
                icalSyncStatus: 'error',
                icalSyncError: err.message,
                lastIcalSyncAttempt: nowIso
            }).catch(() => {});

            syncResults.push({
                roomId: roomCleanId,
                name: rData.name || roomCleanId,
                synced: false,
                error: err.message
            });
        }
    }

    return {
        success: true,
        syncedAt: nowIso,
        results: syncResults
    };
}

exports.handler = async (event, context) => {
    const origin = event.headers.origin || event.headers.Origin || '';
    let allowedOrigin = 'https://kphstay.com';
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        allowedOrigin = origin;
    }

    const headers = {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-cron-secret',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { roomId, all, idToken, cronSecret } = body;

        // Check for Cron Secret bypass or Firebase Auth Admin token
        const expectedSecret = process.env.CRON_SECRET || 'kaghan-cron-secret-2026';
        const isCronAuthorized = cronSecret === expectedSecret || event.headers['x-cron-secret'] === expectedSecret;

        if (!isCronAuthorized) {
            if (!idToken) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Unauthorized: ID token or cron secret required.' })
                };
            }

            const decoded = await auth.verifyIdToken(idToken);
            const isAdmin = resolveIsAdmin(decoded);
            if (!isAdmin) {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Forbidden: Admin access required.' })
                };
            }
        }

        const syncResult = await syncRoomsCore({ roomId, all });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(syncResult)
        };

    } catch (err) {
        console.error("iCal sync handler error:", err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: `Internal sync failure: ${err.message}` })
        };
    }
};

exports.syncRoomsCore = syncRoomsCore;
