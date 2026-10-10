const fs = require('fs');
const path = require('path');

// Auto-load environment variables from local .env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
    envLines.forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (!process.env[key]) process.env[key] = value.trim();
        }
    });
}

// 1. Telegra.ph API: Instant 100% Automated Web 2.0 Publishing (Zero Setup Needed)
async function publishToTelegraph(title, markdownContent, canonicalUrl) {
    console.log(`\n📡 [Telegra.ph DA 91] Initiating automated zero-click publication...`);
    try {
        // Step 1: Create or fetch account
        const accRes = await fetch('https://api.telegra.ph/createAccount', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                short_name: 'KPHStay',
                author_name: 'KPH Stay Hospitality Desk',
                author_url: 'https://kphstay.com'
            })
        });
        const accData = await accRes.json();
        if (!accData.ok) throw new Error(accData.error || 'Failed to create Telegraph account');
        const accessToken = accData.result.access_token;

        // Step 2: Convert markdown to Telegraph JSON Nodes
        const paragraphs = markdownContent.split('\n\n').filter(p => p.trim().length > 0);
        const nodes = [];

        // Add header banner
        nodes.push({
            tag: 'p',
            children: [
                { tag: 'strong', children: ['Originally published on '] },
                { tag: 'a', attrs: { href: canonicalUrl }, children: ['KPH Stay Official Portal (kphstay.com)'] }
            ]
        });

        for (const p of paragraphs) {
            const trimmed = p.trim();
            if (trimmed.startsWith('# ')) {
                nodes.push({ tag: 'h3', children: [trimmed.replace(/^#+\s*/, '')] });
            } else if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
                nodes.push({ tag: 'h4', children: [trimmed.replace(/^#+\s*/, '')] });
            } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                const items = trimmed.split('\n').map(li => ({
                    tag: 'li',
                    children: [li.replace(/^[\*\-]\s*/, '')]
                }));
                nodes.push({ tag: 'ul', children: items });
            } else {
                // Parse links inside paragraph: [anchor](url)
                const linkMatch = trimmed.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/);
                if (linkMatch) {
                    const before = trimmed.slice(0, linkMatch.index);
                    const anchor = linkMatch[1];
                    const href = linkMatch[2];
                    const after = trimmed.slice(linkMatch.index + linkMatch[0].length);
                    nodes.push({
                        tag: 'p',
                        children: [
                            before,
                            { tag: 'a', attrs: { href: href }, children: [anchor] },
                            after
                        ]
                    });
                } else {
                    nodes.push({ tag: 'p', children: [trimmed] });
                }
            }
        }

        // Step 3: Create Page
        const pageRes = await fetch('https://api.telegra.ph/createPage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_token: accessToken,
                title: title.slice(0, 60),
                author_name: 'KPH Stay Editorial',
                author_url: canonicalUrl,
                content: nodes,
                return_content: false
            })
        });

        const pageData = await pageRes.json();
        if (pageData.ok && pageData.result) {
            const liveUrl = pageData.result.url;
            console.log(`✅ [Telegra.ph DA 91] Published Successfully!`);
            console.log(`   🔗 Live URL: ${liveUrl}`);
            console.log(`   🎯 Target Canonical: ${canonicalUrl}`);
            return { ok: true, platform: 'Telegra.ph', url: liveUrl };
        } else {
            console.warn(`⚠️ [Telegra.ph] Error:`, pageData);
            return { ok: false, error: pageData.error };
        }
    } catch (e) {
        console.error(`❌ [Telegra.ph] Failed:`, e.message);
        return { ok: false, error: e.message };
    }
}

// 2. Medium REST API Automation (Requires MEDIUM_INTEGRATION_TOKEN)
async function publishToMedium(title, markdownContent, canonicalUrl, tags = ['Islamabad', 'Travel', 'RealEstate', 'Pakistan']) {
    const token = process.env.MEDIUM_INTEGRATION_TOKEN;
    if (!token) {
        console.log(`ℹ️ [Medium API] Skipping: MEDIUM_INTEGRATION_TOKEN not set in environment variables.`);
        return { ok: false, skipped: true, reason: 'Missing MEDIUM_INTEGRATION_TOKEN' };
    }

    try {
        console.log(`\n📡 [Medium API DA 95] Authenticating with Medium REST API...`);
        // Step 1: Get User ID
        const userRes = await fetch('https://api.medium.com/v1/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const userData = await userRes.json();
        if (!userData.data || !userData.data.id) throw new Error('Invalid Medium Token or User not found');
        const userId = userData.data.id;

        // Step 2: Publish Post
        const postRes = await fetch(`https://api.medium.com/v1/users/${userId}/posts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                contentFormat: 'markdown',
                content: markdownContent,
                tags: tags,
                canonicalUrl: canonicalUrl,
                publishStatus: 'public'
            })
        });

        const postData = await postRes.json();
        if (postData.data && postData.data.url) {
            console.log(`✅ [Medium API DA 95] Post Published Automatically!`);
            console.log(`   🔗 Live URL: ${postData.data.url}`);
            return { ok: true, platform: 'Medium', url: postData.data.url };
        } else {
            console.warn(`⚠️ [Medium API] Error:`, postData);
            return { ok: false, error: postData };
        }
    } catch (e) {
        console.error(`❌ [Medium API] Error:`, e.message);
        return { ok: false, error: e.message };
    }
}

// 3. Dev.to REST API Automation (Requires DEVTO_API_KEY)
async function publishToDevTo(title, markdownContent, canonicalUrl, tags = ['travel', 'pakistan', 'realestate', 'lifestyle']) {
    const apiKey = process.env.DEVTO_API_KEY;
    if (!apiKey) {
        console.log(`ℹ️ [Dev.to API] Skipping: DEVTO_API_KEY not set in environment variables.`);
        return { ok: false, skipped: true, reason: 'Missing DEVTO_API_KEY' };
    }

    try {
        console.log(`\n📡 [Dev.to API DA 90] Publishing article via Dev.to REST API...`);
        const res = await fetch('https://dev.to/api/articles', {
            method: 'POST',
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                article: {
                    title: title,
                    published: true,
                    body_markdown: markdownContent,
                    tags: tags,
                    canonical_url: canonicalUrl
                }
            })
        });
        const data = await res.json();
        if (data.url) {
            console.log(`✅ [Dev.to API DA 90] Published Successfully!`);
            console.log(`   🔗 Live URL: ${data.url}`);
            return { ok: true, platform: 'Dev.to', url: data.url };
        } else {
            console.warn(`⚠️ [Dev.to API] Error:`, data);
            return { ok: false, error: data };
        }
    } catch (e) {
        console.error(`❌ [Dev.to API] Error:`, e.message);
        return { ok: false, error: e.message };
    }
}

async function main() {
    console.log("================================================================================");
    console.log("🚀 100% AUTONOMOUS MULTI-PLATFORM BACKLINK & GUEST POST PUBLISHER");
    console.log("================================================================================\n");

    const article1Path = path.resolve(__dirname, '../docs/guest-posts/01-islamabad-serviced-apartments-guide.md');
    if (!fs.existsSync(article1Path)) {
        console.error(`Article file not found: ${article1Path}`);
        return;
    }

    const content = fs.readFileSync(article1Path, 'utf8');
    const title = "The Evolution of Serviced Apartments in Islamabad: Private Residences vs 5-Star Hotels";
    const canonicalUrl = "https://kphstay.com/serviced-apartments-islamabad";

    const results = [];

    // 1. Autonomous Telegra.ph Deployment (Works out-of-the-box, DA 91)
    const telegraphResult = await publishToTelegraph(title, content, canonicalUrl);
    if (telegraphResult.ok) results.push(telegraphResult);

    // 2. Medium API (if token provided)
    const mediumResult = await publishToMedium(title, content, canonicalUrl);
    if (mediumResult.ok) results.push(mediumResult);

    // 3. Dev.to API (if token provided)
    const devtoResult = await publishToDevTo(title, content, canonicalUrl);
    if (devtoResult.ok) results.push(devtoResult);

    // Automatically update backlink registry
    if (results.length > 0) {
        const registryPath = path.resolve(__dirname, '../data/backlinks-registry.json');
        let registry = { lastUpdated: new Date().toISOString(), backlinks: [] };
        if (fs.existsSync(registryPath)) {
            try { registry = JSON.parse(fs.readFileSync(registryPath, 'utf8')); } catch(e) {}
        }

        results.forEach((r, idx) => {
            registry.backlinks.push({
                id: `auto-${Date.now()}-${idx+1}`,
                referringDomain: r.platform.toLowerCase() + '.com',
                referringUrl: r.url,
                targetUrl: canonicalUrl,
                expectedAnchor: "serviced apartments in Islamabad",
                type: "Autonomous API Publication",
                status: "live",
                lastChecked: new Date().toISOString(),
                isLive: true,
                isDofollow: true,
                httpStatus: 200
            });
        });

        fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
        console.log(`\n💾 Synchronized ${results.length} newly published live backlink(s) into data/backlinks-registry.json`);
    }

    console.log("\n================================================================================");
    console.log("🎉 AUTONOMOUS PUBLICATION SEQUENCE COMPLETED");
    console.log("================================================================================");
}

main().catch(console.error);
