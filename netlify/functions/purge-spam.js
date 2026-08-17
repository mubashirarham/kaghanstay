require('dotenv').config();
const { fdb, auth, initError, resolveIsAdmin } = require('./_admin-init');

const SPAM_UIDS = [
    '185LlOf4m1bTmaGNgV4vS62g0Fu1',
    '18dRKO2tIZf9iCMVnlUvgPHVdDE3',
    '1NVy74Ag9LdytyH3FNaLAbA60wU2',
    '3RDY9dWWrHYsUmYKhojSZV31FOF2',
    '4qo9wJVd7QeNBH2aSQrIcVU8Sob2',
    '8DuMccD8wmeNM6eWXxBkMtvg8Uw1',
    '8TSqIswIDJVJ82WMPSKcBS0Ffjy2',
    'B3M1bRzOSKVNGCnilUepefAMhdL2',
    'D2s5XImGOYRjbDOenlXI43ra1512',
    'DT6RFKzUsyb8U7VJyhtVBmykr5j1',
    'GfCop3b8aqbYUqNWKBCkVdAK1yA3',
    'IijKpSRnHFWOXZsUqHo8ObUkQNr2',
    'IvT8IBCxVzOTDsYBgwEgPcbhp3b2',
    'J3u0tfpEHTbYbVTkVoevz0umV0B2',
    'LNi3eU5moTU5VgbEodLtSAc4AvU2',
    'NlYAQdeJIGds37jr7oGsflhulC02',
    'R0LjEEkuaShJFisIsmPxOtyh22c2',
    'RFkVPGa7evfFYx742VbEANBiWKp2',
    'WFunHoRbcfQbRih34zWKpDkogAr1',
    'WRzU8FHnTfc3eQMh5XSl5NzGEzx1',
    'YJTJ5UESd1RJvPZR0y61cvAHlwb2',
    'aVExB4G2gSRBFXVXPucGJReaIun1',
    'aZUiQpgYUOajiS2A9PCeavFA5g82',
    'avlO33f9kzRLrp85CWq5Do5R5xR2',
    'bYkUBCYU9IX1G4b1yBnwWpVjaU92',
    'c6Q9oB6MkPegrPFdK064OU43mfu1',
    'd6t5VLozjscHmcMJP5WJytMJF052',
    'eorgZBUtomggjoiYNwRdpwJpJj43',
    'eqzhtcHNFPUkidQTYIlvwefUn3v2',
    'hvpZiY6XGHTxFFxOSb8cC8r61OL2',
    'mG4ZFEJo53cf0c9UQsOPDuDodWv1',
    'nh1suwxmhCQngxzUG6McKxj1ib73',
    'sqVcV7Q4lybtej0NOU1AhvS7mCe2',
    'tUd6rLo94nb0iaVfZiwf64aGgmj2',
    'vCbzP4A2gfMn2j2LKBzXjH3ziSG3',
    'xVrTY8ih7BM7HSr5ekhfWG3cIOs2',
    'yz0Kc3CiTfbiuqq77WrzXIK55iB2'
];

exports.handler = async (event) => {
    const origin = event.headers.origin || event.headers.Origin || 'https://kphstay.com';
    const headers = {
        'Access-Control-Allow-Origin': origin.includes('kphstay.com') || origin.includes('localhost') ? origin : 'https://kphstay.com',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    if (initError) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Database service unavailable.' }) };
    }

    // Require admin token or ADMIN_SECRET_KEY
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    let isAdmin = false;
    if (process.env.ADMIN_SECRET_KEY && token === process.env.ADMIN_SECRET_KEY) {
        isAdmin = true;
    } else if (token) {
        try {
            const decoded = await auth.verifyIdToken(token);
            isAdmin = await resolveIsAdmin(decoded, fdb);
        } catch (_) {}
    }

    if (!isAdmin) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Unauthorized. Admin authorization required.' }) };
    }

    let payload = {};
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (_) {}

    let deletedAuthCount = 0;
    let deletedFirestoreCount = 0;

    // 1. Purge known spam list
    for (const uid of SPAM_UIDS) {
        try {
            await auth.deleteUser(uid);
            deletedAuthCount++;
        } catch (e) {
            console.warn(`Spam purge Auth warning for ${uid}:`, e.message);
        }

        try {
            await fdb.collection('users').doc(uid).delete();
            deletedFirestoreCount++;
        } catch (e) {
            console.warn(`Spam purge Firestore warning for ${uid}:`, e.message);
        }
    }

    // 2. Optional: Purge all unverified spam accounts
    if (payload.purgeUnverified === true) {
        try {
            const unverifiedSnap = await fdb.collection('users').where('verified', '==', false).get();
            for (const doc of unverifiedSnap.docs) {
                const uData = doc.data();
                if (uData.role === 'admin' || uData.role === 'moderator' || uData.role === 'editor') {
                    continue; // Do not touch staff accounts
                }
                try {
                    await auth.deleteUser(doc.id);
                    deletedAuthCount++;
                } catch (_) {}

                try {
                    await doc.ref.delete();
                    deletedFirestoreCount++;
                } catch (_) {}
            }
        } catch (err) {
            console.error("Purge unverified batch error:", err);
        }
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: `Purged spam accounts successfully. Auth deleted: ${deletedAuthCount}, Firestore deleted: ${deletedFirestoreCount}.`
        })
    };
};

