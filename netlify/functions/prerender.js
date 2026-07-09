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
                        Reserve Suite
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

// Pre-render the Blog Page Catalog
function prerenderBlog(html, blogs) {
    let modified = html;
    const gridId = 'id="blog-grid"';
    const stayBlogs = blogs.filter(b => b.portal === 'stay');
    
    const cardsHtml = stayBlogs.map(b => {
        const img = b.imageUrl || 'assets/images/logo.png';
        return `
        <div class="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm hover-lift hover:border-[#D4AF37] transition-all flex flex-col justify-between">
            <div class="h-56 overflow-hidden relative">
                <img src="${escapeHTML(img)}" alt="${escapeHTML(b.title)}" class="w-full h-full object-cover">
                <span class="absolute top-4 left-4 bg-slate-900 text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">${escapeHTML(b.category)}</span>
            </div>
            <div class="p-8 flex-grow flex flex-col justify-between">
                <div>
                    <h4 class="text-lg font-bold outfit text-slate-900 mb-3 leading-snug">${escapeHTML(b.title)}</h4>
                    <p class="text-slate-500 text-xs leading-relaxed mb-6">${escapeHTML(b.excerpt)}</p>
                </div>
                <div class="pt-4 border-t border-slate-50 flex justify-between items-center text-[10px] font-semibold text-slate-400">
                    <span>BY ${escapeHTML(b.author.toUpperCase())}</span>
                    <a href="#${escapeHTML(b.slug)}" class="text-[#D4AF37] font-bold uppercase tracking-wider hover:underline flex items-center gap-1.5">Read Post <i class="fa-solid fa-arrow-right text-[8px]"></i></a>
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

exports.handler = async (event, context) => {
    const pagePath = event.queryStringParameters.page || '/';
    console.log(`[SEO Prerenderer] Generating static rendering for path: ${pagePath}`);
    
    // Map path to template file
    let templateFile = 'index.html';
    if (pagePath.includes('rooms')) {
        templateFile = 'rooms.html';
    } else if (pagePath.includes('blog')) {
        templateFile = 'blog.html';
    } else if (pagePath.includes('booking')) {
        templateFile = 'booking.html';
    } else if (pagePath.includes('login')) {
        templateFile = 'login.html';
    }

    try {
        const templatePath = path.join(process.cwd(), templateFile);
        if (!fs.existsSync(templatePath)) {
            return {
                statusCode: 404,
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
        if (templateFile === 'index.html') {
            html = prerenderIndex(html, rooms, blogs);
        } else if (templateFile === 'rooms.html') {
            html = prerenderRooms(html, rooms);
        } else if (templateFile === 'blog.html') {
            html = prerenderBlog(html, blogs);
        }

        // Add additional general crawler tags (indexing rules)
        const seoRobotsTag = `<meta name="robots" content="index, follow">`;
        html = html.replace(/<\/head>/i, `  ${seoRobotsTag}\n</head>`);

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
