require('dotenv').config();
const { fdb } = require('../netlify/functions/_admin-init');
const golootloValidate = require('../netlify/functions/golootlo-validate');
const golootloRedeem = require('../netlify/functions/golootlo-redeem');
const validateCoupon = require('../netlify/functions/validate-coupon');

const results = {
    envChecks: [],
    directApiChecks: [],
    functionChecks: [],
    dbChecks: [],
    summary: { total: 0, passed: 0, failed: 0 }
};

function recordTest(category, name, passed, details = '') {
    results.summary.total++;
    if (passed) results.summary.passed++;
    else results.summary.failed++;
    results[category].push({ name, passed, details });
    const statusIcon = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${statusIcon}: [${category}] ${name}${details ? ` -> ${details}` : ''}`);
}

async function runSuite() {
    console.log('===============================================================');
    console.log('       KAGHAN STAY - GOLOOTLO INTEGRATION TEST SUITE           ');
    console.log('===============================================================');
    console.log('Timestamp:', new Date().toISOString());
    console.log('');

    // --- 1. ENVIRONMENT CONFIGURATION CHECKS ---
    console.log('--- 1. ENVIRONMENT CONFIGURATION CHECKS ---');
    const u = process.env.GOLOOTLO_USERNAME;
    const p = process.env.GOLOOTLO_PASSWORD;
    const m = process.env.GOLOOTLO_MERCHANT_CODE;
    const c = process.env.GOLOOTLO_DEFAULT_COUPON;
    const pct = process.env.GOLOOTLO_DISCOUNT_PERCENT;
    const url = process.env.GOLOOTLO_API_BASE_URL;

    recordTest('envChecks', 'GOLOOTLO_USERNAME is set', !!u && u === 'kph@stay', `Value: ${u || 'missing'}`);
    recordTest('envChecks', 'GOLOOTLO_PASSWORD is set', !!p, `Length: ${p ? p.length : 0} chars`);
    recordTest('envChecks', 'GOLOOTLO_MERCHANT_CODE is set', !!m && m === '1268', `Value: ${m || 'missing'}`);
    recordTest('envChecks', 'GOLOOTLO_DEFAULT_COUPON is set', !!c && c === 'KPHSTAY1', `Value: ${c || 'missing'}`);
    recordTest('envChecks', 'GOLOOTLO_DISCOUNT_PERCENT is set', !!pct && pct === '15', `Value: ${pct || 'missing'}%`);
    recordTest('envChecks', 'GOLOOTLO_API_BASE_URL is set', !!url, `Value: ${url || 'missing'}`);

    console.log('');

    // --- 2. DIRECT GOLOOTLO STAGING API CONNECTIVITY ---
    console.log('--- 2. DIRECT GOLOOTLO STAGING API CONNECTIVITY ---');
    const username = u || 'kph@stay';
    const password = p || '5@qeRoA9Tx6PIw2)';
    const merchantCode = m || '1268';
    const baseUrl = (url || 'https://api-toolkit-staging.golootlo.pk').replace(/\/$/, '');
    const authStr = `${username}:${password}`;
    const authB64 = Buffer.from(authStr, 'utf8').toString('base64');

    const validateApiUrl = `${baseUrl}/api/merchants/${merchantCode}/coupons/validate`;
    console.log(`Pinging: ${validateApiUrl}`);

    try {
        const startTime = Date.now();
        const apiRes = await fetch(validateApiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authB64}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ChannelId: '01',
                GolootloCouponCode: 'KPHSTAY1'
            }),
            signal: AbortSignal.timeout(10000)
        });
        const elapsed = Date.now() - startTime;
        const rawText = await apiRes.text();
        let parsed = null;
        try { parsed = JSON.parse(rawText); } catch(e) {}

        recordTest('directApiChecks', 'Golootlo Staging API HTTP Reachability', apiRes.status < 500, `HTTP Status: ${apiRes.status} (${elapsed}ms)`);
        recordTest('directApiChecks', 'Golootlo API Auth / Response Format', !!parsed, `Response: ${JSON.stringify(parsed || rawText).substring(0, 120)}...`);
    } catch (apiErr) {
        recordTest('directApiChecks', 'Golootlo Staging API HTTP Reachability', false, `Connection Error: ${apiErr.message}`);
    }

    console.log('');

    // --- 3. SERVERLESS FUNCTION HANDLERS ---
    console.log('--- 3. SERVERLESS FUNCTION HANDLERS ---');

    // Test 3.1: golootlo-validate handler with default partner code
    try {
        const event = {
            httpMethod: 'POST',
            headers: { 'origin': 'http://localhost:3000', 'client-ip': '127.0.0.1' },
            body: JSON.stringify({ code: 'KPHSTAY1' })
        };
        const res = await golootloValidate.handler(event, {});
        const body = JSON.parse(res.body);
        recordTest('functionChecks', 'golootlo-validate handler with KPHSTAY1', res.statusCode === 200 && body.valid === true && body.discountPercentage === 15, `Status: ${res.statusCode}, Valid: ${body.valid}, Discount: ${body.discountPercentage}%, Msg: ${body.message}`);
    } catch (e) {
        recordTest('functionChecks', 'golootlo-validate handler with KPHSTAY1', false, e.message);
    }

    // Test 3.2: golootlo-validate schema error on too short code
    try {
        const event = {
            httpMethod: 'POST',
            headers: { 'origin': 'http://localhost:3000', 'client-ip': '127.0.0.1' },
            body: JSON.stringify({ code: 'AB' })
        };
        const res = await golootloValidate.handler(event, {});
        const body = JSON.parse(res.body);
        recordTest('functionChecks', 'golootlo-validate input schema rejection (<5 chars)', res.statusCode === 400 && body.valid === false, `Status: ${res.statusCode}, Error: ${body.error}`);
    } catch (e) {
        recordTest('functionChecks', 'golootlo-validate input schema rejection (<5 chars)', false, e.message);
    }

    // Test 3.3: validate-coupon handler with KPHSTAY1 fallback routing
    try {
        const event = {
            httpMethod: 'POST',
            headers: { 'origin': 'http://localhost:3000', 'client-ip': '127.0.0.1' },
            body: JSON.stringify({ code: 'KPHSTAY1' })
        };
        const res = await validateCoupon.handler(event, {});
        const body = JSON.parse(res.body);
        recordTest('functionChecks', 'validate-coupon universal handler resolves Golootlo code', res.statusCode === 200 && body.valid === true && body.provider === 'golootlo', `Status: ${res.statusCode}, Provider: ${body.provider}, Discount: ${body.discountPercentage}%`);
    } catch (e) {
        recordTest('functionChecks', 'validate-coupon universal handler resolves Golootlo code', false, e.message);
    }

    // Test 3.4: golootlo-redeem handler
    const testBookingId = `KPH-TEST-BK-${Math.floor(100000 + Math.random() * 900000)}`;
    try {
        const event = {
            httpMethod: 'POST',
            headers: { 'origin': 'http://localhost:3000', 'client-ip': '127.0.0.1' },
            body: JSON.stringify({
                code: 'KPHSTAY1',
                bookingId: testBookingId,
                guestName: 'Golootlo Test Guest',
                guestMobile: '03001234567',
                guestEmail: 'test@kphstay.com',
                totalAmount: 25000,
                discountedAmount: 3750
            })
        };
        const res = await golootloRedeem.handler(event, {});
        const body = JSON.parse(res.body);
        recordTest('functionChecks', 'golootlo-redeem handler processes redemption', res.statusCode === 200 && body.success === true, `Status: ${res.statusCode}, BookingId: ${body.bookingId}, Discount: PKR ${body.discountedAmount}`);
    } catch (e) {
        recordTest('functionChecks', 'golootlo-redeem handler processes redemption', false, e.message);
    }

    console.log('');

    // --- 4. FIRESTORE DATABASE AUDIT ---
    console.log('--- 4. FIRESTORE DATABASE AUDIT ---');
    if (fdb) {
        try {
            const snap = await fdb.collection('golootlo_redemptions').doc(`${testBookingId}_KPHSTAY1`).get();
            const exists = snap.exists;
            const data = exists ? snap.data() : null;
            recordTest('dbChecks', 'Firestore Audit Log written in golootlo_redemptions', exists && data.bookingId === testBookingId, exists ? `Doc ID: ${snap.id}, Guest: ${data.guestName}, Amount: PKR ${data.totalAmount}, Discount: PKR ${data.discountedAmount}` : 'Document not found');

            // Cleanup test document
            if (exists) {
                await fdb.collection('golootlo_redemptions').doc(`${testBookingId}_KPHSTAY1`).delete();
                console.log(`Cleaned test record: ${testBookingId}_KPHSTAY1`);
            }
        } catch (dbErr) {
            recordTest('dbChecks', 'Firestore Audit Log written in golootlo_redemptions', false, dbErr.message);
        }
    } else {
        recordTest('dbChecks', 'Firestore connection available', false, 'Firebase Admin not initialized');
    }

    console.log('');
    console.log('===============================================================');
    console.log(`TEST SUITE RESULT: ${results.summary.passed} / ${results.summary.total} PASSED (${results.summary.failed} FAILED)`);
    console.log('===============================================================');

    return results;
}

runSuite().then(res => {
    process.exit(res.summary.failed > 0 ? 1 : 0);
}).catch(err => {
    console.error('Fatal suite runner error:', err);
    process.exit(1);
});
