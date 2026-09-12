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

function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
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

function get404Html() {
    try {
        let p404 = path.join(process.cwd(), '404.html');
        if (!fs.existsSync(p404)) p404 = path.join(__dirname, '../../404.html');
        if (!fs.existsSync(p404)) p404 = path.join(__dirname, '404.html');
        if (fs.existsSync(p404)) return fs.readFileSync(p404, 'utf8');
    } catch (e) {}
    return '<!DOCTYPE html><html><head><title>404 Page Not Found | KPH Stay</title><meta name="robots" content="noindex, follow"></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h1>404 - Suite or Article Not Found</h1><p>The requested accommodation or journal article could not be found.</p><a href="/">Return to Lobby</a></body></html>';
}

// Pre-render the Home Page
function prerenderIndex(html, rooms, blogs) {
    let modified = html;
    
    // 1. Pre-render Featured Rooms
    const featuredRoomsContainer = 'id="featured-rooms"';
    const featuredList = (rooms || []).filter(r => r.status === 'available');
    const roomsHtml = featuredList.map(room => {
        const pkrPrice = formatPKR(room.price || 0);
        const amenitiesList = Array.isArray(room.amenities) ? room.amenities : [];
        const amenitiesHtml = amenitiesList.slice(0, 3).map(a => `
            <span class="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border border-slate-200">
                ${escapeHTML(a)}
            </span>
        `).join('');
        const moreAmenities = amenitiesList.length > 3 ? `<span class="bg-amber-50 text-[#B8860B] text-[10px] uppercase font-extrabold px-2 py-1 rounded-full border border-amber-200">+${amenitiesList.length - 3}</span>` : '';
        const roomSlug = room.slug || slugify(room.name || 'room');
        const roomUrl = `/room/${encodeURIComponent(roomSlug)}`;

        return `
        <div class="bg-white rounded-3xl overflow-hidden border-2 border-slate-200 shadow-md hover:border-[#C5A059] hover:shadow-2xl transition-all duration-300 group cursor-pointer flex flex-col justify-between h-full hover-lift relative">
            <div class="relative h-64 overflow-hidden shrink-0 border-b border-slate-200">
                <img src="${escapeHTML(room.image || '/assets/images/logo.png')}" alt="${escapeHTML(room.name || 'Luxury Suite')}" class="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-95 transition-all duration-700">
                <div class="absolute top-3 left-3 backdrop-blur-md bg-slate-950/85 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold text-[#FFDF9E] border border-amber-400/40 uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
                    ${escapeHTML(room.type || 'Luxury Suite')}
                </div>
            </div>
            <div class="p-6 sm:p-7 flex-grow flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-start mb-1 gap-2">
                        <h3 class="text-xl font-extrabold outfit text-slate-900 tracking-tight group-hover:text-[#C5A059] transition-colors duration-300 leading-snug">${escapeHTML(room.name || 'Suite')}</h3>
                        <div class="flex items-center gap-1 text-amber-500 font-extrabold text-xs shrink-0 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <i class="fa-solid fa-star text-amber-400"></i>
                            <span>${room.rating || 5.0}</span>
                        </div>
                    </div>
                    <div class="text-[11px] text-slate-500 font-extrabold mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                        <i class="fa-solid fa-location-dot text-[#C5A059] text-xs"></i>
                        <span>${escapeHTML(room.location || 'Islamabad')}</span>
                    </div>
                    <p class="text-slate-600 text-xs line-clamp-2 mb-4 leading-relaxed font-normal">
                        ${escapeHTML(room.description || 'Luxury serviced accommodations in prime locations.')}
                    </p>
                    <div class="flex flex-wrap gap-1.5 mb-5">
                        ${amenitiesHtml}
                        ${moreAmenities}
                    </div>
                </div>
                <div class="border-t border-slate-200 pt-4 flex justify-between items-center mt-auto">
                    <div>
                        <span class="text-slate-500 text-[10px] uppercase tracking-wider block font-extrabold">${room.isApartment ? 'Rates starting from' : 'Rate Per Night'}</span>
                        <span class="text-xl font-extrabold text-slate-900 outfit tracking-tight">${pkrPrice}</span>
                    </div>
                    <a href="${roomUrl}" class="bg-slate-900 hover:bg-[#C5A059] hover:text-slate-950 text-white text-xs uppercase tracking-wider font-extrabold px-5 py-2.5 rounded-xl transition-all shadow-md border border-slate-800 hover:border-[#C5A059]">
                        View Suite
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
    const stayBlogs = (blogs || []).filter(b => !b.portal || b.portal === 'stay');
    const latestBlogs = stayBlogs.slice(0, 2);
    
    const blogsHtml = latestBlogs.map(b => {
        const img = b.imageUrl || 'assets/images/logo.png';
        const blogSlug = b.slug || slugify(b.title || 'article');
        const blogUrl = `/blog/${encodeURIComponent(blogSlug)}`;
        return `
        <div class="bg-white rounded-3xl border-2 border-slate-200 p-6 md:p-8 shadow-md hover-lift hover:border-[#C5A059] transition-all duration-300 flex flex-col md:flex-row gap-6 items-center">
            <div class="w-full md:w-1/3 aspect-video md:aspect-square rounded-2xl overflow-hidden shrink-0 border border-slate-200 shadow-inner">
                <img src="${escapeHTML(img)}" alt="${escapeHTML(b.title || 'Resort Journal')}" class="w-full h-full object-cover">
            </div>
            <div class="flex-grow">
                <span class="text-[#B8860B] font-extrabold text-[10px] uppercase tracking-widest block mb-2 flex items-center gap-1.5"><i class="fa-solid fa-tag text-amber-500"></i> ${escapeHTML(b.category || 'Journal')}</span>
                <h4 class="text-xl font-extrabold outfit text-slate-900 mb-2 leading-snug">${escapeHTML(b.title || '')}</h4>
                <p class="text-slate-600 text-xs sm:text-sm leading-relaxed mb-4 line-clamp-2 font-normal">${escapeHTML(b.excerpt || '')}</p>
                <a href="${blogUrl}" class="text-slate-900 hover:text-[#C5A059] text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 self-start border-b-2 border-slate-900 hover:border-[#C5A059] pb-0.5 transition-colors">
                    Read Article <i class="fa-solid fa-arrow-right text-[10px]"></i>
                </a>
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
    const roomsList = [...(rooms || [])];
    roomsList.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

    const cardsHtml = roomsList.map(room => {
        const pkrPrice = formatPKR(room.price || 0);
        const amenitiesList = Array.isArray(room.amenities) ? room.amenities : [];
        const amenitiesHtml = amenitiesList.slice(0, 3).map(a => `
            <span class="bg-slate-50 text-slate-500 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-slate-100">
                ${escapeHTML(a)}
            </span>
        `).join('');
        const moreAmenities = amenitiesList.length > 3 ? `<span class="bg-slate-50 text-[#D4AF37] text-[9px] uppercase font-bold px-2 py-0.5 rounded border border-slate-100">+${amenitiesList.length - 3}</span>` : '';
        const roomSlug = room.slug || slugify(room.name || 'room');
        const roomUrl = `/room/${encodeURIComponent(roomSlug)}`;
        
        return `
        <div class="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-md hover-lift group">
            <div class="relative h-56 overflow-hidden">
                <img src="${escapeHTML(room.image || '/assets/images/logo.png')}" alt="${escapeHTML(room.name || 'Suite')}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                <div class="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#D4AF37] border border-white/10 uppercase tracking-widest">
                    ${escapeHTML(room.type || 'Luxury Suite')}
                </div>
            </div>
            <div class="p-6">
                <div class="flex justify-between items-start mb-1">
                    <h3 class="text-lg font-bold outfit text-[#0F172A] leading-tight">${escapeHTML(room.name || 'Suite')}</h3>
                    <div class="flex items-center gap-1 text-[#D4AF37] font-bold text-xs">
                        <i class="fa-solid fa-star"></i>
                        <span>${room.rating || 5.0}</span>
                    </div>
                </div>
                <div class="text-[10px] text-slate-400 font-bold mb-3 flex items-center gap-1">
                    <i class="fa-solid fa-location-dot text-[#D4AF37] text-[9px]"></i>
                    <span>${escapeHTML(room.location || 'Islamabad')}</span>
                </div>
                <p class="text-slate-500 text-xs line-clamp-2 font-light leading-relaxed mb-4">
                    ${escapeHTML(room.description || 'Luxury serviced accommodations in prime locations.')}
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
                        <a href="${roomUrl}" class="border border-slate-200 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-all">
                            Details
                        </a>
                        <a href="/booking.html?room=${escapeHTML(room.id)}" class="bg-[#0F172A] text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-[#D4AF37] transition-all shadow-sm">
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
    const pkrPrice = Number(room.price) || 0;
    const rawLoc = (room.location || room.locationName || '').toLowerCase();
    const rawName = (room.name || '').toLowerCase();

    // 1. Resolve Geographic & Regional Context
    let city = 'Islamabad';
    let cityPath = '/furnished-apartments-islamabad';
    let cityTitleKeyword = 'Furnished Apartment in Islamabad';
    let addressLocality = 'Islamabad';
    let addressRegion = 'Federal Capital Territory';
    let postalCode = '44000';
    let streetAddress = room.address || 'Sector C, Bahria Enclave';
    let defaultLat = 33.7294;
    let defaultLng = 73.0931;

    const isExplicitIslamabad = rawLoc.includes('islamabad') || rawLoc.includes('bahria') || rawLoc.includes('sector') || rawLoc.includes('cube') || rawLoc.includes('usmania') || rawLoc.includes('royal');
    const isNathiaGali = rawLoc.includes('nathia') || rawLoc.includes('gali') || rawLoc.includes('ayubia') || rawName.includes('nathia') || rawName.includes('ayubia') || (rawName.includes('gali') && !rawLoc.includes('islamabad'));
    const isMurree = (rawLoc.includes('murree') || rawLoc.includes('bhurban') || rawName.includes('murree') || rawName.includes('bhurban')) && !isExplicitIslamabad && !rawName.includes('murree view');

    if (isNathiaGali) {
        city = 'Nathia Gali';
        cityPath = '/furnished-apartments-nathia-gali';
        cityTitleKeyword = 'Furnished Apartment in Nathia Gali';
        addressLocality = 'Nathia Gali';
        addressRegion = 'Khyber Pakhtunkhwa';
        postalCode = '22550';
        streetAddress = room.address || 'Main Abbottabad Road, Nathia Gali';
        defaultLat = 34.0722;
        defaultLng = 73.3858;
    } else if (isMurree) {
        city = 'Murree';
        cityPath = '/furnished-apartments-murree';
        cityTitleKeyword = 'Furnished Apartment in Murree';
        addressLocality = 'Murree';
        addressRegion = 'Punjab';
        postalCode = '47150';
        streetAddress = room.address || 'Pine Valley Corridor, Murree Hills';
        defaultLat = 33.9070;
        defaultLng = 73.3943;
    }

    // 2. Resolve Property Type & Bedrooms Count
    let bedsCount = Number(room.bedrooms) || 0;
    if (bedsCount === 0) {
        const bedMatch = (room.name || '').match(/(\d+)\s*[-]?\s*(?:bed|bhk|bedroom)/i);
        if (bedMatch) {
            bedsCount = parseInt(bedMatch[1], 10);
        } else {
            bedsCount = 1;
        }
    }

    let typeName = room.type || 'Furnished Apartment';
    if (rawName.includes('studio') || (room.type && room.type.toLowerCase().includes('studio'))) {
        typeName = 'Furnished Studio Apartment';
        bedsCount = 1;
    } else if (rawName.includes('penthouse') || (room.type && room.type.toLowerCase().includes('penthouse'))) {
        typeName = `${bedsCount > 1 ? bedsCount + ' Bed ' : ''}Luxury Penthouse`;
    } else if (rawName.includes('villa') || rawName.includes('house') || rawName.includes('farmhouse')) {
        typeName = `${bedsCount} Bed Luxury Villa & Chalet`;
    } else if (bedsCount > 1) {
        typeName = `${bedsCount} Bed Furnished Apartment`;
    } else {
        typeName = '1 Bed Furnished Apartment';
    }

    // 3. Clean Name & Dynamic High-Impact Title Tag
    let cleanRoomName = room.name ? room.name
        .replace(/\s*[–—-]\s*by\s+Nook\s+House/gi, '')
        .replace(/\s*[–—-]\s*Book\s+Your\s+Stay.*/gi, '')
        .replace(/\s*[–—-]\s*Your\s+Perfect\s+Mountain\s+Getaway/gi, '')
        .replace(/\s*[–—-]\s*Your\s+Private\s+Mountain\s+Escape.*/gi, '')
        .trim() : typeName;

    let roomTitle = '';
    if (room.seoTitle && room.seoTitle.trim() && room.seoTitle.length > 20) {
        let baseSeoTitle = room.seoTitle.trim()
            .replace(/\s*\|\s*(KP|KPH|Kaghan)\s*Stay/gi, '')
            .trim();
        roomTitle = `${baseSeoTitle} | KPH Stay`;
    } else {
        roomTitle = `${cleanRoomName} | ${typeName} in ${city} | KPH Stay`;
    }
    roomTitle = escapeHTML(roomTitle);

    // 4. Dynamic Meta Description with High-Intent Keywords
    let rawDesc = '';
    if (room.seoDescription && room.seoDescription.trim() && room.seoDescription.length > 50) {
        rawDesc = room.seoDescription.trim();
    } else {
        rawDesc = `Book ${cleanRoomName}, a fully furnished ${typeName.toLowerCase()} in ${city}. Features equipped kitchen, 24/7 generator backup, fast Wi-Fi, heating/AC, and private parking. Rates from ${formatPKR(pkrPrice)}/night with KPH Stay.`;
    }
    const roomDesc = escapeHTML(rawDesc.slice(0, 160));

    // 5. Dynamic Keywords Assembly
    const keywordSet = new Set();
    keywordSet.add(`furnished apartments in ${city.toLowerCase()}`);
    keywordSet.add(`furnished apartment ${city.toLowerCase()}`);
    keywordSet.add(`${typeName.toLowerCase()} in ${city.toLowerCase()}`);
    keywordSet.add(`${typeName.toLowerCase()} ${city.toLowerCase()}`);
    keywordSet.add(`luxury serviced apartments ${city.toLowerCase()}`);
    keywordSet.add(`short stay apartments ${city.toLowerCase()}`);
    keywordSet.add(`monthly furnished apartment ${city.toLowerCase()}`);
    keywordSet.add(`vacation rentals ${city.toLowerCase()}`);

    if (city === 'Islamabad') {
        keywordSet.add('bahria enclave furnished apartments');
        keywordSet.add('royal mall islamabad apartment');
        keywordSet.add('cube apartments islamabad');
        keywordSet.add('1 bed furnished apartment islamabad');
        keywordSet.add('2 bed furnished apartment islamabad');
        keywordSet.add('furnished flats for rent in islamabad');
        if (rawName.includes('murree view')) {
            keywordSet.add('murree view studio islamabad');
            keywordSet.add('murree view apartment islamabad');
        }
    } else if (city === 'Murree') {
        keywordSet.add('mountain view chalets murree');
        keywordSet.add('murree vacation rentals');
        keywordSet.add('bhurban furnished apartments');
        keywordSet.add('heated apartments murree');
        keywordSet.add('holiday homes murree');
    } else if (city === 'Nathia Gali') {
        keywordSet.add('luxury chalets nathia gali');
        keywordSet.add('pine forest cottages nathia gali');
        keywordSet.add('galiyat vacation homes');
        keywordSet.add('ayubia family suites');
        keywordSet.add('4 bedroom cottage nathia gali');
    }

    if (room.seoKeywords) {
        room.seoKeywords.split(',').forEach(k => {
            if (k.trim()) keywordSet.add(k.trim().toLowerCase());
        });
    }
    const dynamicKeywords = Array.from(keywordSet).join(', ');

    const roomSlug = room.slug || slugify(room.name || 'room');
    const roomUrl = `https://kphstay.com/room/${escapeHTML(roomSlug)}`;
    const roomImg = escapeHTML(room.image || (room.images && room.images.length ? room.images[0] : 'https://kphstay.com/assets/images/logo.png'));
    const robotsTag = room.seoIndex || 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';

    // 6. Meta Tags Replacement
    if (/<title>.*?<\/title>/i.test(modified)) {
        modified = modified.replace(/<title>.*?<\/title>/i, `<title>${roomTitle}</title>`);
    } else {
        modified = modified.replace(/<\/head>/i, `  <title>${roomTitle}</title>\n</head>`);
    }

    if (/<meta\s+name=["']description["']/i.test(modified)) {
        modified = modified.replace(/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${roomDesc}">`);
    } else {
        modified = modified.replace(/<\/head>/i, `  <meta name="description" content="${roomDesc}">\n</head>`);
    }

    if (/<link\s+rel=["']canonical["']/i.test(modified)) {
        modified = modified.replace(/<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${roomUrl}">`);
    } else {
        modified = modified.replace(/<\/head>/i, `  <link rel="canonical" href="${roomUrl}">\n</head>`);
    }

    if (/<meta\s+name=["']robots["']/i.test(modified)) {
        modified = modified.replace(/<meta\s+name=["']robots["'][^>]*>/i, `<meta name="robots" content="${escapeHTML(robotsTag)}">`);
    } else {
        modified = modified.replace(/<\/head>/i, `  <meta name="robots" content="${escapeHTML(robotsTag)}">\n</head>`);
    }

    // Inject Keywords
    if (/<meta\s+name=["']keywords["']/i.test(modified)) {
        modified = modified.replace(/<meta\s+name=["']keywords["'][^>]*>/i, `<meta name="keywords" content="${escapeHTML(dynamicKeywords)}">`);
    } else {
        modified = modified.replace(/<\/head>/i, `  <meta name="keywords" content="${escapeHTML(dynamicKeywords)}">\n</head>`);
    }

    // OpenGraph & Twitter Tags
    const ogTags = `
  <meta property="og:title" content="${roomTitle}">
  <meta property="og:description" content="${roomDesc}">
  <meta property="og:image" content="${roomImg}">
  <meta property="og:url" content="${roomUrl}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${roomTitle}">
  <meta name="twitter:description" content="${roomDesc}">
  <meta name="twitter:image" content="${roomImg}">`;
    modified = modified.replace(/<\/head>/i, `${ogTags}\n</head>`);

    // Helper to generate Unique Room/Property Code
    const generateRoomCode = (r) => {
        if (r.unitCode && typeof r.unitCode === 'string' && r.unitCode.trim()) return r.unitCode.trim().toUpperCase();
        if (r.roomCode && typeof r.roomCode === 'string' && r.roomCode.trim()) return r.roomCode.trim().toUpperCase();
        let locPrefix = 'ISB';
        if (city === 'Murree') locPrefix = 'MUR';
        else if (city === 'Nathia Gali') locPrefix = 'NTH';

        const name = (r.name || '').toUpperCase();
        const numMatch = name.match(/(\d{3,4}|\d+\s*[-]?\s*(?:MARLA|BEDROOM|BED|BHK|KANAL)|C1|C2|A1|A2|B2|D1)/i);
        if (numMatch) {
            let token = numMatch[1].replace(/\s*[-]?\s*/g, '').toUpperCase();
            token = token.replace('BEDROOM', 'BED');
            return `KPH-${locPrefix}-${token}`;
        }
        const rawId = String(r.id || r.slug || 'room').replace(/[^a-zA-Z0-9]/g, '');
        const suffix = rawId.slice(-4).toUpperCase() || 'UNIT';
        return `KPH-${locPrefix}-${suffix}`;
    };

    const roomCode = generateRoomCode(room);

    // 7. Inject Full Body HTML Elements
    modified = modified.replace(/<span id="breadcrumb-room-name"[^>]*>.*?<\/span>/i, `<span id="breadcrumb-room-name" class="text-slate-900 font-bold">${escapeHTML(cleanRoomName)}</span>`);
    modified = modified.replace(/<h1 id="detail-title"[^>]*>.*?<\/h1>/i, `<h1 id="detail-title" class="text-2xl md:text-4xl font-bold outfit text-[#0B0F19]">${escapeHTML(cleanRoomName)}</h1>`);
    modified = modified.replace(/<span id="detail-price-daily"[^>]*>.*?<\/span>/i, `<span id="detail-price-daily" class="text-2xl font-black text-[#C5A059] outfit">${formatPKR(pkrPrice)}</span>`);
    modified = modified.replace(/<span id="detail-rate-daily"[^>]*>.*?<\/span>/i, `<span id="detail-rate-daily" class="text-sm font-bold mt-0.5">${formatPKR(pkrPrice)} / night</span>`);
    
    if (room.description) {
        modified = modified.replace(/<div id="detail-description"[^>]*>[\s\S]*?<\/div>/i, `<div id="detail-description" class="text-slate-600 text-sm leading-relaxed font-light space-y-3">${room.description}</div>`);
    }

    modified = modified.replace(/<img id="gallery-main-img"[^>]*>/i, `<img id="gallery-main-img" src="${roomImg}" alt="${escapeHTML(cleanRoomName)} - Furnished Apartment in ${escapeHTML(city)}" class="w-full h-full object-cover transition-all duration-500">`);

    // 8. Structured Schema Graph (Breadcrumbs, Apartment / VacationRental, FAQPage)
    const hasRealReviews = room.reviewsCount && Number(room.reviewsCount) > 0;
    const schemaGraph = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://kphstay.com/" },
                    { "@type": "ListItem", "position": 2, "name": `Furnished Apartments in ${city}`, "item": `https://kphstay.com${cityPath}` },
                    { "@type": "ListItem", "position": 3, "name": cleanRoomName, "item": roomUrl }
                ]
            },
            {
                "@type": ["Apartment", "VacationRental", "HotelRoom", "Product"],
                "@id": roomUrl,
                "identifier": roomCode,
                "name": roomTitle,
                "description": rawDesc,
                "image": room.images && room.images.length ? room.images : [roomImg],
                "category": typeName,
                "url": roomUrl,
                "occupancy": {
                    "@type": "QuantitativeValue",
                    "value": room.maxGuests || (bedsCount * 2),
                    "unitText": "guests"
                },
                "numberOfRooms": bedsCount,
                "numberOfBathroomsTotal": room.bathrooms || 1,
                "floorSize": {
                    "@type": "QuantitativeValue",
                    "value": room.area ? String(room.area).replace(/[^0-9,]/g, '') || "1000" : (room.size ? String(room.size).replace(/[^0-9,]/g, '') : "1000"),
                    "unitCode": "FTK",
                    "unitText": "sq ft"
                },
                "bed": {
                    "@type": "BedDetails",
                    "numberOfBeds": bedsCount,
                    "typeOfBed": room.bedsConfig || (bedsCount > 1 ? `${bedsCount} King/Double Beds` : "King Bed")
                },
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": streetAddress,
                    "addressLocality": addressLocality,
                    "addressRegion": addressRegion,
                    "postalCode": postalCode,
                    "addressCountry": "PK"
                },
                "geo": {
                    "@type": "GeoCoordinates",
                    "latitude": room.lat || defaultLat,
                    "longitude": room.lng || defaultLng
                },
                "containedInPlace": {
                    "@type": "LodgingBusiness",
                    "name": "KPH Stay - Luxury Furnished Apartments",
                    "url": "https://kphstay.com",
                    "telephone": "+923340091127",
                    "priceRange": "$$"
                },
                "amenityFeature": (room.amenities || [
                    "Fully Furnished", "Equipped Kitchen", "High-Speed Wi-Fi", "24/7 Power Backup", "Heating & AC", "Private Parking"
                ]).map(a => ({
                    "@type": "LocationFeatureSpecification",
                    "name": a,
                    "value": true
                })),
                ...(hasRealReviews ? {
                    "aggregateRating": {
                        "@type": "AggregateRating",
                        "ratingValue": String(room.rating || 5.0),
                        "reviewCount": String(room.reviewsCount),
                        "bestRating": "5",
                        "worstRating": "1"
                    }
                } : {}),
                "brand": {
                    "@type": "Brand",
                    "name": "KPH Stay"
                },
                "sku": roomCode,
                "mpn": roomCode,
                "offers": {
                    "@type": "Offer",
                    "name": `Direct Reservation: ${roomTitle}`,
                    "price": pkrPrice,
                    "priceCurrency": "PKR",
                    "itemCondition": "https://schema.org/NewCondition",
                    "availability": room.status === "maintenance" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
                    "url": roomUrl,
                    "seller": {
                        "@type": "LodgingBusiness",
                        "name": "KPH Stay - Luxury Furnished Apartments",
                        "url": "https://kphstay.com"
                    }
                }
            },
            {
                "@type": "FAQPage",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": `Is ${cleanRoomName} in ${city} fully furnished?`,
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": `Yes, this property in ${city} is 100% fully furnished with plush bedding, living lounge sofas, Smart LED TV, dining furniture, and a private equipped kitchen.`
                        }
                    },
                    {
                        "@type": "Question",
                        "name": `What amenities are included with this ${city} apartment?`,
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": `Guests enjoy complimentary high-speed optical fiber Wi-Fi, 24/7 generator power backup, climate heating/cooling, microwave, refrigerator, hot water geyser, and dedicated parking.`
                        }
                    },
                    {
                        "@type": "Question",
                        "name": `Can I book this furnished apartment in ${city} for weekly or monthly stays?`,
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": `Yes, KPH Stay provides tiered extended stay discounts with 15% off for 7+ nights (weekly) and up to 35% off for 30+ nights (monthly reservations).`
                        }
                    },
                    {
                        "@type": "Question",
                        "name": `How do I book and what payment options are accepted?`,
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": `You can reserve instantly online or via WhatsApp. We offer 'Pay on Check-in' with Cash, Credit/Debit Cards, or Bank Transfer at arrival.`
                        }
                    }
                ]
            }
        ]
    };

    const jsonLdScript = `\n<script type="application/ld+json">\n${JSON.stringify(schemaGraph, null, 2)}\n</script>\n`;
    modified = modified.replace(/<\/head>/i, `${jsonLdScript}</head>`);

    return modified;
}

// Pre-render Individual Blog Post Page (With Full Body Text)
function prerenderBlogPost(html, post) {
    let modified = html;
    const postTitle = `${escapeHTML(post.title)} | KPH Stay Resort Journal`;
    const rawExcerpt = post.excerpt || post.description || post.title;
    const postDesc = escapeHTML(rawExcerpt.slice(0, 160));
    const postSlug = post.slug || slugify(post.title || 'journal');
    const postUrl = `https://kphstay.com/blog/${escapeHTML(postSlug)}`;
    const postImg = escapeHTML(post.imageUrl || 'https://kphstay.com/assets/images/logo.png');
    const category = post.category || 'Travel Guide';
    const postDate = post.createdAt ? new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '2026';
    const wordCount = post.content ? post.content.replace(/<[^>]*>?/gm, '').split(/\s+/).length : (rawExcerpt.split(/\s+/).length * 4);
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    // 1. Meta Tags
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

    // 2. Inject Static DOM Elements to replace "Loading Luxury Travel Journal..." skeleton
    modified = modified.replace(/<span id="breadcrumb-article-title"[^>]*>.*?<\/span>/i, `<span id="breadcrumb-article-title" class="text-slate-700 truncate">${escapeHTML(post.title)}</span>`);
    modified = modified.replace(/<span id="article-category"[^>]*>.*?<\/span>/i, `<span id="article-category" class="bg-amber-100 text-amber-800 text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border border-amber-200">${escapeHTML(category)}</span>`);
    modified = modified.replace(/<span id="article-date"[^>]*>.*?<\/span>/i, `<span id="article-date" class="text-xs text-slate-400 font-medium">${escapeHTML(postDate)}</span>`);
    modified = modified.replace(/<span id="article-read-time"[^>]*>.*?<\/span>/i, `<span id="article-read-time" class="text-xs text-slate-500 font-bold flex items-center gap-1"><i class="fa-regular fa-clock text-amber-600"></i> ${readTime} min read</span>`);
    modified = modified.replace(/<span id="article-word-count"[^>]*>.*?<\/span>/i, `<span id="article-word-count" class="text-xs text-slate-400 font-mono">${wordCount} words</span>`);
    modified = modified.replace(/<h1 id="article-title"[^>]*>.*?<\/h1>/i, `<h1 id="article-title" class="text-3xl md:text-5xl font-extrabold outfit text-slate-900 leading-tight">${escapeHTML(post.title)}</h1>`);
    modified = modified.replace(/<span id="article-author"[^>]*>.*?<\/span>/i, `<span id="article-author" class="font-bold text-xs text-slate-900 block">${escapeHTML(post.author || 'KPH Stay Editorial')}</span>`);
    modified = modified.replace(/<img id="article-hero-img"[^>]*>/i, `<img id="article-hero-img" src="${postImg}" alt="${escapeHTML(post.title)}" class="w-full h-full object-cover">`);

    const articleBodyHtml = post.content || `<p class="text-slate-700 leading-relaxed text-base font-light mb-6">${escapeHTML(post.excerpt || '')}</p>`;
    modified = modified.replace(/<div id="article-prose"[^>]*>[\s\S]*?<\/div>\s*<!-- Call To Action Card -->/i, `<div id="article-prose" class="prose max-w-none">${articleBodyHtml}</div>\n                    <!-- Call To Action Card -->`);

    // 3. Schema.org BlogPosting
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "image": [postImg],
        "datePublished": post.createdAt || post.date || new Date().toISOString(),
        "author": {
            "@type": "Organization",
            "name": post.author || "KPH Stay Editorial"
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

// Pre-render the Blog Catalog Page
function prerenderBlog(html, blogs) {
    let modified = html;
    const gridId = 'id="blog-grid"';
    const stayBlogs = (blogs || []).filter(b => !b.portal || b.portal === 'stay');
    
    const cardsHtml = stayBlogs.map(b => {
        const img = b.imageUrl || 'assets/images/logo.png';
        const dateStr = b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
        const link = b.slug ? `/blog/${escapeHTML(b.slug)}` : `/blog-details.html?id=${escapeHTML(b.id)}`;
        
        return `
        <div class="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-md hover-lift flex flex-col justify-between group">
            <div>
                <div class="relative h-52 overflow-hidden">
                    <img src="${escapeHTML(img)}" alt="${escapeHTML(b.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <span class="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-white/10">
                        ${escapeHTML(b.category || 'Journal')}
                    </span>
                </div>
                <div class="p-6">
                    <div class="text-xs text-slate-400 font-semibold mb-2 flex items-center gap-2">
                        <i class="fa-solid fa-calendar text-[#D4AF37] text-[10px]"></i>
                        <span>${escapeHTML(dateStr)}</span>
                    </div>
                    <h3 class="text-lg font-bold outfit text-slate-900 mb-3 leading-snug group-hover:text-[#D4AF37] transition-colors">
                        <a href="${link}">${escapeHTML(b.title)}</a>
                    </h3>
                    <p class="text-slate-500 text-xs line-clamp-3 leading-relaxed font-light mb-4">
                        ${escapeHTML(b.excerpt || '')}
                    </p>
                </div>
            </div>
            <div class="p-6 pt-0">
                <a href="${link}" class="text-slate-900 hover:text-[#D4AF37] text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    Read Article <i class="fa-solid fa-arrow-right text-[10px]"></i>
                </a>
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
    const rawPage = (event.queryStringParameters && event.queryStringParameters.page) || event.rawUrl || event.path || '/';
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
    let is404 = false;

    if (pagePath.startsWith('/room-details') || pagePath.startsWith('/room/') || (pagePath.startsWith('/rooms/') && pagePath !== '/rooms.html' && pagePath !== '/rooms')) {
        templateFile = 'room-details.html';
    } else if (pagePath.startsWith('/rooms')) {
        templateFile = 'rooms.html';
    } else if (pagePath.startsWith('/blog-details') || (pagePath.startsWith('/blog/') && pagePath !== '/blog.html' && pagePath !== '/blog')) {
        templateFile = 'blog-details.html';
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
    } else if (pagePath.startsWith('/serviced-apartments-islamabad') || pagePath.startsWith('/furnished-apartments-islamabad')) {
        templateFile = 'serviced-apartments-islamabad.html';
    } else if (pagePath.startsWith('/luxury-apartments-murree') || pagePath.startsWith('/furnished-apartments-murree')) {
        templateFile = 'luxury-apartments-murree.html';
    } else if (pagePath.startsWith('/vacation-rentals-nathia-gali') || pagePath.startsWith('/furnished-apartments-nathia-gali')) {
        templateFile = 'vacation-rentals-nathia-gali.html';
    } else if (pagePath === '/' || pagePath === '/index.html' || pagePath === '') {
        templateFile = 'index.html';
    } else {
        is404 = true;
    }

    if (is404) {
        return {
            statusCode: 404,
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
            body: get404Html()
        };
    }

    try {
        let templatePath = path.join(process.cwd(), templateFile);
        if (!fs.existsSync(templatePath)) {
            templatePath = path.join(__dirname, '../../', templateFile);
        }
        if (!fs.existsSync(templatePath)) {
            templatePath = path.join(__dirname, templateFile);
        }
        if (!fs.existsSync(templatePath)) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
                body: get404Html()
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
            let roomId = parsedUrl.searchParams.get('id') || (event.queryStringParameters && (event.queryStringParameters.id || event.queryStringParameters.room));
            let roomSlug = parsedUrl.searchParams.get('slug') || (event.queryStringParameters && event.queryStringParameters.slug);

            if (!roomSlug && !roomId) {
                if (pagePath.startsWith('/room/') || pagePath.startsWith('/rooms/')) {
                    roomSlug = pagePath.replace(/^\/(room|rooms)\//, '').replace('.html', '');
                }
            }

            let targetRoom = null;
            if (roomSlug) {
                const cleanSlug = decodeURIComponent(roomSlug).toLowerCase().trim();
                targetRoom = (rooms || []).find(r => 
                    (r.slug && r.slug.toLowerCase() === cleanSlug) || 
                    slugify(r.name) === cleanSlug || 
                    String(r.id).toLowerCase() === cleanSlug
                );
            }
            if (!targetRoom && roomId) {
                targetRoom = (rooms || []).find(r => String(r.id) === String(roomId));
            }

            // CRITICAL FIX: If room was specifically requested via slug/id but NOT found, return authentic HTTP 404
            if ((roomSlug || roomId) && !targetRoom) {
                return {
                    statusCode: 404,
                    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
                    body: get404Html()
                };
            }

            if (!targetRoom && rooms.length > 0) {
                targetRoom = rooms[0];
            }

            if (targetRoom) {
                html = prerenderRoomDetails(html, targetRoom);
            } else {
                return {
                    statusCode: 404,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' },
                    body: get404Html()
                };
            }
        } else if (templateFile === 'index.html') {
            html = prerenderIndex(html, rooms, blogs);
        } else if (templateFile === 'rooms.html') {
            html = prerenderRooms(html, rooms);
        } else if (templateFile === 'blog-details.html') {
            let blogSlug = parsedUrl.searchParams.get('slug') || (event.queryStringParameters && event.queryStringParameters.slug);
            if (!blogSlug && pagePath.startsWith('/blog/') && pagePath !== '/blog.html' && pagePath !== '/blog') {
                blogSlug = pagePath.replace('/blog/', '').replace('.html', '');
            }
            let targetPost = null;
            if (blogSlug) {
                const cleanSlug = decodeURIComponent(blogSlug).toLowerCase().trim();
                targetPost = (blogs || []).find(b => 
                    (b.slug && b.slug.toLowerCase() === cleanSlug) || 
                    slugify(b.title) === cleanSlug || 
                    String(b.id).toLowerCase() === cleanSlug
                );
            }

            // CRITICAL FIX: If blog was specifically requested via slug/id but NOT found, return authentic HTTP 404
            if (blogSlug && !targetPost) {
                return {
                    statusCode: 404,
                    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
                    body: get404Html()
                };
            }

            if (!targetPost && blogs.length > 0) {
                targetPost = blogs[0];
            }
            if (targetPost) {
                html = prerenderBlogPost(html, targetPost);
            }
        } else if (templateFile === 'blog.html') {
            html = prerenderBlog(html, blogs);
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
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            body: get404Html()
        };
    }
};

module.exports.prerenderRoomDetails = prerenderRoomDetails;
module.exports.prerenderBlogPost = prerenderBlogPost;
