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

function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

function escapeXml(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

exports.handler = async (event, context) => {
    // Determine the host URL from headers or fallback to canonical site domain
    const host = event.headers.host || 'kphstay.com';
    const protocol = event.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${host.replace(/^www\./, '')}`;

    try {
        // Fetch rooms and blogs in parallel from Firestore REST
        const [rooms, blogs] = await Promise.all([
            fetchCollection('rooms'),
            fetchCollection('blogs')
        ]);

        const todayStr = new Date().toISOString().split('T')[0];
        const emittedUrls = new Set();

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

        // 1. Static & High-Intent Regional Pages
        const staticRoutes = [
            { path: '/', priority: '1.0', changefreq: 'daily' },
            { path: '/rooms', priority: '0.9', changefreq: 'daily' },
            { path: '/furnished-apartments-islamabad', priority: '0.9', changefreq: 'weekly' },
            { path: '/furnished-apartments-murree', priority: '0.9', changefreq: 'weekly' },
            { path: '/furnished-apartments-nathia-gali', priority: '0.9', changefreq: 'weekly' },
            { path: '/serviced-apartments-islamabad', priority: '0.8', changefreq: 'weekly' },
            { path: '/luxury-apartments-murree', priority: '0.8', changefreq: 'weekly' },
            { path: '/vacation-rentals-nathia-gali', priority: '0.8', changefreq: 'weekly' },
            { path: '/contact', priority: '0.8', changefreq: 'weekly' },
            { path: '/blog', priority: '0.8', changefreq: 'weekly' },
            { path: '/privacy', priority: '0.3', changefreq: 'monthly' },
            { path: '/terms', priority: '0.3', changefreq: 'monthly' },
            { path: '/refund', priority: '0.3', changefreq: 'monthly' },
            { path: '/cookies', priority: '0.3', changefreq: 'monthly' }
        ];

        staticRoutes.forEach(r => {
            const fullUrl = `${baseUrl}${r.path}`;
            if (!emittedUrls.has(fullUrl)) {
                emittedUrls.add(fullUrl);
                xml += `
    <url>
        <loc>${fullUrl}</loc>
        <lastmod>${todayStr}</lastmod>
        <changefreq>${r.changefreq}</changefreq>
        <priority>${r.priority}</priority>
    </url>`;
            }
        });

        // 2. Dynamic Room detail routes with Image SEO & strict URL deduplication
        (rooms || []).forEach(room => {
            if (room.status === 'available' || !room.status) {
                const roomModDate = room.updatedAt ? room.updatedAt.split('T')[0] : todayStr;
                let roomSlug = (room.slug && room.slug.trim()) ? room.slug.trim().toLowerCase() : slugify(room.name || 'room');
                let roomLoc = `${baseUrl}/room/${encodeURIComponent(roomSlug)}`;

                // Ensure strict slug uniqueness if duplicates exist across sister units
                if (emittedUrls.has(roomLoc)) {
                    const suffix = room.id ? String(room.id).replace(/[^a-zA-Z0-9]/g, '').slice(-4).toLowerCase() : Math.random().toString(36).slice(2, 6);
                    roomSlug = `${roomSlug}-${suffix}`;
                    roomLoc = `${baseUrl}/room/${encodeURIComponent(roomSlug)}`;
                }

                if (!emittedUrls.has(roomLoc)) {
                    emittedUrls.add(roomLoc);

                    const roomImages = (room.images && Array.isArray(room.images) && room.images.length) ? room.images : (room.image ? [room.image] : []);
                    let imageXml = '';
                    roomImages.slice(0, 5).forEach(imgUrl => {
                        if (imgUrl && typeof imgUrl === 'string') {
                            imageXml += `
        <image:image>
            <image:loc>${escapeXml(imgUrl)}</image:loc>
            <image:title>${escapeXml(room.name || 'Luxury Suite')}</image:title>
            <image:caption>${escapeXml(room.location ? `${room.name} in ${room.location}` : room.name)}</image:caption>
        </image:image>`;
                        }
                    });

                    xml += `
    <url>
        <loc>${roomLoc}</loc>
        <lastmod>${roomModDate}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>${imageXml}
    </url>`;
                }
            }
        });

        // 3. Dynamic Journal/Blog clean routes with Image SEO & strict URL deduplication
        const stayBlogs = (blogs || []).filter(b => !b.portal || b.portal === 'stay');
        stayBlogs.forEach(blog => {
            const blogDate = blog.createdAt ? blog.createdAt.split('T')[0] : todayStr;
            let blogSlug = blog.slug || slugify(blog.title) || blog.id;
            let blogUrl = `${baseUrl}/blog/${encodeURIComponent(blogSlug)}`;

            if (emittedUrls.has(blogUrl)) {
                blogSlug = `${blogSlug}-${String(blog.id).slice(-4)}`;
                blogUrl = `${baseUrl}/blog/${encodeURIComponent(blogSlug)}`;
            }

            if (!emittedUrls.has(blogUrl)) {
                emittedUrls.add(blogUrl);

                let blogImageXml = '';
                if (blog.imageUrl) {
                    blogImageXml = `
        <image:image>
            <image:loc>${escapeXml(blog.imageUrl)}</image:loc>
            <image:title>${escapeXml(blog.title || 'Resort Journal')}</image:title>
            <image:caption>${escapeXml(blog.excerpt || blog.title)}</image:caption>
        </image:image>`;
                }

                xml += `
    <url>
        <loc>${blogUrl}</loc>
        <lastmod>${blogDate}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>${blogImageXml}
    </url>`;
            }
        });

        xml += `
</urlset>`;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=86400, s-maxage=86400'
            },
            body: xml
        };

    } catch (err) {
        console.error("Error generating XML Sitemap:", err);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/plain' },
            body: "Internal Server Error"
        };
    }
};
