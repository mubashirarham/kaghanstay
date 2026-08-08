const fs = require('fs');
const path = require('path');

// Google Firestore REST Endpoint for Kaghan Properties
const FIRESTORE_BASE_URL = 'https://firestore.googleapis.com/v1/projects/kaghan-properties/databases/(default)/documents';

// Helper to escape HTML characters for XSS prevention
function escapeHTML(str) {
    if (!str) return '';
    if (typeof str !== 'string') return str.toString();
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Helper to format currency in PKR statically
function formatPKR(amount) {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

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

// Pre-render the Home Page
function prerenderIndex(html, rooms, blogs) {
    let modified = html;
    
    // 1. Pre-render Featured Rooms
    const featuredRoomsContainer = 'id="featured-rooms"';
    const featuredList = rooms.filter(r => r.status === 'available');
    const roomsHtml = featuredList.map(room => {
        const pkrPrice = formatPKR(room.price);
        const amenitiesHtml = room.amenities.slice(0, 3).map(a => `
            <span class="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full border border-slate-100">
                ${escapeHTML(a)}
            </span>
        `).join('');
        const moreAmenities = room.amenities.length > 3 ? `<span class="bg-slate-50 text-[#D4AF37] text-[10px] uppercase font-bold px-2 py-1 rounded-full border border-slate-100">+${room.amenities.length - 3} more</span>` : '';
        
        return `
        <div class="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-lg hover-lift group">
            <div class="relative h-64 overflow-hidden">
                <img src="${escapeHTML(room.image)}" alt="${escapeHTML(room.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                <div class="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#D4AF37] border border-white/10 uppercase tracking-widest">
                    ${escapeHTML(room.type)}
                </div>
            </div>
            <div class="p-8">
                <div class="flex justify-between items-start mb-1">
                    <h3 class="text-xl font-bold outfit text-slate-900">${escapeHTML(room.name)}</h3>
                    <div class="flex items-center gap-1 text-[#D4AF37] font-semibold text-sm">
                        <i class="fa-solid fa-star"></i>
                        <span>${room.rating}</span>
                    </div>
                </div>
                <div class="text-[10px] text-slate-400 font-bold mb-3 flex items-center gap-1">
                    <i class="fa-solid fa-location-dot text-[#D4AF37] text-[9px]"></i>
                    <span>${escapeHTML(room.location || 'Islamabad')}</span>
                </div>
                <p class="text-slate-500 text-xs line-clamp-3 mb-6 leading-relaxed font-light">
                    ${escapeHTML(room.description)}
                </p>
                <div class="flex flex-wrap gap-2 mb-6">
                    ${amenitiesHtml}
                    ${moreAmenities}
                </div>
                <div class="border-t border-slate-100 pt-6 flex justify-between items-center">
                    <div>
                        <span class="text-slate-400 text-[10px] uppercase tracking-wider block font-semibold">${room.isApartment ? 'Rates starting from' : 'Rate Per Night'}</span>
                        <span class="text-xl font-extrabold text-[#D4AF37] outfit">${pkrPrice}</span>
                    </div>
                    <a href="booking.html?room=${escapeHTML(room.id)}" class="bg-[#0F172A] text-white text-xs font-bold px-6 py-3.5 rounded-xl hover:bg-[#D4AF37] transition-all shadow-md">
                        Reserve
                    </a>
                </div>
            </div>
        </div>
        `;
    }).join('\n');
    
    // Inject rendered rooms inside container
    const roomContainerIndex = modified.indexOf(featuredRoomsContainer);
    if (roomContainerIndex !== -1) {
        const closeTagIndex = modified.indexOf('>', roomContainerIndex);
        if (closeTagIndex !== -1) {
            modified = modified.slice(0, closeTagIndex + 1) + roomsHtml + modified.slice(closeTagIndex + 1);
        }
    }

    // 2. Pre-render Blogs Journal feed (Stay Portal)
    const blogContainerId = 'id="resort-blog-feed-container"';
    const stayBlogs = blogs.filter(b => b.portal === 'stay');
    const latestBlogs = stayBlogs.slice(0, 2);
    
    const blogsHtml = latestBlogs.map(b => {
        const img = b.imageUrl || 'assets/images/logo.png';
        return `
        <div class="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-md hover-lift hover:border-[#D4AF37] transition-all duration-300 flex flex-col md:flex-row gap-6 items-center">
            <div class="w-full md:w-1/3 aspect-video md:aspect-square rounded-2xl overflow-hidden shrink-0 border border-slate-100">
                <img src="${escapeHTML(img)}" alt="${escapeHTML(b.title)}" class="w-full h-full object-cover">
            </div>
            <div class="flex-grow">
                <span class="text-[#D4AF37] font-bold text-[9px] uppercase tracking-widest block mb-2">${escapeHTML(b.category)}</span>
                <h4 class="text-lg font-bold outfit text-slate-900 mb-3 leading-snug">${escapeHTML(b.title)}</h4>
                <p class="text-slate-500 text-xs leading-relaxed mb-4 line-clamp-2">${escapeHTML(b.excerpt)}</p>
                <a href="blog.html#${escapeHTML(b.slug)}" class="text-slate-950 hover:text-[#D4AF37] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 self-start">Read Article <i class="fa-solid fa-arrow-right text-[10px]"></i></a>
            </div>
        </div>
        `;
    }).join('\n');

    const blogContainerIndex = modified.indexOf(blogContainerId);
    if (blogContainerIndex !== -1) {
        const closeTagIndex = modified.indexOf('>', blogContainerIndex);
        if (closeTagIndex !== -1) {
            modified = modified.slice(0, closeTagIndex + 1) + blogsHtml + modified.slice(closeTagIndex + 1);
        }
    }

    return modified;
}

// Pre-render the Rooms Page Catalog
function prerenderRooms(html, rooms) {
    let modified = html;
    const gridId = 'id="rooms-grid"';
    
    // Sort pinned listings first
    rooms.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

    const cardsHtml = rooms.map(room => {
        const pkrPrice = formatPKR(room.price);
        const amenitiesHtml = room.amenities.slice(0, 3).map(a => `
            <span class="bg-slate-50 text-slate-500 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-slate-100">
                ${escapeHTML(a)}
            </span>
        `).join('');
        const moreAmenities = room.amenities.length > 3 ? `<span class="bg-slate-50 text-[#D4AF37] text-[9px] uppercase font-bold px-2 py-0.5 rounded border border-slate-100">+${room.amenities.length - 3}</span>` : '';
        
        return `
        <div class="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-md hover-lift group">
            <div class="relative h-56 overflow-hidden">
                <img src="${escapeHTML(room.image)}" alt="${escapeHTML(room.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                <div class="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#D4AF37] border border-white/10 uppercase tracking-widest">
                    ${escapeHTML(room.type)}
                </div>
            </div>
            <div class="p-6">
                <div class="flex justify-between items-start mb-1">
                    <h3 class="text-lg font-bold outfit text-[#0F172A] leading-tight">${escapeHTML(room.name)}</h3>
                    <div class="flex items-center gap-1 text-[#D4AF37] font-bold text-xs">
                        <i class="fa-solid fa-star"></i>
                        <span>${room.rating}</span>
                    </div>
                </div>
                <div class="text-[10px] text-slate-400 font-bold mb-3 flex items-center gap-1">
                    <i class="fa-solid fa-location-dot text-[#D4AF37] text-[9px]"></i>
                    <span>${escapeHTML(room.location || 'Islamabad')}</span>
                </div>
                <p class="text-slate-500 text-xs line-clamp-2 font-light leading-relaxed mb-4">
                    ${escapeHTML(room.description)}
                </p>
                <div class="flex flex-wrap gap-1.5 mb-6">
                    ${amenitiesHtml}
                    ${moreAmenities}
                </div>
                <div class="border-t border-slate-100 pt-5 flex justify-between items-center">
                    <div>
                        <span class="text-slate-400 text-[9px] uppercase tracking-wider block font-semibold">${room.isApartment ? 'Rates starting from' : 'Rate Per Night'}</span>
                        <span class="text-lg font-extrabold text-[#D4AF37] outfit">${pkrPrice}</span>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="openDetailsModal('${escapeHTML(room.id)}')" class="border border-slate-200 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-all">
                            Details
                        </button>
                        <a href="booking.html?room=${escapeHTML(room.id)}" class="bg-[#0F172A] text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-[#D4AF37] transition-all shadow-sm">
                            Book Now
                        </a>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('\n');

    const gridIndex = modified.indexOf(gridId);
    if (gridIndex !== -1) {
        const closeTagIndex = modified.indexOf('>', gridIndex);
        if (closeTagIndex !== -1) {
            modified = modified.slice(0, closeTagIndex + 1) + cardsHtml + modified.slice(closeTagIndex + 1);
        }
    }
    
    return modified;
}

// Pre-render Individual Room Details Page
function prerenderRoomDetails(html, room) {
    let modified = html;
    const customTitle = room.seoTitle ? room.seoTitle.trim() : '';
    const roomTitle = escapeHTML(customTitle || `${room.name} — ${room.type} in ${room.location || 'Islamabad'} | KPH Stay`);
    
    const customDesc = room.seoDescription ? room.seoDescription.trim() : '';
    const rawDesc = customDesc || (room.description ? room.description.replace(/<[^>]*>?/gm, '').trim() : `${room.name} luxury stay in ${room.location || 'Islamabad'}. Rates from ${formatPKR(room.price)}.`);
    const roomDesc = escapeHTML(rawDesc.slice(0, 160));
    
    const slugQuery = room.slug ? `&slug=${escapeHTML(room.slug)}` : '';
    const roomUrl = `https://kphstay.com/room-details?id=${escapeHTML(room.id)}${slugQuery}`;
    const roomImg = escapeHTML(room.image || (room.images && room.images.length ? room.images[0] : 'https://kphstay.com/assets/images/logo.png'));
    const pkrPrice = Number(room.price) || 0;
    const robotsTag = room.seoIndex || 'index, follow';

    // 1. Replace Title
    if (/<title>.*?<\/title>/i.test(modified)) {
        modified = modified.replace(/<title>.*?<\/title>/i, `<title>${roomTitle}</title>`);
    } else {
        modified = modified.replace(/<\/head>/i, `  <title>${roomTitle}</title>\n</head>`);
    }

    // 2. Replace or Insert Meta Description
    if (/<meta\s+name=["']description["']/i.test(modified)) {
        modified = modified.replace(/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${roomDesc}">`);
    } else {
        modified = modified.replace(/<\/head>/i, `  <meta name="description" content="${roomDesc}">\n</head>`);
    }

    // 3. Replace or Insert Canonical URL
    if (/<link\s+rel=["']canonical["']/i.test(modified)) {
        modified = modified.replace(/<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${roomUrl}">`);
    } else {
        modified = modified.replace(/<\/head>/i, `  <link rel="canonical" href="${roomUrl}">\n</head>`);
    }

    // 4. Inject Robots Directive Tag
    if (/<meta\s+name=["']robots["']/i.test(modified)) {
        modified = modified.replace(/<meta\s+name=["']robots["'][^>]*>/i, `<meta name="robots" content="${escapeHTML(robotsTag)}">`);
    } else {
        modified = modified.replace(/<\/head>/i, `  <meta name="robots" content="${escapeHTML(robotsTag)}">\n</head>`);
    }

    // 5. Inject Focus Keywords if present
    if (room.seoKeywords) {
        modified = modified.replace(/<\/head>/i, `  <meta name="keywords" content="${escapeHTML(room.seoKeywords)}">\n</head>`);
    }

    // 6. OpenGraph Tags
    const ogTags = `
  <meta property="og:title" content="${roomTitle}">
  <meta property="og:description" content="${roomDesc}">
  <meta property="og:image" content="${roomImg}">
  <meta property="og:url" content="${roomUrl}">
  <meta property="og:type" content="website">`;
    modified = modified.replace(/<\/head>/i, `${ogTags}\n</head>`);

    // 5. JSON-LD Product & LodgingBusiness Schema
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": room.name,
        "description": rawDesc,
        "image": [roomImg],
        "category": room.type || "Apartment",
        "offers": {
            "@type": "Offer",
            "price": pkrPrice,
            "priceCurrency": "PKR",
            "availability": room.status === "maintenance" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
            "url": roomUrl
        }
    };

    if (room.rating) {
        jsonLd.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": room.rating,
            "reviewCount": room.reviewsCount || 1
        };
    }

    const jsonLdScript = `\n<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>\n`;
    modified = modified.replace(/<\/head>/i, `${jsonLdScript}</head>`);

    return modified;
}

// Pre-render Individual Blog Post Page
function prerenderBlogPost(html, post) {
    let modified = html;
    const postTitle = `${escapeHTML(post.title)} | KPH Stay Resort Journal`;
    const rawExcerpt = post.excerpt || post.description || post.title;
    const postDesc = escapeHTML(rawExcerpt.slice(0, 160));
    const postUrl = `https://kphstay.com/blog/${escapeHTML(post.slug)}`;
    const postImg = escapeHTML(post.imageUrl || 'https://kphstay.com/assets/images/logo.png');

    if (/<title>.*?<\/title>/i.test(modified)) {
        modified = modified.replace(/<title>.*?<\/title>/i, `<title>${postTitle}</title>`);
    } else {
        modified = modified.replace(/<\/head>/i, `  <title>${postTitle}</title>\n</head>`);
    }

    if (/<meta\s+name=["']description["']/i.test(modified)) {
        modified = modified.replace(/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${postDesc}">`);
    } else {
        modified = modified.replace(/<\/head>/i, `  <meta name="description" content="${postDesc}">\n</head>`);
    }

    if (/<link\s+rel=["']canonical["']/i.test(modified)) {
        modified = modified.replace(/<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${postUrl}">`);
    } else {
        modified = modified.replace(/<\/head>/i, `  <link rel="canonical" href="${postUrl}">\n</head>`);
    }

    const ogTags = `
  <meta property="og:title" content="${postTitle}">
  <meta property="og:description" content="${postDesc}">
  <meta property="og:image" content="${postImg}">
  <meta property="og:url" content="${postUrl}">
  <meta property="og:type" content="article">`;
    modified = modified.replace(/<\/head>/i, `${ogTags}\n</head>`);

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "image": [postImg],
        "datePublished": post.createdAt || post.date || new Date().toISOString(),
        "author": {
            "@type": "Organization",
            "name": post.author || "Kaghan Stay"
        },
        "publisher": {
            "@type": "Organization",
            "name": "KPH Stay",
            "logo": {
                "@type": "ImageObject",
                "url": "https://kphstay.com/assets/images/logo.png"
            }
        },
        "description": rawExcerpt
    };

    const jsonLdScript = `\n<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>\n`;
    modified = modified.replace(/<\/head>/i, `${jsonLdScript}</head>`);

    return modified;
}

exports.handler = async (event, context) => {
    const rawPage = (event.queryStringParameters && event.queryStringParameters.page) || '/';
    console.log(`[SEO Prerenderer] Generating static rendering for path: ${rawPage}`);
    
    // Parse URL path and query parameters cleanly
    let parsedUrl;
    try {
        parsedUrl = new URL(rawPage, 'https://kphstay.com');
    } catch (e) {
        parsedUrl = new URL('/', 'https://kphstay.com');
    }
    const pagePath = parsedUrl.pathname.toLowerCase();

    // Map path to exact template file (Most specific first)
    let templateFile = 'index.html';
    if (pagePath.startsWith('/room-details')) {
        templateFile = 'room-details.html';
    } else if (pagePath.startsWith('/rooms')) {
        templateFile = 'rooms.html';
    } else if (pagePath.startsWith('/blog')) {
        templateFile = 'blog.html';
    } else if (pagePath.startsWith('/booking')) {
        templateFile = 'booking.html';
    } else if (pagePath.startsWith('/login')) {
        templateFile = 'login.html';
    } else if (pagePath.startsWith('/contact')) {
        templateFile = 'contact.html';
    } else if (pagePath.startsWith('/privacy')) {
        templateFile = 'privacy.html';
    } else if (pagePath.startsWith('/terms')) {
        templateFile = 'terms.html';
    } else if (pagePath.startsWith('/refund')) {
        templateFile = 'refund.html';
    } else if (pagePath.startsWith('/cookies')) {
        templateFile = 'cookies.html';
    } else if (pagePath.startsWith('/track')) {
        templateFile = 'track.html';
    } else if (pagePath === '/' || pagePath === '/index.html' || pagePath === '') {
        templateFile = 'index.html';
    } else {
        templateFile = 'index.html';
    }

    try {
        const templatePath = path.join(process.cwd(), templateFile);
        if (!fs.existsSync(templatePath)) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
                body: "Template not found"
            };
        }

        let html = fs.readFileSync(templatePath, 'utf8');

        // Fetch Firestore resources in parallel
        const [rooms, blogs] = await Promise.all([
            fetchCollection('rooms'),
            fetchCollection('blogs')
        ]);

        // Inject dynamic content based on page template
        if (templateFile === 'room-details.html') {
            const roomId = parsedUrl.searchParams.get('id') || (event.queryStringParameters && (event.queryStringParameters.id || event.queryStringParameters.room));
            if (roomId) {
                const targetRoom = rooms.find(r => String(r.id) === String(roomId));
                if (!targetRoom) {
                    return {
                        statusCode: 404,
                        headers: { 'Content-Type': 'text/html; charset=utf-8' },
                        body: '<!DOCTYPE html><html><head><title>404 Room Not Found | KPH Stay</title></head><body><h1>404 Suite Style Not Found</h1></body></html>'
                    };
                }
                html = prerenderRoomDetails(html, targetRoom);
            }
        } else if (templateFile === 'index.html') {
            html = prerenderIndex(html, rooms, blogs);
        } else if (templateFile === 'rooms.html') {
            html = prerenderRooms(html, rooms);
        } else if (templateFile === 'blog.html') {
            let blogSlug = parsedUrl.searchParams.get('slug') || (event.queryStringParameters && event.queryStringParameters.slug);
            if (!blogSlug && pagePath.startsWith('/blog/') && pagePath !== '/blog.html' && pagePath !== '/blog') {
                blogSlug = pagePath.replace('/blog/', '').replace('.html', '');
            }
            if (blogSlug) {
                const targetPost = blogs.find(b => b.slug === blogSlug || b.id === blogSlug);
                if (targetPost) {
                    html = prerenderBlogPost(html, targetPost);
                } else {
                    html = prerenderBlog(html, blogs);
                }
            } else {
                html = prerenderBlog(html, blogs);
            }
        }

        // Add additional general crawler tags ONLY if not already present
        if (!/<meta\s+name=["']robots["']/i.test(html)) {
            html = html.replace(/<\/head>/i, `  <meta name="robots" content="index, follow">\n</head>`);
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
                'Netlify-CDN-Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
            },
            body: html
        };

    } catch (err) {
        console.error(`[SEO Prerenderer Error]:`, err);
        
        // Fallback: Return template as-is without crashing
        try {
            const templatePath = path.join(process.cwd(), templateFile);
            const html = fs.readFileSync(templatePath, 'utf8');
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
                    'Netlify-CDN-Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
                },
                body: html
            };
        } catch (readErr) {
            return {
                statusCode: 500,
                body: "Internal Server Error"
            };
        }
    }
};
