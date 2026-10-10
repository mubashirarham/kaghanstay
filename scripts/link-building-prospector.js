const fs = require('fs');
const path = require('path');

// High-DA Target Directory and Travel Prospect Database for Kaghan Stay
const targetDirectories = [
    {
        id: "tripadvisor",
        name: "TripAdvisor Pakistan",
        category: "Hospitality Directory",
        domain: "tripadvisor.com",
        authority: "DA 93",
        submissionUrl: "https://www.tripadvisor.com/Owners",
        anchorText: "KPH Stay - Luxury Furnished Apartments & Chalets",
        targetUrl: "https://kphstay.com/",
        status: "Action Required: Claim Listing",
        impact: "High (Domain Authority 93 - Strong Local Entity Signal)"
    },
    {
        id: "pakwheels-travel",
        name: "PakWheels Travel & Living Forum",
        category: "Community & Travel Forum",
        domain: "pakwheels.com/forums",
        authority: "DA 68",
        submissionUrl: "https://www.pakwheels.com/forums/c/road-trips-travel-living",
        anchorText: "Murree & Nathia Gali luxury chalets with generator & heating",
        targetUrl: "https://kphstay.com/luxury-apartments-murree",
        status: "Action Required: Post Expert Travelogue",
        impact: "High (Top Automotive & Domestic Travel Hub in Pakistan)"
    },
    {
        id: "pinterest-business",
        name: "Pinterest Travel Boards",
        category: "Visual Search & Authority Engine",
        domain: "pinterest.com",
        authority: "DA 94",
        submissionUrl: "https://www.pinterest.com/business/create/",
        anchorText: "Furnished Apartments in Islamabad & Murree",
        targetUrl: "https://kphstay.com/rooms",
        status: "Action Required: Create Pin Boards with Room Photos",
        impact: "Very High (Drives high-intent image referral traffic)"
    },
    {
        id: "crunchbase",
        name: "Crunchbase Company Profile",
        category: "Corporate & Hospitality Entity",
        domain: "crunchbase.com",
        authority: "DA 91",
        submissionUrl: "https://www.crunchbase.com/add-new",
        anchorText: "KPH Stay",
        targetUrl: "https://kphstay.com/",
        status: "Action Required: Create Verified Company Entity",
        impact: "High (Knowledge Graph & Entity Authority)"
    },
    {
        id: "yellowpages-pk",
        name: "YellowPages Pakistan",
        category: "Local Citation",
        domain: "yellowpages.com.pk",
        authority: "DA 55",
        submissionUrl: "https://www.yellowpages.com.pk/add-business",
        anchorText: "Kaghan Properties Hospitality",
        targetUrl: "https://kphstay.com/contact",
        status: "Action Required: Submit NAP Citation",
        impact: "Medium (Strengthens NAP phone & address verification)"
    },
    {
        id: "medium-travel-pub",
        name: "Medium Travel & Tourism Publications",
        category: "Editorial Syndication",
        domain: "medium.com",
        authority: "DA 95",
        submissionUrl: "https://medium.com/new-story",
        anchorText: "serviced apartments in Islamabad",
        targetUrl: "https://kphstay.com/serviced-apartments-islamabad",
        status: "Action Required: Publish Canonical Guest Article",
        impact: "Very High (Passes topical relevance and direct readership)"
    }
];

// Curated List of Top Pakistani Travel & Lifestyle Publications for Guest Pitching
const guestPostTargets = [
    {
        publication: "Tripoto Travel Community",
        domain: "tripoto.com",
        da: "DA 78",
        niche: "Mountain Travel, Trekking & Staycations",
        targetAudience: "Adventure travelers, families, and international explorers",
        recommendedPitch: "Trekking the Galiyat Highlands: Complete Guide to Mukshpuri & Luxury Lodges",
        suggestedAnchor: "luxury chalets in Nathia Gali",
        suggestedTargetPage: "https://kphstay.com/vacation-rentals-nathia-gali",
        contactMethod: "Community Submission Platform (Tripoto Creator Portal)"
    },
    {
        publication: "ProPakistani Lifestyle & Travel",
        domain: "propakistani.pk",
        da: "DA 75",
        niche: "Tech, Business & Modern Lifestyle in Pakistan",
        targetAudience: "Young professionals, tech founders, and overseas Pakistanis",
        recommendedPitch: "The Evolution of Serviced Apartments in Islamabad: Why Modern Expats Choose Private Living",
        suggestedAnchor: "Cube Apartments Bahria Enclave",
        suggestedTargetPage: "https://kphstay.com/serviced-apartments-islamabad",
        contactMethod: "Editorial Desk / Contributor Submission"
    },
    {
        publication: "Daily Times Travel Blogs",
        domain: "dailytimes.com.pk",
        da: "DA 73",
        niche: "Culture, Tourism & Travelogue",
        targetAudience: "Domestic tourists and overseas diaspora",
        recommendedPitch: "Winter in Murree Hills: A Complete Guide to Alpine Snowfall & Private Chalets",
        suggestedAnchor: "furnished apartment for rent in murree",
        suggestedTargetPage: "https://kphstay.com/luxury-apartments-murree",
        contactMethod: "Op-Ed / Blog Submission Desk"
    },
    {
        publication: "Expat.com Pakistan Relocation Forum",
        domain: "expat.com/en/destination/asia/pakistan/islamabad/",
        da: "DA 82",
        niche: "Diplomatic & Expat Relocation Housing",
        targetAudience: "Diplomats, NGO executives, international consultants",
        recommendedPitch: "Islamabad Housing Guide for Extended Stay Consultants & Expatriates",
        suggestedAnchor: "serviced apartments in Islamabad",
        suggestedTargetPage: "https://kphstay.com/serviced-apartments-islamabad",
        contactMethod: "Housing Resource Guide Submission"
    }
];

function main() {
    console.log("================================================================================");
    console.log("🚀 KAGHAN STAY BACKLINK PROSPECTING & HIGH-DA OUTREACH ENGINE");
    console.log("================================================================================\n");

    const dataDir = path.resolve(__dirname, '../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const prospectData = {
        generatedAt: new Date().toISOString(),
        siteTarget: "https://kphstay.com",
        totalDirectories: targetDirectories.length,
        totalGuestPostTargets: guestPostTargets.length,
        directories: targetDirectories,
        guestPostTargets: guestPostTargets
    };

    const outPath = path.join(dataDir, 'backlink-prospects.json');
    fs.writeFileSync(outPath, JSON.stringify(prospectData, null, 2), 'utf8');
    console.log(`💾 Saved complete backlink prospect dataset to: ${outPath}\n`);

    console.log("📋 HIGH-DA DIRECTORIES & PROFILES TO CLAIM:");
    targetDirectories.forEach((d, idx) => {
        console.log(`   ${idx + 1}. [${d.authority}] ${d.name} (${d.domain})`);
        console.log(`      ↳ Anchor: "${d.anchorText}" ➔ Target: ${d.targetUrl}`);
        console.log(`      ↳ Action URL: ${d.submissionUrl}`);
    });

    console.log("\n📝 TOP EDITORIAL GUEST POST TARGETS:");
    guestPostTargets.forEach((g, idx) => {
        console.log(`   ${idx + 1}. [${g.da}] ${g.publication} (${g.domain})`);
        console.log(`      ↳ Pitch: "${g.recommendedPitch}"`);
        console.log(`      ↳ Target Anchor: "${g.suggestedAnchor}" ➔ ${g.suggestedTargetPage}`);
    });
}

main();
