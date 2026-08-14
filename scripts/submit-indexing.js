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
    if (!fs.existsSync(keyPath)) {
        throw new Error(`Service account key file not found at: ${keyPath}`);
    }

    const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    const clientEmail = keyData.client_email;
    const privateKey = keyData.private_key;

    if (!clientEmail || !privateKey) {
        throw new Error("Invalid service account key file format.");
    }

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claimSet = {
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/indexing https://www.googleapis.com/auth/webmasters.readonly',
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

// Format canonical URL to non-www clean URLs
function formatCanonicalUrl(urlStr) {
    if (!urlStr) return urlStr;
    let u = urlStr.replace('https://www.kphstay.com', 'https://kphstay.com');
    return u;
}

async function fetchListingsFromFirestore() {
    const listingUrls = [];
    
    // Fetch room listings
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
    } catch (e) {
        console.warn("⚠️ Warning fetching room listings:", e.message);
    }

    // Fetch blog listings
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
    } catch (e) {
        console.warn("⚠️ Warning fetching blog listings:", e.message);
    }

    return listingUrls;
}

async function submitUrlToGoogle(url, accessToken) {
    const canonicalUrl = formatCanonicalUrl(url);
    const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            url: canonicalUrl,
            type: 'URL_UPDATED'
        })
    });

    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
}

async function main() {
    console.log("⚡ KPH Stay — Google Indexing API Submission Tool\n");

    const rootDir = path.resolve(__dirname, '..');
    const keyPath = path.join(rootDir, 'formal-folder-476209-h0-6ddebc22f141.json');

    const cliArgs = process.argv.slice(2);
    let targetUrls = [];

    const isListingsOnly = cliArgs.includes('--listings');

    const baseUrls = [
        'https://kphstay.com/',
        'https://kphstay.com/rooms',
        'https://kphstay.com/blog',
        'https://kphstay.com/contact',
        'https://kphstay.com/booking',
        'https://kphstay.com/privacy',
        'https://kphstay.com/terms',
        'https://kphstay.com/refund',
        'https://kphstay.com/pricing',
        'https://kphstay.com/cookies'
    ];

    if (isListingsOnly) {
        console.log("🔍 Fetching room & blog listings from Firestore database...");
        targetUrls = await fetchListingsFromFirestore();
        console.log(`Found ${targetUrls.length} listing URL(s).\n`);
    } else if (cliArgs.length > 0 && !cliArgs.includes('--all')) {
        targetUrls = cliArgs.filter(arg => arg.startsWith('http://') || arg.startsWith('https://')).map(formatCanonicalUrl);
    } else {
        console.log("🔍 Fetching dynamic room & blog listings from database...");
        const listingUrls = await fetchListingsFromFirestore();
        targetUrls = [...baseUrls, ...listingUrls];
        console.log(`Found ${baseUrls.length} base pages + ${listingUrls.length} dynamic listing URLs.\n`);
    }

    if (targetUrls.length === 0) {
        console.log("⚠️ No target URLs found to submit.");
        return;
    }

    try {
        console.log("🔑 Authenticating with Google Cloud Service Account...");
        const token = await getAccessToken(keyPath);
        console.log("✅ Authenticated successfully.\n");

        console.log(`🚀 Submitting ${targetUrls.length} URL(s) to Google Indexing API...\n`);

        for (const url of targetUrls) {
            process.stdout.write(`Submitting: ${url} ... `);
            try {
                const result = await submitUrlToGoogle(url, token);
                if (result.ok) {
                    console.log(`✅ Success (Status ${result.status})`);
                } else {
                    console.log(`❌ Failed (${result.status}):`, result.data.error ? result.data.error.message : JSON.stringify(result.data));
                }
            } catch (err) {
                console.log(`❌ Error: ${err.message}`);
            }
        }

        console.log("\n🎉 Indexing submission finished!");
    } catch (err) {
        console.error("❌ Fatal Error:", err.message);
        process.exit(1);
    }
}

main();
