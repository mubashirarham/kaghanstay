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

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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

async function getSitemaps(siteUrl, token) {
    const encodedSite = encodeURIComponent(siteUrl);
    const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
}

async function getSearchAnalytics(siteUrl, token) {
    const encodedSite = encodeURIComponent(siteUrl);
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            startDate,
            endDate,
            dimensions: ['page'],
            rowLimit: 500
        })
    });
    return await res.json();
}

async function inspectUrl(inspectionUrl, siteUrl, token) {
    const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            inspectionUrl: inspectionUrl,
            siteUrl: siteUrl
        })
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
}

async function fetchListingsFromFirestore() {
    const listingUrls = [];
    try {
        const roomsRes = await fetch('https://firestore.googleapis.com/v1/projects/kaghan-properties/databases/(default)/documents/rooms?pageSize=100').catch(() => null);
        if (roomsRes && roomsRes.ok) {
            const data = await roomsRes.json();
            if (data.documents) {
                data.documents.forEach(doc => {
                    const id = doc.name.split('/').pop();
                    const fields = doc.fields || {};
                    const slug = fields.slug ? fields.slug.stringValue : null;
                    if (slug) {
                        listingUrls.push(`https://kphstay.com/room/${slug}`);
                        listingUrls.push(`https://kphstay.com/room-details?slug=${slug}`);
                    }
                    listingUrls.push(`https://kphstay.com/room-details?id=${id}`);
                });
            }
        }
    } catch (e) {}

    try {
        const blogsRes = await fetch('https://firestore.googleapis.com/v1/projects/kaghan-properties/databases/(default)/documents/blogs?pageSize=100').catch(() => null);
        if (blogsRes && blogsRes.ok) {
            const data = await blogsRes.json();
            if (data.documents) {
                data.documents.forEach(doc => {
                    const id = doc.name.split('/').pop();
                    const fields = doc.fields || {};
                    const slug = fields.slug ? fields.slug.stringValue : null;
                    if (slug) {
                        listingUrls.push(`https://kphstay.com/blog/${slug}`);
                    }
                });
            }
        }
    } catch (e) {}

    return listingUrls;
}

async function main() {
    console.log("=================================================");
    console.log("🔍 Google Search Console Deep-Dive Analyzer");
    console.log("=================================================\n");

    const keyPath = path.resolve(__dirname, '../formal-folder-476209-h0-6ddebc22f141.json');
    const token = await getAccessToken(keyPath);
    console.log("✅ Authenticated with Google Cloud API\n");

    const sitesData = await listSites(token);
    const siteEntries = sitesData.siteEntry || [];
    console.log(`📋 Found ${siteEntries.length} Search Console Properties:`);
    siteEntries.forEach(s => console.log(`   - ${s.siteUrl}`));
    console.log("");

    const report = {
        properties: [],
        inspectionResults: []
    };

    for (const siteObj of siteEntries) {
        const sUrl = siteObj.siteUrl;
        console.log(`=========================================`);
        console.log(`📊 Analyzing Property: ${sUrl}`);
        console.log(`=========================================`);

        const sitemaps = await getSitemaps(sUrl, token);
        console.log("📌 Sitemaps Status:");
        if (sitemaps.sitemap) {
            sitemaps.sitemap.forEach(sm => {
                console.log(`   - Path: ${sm.path}`);
                console.log(`     Last Downloaded: ${sm.lastDownloaded}`);
                console.log(`     Pending: ${sm.isPending}`);
                if (sm.contents) {
                    sm.contents.forEach(c => console.log(`     Type: ${c.type} | Submitted: ${c.submitted} | Indexed: ${c.indexed}`));
                }
            });
        } else {
            console.log("   (No sitemaps found)");
        }

        const analytics = await getSearchAnalytics(sUrl, token);
        console.log("\n📈 Search Analytics (Performance Data):");
        if (analytics.rows && analytics.rows.length > 0) {
            console.log(`   Active indexed pages receiving traffic: ${analytics.rows.length}`);
            analytics.rows.slice(0, 10).forEach(r => {
                console.log(`   📄 ${r.keys[0]} | Clicks: ${r.clicks} | Impressions: ${r.impressions} | Pos: ${r.position.toFixed(1)}`);
            });
        } else {
            console.log("   No search analytics performance data recorded yet.");
        }
        console.log("");

        report.properties.push({
            siteUrl: sUrl,
            sitemaps: sitemaps,
            analytics: analytics
        });
    }

    // Inspect Key Canonical & Clean URLs
    const primarySiteUrl = siteEntries[0] ? siteEntries[0].siteUrl : 'https://kphstay.com/';

    const cleanBaseUrls = [
        'https://kphstay.com/',
        'https://www.kphstay.com/',
        'https://kphstay.com/rooms',
        'https://www.kphstay.com/rooms',
        'https://kphstay.com/blog',
        'https://www.kphstay.com/blog',
        'https://kphstay.com/contact',
        'https://kphstay.com/booking',
        'https://kphstay.com/pricing',
        'https://kphstay.com/privacy',
        'https://kphstay.com/terms'
    ];

    const dynamicUrls = await fetchListingsFromFirestore();
    const urlsToInspect = [...cleanBaseUrls, ...dynamicUrls.slice(0, 15)];

    console.log(`=========================================`);
    console.log(`🔍 Inspecting ${urlsToInspect.length} Key Clean & Dynamic URLs against property: ${primarySiteUrl}`);
    console.log(`=========================================\n`);

    for (const url of urlsToInspect) {
        await sleep(350);
        const targetProperty = url.startsWith('https://www.kphstay.com') ? 'https://www.kphstay.com/' : 'https://kphstay.com/';
        const res = await inspectUrl(url, targetProperty, token);
        if (res.ok && res.data.inspectionResult) {
            const resultData = res.data.inspectionResult;
            const idx = resultData.indexStatusResult || {};
            const item = {
                url: url,
                verdict: idx.verdict || 'UNKNOWN',
                coverageState: idx.coverageState || 'UNKNOWN',
                indexingState: idx.indexingState || 'UNKNOWN',
                pageFetchState: idx.pageFetchState || 'UNKNOWN',
                robotsTxtState: idx.robotsTxtState || 'UNKNOWN',
                crawledAs: idx.crawledAs || 'UNKNOWN',
                lastCrawlTime: idx.lastCrawlTime || 'N/A',
                googleCanonical: idx.googleCanonical || 'N/A',
                userCanonical: idx.userCanonical || 'N/A'
            };

            report.inspectionResults.push(item);

            if (idx.verdict === 'PASS') {
                console.log(`✅ INDEXED [PASS]: ${url}`);
                console.log(`   Google Canonical: ${idx.googleCanonical}`);
            } else {
                console.log(`⚠️ NOT INDEXED [${idx.verdict} | Coverage: ${idx.coverageState} | Fetch: ${idx.pageFetchState}]: ${url}`);
                if (idx.googleCanonical) console.log(`   ↳ Google Canonical: ${idx.googleCanonical}`);
                if (idx.userCanonical) console.log(`   ↳ User Canonical: ${idx.userCanonical}`);
            }
        } else {
            console.log(`❌ Inspection Error for ${url}:`, res.data.error ? res.data.error.message : JSON.stringify(res.data));
        }
    }

    const scratchDir = path.resolve(__dirname, '../scratch');
    if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
    fs.writeFileSync(
        path.join(scratchDir, 'gsc-deep-dive-report.json'),
        JSON.stringify(report, null, 2)
    );
    console.log("\n📄 Saved full deep-dive report to scratch/gsc-deep-dive-report.json");
}

main().catch(err => console.error("❌ Fatal:", err));
