const fs = require('fs');
const path = require('path');

async function checkBacklink(item) {
    console.log(`\n🔍 Checking backlink: [${item.id}] ${item.referringUrl}`);
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(item.referringUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 KaghanStayBacklinkBot/1.0'
            },
            signal: controller.signal
        });
        clearTimeout(timeout);

        item.httpStatus = res.status;
        item.lastChecked = new Date().toISOString();

        if (!res.ok) {
            item.isLive = false;
            item.isDofollow = false;
            console.log(`   ❌ Failed to fetch page. HTTP Status: ${res.status}`);
            return item;
        }

        const html = await res.text();
        const targetClean = item.targetUrl.replace(/\/$/, '');
        
        // Find all anchor tags linking to target domain / target URL
        const linkRegex = new RegExp(`<a\\s+[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\\/a>`, 'gis');
        let match;
        const matchedLinks = [];
        let isDofollow = false;

        while ((match = linkRegex.exec(html)) !== null) {
            const href = match[1];
            const anchorText = match[2].replace(/<[^>]*>/g, '').trim();
            const fullTag = match[0];

            if (href.includes('kphstay.com') || href.includes(targetClean)) {
                // Check rel attribute
                const relMatch = fullTag.match(/rel=["']([^"']*)["']/i);
                const relVal = relMatch ? relMatch[1].toLowerCase() : '';
                
                const hasNofollow = relVal.includes('nofollow');
                const hasSponsored = relVal.includes('sponsored');
                const linkDofollow = !hasNofollow && !hasSponsored;
                if (linkDofollow) isDofollow = true;

                matchedLinks.push({
                    href,
                    anchorText,
                    isDofollow: linkDofollow
                });
            }
        }

        item.isLive = matchedLinks.length > 0;
        item.isDofollow = isDofollow;
        item.matchedLinksCount = matchedLinks.length;
        item.matchedLinks = matchedLinks;
        item.actualAnchor = matchedLinks.map(l => `"${l.anchorText}"`).join(', ');

        if (matchedLinks.length > 0) {
            const badge = isDofollow ? '🟢 DOFOLLOW' : '🟡 NOFOLLOW / UGC';
            console.log(`   ✅ ${matchedLinks.length} Backlinks Found! [${badge}]`);
            matchedLinks.slice(0, 4).forEach((l, i) => {
                console.log(`      ↳ [${i+1}] "${l.anchorText}" -> ${l.href} (${l.isDofollow ? 'DOFOLLOW' : 'NOFOLLOW'})`);
            });
        } else {
            console.log(`   ⚠️ Page fetched successfully (200 OK), but target URL ${item.targetUrl} was not found in HTML.`);
        }

        return item;
    } catch (e) {
        item.httpStatus = 'ERROR';
        item.isLive = false;
        item.isDofollow = false;
        item.error = e.message;
        item.lastChecked = new Date().toISOString();
        console.log(`   ❌ Fetch error: ${e.message}`);
        return item;
    }
}

async function main() {
    console.log("================================================================================");
    console.log("🔗 KPH STAY AUTOMATED BACKLINK HEALTH & DOFOLLOW VERIFICATION ENGINE");
    console.log("================================================================================\n");

    const registryPath = path.resolve(__dirname, '../data/backlinks-registry.json');
    if (!fs.existsSync(registryPath)) {
        console.error(`Registry file not found at: ${registryPath}`);
        return;
    }

    const data = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const items = data.backlinks || [];

    console.log(`Found ${items.length} backlink record(s) in registry.\n`);

    const updated = [];
    for (const item of items) {
        if (item.status === 'live' || item.status === 'testing') {
            const res = await checkBacklink(item);
            updated.push(res);
        } else {
            console.log(`⏳ Skipping [${item.id}] - Status: ${item.status} (Pending Submission)`);
            updated.push(item);
        }
    }

    data.lastUpdated = new Date().toISOString();
    data.backlinks = updated;

    fs.writeFileSync(registryPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`\n💾 Saved updated verification results to: ${registryPath}`);
    console.log("================================================================================");
}

main().catch(console.error);
