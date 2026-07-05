const FIRESTORE_BASE_URL = 'https://firestore.googleapis.com/v1/projects/kaghan-properties/databases/(default)/documents';

// Convert Firestore REST document structure to standard JS objects
function parseFirestoreValue(value) {
    if (!value) return null;
    if ('stringValue' in value) return value.stringValue;
    if ('integerValue' in value) return parseInt(value.integerValue, 10);
    if ('doubleValue' in value) return parseFloat(value.doubleValue);
    if ('booleanValue' in value) return value.booleanValue;
    if ('arrayValue' in value) {
        return (value.arrayValue.values || []).map(v => parseFirestoreValue(v));
    }
    if ('mapValue' in value) {
        const obj = {};
        const fields = value.mapValue.fields || {};
        for (const k in fields) {
            obj[k] = parseFirestoreValue(fields[k]);
        }
        return obj;
    }
    return null;
}

function parseFirestoreDoc(doc) {
    const fields = doc.fields || {};
    const obj = {};
    for (const key in fields) {
        obj[key] = parseFirestoreValue(fields[key]);
    }
    const parts = doc.name.split('/');
    obj.id = parts[parts.length - 1];
    return obj;
}

// Fetch list of documents from a Firestore collection
async function fetchCollection(collectionName) {
    try {
        const res = await fetch(`${FIRESTORE_BASE_URL}/${collectionName}`);
        if (!res.ok) {
            throw new Error(`Firestore REST returned status: ${res.status}`);
        }
        const data = await res.json();
        return (data.documents || []).map(doc => parseFirestoreDoc(doc));
    } catch (err) {
        console.error(`Error fetching collection ${collectionName} from Firestore REST:`, err);
        return [];
    }
}

exports.handler = async (event, context) => {
    // Determine the host URL from headers or fallback
    const host = event.headers.host || 'kphstay.com';
    const protocol = event.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${host}`;

    try {
        // Fetch rooms and blogs in parallel
        const [rooms, blogs] = await Promise.all([
            fetchCollection('rooms'),
            fetchCollection('blogs')
        ]);

        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Static site routes
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${baseUrl}/</loc>
        <lastmod>${todayStr}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${baseUrl}/rooms</loc>
        <lastmod>${todayStr}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/blog</loc>
        <lastmod>${todayStr}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>${baseUrl}/booking</loc>
        <lastmod>${todayStr}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.5</priority>
    </url>
    <url>
        <loc>${baseUrl}/login</loc>
        <lastmod>${todayStr}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.3</priority>
    </url>`;

        // 2. Dynamic Room routes (link directly to booking detail page or rooms list)
        rooms.forEach(room => {
            if (room.status === 'available') {
                xml += `
    <url>
        <loc>${baseUrl}/booking?room=${room.id}</loc>
        <lastmod>${todayStr}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
            }
        });

        // 3. Dynamic Journal/Blog routes
        const stayBlogs = blogs.filter(b => b.portal === 'stay');
        stayBlogs.forEach(blog => {
            const blogDate = blog.createdAt ? blog.createdAt.split('T')[0] : todayStr;
            xml += `
    <url>
        <loc>${baseUrl}/blog#${blog.slug}</loc>
        <lastmod>${blogDate}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>
    </url>`;
        });

        xml += `
</urlset>`;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, max-age=86400' // cache for 1 day
            },
            body: xml
        };

    } catch (err) {
        console.error("Error generating XML Sitemap:", err);
        return {
            statusCode: 500,
            body: "Internal Server Error"
        };
    }
};
