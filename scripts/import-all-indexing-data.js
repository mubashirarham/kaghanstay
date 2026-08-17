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

// 1. List Sites
async function listSites(token) {
    const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
}

// 2. Get Sitemaps
async function getSitemaps(siteUrl, token) {
    const encodedSite = encodeURIComponent(siteUrl);
    const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
}

// 3. Search Analytics query helper
async function querySearchAnalytics(siteUrl, token, dimensions, rowLimit = 500) {
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

// 4. URL Inspection API
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

// 5. Indexing API Metadata
async function getIndexingApiMetadata(url, token) {
    const canonicalUrl = url.replace('https://www.kphstay.com', 'https://kphstay.com');
    const apiUrl = `https://indexing.googleapis.com/v3/urlNotifications/metadata?url=${encodeURIComponent(canonicalUrl)}`;
    const res = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
}

// 6. Fetch all known URLs (from Firestore + Static + Sitemap)
async function fetchAllSiteUrls() {
    const urls = new Set([
        'https://kphstay.com/',
        'https://kphstay.com/rooms',
        'https://kphstay.com/blog',
        'https://kphstay.com/contact',
        'https://kphstay.com/booking',
        'https://kphstay.com/pricing',
        'https://kphstay.com/privacy',
        'https://kphstay.com/terms',
        'https://kphstay.com/refund',
        'https://kphstay.com/cookies'
    ]);

    try {
        const sitemapRes = await fetch('https://kphstay.com/sitemap.xml');
        if (sitemapRes.ok) {
            const xml = await sitemapRes.text();
            const locMatches = xml.matchAll(/<loc>(.*?)<\/loc>/g);
            for (const match of locMatches) {
                if (match[1]) urls.add(match[1].trim());
            }
        }
    } catch (e) {
        console.warn('Could not fetch live sitemap xml:', e.message);
    }

    try {
        const roomsRes = await fetch('https://firestore.googleapis.com/v1/projects/kaghan-properties/databases/(default)/documents/rooms?pageSize=100');
        if (roomsRes && roomsRes.ok) {
            const data = await roomsRes.json();
            if (data.documents) {
                data.documents.forEach(doc => {
                    const fields = doc.fields || {};
                    const slug = fields.slug ? fields.slug.stringValue : null;
                    if (slug) {
                        urls.add(`https://kphstay.com/room/${slug}`);
                    }
                });
            }
        }
    } catch (e) {}

    try {
        const blogsRes = await fetch('https://firestore.googleapis.com/v1/projects/kaghan-properties/databases/(default)/documents/blogs?pageSize=100');
        if (blogsRes && blogsRes.ok) {
            const data = await blogsRes.json();
            if (data.documents) {
                data.documents.forEach(doc => {
                    const fields = doc.fields || {};
                    const slug = fields.slug ? fields.slug.stringValue : null;
                    if (slug) {
                        urls.add(`https://kphstay.com/blog/${slug}`);
                    }
                });
            }
        }
    } catch (e) {}

    return Array.from(urls);
}

async function main() {
    console.log("===============================================================");
    console.log("🚀 FULL IMPORT: GOOGLE SEARCH CONSOLE & INDEXING DATA");
    console.log("===============================================================\n");

    const keyPath = path.resolve(__dirname, '../formal-folder-476209-h0-6ddebc22f141.json');
    if (!fs.existsSync(keyPath)) {
        throw new Error(`Credentials file not found at ${keyPath}`);
    }

    const token = await getAccessToken(keyPath);
    console.log("🔑 Authenticated via Service Account JWT.\n");

    const importedData = {
        importedAt: new Date().toISOString(),
        properties: [],
        searchAnalytics: {},
        indexingApiVerification: [],
        urlInspections: [],
        summary: {}
    };

    // 1. Fetch properties
    const sitesRes = await listSites(token);
    const sites = sitesRes.siteEntry || [];
    console.log(`🌐 Discovered ${sites.length} Search Console Properties:`);
    for (const site of sites) {
        console.log(`   - ${site.siteUrl} (${site.permissionLevel})`);
    }
    console.log("");

    for (const site of sites) {
        const siteUrl = site.siteUrl;
        const sitemaps = await getSitemaps(siteUrl, token);

        // Fetch Analytics with various dimension breakdowns
        const byPage = await querySearchAnalytics(siteUrl, token, ['page']);
        const byQuery = await querySearchAnalytics(siteUrl, token, ['query']);
        const byCountry = await querySearchAnalytics(siteUrl, token, ['country']);
        const byDevice = await querySearchAnalytics(siteUrl, token, ['device']);
        const byDate = await querySearchAnalytics(siteUrl, token, ['date']);

        importedData.properties.push({
            siteUrl,
            permissionLevel: site.permissionLevel,
            sitemaps: sitemaps.sitemap || [],
            performanceSummary: {
                totalPages: byPage.rows ? byPage.rows.length : 0,
                totalQueries: byQuery.rows ? byQuery.rows.length : 0,
                totalImpressions: (byDate.rows || []).reduce((acc, r) => acc + (r.impressions || 0), 0),
                totalClicks: (byDate.rows || []).reduce((acc, r) => acc + (r.clicks || 0), 0)
            }
        });

        importedData.searchAnalytics[siteUrl] = {
            byPage: byPage.rows || [],
            byQuery: byQuery.rows || [],
            byCountry: byCountry.rows || [],
            byDevice: byDevice.rows || [],
            byDate: byDate.rows || []
        };
    }

    // 2. Fetch all site URLs
    const allUrls = await fetchAllSiteUrls();
    console.log(`📑 Total unique site URLs to inspect: ${allUrls.length}\n`);

    let indexedCount = 0;
    let notIndexedCount = 0;
    let coverageBreakdown = {};

    console.log("🔍 Running URL Inspection & Indexing API verification for each URL...\n");

    for (let i = 0; i < allUrls.length; i++) {
        const url = allUrls[i];
        process.stdout.write(`[${i + 1}/${allUrls.length}] Checking: ${url} ... `);

        // Indexing API Metadata
        const indexingMeta = await getIndexingApiMetadata(url, token);
        importedData.indexingApiVerification.push({
            url,
            status: indexingMeta.status,
            metadata: indexingMeta.data
        });

        // Determine matching Search Console property
        let targetProperty = 'https://kphstay.com/';
        if (url.startsWith('https://www.kphstay.com')) {
            targetProperty = 'https://www.kphstay.com/';
        } else if (url.startsWith('https://kphstay.com')) {
            targetProperty = 'https://kphstay.com/';
        }

        // Search Console URL Inspection API
        await sleep(350);
        let inspectRes = await inspectUrl(url, targetProperty, token);

        if (inspectRes.ok && inspectRes.data && inspectRes.data.inspectionResult) {
            const resData = inspectRes.data.inspectionResult;
            const idxStatus = resData.indexStatusResult || {};

            const record = {
                url,
                inspectedUnderProperty: targetProperty,
                verdict: idxStatus.verdict || 'UNKNOWN',
                coverageState: idxStatus.coverageState || 'UNKNOWN',
                indexingState: idxStatus.indexingState || 'UNKNOWN',
                pageFetchState: idxStatus.pageFetchState || 'UNKNOWN',
                robotsTxtState: idxStatus.robotsTxtState || 'UNKNOWN',
                crawledAs: idxStatus.crawledAs || 'UNKNOWN',
                lastCrawlTime: idxStatus.lastCrawlTime || null,
                googleCanonical: idxStatus.googleCanonical || null,
                userCanonical: idxStatus.userCanonical || null,
                sitemap: idxStatus.sitemap || [],
                referringUrls: idxStatus.referringUrls || [],
                mobileUsabilityResult: resData.mobileUsabilityResult ? resData.mobileUsabilityResult.verdict : null,
                richResults: resData.richResultsResult ? resData.richResultsResult.verdict : null
            };

            importedData.urlInspections.push(record);

            const cov = record.coverageState;
            coverageBreakdown[cov] = (coverageBreakdown[cov] || 0) + 1;

            if (record.verdict === 'PASS') {
                indexedCount++;
                console.log(`✅ INDEXED (${record.coverageState})`);
            } else {
                notIndexedCount++;
                console.log(`⚠️ ${record.verdict} (${record.coverageState})`);
            }
        } else {
            console.log(`❌ Error (${inspectRes.status}):`, inspectRes.data ? (inspectRes.data.error ? inspectRes.data.error.message : JSON.stringify(inspectRes.data)) : 'Unknown error');
            importedData.urlInspections.push({
                url,
                inspectedUnderProperty: targetProperty,
                error: inspectRes.data
            });
        }
    }

    importedData.summary = {
        totalUrlsChecked: allUrls.length,
        indexedCount,
        notIndexedCount,
        coverageBreakdown,
        propertiesCount: sites.length
    };

    // Save JSON output
    const outDir = path.resolve(__dirname, '../data');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    
    const jsonPath = path.join(outDir, 'search-console-indexing-data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(importedData, null, 2));

    const scratchPath = path.resolve(__dirname, '../scratch/search-console-full-data.json');
    fs.writeFileSync(scratchPath, JSON.stringify(importedData, null, 2));

    console.log("\n===============================================================");
    console.log("🎉 IMPORT COMPLETED SUCCESSFULLY!");
    console.log(`📁 Saved data to: ${jsonPath}`);
    console.log("===============================================================");
    console.log(`Total URLs: ${allUrls.length}`);
    console.log(`Indexed (PASS): ${indexedCount}`);
    console.log(`Not Indexed: ${notIndexedCount}`);
    console.log("Coverage Breakdown:", coverageBreakdown);
    console.log("===============================================================\n");
}

main().catch(err => {
    console.error("❌ Fatal Import Error:", err);
});
