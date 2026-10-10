async function test() {
    const res = await fetch('https://dev.to/mubashir_arham_edbbd6e862/tulipano-by-nook-house-a-review-of-heated-mountain-luxury-in-the-murree-hills-39ic');
    const html = await res.text();
    const regex = /<a\s+[^>]*href="([^"]*kphstay[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    console.log("Matched Links in Article:");
    while ((match = regex.exec(html)) !== null) {
        console.log(`- Href: ${match[1]}`);
        console.log(`  Anchor: "${match[2].trim()}"`);
    }
}
test();
