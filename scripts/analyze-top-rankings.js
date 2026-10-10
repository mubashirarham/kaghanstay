const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function base64url(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

async function getAccessToken(keyPath) {
    const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    const clientEmail = keyData.client_email;
    const privateKey = keyData.private_key;

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claimSet = {
        iss: clientEmail,
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
    const signature = base64url(signer.sign(privateKey));

    const jwt = `${signatureInput}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });

    if (!res.ok) {
        throw new Error(`Token Error: ${await res.text()}`);
    }

    const data = await res.json();
    return data.access_token;
}

async function listSites(token) {
    const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
}

async function querySearchAnalytics(siteUrl, token, { startDate, endDate, dimensions, rowLimit = 5000, startRow = 0, dimensionFilterGroups }) {
    const encodedSite = encodeURIComponent(siteUrl);
    const bodyPayload = {
        startDate,
        endDate,
        dimensions,
        rowLimit,
        startRow
    };
    if (dimensionFilterGroups) {
        bodyPayload.dimensionFilterGroups = dimensionFilterGroups;
    }

    const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyPayload)
    });

    if (!res.ok) {
        const text = await res.text();
        console.error(`Error querying ${siteUrl} [${dimensions.join(',')}]: ${text}`);
        return { rows: [] };
    }
    return await res.json();
}

async function main() {
    console.log("================================================================================");
    console.log("🔍 COMPREHENSIVE GOOGLE SEARCH CONSOLE KEYWORD RANKING & TOP 1-10 AUDIT");
    console.log("================================================================================\n");

    const keyPath = path.resolve(__dirname, '../formal-folder-476209-h0-6ddebc22f141.json');
    const token = await getAccessToken(keyPath);
    console.log("✅ Authenticated with Google Cloud GSC Service Account.\n");

    const sitesData = await listSites(token);
    const siteEntries = sitesData.siteEntry || [];
    console.log(`📋 Found ${siteEntries.length} Search Console Properties:`);
    siteEntries.forEach(s => console.log(`   - ${s.siteUrl} (${s.permissionLevel})`));
    console.log("");

    const now = new Date();
    const endDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // GSC has ~2-3 days lag
    const startDate90d = new Date(now.getTime() - 92 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startDate16m = new Date(now.getTime() - 480 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startDate28d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const auditResults = {
        generatedAt: new Date().toISOString(),
        dateRanges: {
            last28Days: { start: startDate28d, end: endDate },
            last90Days: { start: startDate90d, end: endDate },
            last16Months: { start: startDate16m, end: endDate }
        },
        properties: []
    };

    for (const siteObj of siteEntries) {
        const siteUrl = siteObj.siteUrl;
        console.log(`================================================================================`);
        console.log(`📊 Analyzing Search Analytics for: ${siteUrl}`);
        console.log(`================================================================================`);

        // Fetch query + page breakdown for 90 days and 16 months
        const qp90 = await querySearchAnalytics(siteUrl, token, {
            startDate: startDate90d,
            endDate: endDate,
            dimensions: ['query', 'page'],
            rowLimit: 5000
        });

        const q90 = await querySearchAnalytics(siteUrl, token, {
            startDate: startDate90d,
            endDate: endDate,
            dimensions: ['query'],
            rowLimit: 5000
        });

        const qp28 = await querySearchAnalytics(siteUrl, token, {
            startDate: startDate28d,
            endDate: endDate,
            dimensions: ['query', 'page'],
            rowLimit: 5000
        });

        const qp16m = await querySearchAnalytics(siteUrl, token, {
            startDate: startDate16m,
            endDate: endDate,
            dimensions: ['query', 'page'],
            rowLimit: 5000
        });

        const pages90 = await querySearchAnalytics(siteUrl, token, {
            startDate: startDate90d,
            endDate: endDate,
            dimensions: ['page'],
            rowLimit: 5000
        });

        const queryCountry = await querySearchAnalytics(siteUrl, token, {
            startDate: startDate90d,
            endDate: endDate,
            dimensions: ['query', 'country'],
            rowLimit: 5000
        });

        const queryDevice = await querySearchAnalytics(siteUrl, token, {
            startDate: startDate90d,
            endDate: endDate,
            dimensions: ['query', 'device'],
            rowLimit: 5000
        });

        const allQueryRows90 = (q90.rows || []).map(r => ({
            query: r.keys[0],
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: r.ctr,
            position: r.position
        }));

        const allQueryPageRows90 = (qp90.rows || []).map(r => ({
            query: r.keys[0],
            page: r.keys[1],
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: r.ctr,
            position: r.position
        }));

        const allQueryPageRows28 = (qp28.rows || []).map(r => ({
            query: r.keys[0],
            page: r.keys[1],
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: r.ctr,
            position: r.position
        }));

        const allQueryPageRows16m = (qp16m.rows || []).map(r => ({
            query: r.keys[0],
            page: r.keys[1],
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: r.ctr,
            position: r.position
        }));

        // Top 1-10 rankings
        const top10_90d = allQueryRows90.filter(r => r.position >= 1.0 && r.position <= 10.499);
        const top3_90d = allQueryRows90.filter(r => r.position >= 1.0 && r.position <= 3.499);
        const pos4to10_90d = allQueryRows90.filter(r => r.position > 3.499 && r.position <= 10.499);
        const strikingDistance_90d = allQueryRows90.filter(r => r.position > 10.499 && r.position <= 20.499);

        // Map queries to landing pages
        const queryToPageMap = {};
        allQueryPageRows90.forEach(row => {
            if (!queryToPageMap[row.query]) {
                queryToPageMap[row.query] = [];
            }
            queryToPageMap[row.query].push({
                page: row.page,
                clicks: row.clicks,
                impressions: row.impressions,
                ctr: row.ctr,
                position: row.position
            });
        });

        console.log(`\n📈 SUMMARY METRICS (Past 90 Days) for ${siteUrl}:`);
        console.log(`   - Total Distinct Queries: ${allQueryRows90.length}`);
        console.log(`   - Total Queries in Top 1-10: ${top10_90d.length}`);
        console.log(`   - Total Queries in Top 1-3 (Dominant): ${top3_90d.length}`);
        console.log(`   - Total Queries in Pos 4-10 (Page 1): ${pos4to10_90d.length}`);
        console.log(`   - Total Striking Distance Queries (Pos 11-20): ${strikingDistance_90d.length}`);
        console.log(`   - Total Pages Receiving Search Traffic: ${(pages90.rows || []).length}`);

        console.log(`\n🏆 TOP 1-10 KEYWORDS BREAKDOWN (Sorted by Position):`);
        top10_90d.sort((a, b) => a.position - b.position);
        top10_90d.forEach((k, idx) => {
            const pages = (queryToPageMap[k.query] || []).map(p => p.page).join(', ');
            console.log(`   ${idx + 1}. [Pos: ${k.position.toFixed(1)}] "${k.query}" | Clicks: ${k.clicks} | Imp: ${k.impressions} | CTR: ${(k.ctr * 100).toFixed(1)}%`);
            if (pages) console.log(`      ↳ Landing Page(s): ${pages}`);
        });

        console.log(`\n🎯 STRIKING DISTANCE KEYWORDS (Positions 11-20 - Quick Wins):`);
        strikingDistance_90d.sort((a, b) => b.impressions - a.impressions);
        strikingDistance_90d.slice(0, 15).forEach((k, idx) => {
            const pages = (queryToPageMap[k.query] || []).map(p => p.page).join(', ');
            console.log(`   ${idx + 1}. [Pos: ${k.position.toFixed(1)}] "${k.query}" | Clicks: ${k.clicks} | Imp: ${k.impressions} | CTR: ${(k.ctr * 100).toFixed(1)}%`);
            if (pages) console.log(`      ↳ Landing Page(s): ${pages}`);
        });

        auditResults.properties.push({
            siteUrl,
            summary: {
                totalQueries90d: allQueryRows90.length,
                top10Count: top10_90d.length,
                top3Count: top3_90d.length,
                pos4to10Count: pos4to10_90d.length,
                strikingDistanceCount: strikingDistance_90d.length
            },
            top10Keywords: top10_90d.map(q => ({
                ...q,
                landingPages: queryToPageMap[q.query] || []
            })),
            strikingDistanceKeywords: strikingDistance_90d.map(q => ({
                ...q,
                landingPages: queryToPageMap[q.query] || []
            })),
            allQueries90d: allQueryRows90,
            allQueryPages90d: allQueryPageRows90,
            allQueryPages28d: allQueryPageRows28,
            allQueryPages16m: allQueryPageRows16m,
            pagesPerformance90d: pages90.rows || [],
            queryCountry: queryCountry.rows || [],
            queryDevice: queryDevice.rows || []
        });
    }

    const scratchDir = path.resolve(__dirname, '../scratch');
    if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
    const outPath = path.join(scratchDir, 'top-rankings-audit.json');
    fs.writeFileSync(outPath, JSON.stringify(auditResults, null, 2), 'utf8');
    console.log(`\n💾 Saved complete Top 1-10 rankings audit dataset to: ${outPath}`);
}

main().catch(err => console.error("❌ Fatal:", err));
