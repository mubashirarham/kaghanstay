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
        const errText = await res.text();
        throw new Error(`Token Error: ${errText}`);
    }

    const data = await res.json();
    return data.access_token;
}

function formatCanonicalUrl(urlStr) {
    if (!urlStr) return urlStr;
    return urlStr.replace('https://kphstay.com', 'https://www.kphstay.com');
}

async function getUrlIndexingMetadata(url, token) {
    const canonicalUrl = formatCanonicalUrl(url);
    const apiUrl = `https://indexing.googleapis.com/v3/urlNotifications/metadata?url=${encodeURIComponent(canonicalUrl)}`;
    const res = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
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
    console.log("🔍 Verifying Submission Status with Google Indexing & Search Console APIs...\n");
    const keyPath = path.resolve(__dirname, '../formal-folder-476209-h0-6ddebc22f141.json');

    try {
        const token = await getAccessToken(keyPath);
        console.log("🔑 OAuth2 Token acquired.\n");

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

        const listingUrls = await fetchListingsFromFirestore();
        const allUrls = [...baseUrls, ...listingUrls];

        console.log(`Checking Metadata verification for all ${allUrls.length} submitted URLs...\n`);

        let verifiedCount = 0;
        let pendingCount = 0;

        for (const url of allUrls) {
            await sleep(150); // Delay to avoid per-minute read rate limits
            const res = await getUrlIndexingMetadata(url, token);
            if (res.ok && res.data.latestUpdate) {
                verifiedCount++;
                const update = res.data.latestUpdate;
                console.log(`✅ VERIFIED: ${url} | Google Received: ${update.notifyTime} (${update.type})`);
            } else if (res.ok) {
                verifiedCount++;
                console.log(`✅ RECEIVED BY GOOGLE: ${url} (Metadata active)`);
            } else {
                pendingCount++;
                console.log(`⚠️ Metadata response for ${url} (${res.status}):`, res.data.error ? res.data.error.message : JSON.stringify(res.data));
            }
        }

        console.log(`\n==========================================`);
        console.log(`📊 SUMMARY OF VERIFICATION VIA GOOGLE API:`);
        console.log(`Total URLs Checked: ${allUrls.length}`);
        console.log(`Verified Submitted with Google: ${verifiedCount}`);
        console.log(`Pending / Unregistered: ${pendingCount}`);
        console.log(`==========================================\n`);

    } catch (err) {
        console.error("❌ Error running verification:", err.message);
    }
}

main();
