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
    if (!fs.existsSync(keyPath)) {
        throw new Error(`Service account key file not found at: ${keyPath}`);
    }
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
        const text = await res.text();
        throw new Error(`OAuth token fetch failed: ${text}`);
    }

    const data = await res.json();
    return data.access_token;
}

async function listSites(token) {
    console.log("📍 Fetching sites registered in Search Console for this service account...");
    const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
}

async function getSitemaps(siteUrl, token) {
    const encodedSite = encodeURIComponent(siteUrl);
    const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
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
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
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
                    listingUrls.push(`https://www.kphstay.com/room-details.html?id=${id}`);
                    if (slug && slug !== id) {
                        listingUrls.push(`https://www.kphstay.com/room/${slug}`);
                    }
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
                    listingUrls.push(`https://www.kphstay.com/blog-details.html?id=${id}`);
                    if (slug && slug !== id) {
                        listingUrls.push(`https://www.kphstay.com/blog/${slug}`);
                    }
                });
            }
        }
    } catch (e) {}

    return listingUrls;
}

async function main() {
    console.log("=================================================");
    console.log("🔍 Google Search Console Data & Indexing Fetcher");
    console.log("=================================================\n");

    const keyPath = path.resolve(__dirname, '../formal-folder-476209-h0-6ddebc22f141.json');

    try {
        const token = await getAccessToken(keyPath);
        console.log("✅ Authenticated with Google Cloud API\n");

        // 1. List sites registered in Search Console
        const sitesResult = await listSites(token);
        if (!sitesResult.ok) {
            console.error("❌ Failed to list Search Console sites:", sitesResult.data);
            return;
        }

        const sites = sitesResult.data.siteEntry || [];
        console.log(`📋 Found ${sites.length} site(s) in Search Console:`);
        sites.forEach(s => console.log(`   - ${s.siteUrl} (Permission Level: ${s.permissionLevel})`));
        console.log("");

        if (sites.length === 0) {
            console.log("⚠️ No Search Console sites found for this service account!");
            console.log("👉 Please make sure the service account email is added as an Owner/Full User in Google Search Console for your domain.");
            return;
        }

        // Target site URL from list or default
        const siteUrl = sites[0].siteUrl;
        console.log(`🎯 Querying Search Console for site: ${siteUrl}\n`);

        // 2. Fetch Sitemaps
        console.log("--- 1. SITEMAPS STATUS ---");
        const sitemapsRes = await getSitemaps(siteUrl, token);
        if (sitemapsRes.ok && sitemapsRes.data.sitemap) {
            console.log(`Found ${sitemapsRes.data.sitemap.length} sitemap(s):`);
            sitemapsRes.data.sitemap.forEach(sm => {
                console.log(`   📌 Path: ${sm.path}`);
                console.log(`      Last Submitted: ${sm.lastSubmitted}`);
                console.log(`      Last Downloaded: ${sm.lastDownloaded}`);
                console.log(`      Is Pending: ${sm.isPending}`);
                if (sm.contents) {
                    sm.contents.forEach(c => {
                        console.log(`      Type: ${c.type} | Submitted: ${c.submitted} | Indexed: ${c.indexed}`);
                    });
                }
            });
        } else {
            console.log("   No sitemaps found or error:", sitemapsRes.data);
        }
        console.log("");

        // 3. Fetch Search Analytics (Indexed pages getting impressions/clicks)
        console.log("--- 2. SEARCH ANALYTICS (INDEXED PAGES WITH IMPRESSIONS/CLICKS) ---");
        const analyticsRes = await getSearchAnalytics(siteUrl, token);
        let analyticsPages = [];
        if (analyticsRes.ok && analyticsRes.data.rows) {
            analyticsPages = analyticsRes.data.rows;
            console.log(`Found ${analyticsPages.length} active pages in Search Analytics:`);
            analyticsPages.slice(0, 20).forEach(r => {
                console.log(`   📄 ${r.keys[0]} (Clicks: ${r.clicks}, Impressions: ${r.impressions}, CTR: ${(r.ctr*100).toFixed(2)}%, Avg Pos: ${r.position.toFixed(1)})`);
            });
            if (analyticsPages.length > 20) {
                console.log(`   ... and ${analyticsPages.length - 20} more pages.`);
            }
        } else {
            console.log("   No search analytics rows or response:", analyticsRes.data);
        }
        console.log("");

        // 4. URL Inspection API
        console.log("--- 3. DETAILED URL INSPECTION ---");
        const baseUrls = [
            'https://www.kphstay.com/',
            'https://www.kphstay.com/rooms.html',
            'https://www.kphstay.com/blog.html',
            'https://www.kphstay.com/contact.html',
            'https://www.kphstay.com/booking.html',
            'https://www.kphstay.com/login.html',
            'https://www.kphstay.com/privacy.html',
            'https://www.kphstay.com/terms.html',
            'https://www.kphstay.com/refund.html',
            'https://www.kphstay.com/pricing.html'
        ];

        const listings = await fetchListingsFromFirestore();
        const urlsToInspect = [...baseUrls, ...listings];

        console.log(`Inspecting ${urlsToInspect.length} URLs via Google URL Inspection API...\n`);

        const results = [];
        let indexedCount = 0;
        let notIndexedCount = 0;

        for (const url of urlsToInspect) {
            await sleep(300); // Respect API rate limits (2000 per day / 600 per min)
            const inspectRes = await inspectUrl(url, siteUrl, token);

            if (inspectRes.ok && inspectRes.data.inspectionResult) {
                const inspectData = inspectRes.data.inspectionResult;
                const indexStatus = inspectData.indexStatusResult || {};

                const item = {
                    url: url,
                    verdict: indexStatus.verdict || 'UNKNOWN',
                    coverageState: indexStatus.coverageState || 'UNKNOWN',
                    indexingState: indexStatus.indexingState || 'UNKNOWN',
                    pageFetchState: indexStatus.pageFetchState || 'UNKNOWN',
                    robotsTxtState: indexStatus.robotsTxtState || 'UNKNOWN',
                    crawledAs: indexStatus.crawledAs || 'UNKNOWN',
                    lastCrawlTime: indexStatus.lastCrawlTime || 'N/A',
                    googleCanonical: indexStatus.googleCanonical || 'N/A',
                    userCanonical: indexStatus.userCanonical || 'N/A'
                };

                results.push(item);

                if (indexStatus.verdict === 'PASS') {
                    indexedCount++;
                    console.log(`✅ INDEXED [${item.verdict}]: ${url}`);
                } else {
                    notIndexedCount++;
                    console.log(`⚠️ NOT INDEXED [Verdict: ${item.verdict} | State: ${item.coverageState} | Fetch: ${item.pageFetchState}]: ${url}`);
                    if (item.googleCanonical !== item.userCanonical && item.googleCanonical !== 'N/A') {
                        console.log(`   ↳ Canonical mismatch! User: ${item.userCanonical} | Google: ${item.googleCanonical}`);
                    }
                }
            } else {
                console.log(`❌ Failed to inspect ${url}:`, inspectRes.data.error ? inspectRes.data.error.message : inspectRes.data);
            }
        }

        console.log("\n=================================================");
        console.log("📊 SEARCH CONSOLE INSPECTION SUMMARY");
        console.log("=================================================");
        console.log(`Total URLs Inspected: ${urlsToInspect.length}`);
        console.log(`Indexed (VERDICT PASS): ${indexedCount}`);
        console.log(`Not Indexed / Errors: ${notIndexedCount}`);
        console.log("=================================================");

        // Save detailed JSON output for artifact / breakdown
        const scratchDir = path.resolve(__dirname, '../scratch');
        if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
        fs.writeFileSync(
            path.join(scratchDir, 'search-console-inspection.json'),
            JSON.stringify({ siteUrl, indexedCount, notIndexedCount, results, sitemaps: sitemapsRes.data, searchAnalytics: analyticsPages }, null, 2)
        );
        console.log("📄 Saved full report to scratch/search-console-inspection.json");

    } catch (err) {
        console.error("❌ Error running Search Console check:", err.message);
    }
}

main();
