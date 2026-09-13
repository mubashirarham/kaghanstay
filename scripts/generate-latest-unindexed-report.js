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

async function fetchCollection(collectionName) {
    try {
        const res = await fetch(`https://firestore.googleapis.com/v1/projects/kaghan-properties/databases/(default)/documents/${collectionName}?pageSize=100`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.documents || []).map(doc => {
            const id = doc.name.split('/').pop();
            const fields = doc.fields || {};
            const item = { id };
            for (const k in fields) {
                const f = fields[k];
                if ('stringValue' in f) item[k] = f.stringValue;
                else if ('integerValue' in f) item[k] = parseInt(f.integerValue, 10);
                else if ('booleanValue' in f) item[k] = f.booleanValue;
            }
            return item;
        });
    } catch (e) {
        return [];
    }
}

async function main() {
    console.log("==========================================================");
    console.log("🔍 Live Search Console Indexing Audit (Indexed vs Non-Indexed)");
    console.log("==========================================================\n");

    const keyPath = path.resolve(__dirname, '../formal-folder-476209-h0-6ddebc22f141.json');
    const token = await getAccessToken(keyPath);
    const siteUrl = 'https://kphstay.com/';

    const [rooms, blogs] = await Promise.all([
        fetchCollection('rooms'),
        fetchCollection('blogs')
    ]);

    const inventory = [];

    // 1. Static Pages
    const staticPages = [
        { url: 'https://kphstay.com/', type: 'Core Landing', name: 'Homepage' },
        { url: 'https://kphstay.com/rooms', type: 'Core Catalog', name: 'All Accommodations' },
        { url: 'https://kphstay.com/blog', type: 'Core Blog', name: 'Resort Blog' },
        { url: 'https://kphstay.com/contact', type: 'Utility / Support', name: 'Contact & Support' },
        { url: 'https://kphstay.com/pricing', type: 'Utility', name: 'Transparent Pricing' },
        { url: 'https://kphstay.com/privacy', type: 'Legal', name: 'Privacy Policy' },
        { url: 'https://kphstay.com/terms', type: 'Legal', name: 'Terms & Conditions' },
        { url: 'https://kphstay.com/refund', type: 'Legal', name: 'Refund Policy' },
        { url: 'https://kphstay.com/cookies', type: 'Legal', name: 'Cookie Policy' },
        { url: 'https://kphstay.com/furnished-apartments-islamabad', type: 'Regional SEO', name: 'Furnished Apartments in Islamabad' },
        { url: 'https://kphstay.com/furnished-apartments-murree', type: 'Regional SEO', name: 'Furnished Apartments in Murree' },
        { url: 'https://kphstay.com/furnished-apartments-nathia-gali', type: 'Regional SEO', name: 'Furnished Apartments in Nathia Gali' },
        { url: 'https://kphstay.com/serviced-apartments-islamabad', type: 'Regional SEO', name: 'Serviced Apartments Islamabad' },
        { url: 'https://kphstay.com/luxury-apartments-murree', type: 'Regional SEO', name: 'Luxury Apartments Murree' },
        { url: 'https://kphstay.com/vacation-rentals-nathia-gali', type: 'Regional SEO', name: 'Vacation Rentals Nathia Gali' }
    ];
    inventory.push(...staticPages);

    // 2. Room listings
    rooms.forEach(r => {
        if (r.slug) {
            inventory.push({
                url: `https://kphstay.com/room/${r.slug}`,
                type: 'Room Listing',
                name: r.title || r.name || r.slug
            });
        }
    });

    // 3. Blog articles
    blogs.forEach(b => {
        if (b.slug) {
            inventory.push({
                url: `https://kphstay.com/blog/${b.slug}`,
                type: 'Blog Article',
                name: b.title || b.slug
            });
        }
    });

    console.log(`Auditing ${inventory.length} canonical URLs across KPHStay.com...\n`);

    const indexedPages = [];
    const nonIndexedPages = [];

    for (let i = 0; i < inventory.length; i++) {
        const item = inventory[i];
        await sleep(350); // Respect GSC API rate limits

        const res = await inspectUrl(item.url, siteUrl, token);
        if (res.ok && res.data.inspectionResult) {
            const idx = res.data.inspectionResult.indexStatusResult || {};
            const verdict = idx.verdict || 'UNKNOWN';
            const coverage = idx.coverageState || 'UNKNOWN';
            const fetchState = idx.pageFetchState || 'UNKNOWN';
            const googleCanonical = idx.googleCanonical || 'N/A';
            const lastCrawlTime = idx.lastCrawlTime || 'Never';

            const record = {
                ...item,
                verdict,
                coverage,
                fetchState,
                googleCanonical,
                lastCrawlTime
            };

            if (verdict === 'PASS') {
                indexedPages.push(record);
                console.log(`[${i+1}/${inventory.length}] ✅ INDEXED: ${item.url}`);
            } else {
                nonIndexedPages.push(record);
                console.log(`[${i+1}/${inventory.length}] ⚠️ NOT INDEXED [${coverage}]: ${item.url}`);
            }
        } else {
            console.log(`[${i+1}/${inventory.length}] ❌ Inspection failed for ${item.url}:`, res.data.error ? res.data.error.message : res.data);
            nonIndexedPages.push({
                ...item,
                verdict: 'API_ERROR',
                coverage: 'Failed to inspect',
                fetchState: 'ERROR',
                googleCanonical: 'N/A',
                lastCrawlTime: 'N/A'
            });
        }
    }

    console.log("\n==========================================================");
    console.log(`📊 AUDIT COMPLETE: ${inventory.length} Total Canonical URLs`);
    console.log(`   ✅ Indexed: ${indexedPages.length}`);
    console.log(`   ⚠️ Non-Indexed / Pending Crawl: ${nonIndexedPages.length}`);
    console.log("==========================================================");

    const reportData = {
        generatedAt: new Date().toISOString(),
        totalPages: inventory.length,
        indexedCount: indexedPages.length,
        nonIndexedCount: nonIndexedPages.length,
        indexedPages,
        nonIndexedPages
    };

    const scratchDir = path.resolve(__dirname, '../scratch');
    if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
    fs.writeFileSync(
        path.join(scratchDir, 'live-non-indexed-audit.json'),
        JSON.stringify(reportData, null, 2)
    );
    console.log("📄 Saved audit data to scratch/live-non-indexed-audit.json");
}

main().catch(err => console.error("❌ Fatal:", err));
