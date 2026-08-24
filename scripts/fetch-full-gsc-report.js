const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function base64url(str) {
    return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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

// 1. Fetch Sitemaps
async function getSitemaps(siteUrl, token) {
    const encodedSite = encodeURIComponent(siteUrl);
    const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
}

// 2. Fetch Search Analytics
async function getSearchAnalytics(siteUrl, token, dimensions, rowLimit = 500) {
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
            dimensions,
            rowLimit
        })
    });
    return await res.json();
}

// 3. URL Inspection API
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

// 4. Google Indexing API Metadata
async function getIndexingApiMetadata(url, token) {
    const apiUrl = `https://indexing.googleapis.com/v3/urlNotifications/metadata?url=${encodeURIComponent(url)}`;
    const res = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
}

// 5. Fetch all rooms & blogs from Firestore
async function fetchCatalogFromFirestore() {
    const rooms = [];
    const blogs = [];

    try {
        const roomsRes = await fetch('https://firestore.googleapis.com/v1/projects/kaghan-properties/databases/(default)/documents/rooms?pageSize=100');
        if (roomsRes.ok) {
            const data = await roomsRes.json();
            if (data.documents) {
                data.documents.forEach(doc => {
                    const id = doc.name.split('/').pop();
                    const fields = doc.fields || {};
                    const name = fields.name ? fields.name.stringValue : 'Room';
                    const slug = fields.slug ? fields.slug.stringValue : null;
                    const status = fields.status ? fields.status.stringValue : 'available';
                    const updatedAt = fields.updatedAt ? fields.updatedAt.stringValue : null;
                    rooms.push({ id, name, slug, status, updatedAt });
                });
            }
        }
    } catch (e) {
        console.error('Error fetching rooms:', e.message);
    }

    try {
        const blogsRes = await fetch('https://firestore.googleapis.com/v1/projects/kaghan-properties/databases/(default)/documents/blogs?pageSize=100');
        if (blogsRes.ok) {
            const data = await blogsRes.json();
            if (data.documents) {
                data.documents.forEach(doc => {
                    const id = doc.name.split('/').pop();
                    const fields = doc.fields || {};
                    const title = fields.title ? fields.title.stringValue : 'Blog Post';
                    const slug = fields.slug ? fields.slug.stringValue : null;
                    const portal = fields.portal ? fields.portal.stringValue : 'stay';
                    const createdAt = fields.createdAt ? fields.createdAt.stringValue : null;
                    blogs.push({ id, title, slug, portal, createdAt });
                });
            }
        }
    } catch (e) {
        console.error('Error fetching blogs:', e.message);
    }

    return { rooms, blogs };
}

async function run() {
    console.log("================================================================================");
    console.log("🚀 STARTING COMPREHENSIVE GOOGLE SEARCH CONSOLE API & INDEXING INSPECTION");
    console.log("================================================================================\n");

    const keyPath = path.resolve(__dirname, '../formal-folder-476209-h0-6ddebc22f141.json');
    const token = await getAccessToken(keyPath);
    console.log("🔑 Authenticated successfully with Google Search Console & Indexing API.");

    // Step 1: Query Sitemaps for both sites
    const targetSites = ['https://kphstay.com/', 'https://www.kphstay.com/'];
    const sitemapsReport = {};

    for (const site of targetSites) {
        console.log(`\n📋 Querying Sitemaps for ${site}...`);
        const sitemapsData = await getSitemaps(site, token);
        sitemapsReport[site] = sitemapsData;
        if (sitemapsData.sitemap) {
            console.log(`   Found ${sitemapsData.sitemap.length} sitemaps:`);
            sitemapsData.sitemap.forEach(sm => {
                console.log(`   - Sitemap: ${sm.path}`);
                console.log(`     Last Downloaded: ${sm.lastDownloaded || 'Never'}`);
                console.log(`     Status: Warnings=${sm.warnings || 0}, Errors=${sm.errors || 0}, Pending=${sm.isPending}`);
                if (sm.contents) {
                    sm.contents.forEach(c => {
                        console.log(`     -> Type: ${c.type} | Submitted: ${c.submitted} | Indexed: ${c.indexed}`);
                    });
                }
            });
        } else {
            console.log("   No sitemaps returned or response:", JSON.stringify(sitemapsData));
        }
    }

    // Step 2: Query Search Analytics
    const analyticsReport = {};
    for (const site of targetSites) {
        console.log(`\n📊 Querying Search Analytics Performance for ${site}...`);
        const pagesData = await getSearchAnalytics(site, token, ['page']);
        const queriesData = await getSearchAnalytics(site, token, ['query']);
        analyticsReport[site] = { pages: pagesData, queries: queriesData };
        
        if (pagesData.rows && pagesData.rows.length > 0) {
            console.log(`   Found ${pagesData.rows.length} pages receiving impressions/clicks in past 90 days:`);
            pagesData.rows.slice(0, 10).forEach(r => {
                console.log(`   - Page: ${r.keys[0]} | Clicks: ${r.clicks} | Imp: ${r.impressions} | CTR: ${(r.ctr * 100).toFixed(1)}% | AvgPos: ${r.position.toFixed(1)}`);
            });
        } else {
            console.log("   No search analytics page data in past 90 days.");
        }

        if (queriesData.rows && queriesData.rows.length > 0) {
            console.log(`   Found ${queriesData.rows.length} search queries:`);
            queriesData.rows.slice(0, 5).forEach(r => {
                console.log(`   - Query: "${r.keys[0]}" | Clicks: ${r.clicks} | Imp: ${r.impressions} | Pos: ${r.position.toFixed(1)}`);
            });
        }
    }

    // Step 3: Fetch Catalog
    console.log("\n📦 Fetching Rooms and Blogs from Firestore...");
    const catalog = await fetchCatalogFromFirestore();
    console.log(`   Found ${catalog.rooms.length} room(s) and ${catalog.blogs.length} blog(s).`);

    // Step 4: URL Inspection
    // Build comprehensive list of canonical and legacy URLs to test
    const baseUrls = [
        'https://kphstay.com/',
        'https://kphstay.com/rooms',
        'https://kphstay.com/blog',
        'https://kphstay.com/contact',
        'https://kphstay.com/privacy',
        'https://kphstay.com/terms',
        'https://kphstay.com/refund',
        'https://kphstay.com/cookies',
        'https://kphstay.com/pricing',
        'https://kphstay.com/booking',
        'https://kphstay.com/sitemap.xml',
        'https://kphstay.com/robots.txt'
    ];

    const roomUrls = [];
    catalog.rooms.forEach(r => {
        if (r.slug) {
            roomUrls.push({ url: `https://kphstay.com/room/${r.slug}`, type: 'room', name: r.name });
            roomUrls.push({ url: `https://kphstay.com/room-details.html?id=${r.id}`, type: 'room_legacy', name: r.name });
        } else {
            roomUrls.push({ url: `https://kphstay.com/room-details.html?id=${r.id}`, type: 'room', name: r.name });
        }
    });

    const blogUrls = [];
    catalog.blogs.forEach(b => {
        if (b.slug) {
            blogUrls.push({ url: `https://kphstay.com/blog/${b.slug}`, type: 'blog', name: b.title });
            blogUrls.push({ url: `https://kphstay.com/blog-details.html?id=${b.id}`, type: 'blog_legacy', name: b.title });
        } else {
            blogUrls.push({ url: `https://kphstay.com/blog-details.html?id=${b.id}`, type: 'blog', name: b.title });
        }
    });

    // Also include www versions of top pages to check canonicalization
    const wwwUrls = [
        'https://www.kphstay.com/',
        'https://www.kphstay.com/rooms',
        'https://www.kphstay.com/sitemap.xml'
    ];

    const allUrlsToInspect = [
        ...baseUrls.map(u => ({ url: u, type: 'static', name: u.split('/').pop() || 'Homepage' })),
        ...roomUrls,
        ...blogUrls,
        ...wwwUrls.map(u => ({ url: u, type: 'www_variant', name: 'WWW Variant' }))
    ];

    console.log(`\n🔍 Executing Google URL Inspection API for ${allUrlsToInspect.length} URLs across properties...`);
    const inspectionResults = [];
    let passCount = 0;
    let failCount = 0;
    let neutralCount = 0;

    for (let i = 0; i < allUrlsToInspect.length; i++) {
        const item = allUrlsToInspect[i];
        const primarySite = item.url.startsWith('https://www.kphstay.com') ? 'https://www.kphstay.com/' : 'https://kphstay.com/';
        
        await sleep(350); // API Rate Limit safety
        const inspectRes = await inspectUrl(item.url, primarySite, token);

        let indexingApiData = null;
        if (item.type === 'static' || item.type === 'room' || item.type === 'blog') {
            const indRes = await getIndexingApiMetadata(item.url, token);
            if (indRes.ok) {
                indexingApiData = indRes.data;
            }
        }

        if (inspectRes.ok && inspectRes.data.inspectionResult) {
            const resData = inspectRes.data.inspectionResult;
            const indexStatus = resData.indexStatusResult || {};
            const mobileUsability = resData.mobileUsabilityResult || {};
            const richResults = resData.richResultsResult || {};

            const verdict = indexStatus.verdict || 'UNKNOWN';
            if (verdict === 'PASS') passCount++;
            else if (verdict === 'NEUTRAL') neutralCount++;
            else failCount++;

            const record = {
                url: item.url,
                type: item.type,
                name: item.name,
                verdict: verdict,
                coverageState: indexStatus.coverageState || 'N/A',
                indexingState: indexStatus.indexingState || 'N/A',
                pageFetchState: indexStatus.pageFetchState || 'N/A',
                robotsTxtState: indexStatus.robotsTxtState || 'N/A',
                crawledAs: indexStatus.crawledAs || 'N/A',
                lastCrawlTime: indexStatus.lastCrawlTime || 'N/A',
                googleCanonical: indexStatus.googleCanonical || 'N/A',
                userCanonical: indexStatus.userCanonical || 'N/A',
                mobileVerdict: mobileUsability.verdict || 'N/A',
                mobileIssues: (mobileUsability.issues || []).map(iss => iss.issueType),
                richResultsVerdict: richResults.verdict || 'N/A',
                richDetected: (richResults.detectedItems || []).map(d => ({ name: d.richResultType, items: (d.items || []).length })),
                indexingApiNotification: indexingApiData ? indexingApiData.latestUpdate : null
            };

            inspectionResults.push(record);

            const icon = verdict === 'PASS' ? '✅' : (verdict === 'NEUTRAL' ? '⚠️' : '❌');
            console.log(`[${i+1}/${allUrlsToInspect.length}] ${icon} [${verdict}] ${item.url} -> ${record.coverageState}`);
            if (record.googleCanonical !== 'N/A' && record.googleCanonical !== record.userCanonical) {
                console.log(`      ↳ Canonical: Google=${record.googleCanonical} | User=${record.userCanonical}`);
            }
        } else {
            console.log(`[${i+1}/${allUrlsToInspect.length}] ❌ Failed to inspect ${item.url}:`, inspectRes.data ? JSON.stringify(inspectRes.data) : 'Unknown error');
            inspectionResults.push({
                url: item.url,
                type: item.type,
                name: item.name,
                verdict: 'ERROR',
                error: inspectRes.data
            });
            failCount++;
        }
    }

    console.log("\n================================================================================");
    console.log("📈 INSPECTION COMPLETE SUMMARY");
    console.log("================================================================================");
    console.log(`Total URLs Inspected: ${allUrlsToInspect.length}`);
    console.log(`Indexed (VERDICT: PASS): ${passCount}`);
    console.log(`Neutral / Excluded / Canonical / Redirect (VERDICT: NEUTRAL): ${neutralCount}`);
    console.log(`Failed / Errors: ${failCount}`);
    console.log("================================================================================\n");

    const scratchDir = path.resolve(__dirname, '../scratch');
    if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

    const finalReportData = {
        generatedAt: new Date().toISOString(),
        serviceAccount: 'google-indexing-bot-kph-stay@formal-folder-476209-h0.iam.gserviceaccount.com',
        propertiesVerified: targetSites,
        counts: {
            total: allUrlsToInspect.length,
            pass: passCount,
            neutral: neutralCount,
            fail: failCount
        },
        sitemaps: sitemapsReport,
        searchAnalytics: analyticsReport,
        catalog: catalog,
        inspectionResults: inspectionResults
    };

    const outPath = path.join(scratchDir, 'gsc-full-report.json');
    fs.writeFileSync(outPath, JSON.stringify(finalReportData, null, 2), 'utf8');
    console.log(`💾 Saved complete detailed data payload to: ${outPath}`);
}

run().catch(console.error);
