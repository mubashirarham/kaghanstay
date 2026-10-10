const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function base64url(str) {
    return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getAccessToken(keyPath) {
    const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claimSet = {
        iss: keyData.client_email,
        scope: 'https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/webmasters https://www.googleapis.com/auth/indexing',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
    };
    const encodedHeader = base64url(JSON.stringify(header));
    const encodedClaimSet = base64url(JSON.stringify(claimSet));
    const signatureInput = `${encodedHeader}.${encodedClaimSet}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signatureInput);
    const signature = base64url(signer.sign(keyData.private_key));
    const jwt = `${signatureInput}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });
    const data = await res.json();
    return data.access_token;
}

async function queryGSC(siteUrl, token, bodyPayload) {
    const encodedSite = encodeURIComponent(siteUrl);
    const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyPayload)
    });
    if (!res.ok) return { rows: [] };
    return await res.json();
}

async function main() {
    const keyPath = path.resolve(__dirname, '../formal-folder-476209-h0-6ddebc22f141.json');
    const token = await getAccessToken(keyPath);
    const siteUrl = 'https://kphstay.com/';

    const now = new Date();
    const endDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startDate16m = new Date(now.getTime() - 485 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startDate90d = new Date(now.getTime() - 92 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startDate28d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 1. Fetch 16m Query + Page
    const qp16m = await queryGSC(siteUrl, token, {
        startDate: startDate16m,
        endDate: endDate,
        dimensions: ['query', 'page'],
        rowLimit: 5000
    });

    // 2. Fetch 16m Query
    const q16m = await queryGSC(siteUrl, token, {
        startDate: startDate16m,
        endDate: endDate,
        dimensions: ['query'],
        rowLimit: 5000
    });

    // 3. Fetch 16m Pages
    const p16m = await queryGSC(siteUrl, token, {
        startDate: startDate16m,
        endDate: endDate,
        dimensions: ['page'],
        rowLimit: 5000
    });

    // 4. Fetch Country + Device
    const qc16m = await queryGSC(siteUrl, token, {
        startDate: startDate16m,
        endDate: endDate,
        dimensions: ['query', 'country', 'device'],
        rowLimit: 5000
    });

    // 5. Date-wise performance (aggregated daily)
    const dateTrend = await queryGSC(siteUrl, token, {
        startDate: startDate90d,
        endDate: endDate,
        dimensions: ['date'],
        rowLimit: 5000
    });

    const report = {
        siteUrl,
        dateRange: { start: startDate16m, end: endDate },
        totals: {
            clicks: (q16m.rows || []).reduce((acc, r) => acc + r.clicks, 0),
            impressions: (q16m.rows || []).reduce((acc, r) => acc + r.impressions, 0),
            distinctQueries16m: (q16m.rows || []).length,
            distinctPages16m: (p16m.rows || []).length
        },
        queries16m: q16m.rows || [],
        queryPages16m: qp16m.rows || [],
        pages16m: p16m.rows || [],
        queryCountryDevice: qc16m.rows || [],
        dailyTrend90d: dateTrend.rows || []
    };

    const outPath = path.resolve(__dirname, '../scratch/gsc-16m-deep-dive.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`Saved 16m deep dive report to ${outPath}`);
    console.log(`Total 16m queries: ${report.totals.distinctQueries16m}`);
    console.log(`Total 16m clicks: ${report.totals.clicks}, impressions: ${report.totals.impressions}`);
}

main().catch(console.error);
