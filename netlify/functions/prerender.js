const fs = require('fs');
const path = require('path');

// Google Firestore REST Endpoint for Kaghan Properties
const FIRESTORE_BASE_URL = 'https://firestore.googleapis.com/v1/projects/kaghan-properties/databases/(default)/documents';

// Default bundled blogs fallback for instant prerender and cold starts
const DEFAULT_STAY_BLOGS = [
    {
        id: "luxury-serviced-apartments-islamabad-vs-hotels-guide",
        title: "The Comprehensive Islamabad Accommodation Guide: Why Luxury Serviced Apartments in Bahria Enclave Outperform Traditional Hotels",
        slug: "luxury-serviced-apartments-islamabad-vs-hotels-guide",
        excerpt: "Discover why discerning corporate executives, overseas families, and leisure travelers are choosing spacious serviced apartments over cramped 5-star hotel rooms in Islamabad.",
        content: `<h2>The Evolution of Luxury Hospitality in Pakistan's Capital</h2>
<p>For decades, travelers visiting Islamabad—whether for international diplomatic missions, corporate conferences, or family reunions—instinctively booked traditional five-star hotels in the Blue Area or the Red Zone. However, the hospitality landscape in Pakistan's capital has undergone a permanent structural transformation. Discerning travelers, overseas Pakistanis, digital nomads, and extended-stay guests are increasingly seeking residences that provide genuine residential comfort, autonomous living, spacious layouts, and total privacy without sacrificing high-end concierge services.</p>
<p>Modern travelers no longer want to be confined to a standard 300-square-foot hotel room where every extra guest requires an expensive adjoining suite and daily dining depends entirely on overpriced room service menus. This guide provides an in-depth analysis of why fully furnished luxury serviced apartments—particularly in master-planned communities like <a href="/serviced-apartments-islamabad">Bahria Enclave Islamabad</a>—have emerged as the undisputed superior accommodation choice in the federal capital.</p>

<div class="my-8 p-6 bg-amber-50 border-l-4 border-[#C5A059] rounded-2xl shadow-sm">
    <h3 class="text-base font-extrabold text-slate-900 mb-2 flex items-center gap-2"><i class="fa-solid fa-bolt text-[#C5A059]"></i> AI & Executive Summary: Why Serviced Apartments Win</h3>
    <ul class="text-xs sm:text-sm text-slate-700 space-y-1.5 list-disc list-inside">
        <li><strong>Living Space:</strong> 1 to 4-bedroom residences offer 800 to 2,500+ sq. ft., providing 3x to 5x the space of standard luxury hotel rooms.</li>
        <li><strong>Culinary Autonomy:</strong> Fully equipped private kitchens with microwaves, refrigerators, and gas stovetops reduce dining expenses by up to 60%.</li>
        <li><strong>Cost Efficiency:</strong> Weekly savings of 15% and monthly discounts of up to 35% on <a href="/pricing">KPH Stay rates</a>.</li>
        <li><strong>Power Reliability:</strong> 24/7 uninterrupted dual solar and automatic heavy generator backup ensures zero downtime during outages.</li>
        <li><strong>Prime Tranquility:</strong> Located in Bahria Enclave against Margalla foothills, offering clean air, mountain panoramas, and gated 24/7 security.</li>
    </ul>
</div>

<h2>Space, Autonomy, and Architectural Freedom: The 3x Space Advantage</h2>
<p>The single greatest limitation of traditional hotel accommodation is square footage. A standard five-star hotel room in Islamabad typically measures between 280 and 380 square feet. When traveling as a family, with colleagues, or on an extended relocation assignment, living in a single enclosed bedroom quickly becomes claustrophobic.</p>
<p>At <a href="/rooms">KPH Stay Serviced Residences</a>, apartment layouts range from stylish 1-Bedroom Executive Suites (850 sq. ft.) to sprawling 2-Bedroom and 3-Bedroom Penthouses (1,400 to 2,600 sq. ft.). Each residence features distinct functional zones:</p>
<ul>
    <li><strong>Dedicated Living Lounges:</strong> Expansive seating areas equipped with plush designer sofas and 55-inch to 65-inch 4K Smart TVs with Netflix and streaming apps.</li>
    <li><strong>Private Dining Areas:</strong> Elegant dining tables that seat 4 to 8 people, ideal for family meals or private business meetings.</li>
    <li><strong>En-Suite Master Bedrooms:</strong> Fitted with King-size orthopaedic mattresses, blackout curtains, and walk-in wardrobe closets.</li>
    <li><strong>Private Scenic Balconies:</strong> Open-air terraces offering uninterrupted views of the Margalla Hills and Bahria Enclave green corridors.</li>
</ul>

<h2>Comprehensive Comparison: 5-Star Hotels vs. KPH Serviced Apartments</h2>
<div class="overflow-x-auto my-8">
    <table class="w-full text-left text-xs sm:text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
        <thead>
            <tr class="bg-slate-900 text-white font-bold">
                <th class="p-3.5 border-b border-slate-800">Feature</th>
                <th class="p-3.5 border-b border-slate-800">Traditional 5-Star Hotel</th>
                <th class="p-3.5 border-b border-slate-800 bg-[#C5A059] text-slate-900">KPH Stay Serviced Apartment</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr>
                <td class="p-3 font-bold">Average Usable Area</td>
                <td class="p-3">300 – 400 sq. ft.</td>
                <td class="p-3 font-semibold text-emerald-700">850 – 2,500+ sq. ft. (3x - 6x larger)</td>
            </tr>
            <tr>
                <td class="p-3 font-bold">Kitchen Facilities</td>
                <td class="p-3">Mini-fridge & kettle only</td>
                <td class="p-3 font-semibold text-emerald-700">Full Modular Kitchen (Stove, Microwave, Refrigerator, Cookware)</td>
            </tr>
            <tr>
                <td class="p-3 font-bold">Multi-Bedroom Family Privacy</td>
                <td class="p-3">Requires booking multiple separate rooms</td>
                <td class="p-3 font-semibold text-emerald-700">All under one private keyed front door</td>
            </tr>
            <tr>
                <td class="p-3 font-bold">24/7 Power Infrastructure</td>
                <td class="p-3">Generator backup available</td>
                <td class="p-3 font-semibold text-emerald-700">Dual Solar + Auto Commercial Generator Backup</td>
            </tr>
            <tr>
                <td class="p-3 font-bold">High-Speed Connectivity</td>
                <td class="p-3">Shared Wi-Fi (often throttled per device)</td>
                <td class="p-3 font-semibold text-emerald-700">Dedicated 100+ Mbps Optical Fiber Router per Unit</td>
            </tr>
            <tr>
                <td class="p-3 font-bold">Extended Stay Pricing</td>
                <td class="p-3">Flat nightly rates with minimal discounts</td>
                <td class="p-3 font-semibold text-emerald-700">15% Off Weekly / Up to 35% Off Monthly Bookings</td>
            </tr>
        </tbody>
    </table>
</div>

<h2>Why Location Matters: The Serenity and Security of Bahria Enclave</h2>
<p>While downtown Islamabad offers proximity to government secretariats, it also brings traffic congestion, noise pollution, and elevated security checkpoints. Situated just 20 minutes from the city center along the wide, scenic Kurri Road and Kuri Bypass, Bahria Enclave is widely recognized by the <a href="https://www.cda.gov.pk" target="_blank" rel="noopener noreferrer">Capital Development Authority (CDA)</a> corridor as one of Islamabad's most modern and secure master-planned residential enclaves.</p>
<p>Guests staying at KPH Stay in Bahria Enclave enjoy:</p>
<ul>
    <li><strong>Gated Security Infrastructure:</strong> 24/7 perimeter patrolling, CCTV surveillance, and controlled gate access.</li>
    <li><strong>Clean Mountain Air:</strong> Positioned adjacent to the pristine Margalla foothills and surrounded by manicured parks and fountains.</li>
    <li><strong>Modern Commercial Conveniences:</strong> Walkable access to supermarkets, gourmet bakeries, international fast-food chains, pharmacies, and banks in Sector C Commercial Zone.</li>
    <li><strong>Seamless Transit:</strong> Effortless road access to Rawal Lake, Serena Hotel, Shakarparian, and Islamabad International Airport via the Islamabad Expressway and Ring Corridors.</li>
</ul>

<h2>Culinary Autonomy: Why Having a Full Kitchen is a Game Changer</h2>
<p>One of the largest hidden expenses of any extended trip is food. Dining three times a day at hotel restaurants or relying on room service quickly doubles the cost of accommodation. More importantly, hotel food cannot replicate healthy, home-style meals tailored to specific dietary requirements, infant care, or elderly family members.</p>
<p>Every apartment at KPH Stay includes a full chef's kitchen fitted with marble countertops, custom cabinetry, heavy-duty gas burners, microwave ovens, large frost-free refrigerators, electric kettles, and complete dinnerware sets. Guests can easily prepare breakfast, brew artisanal coffee, or cook full family dinners with fresh ingredients sourced from nearby gourmet grocery markets.</p>

<h2>Essential Amenities for Modern Digital Nomads and Corporate Executives</h2>
<p>For business executives and remote professionals, reliable utilities are non-negotiable. Pakistan's urban centers occasionally experience municipal electrical grid fluctuations. To ensure zero disruption, KPH Stay features:</p>
<ol>
    <li><strong>Dual-Layer Power Backup:</strong> Synchronized solar energy banks and heavy-duty automatic commercial diesel generators keep air conditioning, heating, refrigeration, and lighting operational 24/7 without a second of downtime.</li>
    <li><strong>Dedicated Optical Fiber Wi-Fi:</strong> Each apartment has its own high-speed Wi-Fi router delivering unthrottled 100+ Mbps bandwidth for crystal-clear Zoom conferences and large file transfers.</li>
    <li><strong>Work Desks & Ergonomic Seating:</strong> Dedicated quiet study nooks designed for productive remote work.</li>
    <li><strong>Housekeeping & Linen Services:</strong> Scheduled professional housekeeping, fresh linen exchanges, and on-site automated laundry machines.</li>
</ol>

<h2>Exploring Islamabad: Proximity to Top Capital Landmarks</h2>
<p>During your stay, explore the finest cultural and natural attractions of the capital:</p>
<ul>
    <li><a href="https://www.iwmb.org.pk" target="_blank" rel="noopener noreferrer">Margalla Hills National Park</a> & Trail 3 / Trail 5: Just 15 minutes away for world-class hiking, birdwatching, and panoramic viewpoints.</li>
    <li><strong>Rawal Lake Promenade & Water Sports Club:</strong> 12 minutes away for evening boating and sunset lakeside walks.</li>
    <li><strong>Faisal Mosque & Centaurus Mall:</strong> 22 minutes away via Islamabad Highway for heritage architecture and luxury shopping.</li>
</ul>

<h2>Frequently Asked Questions (FAQ)</h2>
<div class="space-y-4 my-6">
    <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <h3 class="font-bold text-slate-900 text-sm mb-1">What is the check-in and check-out procedure at KPH Stay Islamabad?</h3>
        <p class="text-xs text-slate-600">Check-in begins at 2:00 PM and check-out is at 12:00 PM. We offer 24/7 front desk concierge and self-check-in options with digital smart locks upon request.</p>
    </div>
    <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <h3 class="font-bold text-slate-900 text-sm mb-1">Are utilities, Wi-Fi, and generator backup included in the daily rate?</h3>
        <p class="text-xs text-slate-600">Yes. All rates on <a href="/booking">kphstay.com</a> are 100% transparent and inclusive of electricity, 24/7 generator backup, high-speed optical fiber Wi-Fi, gas, and parking with zero hidden surcharges.</p>
    </div>
    <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <h3 class="font-bold text-slate-900 text-sm mb-1">Do you offer discounts for long-term or monthly stays?</h3>
        <p class="text-xs text-slate-600">Yes! We offer tiered long-term rates with 15% off for 7+ night stays and up to 35% discount for monthly reservations. You can check rates directly on our <a href="/pricing">Pricing Page</a> or <a href="/contact">contact our reservation team</a>.</p>
    </div>
</div>

<p class="mt-8 font-semibold text-slate-900">Ready to experience the ultimate in capital luxury? <a href="/booking" class="text-[#C5A059] underline hover:text-[#996515]">Reserve your furnished apartment in Islamabad today</a> with instant confirmation and pay on arrival options.</p>`,
        author: "Resort Editorial Team",
        imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
        category: "Islamabad Guide",
        portal: "stay",
        createdAt: "2026-09-01T10:00:00.000Z"
    },
    {
        id: "murree-bhurban-luxury-chalets-vacation-guide",
        title: "The Definitive Murree & Bhurban Vacation Guide: Mountain Chalets, Heated Suites & Four-Season Alpine Itineraries",
        slug: "murree-bhurban-luxury-chalets-vacation-guide",
        excerpt: "Plan the perfect alpine getaway to Murree Hills and Bhurban with our comprehensive guide on luxury heated chalets, seasonal weather tips, and curated 3-day itineraries.",
        content: `<h2>The Alpine Splendor of Murree Hills and Bhurban</h2>
<p>Rising over 7,500 feet above sea level, the pine-clad ridges of Murree and the serene forested slopes of Bhurban represent Pakistan's most accessible and beloved mountain getaways. Located just a smooth 60-minute drive from Islamabad via the four-lane Murree Expressway (N-75), this alpine sanctuary offers crisp mountain air, panoramic Himalayan vistas, lush pine forests, and a dramatic four-season climate that transforms the landscape every few months.</p>
<p>Whether you are seeking a romantic snow-covered winter holiday, a refreshing summer monsoon escape from the plains, or a peaceful autumn retreat among golden foliage, staying in a private <a href="/luxury-apartments-murree">luxury heated apartment or chalet in Murree</a> elevates your vacation from a standard hotel visit into an unforgettable mountain experience.</p>

<div class="my-8 p-6 bg-amber-50 border-l-4 border-[#C5A059] rounded-2xl shadow-sm">
    <h3 class="text-base font-extrabold text-slate-900 mb-2 flex items-center gap-2"><i class="fa-solid fa-mountain-sun text-[#C5A059]"></i> AI & Vacationer Summary: Murree & Bhurban Essentials</h3>
    <ul class="text-xs sm:text-sm text-slate-700 space-y-1.5 list-disc list-inside">
        <li><strong>Best Winter Travel:</strong> December through February for fresh snowfall, snow-covered pine forests, and cozy fireplace chalets.</li>
        <li><strong>Best Summer Travel:</strong> May through August for pleasant 18°C to 24°C temperatures and vibrant green valleys.</li>
        <li><strong>Transit & Roads:</strong> Travel via Islamabad-Murree Expressway (N-75). Winter travelers must carry snow chains and check <a href="https://www.pmd.gov.pk" target="_blank" rel="noopener noreferrer">PMD Weather Bulletins</a>.</li>
        <li><strong>Top Accommodations:</strong> <a href="/rooms">KPH Stay Heated Mountain Chalets</a> featuring central heating, electric blankets, private balconies, and dedicated parking.</li>
        <li><strong>Key Highlights:</strong> Bhurban Golf Course, Patriata (New Murree) Cable Car, Kashmir Point, and historic Mall Road.</li>
    </ul>
</div>

<h2>The Four Seasons of Murree: When Should You Visit?</h2>
<p>Each season in the Murree and Bhurban highlands offers a distinct atmosphere:</p>
<ul>
    <li><strong>Winter (December – February):</strong> Temperatures range from -5°C to 8°C. Heavy snowfall blankets the pine forests, turning the region into a winter wonderland. This is peak season for snow enthusiasts, honeymooners, and families who love cozy evenings by the fireplace.</li>
    <li><strong>Spring (March – April):</strong> The snow melts into crystal-clear mountain streams, wildflowers bloom across the terraced valleys, and the crisp spring breeze is revitalizing. Tourism crowds are light, making it ideal for quiet nature walks.</li>
    <li><strong>Summer (May – August):</strong> While the plains of Punjab and Sindh experience scorching 40°C+ heat, Murree enjoys pleasant daytime temperatures of 20°C to 25°C. Afternoon misty cloud covers and light monsoon showers create breathtaking atmospheric views.</li>
    <li><strong>Autumn (September – November):</strong> Characterized by deep blue skies, dry crisp air, golden pine needles, and high visibility across the snow-capped Himalayan ranges in the distant horizon.</li>
</ul>

<h2>Accommodation Spotlight: Why Heated Chalets Outclass Standard Hill Hotels</h2>
<p>A common grievance among hill station tourists in Pakistan is checking into cold, damp hotel rooms with inadequate heating. At high altitudes where winter nights plummet below freezing, reliable climate control is essential for health and comfort.</p>
<p>At <a href="/luxury-apartments-murree">KPH Stay Murree & Bhurban Residences</a>, every unit is engineered for mountain luxury:</p>
<ul>
    <li><strong>High-Efficiency Heating:</strong> High-BTU inverter climate systems, gas heaters, and multi-layer electric thermal under-blankets guarantee cozy warmth throughout the night.</li>
    <li><strong>24/7 Hot Water Geysers:</strong> Heavy-capacity instant gas and electric water heaters ensure uninterrupted steaming showers after a day on the snowy trails.</li>
    <li><strong>Floor-to-Ceiling Panoramic Windows:</strong> Double-glazed insulated glass panels keep cold drafts out while framing sweeping views of pine valleys and drifting mountain clouds.</li>
    <li><strong>Private Kitchens & Tea Lounges:</strong> Enjoy freshly brewed Kashmiri chai, hot soups, and homemade meals on your private balcony.</li>
</ul>

<h2>Curated 3-Day Alpine Itinerary for Murree & Bhurban</h2>
<div class="space-y-4 my-6">
    <div class="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2 text-amber-700">
            <span class="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-black">1</span>
            Day 1: Scenic Drive & Bhurban Pine Forest Sunset
        </h3>
        <p class="text-xs text-slate-600 mt-2 leading-relaxed">Depart Islamabad early morning via the smooth Murree Expressway (N-75). Check into your luxury suite at KPH Stay. In the afternoon, take a leisurely stroll through the pine trails around Bhurban and visit the scenic viewpoint overlooking the Jhelum river valley. Enjoy evening barbecue and Kashmiri tea on your private heated terrace.</p>
    </div>
    <div class="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2 text-amber-700">
            <span class="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-black">2</span>
            Day 2: Patriata Chairlift & Mall Road Heritage
        </h3>
        <p class="text-xs text-slate-600 mt-2 leading-relaxed">Head to Patriata (New Murree) to ride the world-class cable car and chairlift system ascending through dense oak and cedar canopies to the highest ridge. In the evening, explore the historic Mall Road, browse traditional handicraft bazaars, and dine on sizzling local mutton karahi at iconic hilltop restaurants.</p>
    </div>
    <div class="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2 text-amber-700">
            <span class="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-black">3</span>
            Day 3: Kashmir Point Morning Walk & Gentle Return
        </h3>
        <p class="text-xs text-slate-600 mt-2 leading-relaxed">Wake up to panoramic sunrise views over the Pir Panjal mountains. Take a morning walk to Kashmir Point and the Governor House forest loop. Enjoy a fresh breakfast prepared in your apartment's kitchen before checking out and taking a leisurely drive back to Islamabad.</p>
    </div>
</div>

<h2>Alpine Packing & Travel Advisory Checklist</h2>
<div class="overflow-x-auto my-6">
    <table class="w-full text-left text-xs sm:text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
        <thead>
            <tr class="bg-slate-900 text-white font-bold">
                <th class="p-3 border-b border-slate-800">Season</th>
                <th class="p-3 border-b border-slate-800">Average Temp</th>
                <th class="p-3 border-b border-slate-800">Must-Pack Clothing</th>
                <th class="p-3 border-b border-slate-800">Vehicle / Road Tip</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr>
                <td class="p-3 font-bold">Winter (Dec – Feb)</td>
                <td class="p-3 font-semibold text-blue-600">-5°C to 8°C</td>
                <td class="p-3">Thermal base layers, down jackets, waterproof boots, gloves, woolen beanies</td>
                <td class="p-3">Carry snow chains, anti-freeze coolant, check brake pads</td>
            </tr>
            <tr>
                <td class="p-3 font-bold">Spring (Mar – Apr)</td>
                <td class="p-3 font-semibold text-emerald-600">10°C to 18°C</td>
                <td class="p-3">Fleece jackets, light cardigans, comfortable walking sneakers</td>
                <td class="p-3">Clear scenic roads; monitor occasional spring showers</td>
            </tr>
            <tr>
                <td class="p-3 font-bold">Summer (May – Aug)</td>
                <td class="p-3 font-semibold text-amber-600">18°C to 25°C</td>
                <td class="p-3">Breathable cotton shirts, light sweaters for chilly evenings, umbrella</td>
                <td class="p-3">Peak season traffic; travel early morning to avoid rush</td>
            </tr>
            <tr>
                <td class="p-3 font-bold">Autumn (Sep – Nov)</td>
                <td class="p-3 font-semibold text-orange-600">8°C to 16°C</td>
                <td class="p-3">Windbreakers, trench coats, scarves, warm socks</td>
                <td class="p-3">Ideal dry driving conditions; clear road visibility</td>
            </tr>
        </tbody>
    </table>
</div>

<h2>Safety and Responsible Tourism Guidelines</h2>
<p>The <a href="https://tourism.punjab.gov.pk" target="_blank" rel="noopener noreferrer">Punjab Tourism Development Corporation (PTDC)</a> and National Highway Authority provide standard safety rules for Murree tourists. Always ensure your vehicle has good tire tread and functioning wiper blades. When traveling during heavy snowfall, verify road openness with local traffic police and stay in established properties with guaranteed generator and heating infrastructure.</p>

<h2>Frequently Asked Questions (FAQ)</h2>
<div class="space-y-4 my-6">
    <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <h3 class="font-bold text-slate-900 text-sm mb-1">How far is Murree and Bhurban from Islamabad?</h3>
        <p class="text-xs text-slate-600">Murree is approximately 55 km from Islamabad, taking roughly 50 to 60 minutes via the N-75 Expressway under normal traffic conditions. Bhurban is an additional 15 minutes beyond Murree town.</p>
    </div>
    <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <h3 class="font-bold text-slate-900 text-sm mb-1">Are KPH Stay apartments in Murree accessible during winter snowfall?</h3>
        <p class="text-xs text-slate-600">Yes! Our properties are situated along prime main access corridors that are prioritized for snow clearing by local authorities. We also provide on-site covered parking and 24/7 staff assistance.</p>
    </div>
    <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <h3 class="font-bold text-slate-900 text-sm mb-1">How can I book a heated chalet in Bhurban or Murree?</h3>
        <p class="text-xs text-slate-600">You can browse available chalets on our <a href="/rooms">Accommodations Page</a> and book instantly online via our <a href="/booking">Direct Booking Portal</a> with instant WhatsApp confirmation.</p>
    </div>
</div>

<p class="mt-8 font-semibold text-slate-900">Escape the ordinary. <a href="/booking" class="text-[#C5A059] underline hover:text-[#996515]">Book your luxury mountain chalet in Murree & Bhurban</a> today with KPH Stay.</p>`,
        author: "Alpine Concierge",
        imageUrl: "https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=800&q=80",
        category: "Murree Guide",
        portal: "stay",
        createdAt: "2026-09-05T11:00:00.000Z"
    },
    {
        id: "nathia-gali-galiyat-travel-guide-pine-chalets-hiking",
        title: "Nathia Gali & The Galiyat Highlands: Complete Travel Guide to Cloud-Touch Chalets, Mukshpuri Treks & Alpine Living",
        slug: "nathia-gali-galiyat-travel-guide-pine-chalets-hiking",
        excerpt: "Experience the pristine wilderness of Nathia Gali and the Galiyat range. Discover Mukshpuri and Miranjani hiking trails, Pipeline Track walks, and luxury chalets nestled in ancient pine forests.",
        content: `<h2>The Crown Jewel of the Galiyat Mountain Range</h2>
<p>Perched at an elevation of 8,200 feet (2,500 meters) in the heart of the Hazara region of Khyber Pakhtunkhwa, Nathia Gali is widely celebrated as the most serene and ecologically intact mountain resort in Northern Pakistan. Unlike more commercialized hill towns, Nathia Gali retains its pristine alpine charm: towering centuries-old Himalayan cedar (Deodar) and Blue Pine forests, rolling cloud banks that drift directly through your balcony, and tranquil trails where the only sounds are chirping birds and mountain breezes.</p>
<p>For nature enthusiasts, trekking adventurers, and families seeking refined alpine luxury, choosing a private <a href="/vacation-rentals-nathia-gali">luxury chalet or vacation rental in Nathia Gali</a> provides the ultimate mountain experience. This comprehensive guide covers top hiking tracks, seasonal weather insights, wildlife etiquette, and accommodation tips for an unforgettable holiday in the Galiyat.</p>

<div class="my-8 p-6 bg-amber-50 border-l-4 border-[#C5A059] rounded-2xl shadow-sm">
    <h3 class="text-base font-extrabold text-slate-900 mb-2 flex items-center gap-2"><i class="fa-solid fa-tree text-[#C5A059]"></i> AI & Trekker Brief: Nathia Gali Key Highlights</h3>
    <ul class="text-xs sm:text-sm text-slate-700 space-y-1.5 list-disc list-inside">
        <li><strong>Elevation:</strong> 2,500m (8,200 ft) – offers cool, refreshing alpine temperatures year-round (12°C to 20°C in summer; -7°C to 5°C in winter).</li>
        <li><strong>Iconic Treks:</strong> Mukshpuri Peak (2,800m), Miranjani Peak (2,960m), and the historic Dunga Gali to Ayubia Pipeline Track.</li>
        <li><strong>Scenic Stay:</strong> <a href="/rooms">KPH Stay Pine Valley Chalets</a> featuring fireplaces, heated bedrooms, mountain decks, and private kitchens.</li>
        <li><strong>Conservation:</strong> Managed under the <a href="https://www.gda.gkp.pk" target="_blank" rel="noopener noreferrer">Galiyat Development Authority (GDA)</a> eco-protection guidelines with rich biodiversity.</li>
        <li><strong>Connectivity:</strong> Located 32 km from Murree and 85 km from Islamabad via the scenic Galiyat Highway.</li>
    </ul>
</div>

<h2>World-Class Hiking Trails of Nathia Gali</h2>
<p>The Galiyat range is Pakistan's premier accessible trekking hub, offering diverse trails ranging from gentle historic forest paths to rewarding high-altitude summits:</p>

<h3>1. The Historic Pipeline Track (Dunga Gali to Ayubia)</h3>
<p>Constructed during the British colonial era to supply water to Murree, the famous Pipeline Track is a flat, 4-kilometer walking route that follows the gravity-fed water pipeline between Dunga Gali and Ayubia National Park. The trail winds through dense pine forest canopies, offering stunning views of the deep river valleys below. It is perfectly suited for families, children, and elderly travelers looking for an easy, meditative 1.5-hour nature walk with zero steep inclines.</p>

<h3>2. The Mukshpuri Peak Trek (Dunga Gali or Nathia Gali Route)</h3>
<p>Mukshpuri is the second highest peak in Galiyat (2,800 meters / 9,186 feet). The hike can be started from either Dunga Gali (steeper, 2.5 hours) or from Nathia Gali near the Pines Hotel (gentler, 3 hours). The trail winds through vibrant sub-alpine forests and carpets of mountain daisies before opening onto a breathtaking grassy plateau summit. On clear days, the summit rewards hikers with panoramic views of the Jhelum River, the snow-covered peaks of Kashmir, and the distant Nanga Parbat massif.</p>

<h3>3. The Miranjani Peak Expedition</h3>
<p>For experienced trekkers seeking a more strenuous challenge, Miranjani Peak is the highest point in Galiyat (2,960 meters / 9,711 feet). Starting from the Governor House trail in Nathia Gali, this 4.5-kilometer climb takes roughly 3.5 to 4.5 hours to summit. The upper ridge offers sweeping views of Tarbela Lake, Abbottabad city, and the majestic snow-capped peaks of the Kaghan Valley and Swat.</p>

<h2>Trekking Routes & Difficulty Comparison Matrix</h2>
<div class="overflow-x-auto my-8">
    <table class="w-full text-left text-xs sm:text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
        <thead>
            <tr class="bg-slate-900 text-white font-bold">
                <th class="p-3 border-b border-slate-800">Trail Name</th>
                <th class="p-3 border-b border-slate-800">Distance (One Way)</th>
                <th class="p-3 border-b border-slate-800">Avg Duration</th>
                <th class="p-3 border-b border-slate-800">Difficulty Level</th>
                <th class="p-3 border-b border-slate-800">Best For</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr>
                <td class="p-3 font-bold">Pipeline Track</td>
                <td class="p-3">4.0 km</td>
                <td class="p-3">1.5 hours</td>
                <td class="p-3 font-semibold text-emerald-600">Easy (Flat Path)</td>
                <td class="p-3">Families, seniors, casual photography</td>
            </tr>
            <tr>
                <td class="p-3 font-bold">Mukshpuri Peak</td>
                <td class="p-3">3.5 km</td>
                <td class="p-3">2.5 – 3.0 hours</td>
                <td class="p-3 font-semibold text-amber-600">Moderate</td>
                <td class="p-3">Nature lovers, sunset viewpoints, meadow picnics</td>
            </tr>
            <tr>
                <td class="p-3 font-bold">Miranjani Peak</td>
                <td class="p-3">4.5 km</td>
                <td class="p-3">3.5 – 4.5 hours</td>
                <td class="p-3 font-semibold text-rose-600">Challenging / Strenuous</td>
                <td class="p-3">Experienced trekkers, alpine panorama seekers</td>
            </tr>
        </tbody>
    </table>
</div>

<h2>Where to Stay: Cloud-Touch Chalets & Heated Alpine Suites</h2>
<p>Because Nathia Gali sits at an altitude of over 8,000 feet, evening and morning temperatures are brisk throughout the year, and winters bring heavy snowfalls exceeding 4 to 6 feet. Standard tourist lodges often suffer from poor insulation, freezing bathrooms, and lack of warm living spaces.</p>
<p>At <a href="/vacation-rentals-nathia-gali">KPH Stay Nathia Gali Chalets</a>, guests enjoy a seamless balance between rustic alpine charm and 5-star modern hospitality:</p>
<ul>
    <li><strong>Cozy Living Rooms with Fireplaces:</strong> Warm up beside a traditional crackling wood fire or high-capacity heating systems while watching mist roll across the pine valley.</li>
    <li><strong>Heated Bedrooms & Electric Thermal Blankets:</strong> Plush multi-layered bedding and orthopaedic mattresses guarantee sound sleep in sub-zero alpine conditions.</li>
    <li><strong>Full Private Kitchens:</strong> Prepare steaming pots of soup, noodles, and authentic curries after a long day of mountain hiking.</li>
    <li><strong>Private Viewing Terraces:</strong> High-altitude balconies perched right on the edge of the forest canopy, offering unmatched stargazing under clear alpine skies.</li>
</ul>

<h2>Eco-Tourism & Responsible Travel Guidelines</h2>
<p>The Ayubia and Nathia Gali national parks are home to rare Himalayan wildlife, including the Common Leopard, Rhesus Macaque monkeys, flying squirrels, and exotic pheasant species (such as the Kalij Pheasant). In collaboration with <a href="https://www.wwfpak.org" target="_blank" rel="noopener noreferrer">WWF Pakistan</a> and the <a href="https://kptourism.com" target="_blank" rel="noopener noreferrer">Khyber Pakhtunkhwa Culture & Tourism Authority (KPCTA)</a>, travelers are urged to practice Leave-No-Trace principles:</p>
<ol>
    <li>Never feed wild monkeys or wildlife along the trails, as human food disrupts their natural foraging behavior.</li>
    <li>Carry all plastic bottles, wrappers, and trash back to designated disposal bins in the town center.</li>
    <li>Stick to marked trails to prevent soil erosion along delicate alpine meadows.</li>
</ol>

<h2>Frequently Asked Questions (FAQ)</h2>
<div class="space-y-4 my-6">
    <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <h3 class="font-bold text-slate-900 text-sm mb-1">What is the best route to drive to Nathia Gali from Islamabad?</h3>
        <p class="text-xs text-slate-600">The most popular and scenic route is via the Murree Expressway (N-75) to Sunny Bank, then continuing along the Galiyat Highway past Changla Gali, Dungagali, and into Nathia Gali (approx. 2.5 to 3 hours total drive).</p>
    </div>
    <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <h3 class="font-bold text-slate-900 text-sm mb-1">Are KPH Stay chalets in Nathia Gali suitable for large family groups?</h3>
        <p class="text-xs text-slate-600">Yes! We offer 2-Bedroom, 3-Bedroom, and 4-Bedroom private chalets that accommodate up to 8 to 12 guests with spacious lounges, multiple en-suite bathrooms, and dining areas under one private roof.</p>
    </div>
    <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <h3 class="font-bold text-slate-900 text-sm mb-1">Do you provide heaters and hot water during winter snow season?</h3>
        <p class="text-xs text-slate-600">Absolutely. All KPH Stay Nathia Gali residences feature heavy-duty room heating, electric thermal under-blankets, and instant 24/7 hot water geysers included in the rate.</p>
    </div>
</div>

<p class="mt-8 font-semibold text-slate-900">Experience true alpine tranquility. <a href="/booking" class="text-[#C5A059] underline hover:text-[#996515]">Book your private luxury chalet in Nathia Gali</a> today with KPH Stay.</p>`,
        author: "Galiyat Guide",
        imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
        category: "Nathia Gali Guide",
        portal: "stay",
        createdAt: "2026-09-10T09:00:00.000Z"
    },
    {
        id: "pine-valley-hiking-trails-islamabad",
        title: "Pine Valley Hiking Trails: Exploring Margalla Foothills",
        slug: "pine-valley-hiking-trails-islamabad",
        excerpt: "A hiker's roadmap detailing secret paths, flora, and sunrise spots adjacent to KPH Stay Islamabad.",
        content: `<p>Located in the scenic foothills of Islamabad, KPH Stay offers direct access to some of the most serene, untouched hiking trails in the Margalla region. These trails wind through thick pine clusters, leading to panoramic lookouts of the capital valley.</p>
                   <p>Our favorite trail—Trail 3B—starts just 5 minutes from the resort lobby. It takes hikers on a moderate 45-minute climb, leading to Pinecrest Ridge. Sunrise from this point is breathtaking, offering panoramic views of Rawal Lake and the city skyline in a fresh, mist-covered alpine landscape.</p>
                  <p>Our concierge desk provides complimentary hiking kits, including map layouts, local safety guidelines, water bottles, and walking sticks. Ensure you wear sturdy footwear and head out early to experience the raw morning tranquility.</p>`,
        author: "Resort Concierge",
        imageUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
        category: "Pine Valley Guide",
        portal: "stay",
        createdAt: "2026-08-15T10:00:00.000Z"
    },
    {
        id: "spa-retreat-launch-kaghan-resorts",
        title: "Luxury Retreat Packages: Golden Hours Spa Launch",
        slug: "spa-retreat-launch-kaghan-resorts",
        excerpt: "Indulge in absolute alpine relaxation. Discover our newly launched hot-stone sauna and Swedish massage treatments.",
        content: `<p>KPH Stay is proud to launch its Golden Hours Wellness Spa, a dedicated sanctuary featuring Swedish therapy, hot-stone saunas, and organic pine oil aromatherapy.</p>
                  <p>Designed to heal mind and body, our wellness packages cater to weekend stays and corporate travelers. Guests staying in Executive and Presidential Suites receive complimentary 30-minute relaxation coupons upon checking in.</p>
                  <p>Enjoy panoramic glass walls overlooking the mountain forests while getting custom therapies from our professional spa technicians. Book your slots in advance during peak season.</p>`,
        author: "Resort Manager",
        imageUrl: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
        category: "Stay Offers",
        portal: "stay",
        createdAt: "2026-08-10T12:00:00.000Z"
    },
    {
        id: "nathia-gali-summer-travel-guide",
        title: "Nathia Gali Summer Travel Guide: Forest Walks & Mountain Views",
        slug: "nathia-gali-summer-travel-guide",
        excerpt: "Discover the best viewpoints, hiking tracks, local cafes, and weather tips for an unforgettable mountain retreat in Nathia Gali.",
        content: `<p>Perched high in the Galiyat range, Nathia Gali remains one of Pakistan's most enchanting hill stations. With lush pine forests, cool summer breezes, and sweeping views of snow-capped peaks, it is the ultimate destination for nature lovers and families seeking respite from urban heat.</p>
                  <p>Key highlights include the famous Pipeline Track—an easy 4-kilometer walk connecting Dunga Gali to Ayubia beneath towering pines—and the hike up Mukshpuri Peak for 360-degree vistas of the surrounding valleys.</p>
                  <p>Stay with KPH Stay in Nathia Gali for luxury chalets with heated rooms, cozy fireplaces, and panoramic mountain balconies.</p>`,
        author: "Editorial Team",
        imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
        category: "Travel Guide",
        portal: "stay",
        createdAt: "2026-08-01T08:30:00.000Z"
    }
];

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
    return '<!DOCTYPE html><html><head><title>404 Page Not Found | KPH Stay</title><meta name="robots" content="noindex, follow"></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h1>404 - Suite or Article Not Found</h1><p>The requested accommodation or blog article could not be found.</p><a href="/">Return to Lobby</a></body></html>';
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

    // 2. Pre-render Blogs feed (Stay Portal)
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
                <img src="${escapeHTML(img)}" alt="${escapeHTML(b.title || 'Resort Blog')}" class="w-full h-full object-cover">
            </div>
            <div class="flex-grow">
                <span class="text-[#B8860B] font-extrabold text-[10px] uppercase tracking-widest block mb-2 flex items-center gap-1.5"><i class="fa-solid fa-tag text-amber-500"></i> ${escapeHTML(b.category || 'Travel Guide')}</span>
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

    // Collect ALL images without limits (deduplicated)
    const imageSet = new Set();
    if (room.images && Array.isArray(room.images)) {
        room.images.forEach(img => { if (img && typeof img === 'string' && img.trim()) imageSet.add(img.trim()); });
    }
    if (room.image && typeof room.image === 'string' && room.image.trim()) {
        imageSet.add(room.image.trim());
    }
    const allRoomImages = imageSet.size > 0 ? Array.from(imageSet) : [roomImg];

    // 7. Inject Full Body HTML Elements
    modified = modified.replace(/<span id="breadcrumb-room-name"[^>]*>.*?<\/span>/i, `<span id="breadcrumb-room-name" class="text-slate-900 font-bold">${escapeHTML(cleanRoomName)}</span>`);
    modified = modified.replace(/<h1 id="detail-title"[^>]*>.*?<\/h1>/i, `<h1 id="detail-title" class="text-2xl md:text-4xl font-bold outfit text-[#0B0F19]">${escapeHTML(cleanRoomName)}</h1>`);
    modified = modified.replace(/<span id="detail-price-daily"[^>]*>.*?<\/span>/i, `<span id="detail-price-daily" class="text-2xl font-black text-[#C5A059] outfit">${formatPKR(pkrPrice)}</span>`);
    modified = modified.replace(/<span id="detail-rate-daily"[^>]*>.*?<\/span>/i, `<span id="detail-rate-daily" class="text-sm font-bold mt-0.5">${formatPKR(pkrPrice)} / night</span>`);
    
    if (room.description) {
        modified = modified.replace(/<div id="detail-description"[^>]*>[\s\S]*?<\/div>/i, `<div id="detail-description" class="text-slate-600 text-sm leading-relaxed font-light space-y-3">${room.description}</div>`);
    }

    modified = modified.replace(/<img id="gallery-main-img"[^>]*>/i, `<img id="gallery-main-img" src="${roomImg}" alt="${escapeHTML(cleanRoomName)} - Furnished Apartment in ${escapeHTML(city)}" class="w-full h-full object-cover transition-all duration-500">`);
    modified = modified.replace(/<span id="gallery-count"[^>]*>.*?<\/span>/i, `<span id="gallery-count">${allRoomImages.length}</span>`);

    // Prerender all image thumbnails directly in static HTML for web & image crawlers
    const thumbnailsHtml = allRoomImages.map((img, idx) => `
        <button class="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 border-slate-200 transition-all cursor-pointer">
            <img src="${escapeHTML(img)}" alt="${escapeHTML(cleanRoomName)} photo ${idx + 1} in ${escapeHTML(city)}, Pakistan" class="w-full h-full object-cover" loading="lazy" itemprop="image">
        </button>
    `).join('\n');
    modified = modified.replace(/<div id="gallery-thumbnails"[^>]*>[\s\S]*?<\/div>/i, `<div id="gallery-thumbnails" class="flex gap-3 overflow-x-auto pb-2 scrollbar-thin hide-scrollbar">\n${thumbnailsHtml}\n</div>`);

    // Add semantic noscript image gallery for Googlebot
    const noscriptGallery = `
    <noscript>
        <div class="p-6 bg-slate-50 rounded-2xl my-6 border border-slate-200">
            <h2 class="text-base font-bold text-slate-900 mb-3">${escapeHTML(cleanRoomName)} Photo Gallery (${allRoomImages.length} Photos)</h2>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                ${allRoomImages.map((img, idx) => `<img src="${escapeHTML(img)}" alt="${escapeHTML(cleanRoomName)} - Photo ${idx + 1} (${escapeHTML(city)}, Pakistan)" class="rounded-xl object-cover w-full h-32" itemprop="image">`).join('\n')}
            </div>
        </div>
    </noscript>
    `;
    modified = modified.replace(/<\/main>/i, `${noscriptGallery}\n</main>`);

    // 8. Structured Schema Graph (Breadcrumbs, Apartment / VacationRental with full ImageObject photo array, FAQPage)
    const photoObjects = allRoomImages.map((imgUrl, idx) => ({
        "@type": "ImageObject",
        "contentUrl": imgUrl,
        "url": imgUrl,
        "name": `${cleanRoomName} - Photo ${idx + 1}`,
        "caption": `${cleanRoomName} photo ${idx + 1} - fully furnished accommodation in ${city}, Pakistan`
    }));

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
                "image": allRoomImages,
                "photo": photoObjects,
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
    const postTitle = `${escapeHTML(post.title)} | KPH Stay Resort Blog`;
    const rawExcerpt = post.excerpt || post.description || post.title;
    const postDesc = escapeHTML(rawExcerpt.slice(0, 160));
    const postSlug = post.slug || slugify(post.title || 'blog');
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

    // 2. Inject Static DOM Elements to replace "Loading Luxury Travel Blog..." skeleton
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
                        ${escapeHTML(b.category || 'Travel Guide')}
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

        // Merge Firestore blogs with default seeds (Firestore takes precedence, seeds fill any missing items)
        const blogMap = new Map();
        (blogs || []).forEach(b => {
            const key = b.slug || b.id;
            if (key) blogMap.set(key, b);
        });
        DEFAULT_STAY_BLOGS.forEach(b => {
            const key = b.slug || b.id;
            if (key && !blogMap.has(key)) blogMap.set(key, b);
        });
        const allBlogs = Array.from(blogMap.values());

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
            html = prerenderIndex(html, rooms, allBlogs);
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
                targetPost = (allBlogs || []).find(b => 
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

            if (!targetPost && allBlogs.length > 0) {
                targetPost = allBlogs[0];
            }
            if (targetPost) {
                html = prerenderBlogPost(html, targetPost);
            }
        } else if (templateFile === 'blog.html') {
            html = prerenderBlog(html, allBlogs);
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
