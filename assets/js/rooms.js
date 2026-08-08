// Kaghan Hotel - Rooms Explorer Module
// Handles filtering, sorting, card rendering, and room details modals.

(function() {
    // Initialize Rooms Page actions on load
    document.addEventListener('DOMContentLoaded', async () => {
        // Exit if not on the rooms layout page
        if (!document.getElementById('rooms-grid')) return;

        await initRoomsPage();
    });

    // Pagination & Filter Globals
    let currentPage = 1;
    const itemsPerPage = 6;
    let currentFilteredRooms = [];

    async function initRoomsPage() {
        renderNavbar();

        // Populate dynamic filters before initial render
        await populateFilters();

        setupRoomsEventListeners();

        // Listen for real-time rooms updates
        window.addEventListener('kaghan-db-rooms', () => {
            applyFilters();
        });
        window.addEventListener('kaghan-db-categories', async () => {
            await populateFilters();
            applyFilters();
        });
        window.addEventListener('kaghan-db-locations', async () => {
            await populateFilters();
            applyFilters();
        });

        await loadParams();
    }

    // Leaflet Map Globals
    let mapInstance = null;
    let mapMarkers = [];
    let isMapMode = false;

    window.toggleMapMode = () => {
        isMapMode = !isMapMode;
        const gridContainer = document.getElementById('rooms-grid-container');
        const mapContainer = document.getElementById('rooms-map-container');
        const btnText = document.getElementById('toggle-map-text');
        const btnIcon = document.querySelector('#toggle-map-btn i');

        if (isMapMode) {
            gridContainer.classList.remove('w-full');
            gridContainer.classList.add('w-1/2'); // Split layout
            
            mapContainer.classList.remove('w-0', 'opacity-0', 'hidden', 'lg:block');
            mapContainer.classList.add('w-1/2', 'opacity-100');
            
            btnText.innerText = 'Hide Map';
            btnIcon.className = 'fa-solid fa-list';

            // Initialize or resize map
            setTimeout(() => {
                if (!mapInstance && typeof L !== 'undefined') {
                    initMap();
                } else if (mapInstance) {
                    mapInstance.invalidateSize();
                }
            }, 300);
        } else {
            gridContainer.classList.remove('w-1/2');
            gridContainer.classList.add('w-full');
            
            mapContainer.classList.remove('w-1/2', 'opacity-100');
            mapContainer.classList.add('w-0', 'opacity-0', 'hidden', 'lg:block');
            
            btnText.innerText = 'Show Map';
            btnIcon.className = 'fa-solid fa-map-location-dot';
        }
    };

    function initMap() {
        mapInstance = L.map('rooms-map').setView([33.7294, 73.0931], 11); // Default to Islamabad
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapInstance);
        applyFilters(); // Draw markers for current filtered set
    }

    function updateMapMarkers(rooms) {
        if (!mapInstance) return;

        // Clear existing markers
        mapMarkers.forEach(m => mapInstance.removeLayer(m));
        mapMarkers = [];

        // Bounds to auto-zoom
        const bounds = L.latLngBounds();

        rooms.forEach(room => {
            let lat = room.lat;
            let lng = room.lng;
            
            if (!lat || !lng) {
                const locStr = (room.location || '').toLowerCase();
                if (locStr.includes('nathia')) { lat = 34.0722; lng = 73.3831; }
                else if (locStr.includes('murree')) { lat = 33.9070; lng = 73.3943; }
                else { lat = 33.7294 + (Math.random()*0.02 - 0.01); lng = 73.0931 + (Math.random()*0.02 - 0.01); }
            }

            const priceText = KaghanUI.formatPKR(room.priceDaily || room.price || 0);
            
            // Custom divIcon for price bubble marker (Airbnb style)
            const icon = L.divIcon({
                className: 'custom-map-price-marker',
                html: `<div class="leaflet-price-bubble" data-room-id="${room.id}">${priceText}</div>`,
                iconSize: [85, 32],
                iconAnchor: [42, 16]
            });

            const marker = L.marker([lat, lng], { icon: icon }).addTo(mapInstance);
            bounds.extend([lat, lng]);

            // Popup logic
            marker.bindPopup(`
                <div class="p-2 w-52 font-sans">
                    <div class="relative h-28 rounded-xl overflow-hidden mb-2">
                        <img src="${KaghanSafe.escapeHTML(room.image)}" class="w-full h-full object-cover">
                        <div class="absolute top-2 right-2 backdrop-blur-md bg-black/60 px-2 py-0.5 rounded-full text-[9px] font-bold text-[#C5A059]">★ ${room.rating || '5.0'}</div>
                    </div>
                    <h4 class="font-bold text-sm text-slate-900 leading-tight mb-1">${KaghanSafe.escapeHTML(room.name)}</h4>
                    <p class="text-xs text-[#C5A059] font-bold">${priceText} <span class="text-slate-500 font-normal">/ Night</span></p>
                    <a href="room-details.html?id=${room.id}" class="block text-center bg-slate-900 text-white text-xs py-1.5 rounded-xl mt-2 font-bold hover:bg-[#C5A059] transition-colors">View Stay</a>
                </div>
            `);

            mapMarkers.push(marker);
        });

        if (mapMarkers.length > 0) {
            mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }

    function highlightMapBubble(roomId, isHovered) {
        if (!mapInstance) return;
        const bubbles = document.querySelectorAll(`.leaflet-price-bubble[data-room-id="${roomId}"]`);
        bubbles.forEach(b => {
            if (isHovered) b.classList.add('highlighted');
            else b.classList.remove('highlighted');
        });
    }

    window.scrollCategoryBar = (direction) => {
        const container = document.getElementById('firestore-category-pills') || document.getElementById('custom-category-filters');
        if (!container) return;
        const scrollAmount = 260;
        container.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    window.clearSearchInput = () => {
        const heroInput = document.getElementById('filter-search-hero');
        const mainInput = document.getElementById('filter-search');
        if (heroInput) heroInput.value = '';
        if (mainInput) mainInput.value = '';
        const clearBtn = document.getElementById('clear-search-btn');
        if (clearBtn) clearBtn.classList.add('hidden');
        applyFilters();
    };

    window.syncAndApplyFilter = (targetId, value) => {
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
            targetEl.value = value;
        }
        if (targetId === 'filter-search') {
            const heroInput = document.getElementById('filter-search-hero');
            const clearBtn = document.getElementById('clear-search-btn');
            if (heroInput && heroInput.value !== value) heroInput.value = value;
            if (clearBtn) {
                if (value) clearBtn.classList.remove('hidden');
                else clearBtn.classList.add('hidden');
            }
        }
        if (targetId === 'filter-location') {
            const q = document.getElementById('quick-filter-location');
            if (q && q.value !== value) q.value = value;
            const l = document.getElementById('filter-location');
            if (l && l.value !== value) l.value = value;
        }
        if (targetId === 'filter-category') {
            const cSelect = document.getElementById('filter-category');
            if (cSelect && cSelect.value !== value) cSelect.value = value;

            // Highlight active category pill
            const pills = document.querySelectorAll('.category-pill-btn');
            pills.forEach(p => {
                const val = p.getAttribute('data-value');
                if (val === value) {
                    p.className = 'category-pill-btn group flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer bg-[#C5A059] text-white shadow-md ring-2 ring-[#C5A059]/40';
                } else {
                    p.className = 'category-pill-btn group flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer bg-white/5 border border-white/15 text-white/80 hover:bg-white/10 hover:text-white';
                }
            });
        }
        applyFilters();
    };

    async function populateFilters() {
        // Fetch categories and rooms directly from Firestore
        const firestoreCategories = await KaghanDB.getCategories();
        const locations = await KaghanDB.getLocations();
        const rooms = await KaghanDB.getRooms();

        // Preset category mapping & icon metadata
        const categoryMeta = {
            '07': { label: 'Penthouse', icon: 'fa-building-user' },
            'penthouse': { label: 'Penthouse', icon: 'fa-building-user' },
            '08': { label: 'General Room', icon: 'fa-bed' },
            'general room': { label: 'General Room', icon: 'fa-bed' },
            'general': { label: 'General Room', icon: 'fa-bed' },
            '09': { label: 'Valley View Room', icon: 'fa-mountain-sun' },
            'valley view room': { label: 'Valley View Room', icon: 'fa-mountain-sun' },
            'valley view': { label: 'Valley View Room', icon: 'fa-mountain-sun' },
            'studio': { label: 'Studio Furnished', icon: 'fa-cube' },
            'studio furnished': { label: 'Studio Furnished', icon: 'fa-cube' },
            '1bed': { label: '1 Bed Furnished', icon: 'fa-bed' },
            '1-bed': { label: '1 Bed Furnished', icon: 'fa-bed' },
            '1bed furnished': { label: '1 Bed Furnished', icon: 'fa-bed' },
            '1 bed furnished': { label: '1 Bed Furnished', icon: 'fa-bed' },
            '1 bed': { label: '1 Bed Furnished', icon: 'fa-bed' },
            '2bed': { label: '2 Bed Furnished', icon: 'fa-door-open' },
            '2-bed': { label: '2 Bed Furnished', icon: 'fa-door-open' },
            '2bed furnished': { label: '2 Bed Furnished', icon: 'fa-door-open' },
            '2 bed furnished': { label: '2 Bed Furnished', icon: 'fa-door-open' },
            '2 bed': { label: '2 Bed Furnished', icon: 'fa-door-open' },
            '3bed': { label: '3 Bed Furnished', icon: 'fa-house-chimney' },
            '3-bed': { label: '3 Bed Furnished', icon: 'fa-house-chimney' },
            '3bed furnished': { label: '3 Bed Furnished', icon: 'fa-house-chimney' },
            '3 bed furnished': { label: '3 Bed Furnished', icon: 'fa-house-chimney' },
            '3 bed': { label: '3 Bed Furnished', icon: 'fa-house-chimney' },
            '4bed': { label: '4 Bed Furnished', icon: 'fa-building' },
            '4-bed': { label: '4 Bed Furnished', icon: 'fa-building' },
            '4bed furnished': { label: '4 Bed Furnished', icon: 'fa-building' },
            '4 bed furnished': { label: '4 Bed Furnished', icon: 'fa-building' },
            '4 bed': { label: '4 Bed Furnished', icon: 'fa-building' },
            'farmhouse': { label: 'Furnished Farmhouse', icon: 'fa-tree' },
            'furnished farmhouse': { label: 'Furnished Farmhouse', icon: 'fa-tree' }
        };

        // Map to hold merged category items: id -> { id, label, logo, icon, count }
        const categoryMap = new Map();

        // 1. Add Firestore 'categories' collection documents (saved via admin panel)
        (firestoreCategories || []).forEach(cat => {
            if (!cat) return;
            const rawId = (cat.id || cat.name || cat.label || '').toString().trim();
            if (!rawId) return;
            const key = rawId.toLowerCase();
            const meta = categoryMeta[key] || {};
            categoryMap.set(key, {
                id: cat.id || rawId,
                label: cat.label || cat.name || meta.label || rawId,
                logo: cat.logo || cat.image || cat.iconUrl || meta.logo || null,
                icon: cat.icon || meta.icon || 'fa-hotel',
                count: 0
            });
        });

        // 2. Scan Firestore rooms to dynamically extract any room categories present in Firestore
        (rooms || []).forEach(r => {
            const rCat = (r.category || r.categoryId || r.categoryName || r.type || '').toString().trim();
            if (!rCat) return;

            const key = rCat.toLowerCase();
            const meta = categoryMeta[key] || {};

            if (!categoryMap.has(key)) {
                categoryMap.set(key, {
                    id: r.category || r.categoryId || rCat,
                    label: r.categoryName || meta.label || rCat,
                    logo: meta.logo || null,
                    icon: meta.icon || 'fa-hotel',
                    count: 0
                });
            }
        });

        // 3. Count matching rooms for each category
        rooms.forEach(r => {
            const rCat = (r.category || r.categoryId || r.categoryName || r.type || '').toString().toLowerCase().trim();
            const rName = (r.name || '').toString().toLowerCase();

            categoryMap.forEach((catObj, key) => {
                if (rCat === key || rCat.includes(key) || key.includes(rCat) || rName.includes(key)) {
                    catObj.count++;
                } else if (key.includes('1bed') && (rCat.includes('1') || rName.includes('1'))) {
                    catObj.count++;
                } else if (key.includes('2bed') && (rCat.includes('2') || rName.includes('2'))) {
                    catObj.count++;
                } else if (key.includes('3bed') && (rCat.includes('3') || rName.includes('3'))) {
                    catObj.count++;
                } else if (key.includes('4bed') && (rCat.includes('4') || rName.includes('4'))) {
                    catObj.count++;
                } else if (key.includes('studio') && (rCat.includes('studio') || rName.includes('studio'))) {
                    catObj.count++;
                } else if (key.includes('farm') && (rCat.includes('farm') || rName.includes('farm'))) {
                    catObj.count++;
                }
            });
        });

        const validCategories = Array.from(categoryMap.values());
        const totalRoomsCount = rooms.length;

        // Update category count badge
        const countBadge = document.getElementById('firestore-category-count-badge');
        if (countBadge) {
            countBadge.textContent = `${totalRoomsCount} Available Stays`;
        }

        // Render Firestore Category Pills Container
        const container = document.getElementById('firestore-category-pills') || document.getElementById('custom-category-filters');
        const categorySelect = document.getElementById('filter-category');
        const currentCatVal = categorySelect ? (categorySelect.value || 'all') : 'all';

        if (container) {
            let html = `
                <button data-value="all" type="button" onclick="syncAndApplyFilter('filter-category', 'all')" class="category-pill-btn group flex items-center gap-2 px-4 py-2 rounded-full text-xs transition-all shrink-0 cursor-pointer ${currentCatVal === 'all' ? 'bg-[#C5A059] text-white font-bold shadow-md ring-2 ring-[#C5A059]/40' : 'bg-white/5 border border-white/15 text-white/80 hover:bg-white/10 hover:text-white'}">
                    <i class="fa-solid fa-border-all text-[#FFDF9E]"></i>
                    <span>All Suites</span>
                    <span class="ml-1 text-[10px] px-2 py-0.5 rounded-full ${currentCatVal === 'all' ? 'bg-black/25 text-white font-bold' : 'bg-white/10 text-slate-300'}">${totalRoomsCount}</span>
                </button>
            `;

            validCategories.forEach(cat => {
                const catId = (cat.id || cat.name || '').toString();
                const catKey = catId.toLowerCase().trim();
                const isSelected = currentCatVal.toLowerCase() === catKey;

                const iconOrLogo = (cat.logo || cat.image)
                    ? `<img src="${KaghanSafe.escapeHTML(cat.logo || cat.image)}" alt="${KaghanSafe.escapeHTML(cat.label || cat.name || cat.id)}" class="w-4 h-4 object-contain rounded-full">`
                    : `<i class="fa-solid ${cat.icon || 'fa-hotel'} text-[#FFDF9E]"></i>`;

                html += `
                    <button data-value="${cat.id}" type="button" onclick="syncAndApplyFilter('filter-category', '${cat.id}')" class="category-pill-btn group flex items-center gap-2 px-4 py-2 rounded-full text-xs transition-all shrink-0 cursor-pointer ${isSelected ? 'bg-[#C5A059] text-white font-bold shadow-md ring-2 ring-[#C5A059]/40' : 'bg-white/5 border border-white/15 text-white/80 hover:bg-white/10 hover:text-white'}">
                        ${iconOrLogo}
                        <span>${KaghanSafe.escapeHTML(cat.label || cat.name || cat.id)}</span>
                        <span class="ml-1 text-[10px] px-2 py-0.5 rounded-full ${isSelected ? 'bg-black/25 text-white font-bold' : 'bg-white/10 text-slate-300'}">${cat.count}</span>
                    </button>
                `;
            });

            container.innerHTML = html;
        }

        // Update Hidden Category Select
        if (categorySelect) {
            categorySelect.innerHTML = `<option value="all">All Categories</option>` +
                validCategories.map(c => `<option value="${c.id}">${c.label || c.name || c.id}</option>`).join('');
            categorySelect.value = currentCatVal;
        }

        // Update Location Dropdowns from Firestore
        const quickLoc = document.getElementById('quick-filter-location');
        if (quickLoc) {
            let currentLocVal = quickLoc.value || 'all';
            quickLoc.innerHTML = `<option value="all" class="bg-[#0F172A] text-white">📍 All Destinations</option>` +
                locations.map(l => `<option value="${l.id}" class="bg-[#0F172A] text-white">${l.label || l.name}</option>`).join('');
            quickLoc.value = currentLocVal;
        }

        const locationSelect = document.getElementById('filter-location');
        if (locationSelect) {
            let currentLocVal = locationSelect.value || 'all';
            locationSelect.innerHTML = `<option value="all">All Locations</option>` +
                locations.map(l => `<option value="${l.id}">${l.label || l.name}</option>`).join('');
            locationSelect.value = currentLocVal;
        }
    }

    function rebindCustomCategoryButtons() {
        const customCategoryContainer = document.getElementById('custom-category-filters');
        const categorySelect = document.getElementById('filter-category');
        if (customCategoryContainer) {
            const btns = customCategoryContainer.querySelectorAll('.category-filter-btn');
            btns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const value = btn.getAttribute('data-value');
                    if (categorySelect) {
                        categorySelect.value = value;
                        categorySelect.dispatchEvent(new Event('change'));
                    }
                });
            });
        }
    }

    function renderNavbar() {
        if (window.renderNavbar) window.renderNavbar();
    }

    function setupRoomsEventListeners() {
        // Mobile Navigation Drawer Toggle handled by shared.js

        // Live updating label for price selector slider
        const priceSlider = document.getElementById('filter-price');
        if (priceSlider) {
            priceSlider.addEventListener('input', () => {
                const val = priceSlider.value;
                document.getElementById('price-val').innerText = KaghanUI.formatPKR(val);
                applyFilters();
            });
        }

        // Keywords and drop-down filter bindings
        const searchInput = document.getElementById('filter-search');
        if (searchInput) searchInput.addEventListener('input', applyFilters);

        const categorySelect = document.getElementById('filter-category');
        if (categorySelect) categorySelect.addEventListener('change', applyFilters);

        const locationSelect = document.getElementById('filter-location');
        if (locationSelect) locationSelect.addEventListener('change', applyFilters);

        const sortSelect = document.getElementById('sort-by');
        if (sortSelect) sortSelect.addEventListener('change', applyFilters);
    }

    let filterDebounceTimer = null;

    // Reset filters action
    window.clearFilters = async () => {
        const searchInput = document.getElementById('filter-search');
        const categorySelect = document.getElementById('filter-category');
        const locationSelect = document.getElementById('filter-location');
        const priceSlider = document.getElementById('filter-price');
        const sortSelect = document.getElementById('sort-by');

        if (searchInput) searchInput.value = '';
        if (categorySelect) categorySelect.value = 'all';
        if (locationSelect) locationSelect.value = 'all';
        if (priceSlider) {
            priceSlider.value = priceSlider.max || 500000;
        }
        if (sortSelect) sortSelect.value = 'default';

        // Uncheck all amenity checkboxes
        const amenityCheckboxes = document.querySelectorAll('input[name="filter-amenity"]');
        amenityCheckboxes.forEach(cb => cb.checked = false);

        if (window.updatePriceLabel) window.updatePriceLabel();
        await applyFilters();
    };

    window.updatePriceLabel = () => {
        const priceSlider = document.getElementById('filter-price');
        const priceVal = document.getElementById('price-val');
        if (!priceSlider || !priceVal) return;
        const val = Number(priceSlider.value);
        const maxVal = Number(priceSlider.max || 500000);
        if (val >= maxVal) {
            priceVal.innerText = "Any Price";
        } else {
            priceVal.innerText = KaghanUI.formatPKR(val);
        }
    };

    // Filter calculations (Instant initial load + Smooth Typing Debounce)
    function applyFilters(resetPage = true) {
        if (filterDebounceTimer) clearTimeout(filterDebounceTimer);
        
        const delay = resetPage ? 0 : 150;
        filterDebounceTimer = setTimeout(async () => {
            try {
                const rooms = await KaghanDB.getRooms();
                const searchInput = document.getElementById('filter-search');
                const categorySelect = document.getElementById('filter-category');
                const locationSelect = document.getElementById('filter-location');
                const priceSlider = document.getElementById('filter-price');
                const sortSelect = document.getElementById('sort-by');

                const keyword = searchInput ? searchInput.value.trim().toLowerCase() : '';
                const category = categorySelect ? categorySelect.value : 'all';
                const location = locationSelect ? locationSelect.value : 'all';
                const sliderVal = priceSlider ? Number(priceSlider.value) : Infinity;
                const sliderMax = priceSlider ? Number(priceSlider.max || 500000) : 500000;
                const isMaxCeiling = sliderVal >= sliderMax;
                const sortBy = sortSelect ? sortSelect.value : 'default';

                // Sync custom category buttons state
                const customCategoryContainer = document.getElementById('custom-category-filters');
                if (customCategoryContainer && categorySelect) {
                    const btns = customCategoryContainer.querySelectorAll('.category-filter-btn');
                    btns.forEach(btn => {
                        if (btn.getAttribute('data-value') === categorySelect.value) {
                            btn.classList.add('active-category', 'opacity-100');
                            btn.classList.remove('opacity-60');
                        } else {
                            btn.classList.remove('active-category', 'opacity-100');
                            btn.classList.add('opacity-60');
                        }
                    });
                }

                // Get selected amenities
                const checkedAmenities = document.querySelectorAll('input[name="filter-amenity"]:checked');
                const selectedAmenities = Array.from(checkedAmenities).map(cb => cb.value.toLowerCase());

                let filtered = rooms.filter(room => {
                    const rName = (room.name || '').toLowerCase();
                    const rDesc = (room.description || '').toLowerCase();
                    const rType = (room.type || '').toLowerCase();
                    const rLoc = (room.location || '').toLowerCase();
                    const rLocName = (room.locationName || '').toLowerCase();
                    const rLocId = (room.locationId || '').toLowerCase();
                    const rAmenities = Array.isArray(room.amenities) ? room.amenities : [];
                    const rPrice = Number(room.priceDaily || room.price || 0);

                    // Keyword matches title, description, category, location, or amenities
                    const matchesKeyword = !keyword || 
                                           rName.includes(keyword) || 
                                           rDesc.includes(keyword) ||
                                           rType.includes(keyword) ||
                                           rLoc.includes(keyword) ||
                                           rLocName.includes(keyword) ||
                                           rAmenities.some(a => (a || '').toLowerCase().includes(keyword));

                    // Flexible Category Matcher
                    let matchesCategory = (category === 'all');
                    if (!matchesCategory) {
                        const cat = category.toLowerCase().trim();
                        const rCat = (room.category || room.categoryId || room.categoryName || room.type || '').toString().toLowerCase().trim();

                        if (rCat === cat || rType === cat || rName.includes(cat) || rType.includes(cat) || rCat.includes(cat) || cat.includes(rCat)) {
                            matchesCategory = true;
                        } else if ((cat === '07' || cat.includes('penthouse')) && (rCat.includes('penthouse') || rType.includes('penthouse') || rName.includes('penthouse') || rCat === '07')) {
                            matchesCategory = true;
                        } else if ((cat === '08' || cat.includes('general')) && (rCat.includes('general') || rType.includes('general') || rName.includes('general') || rCat === '08')) {
                            matchesCategory = true;
                        } else if ((cat === '09' || cat.includes('valley')) && (rCat.includes('valley') || rType.includes('valley') || rName.includes('valley') || rCat === '09')) {
                            matchesCategory = true;
                        } else if ((cat.includes('1bed') || cat.includes('1 bed') || cat === '1') && (rType.includes('1') || rName.includes('1') || rCat.includes('1') || rType.includes('one'))) {
                            matchesCategory = true;
                        } else if ((cat.includes('2bed') || cat.includes('2 bed') || cat === '2') && (rType.includes('2') || rName.includes('2') || rCat.includes('2') || rType.includes('two'))) {
                            matchesCategory = true;
                        } else if ((cat.includes('3bed') || cat.includes('3 bed') || cat === '3') && (rType.includes('3') || rName.includes('3') || rCat.includes('3') || rType.includes('three'))) {
                            matchesCategory = true;
                        } else if ((cat.includes('4bed') || cat.includes('4 bed') || cat === '4') && (rType.includes('4') || rName.includes('4') || rCat.includes('4') || rType.includes('four'))) {
                            matchesCategory = true;
                        } else if (cat.includes('studio') && (rType.includes('studio') || rName.includes('studio') || rCat.includes('studio'))) {
                            matchesCategory = true;
                        } else if (cat.includes('farm') && (rType.includes('farm') || rName.includes('farm') || rCat.includes('farm') || rType.includes('villa'))) {
                            matchesCategory = true;
                        }
                    }

                    // Flexible Location Matcher
                    let matchesLocation = (location === 'all');
                    if (!matchesLocation) {
                        const loc = location.toLowerCase().trim();
                        if (rLoc === loc || rLocName === loc || rLocId === loc || rLoc.includes(loc) || rLocName.includes(loc) || loc.includes(rLoc) || (rLocId && loc.includes(rLocId))) {
                            matchesLocation = true;
                        }
                    }

                    const matchesPrice = isMaxCeiling || rPrice <= sliderVal;

                    const quickGuests = document.getElementById('quick-filter-guests');
                    const minGuestsNeeded = quickGuests && quickGuests.value !== 'all' ? Number(quickGuests.value) : 0;
                    const matchesGuests = minGuestsNeeded === 0 || (Number(room.maxGuests || 2) >= minGuestsNeeded);

                    // Room must contain all selected amenities
                    const matchesAmenities = selectedAmenities.every(selectedA => 
                        rAmenities.some(roomA => (roomA || '').toLowerCase().includes(selectedA))
                    );

                    return matchesKeyword && matchesCategory && matchesLocation && matchesPrice && matchesAmenities && matchesGuests;
                })                // Sorting (Pinned items always float to the top)
                filtered.sort((a, b) => {
                    const aPinned = a.isPinned ? 1 : 0;
                    const bPinned = b.isPinned ? 1 : 0;
                    if (aPinned !== bPinned) return bPinned - aPinned;

                    if (sortBy === 'price-low') return (Number(a.priceDaily || a.price || 0)) - (Number(b.priceDaily || b.price || 0));
                    if (sortBy === 'price-high') return (Number(b.priceDaily || b.price || 0)) - (Number(a.priceDaily || a.price || 0));
                    if (sortBy === 'rating') return (Number(b.rating || 0)) - (Number(a.rating || 0));
                    return 0;
                });

                currentFilteredRooms = filtered;
                if (resetPage) {
                    currentPage = 1;
                }
                renderRooms(filtered);
                updateMapMarkers(filtered);
            } catch (err) {
                console.error("applyFilters error:", err);
            }
        }, 150);
    }

    async function getCategoryLabel(categoryId) {
        const categories = await KaghanDB.getCategories();
        const cat = categories.find(c => c.id === categoryId);
        return cat ? cat.label : categoryId;
    }

    async function renderRooms(roomsList) {
        const container = document.getElementById('rooms-grid');
        const fallback = document.getElementById('no-rooms-fallback');
        const countLabel = document.getElementById('results-count');
        const pagination = document.getElementById('rooms-pagination');

        if (countLabel) countLabel.innerText = roomsList.length;
        
        const mobileCount = document.getElementById('results-count-mobile');
        if (mobileCount) mobileCount.innerText = roomsList.length;

        if (roomsList.length === 0) {
            if (container) container.innerHTML = '';
            if (fallback) fallback.classList.remove('hidden');
            if (pagination) pagination.classList.add('hidden');
            updateMapMarkers([]);
            return;
        }

        if (fallback) fallback.classList.add('hidden');
        if (pagination) pagination.classList.remove('hidden');

        const savedWishlist = await KaghanDB.getWishlist();

        // Pagination calculations
        const totalPages = Math.ceil(roomsList.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedRooms = roomsList.slice(startIndex, endIndex);

        if (container) {
            container.innerHTML = paginatedRooms.map((room, idx) => {
                let mainImg = room.image || (room.images && room.images.length ? room.images[0] : '');
                const isSaved = savedWishlist.includes(room.id);
                return `
                <div data-room-id="${room.id}" data-animate="fade-up" style="transition-delay: ${idx * 80}ms;" onclick="KaghanUI.openRoomDetailModal('${room.id}')" class="bg-white/80 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-[#C5A059]/10 shadow-[0_12px_40px_-15px_rgba(11,15,25,0.05)] hover:border-[#C5A059]/30 transition-all duration-500 group cursor-pointer flex flex-col h-full hover-lift relative">
                    <div class="relative h-56 overflow-hidden bg-slate-100 shrink-0">
                        <img src="${KaghanSafe.escapeHTML(mainImg)}" alt="${KaghanSafe.escapeHTML(room.name || 'Luxury Suite')}" class="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-95 transition-all duration-700">
                        ${room.isPinned ? `
                        <div class="absolute bottom-3 left-4 bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white text-[9px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 z-10">
                            <i class="fa-solid fa-thumbtack text-[8px]"></i> Pinned
                        </div>
                        ` : ''}
                        <button type="button" class="wishlist-btn ${isSaved ? 'active' : ''}" onclick="event.stopPropagation(); KaghanDB.toggleWishlistItem('${room.id}');" aria-label="Save to Wishlist">
                            <i class="${isSaved ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                        </button>
                        <div class="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-sm border border-white/20 text-[10px] font-bold uppercase tracking-wider text-[#C5A059] flex items-center gap-1.5">
                            ${room.originalPrice ? `<span class="line-through text-slate-400 font-semibold text-[9px]">${KaghanUI.formatPKR(room.originalPrice)}</span>` : ''}
                            <span>${KaghanUI.formatPKR(room.priceDaily || room.price || 0)} <span class="text-slate-400 lowercase font-medium">/night</span></span>
                        </div>
                        <div class="absolute top-4 right-14 backdrop-blur-md bg-[#0B0F19]/65 px-3 py-1.5 rounded-full text-[9px] font-bold text-[#C5A059] border border-white/10 uppercase tracking-widest room-cat-label" data-cat="${room.type || ''}">
                            ${KaghanSafe.escapeHTML(room.type || 'Suite')}
                        </div>
                    </div>
                    <div class="p-6 flex-1 flex flex-col justify-between">
                        <div>
                            <div class="flex justify-between items-start mb-2">
                                <h3 class="text-lg font-medium outfit text-[#0B0F19] leading-tight group-hover:text-[#C5A059] transition-colors duration-300">${KaghanSafe.escapeHTML(room.name)}</h3>
                                <div class="flex items-center gap-1 text-[#C5A059] font-bold text-xs bg-[#C5A059]/10 px-2 py-0.5 rounded-lg">
                                    <i class="fa-solid fa-star"></i>
                                    <span>${room.rating || '5.0'}</span>
                                </div>
                            </div>
                            <div class="text-[9px] text-slate-400 font-bold mb-3 flex items-center gap-1 uppercase tracking-widest">
                                <i class="fa-solid fa-location-dot text-[#C5A059] text-[9px]"></i>
                                <span>${KaghanSafe.escapeHTML(room.locationName || room.location || 'Islamabad')}</span>
                            </div>
                            <div class="text-slate-500 text-xs line-clamp-2 font-light leading-relaxed mb-4">
                                ${KaghanSafe.escapeHTML(KaghanSafe.stripTags(room.description || ''))}
                            </div>
                            <div class="flex flex-wrap gap-1.5 mb-6">
                                ${(room.amenities || []).slice(0, 3).map(a => `
                                    <span class="bg-slate-50/50 text-slate-500 text-[9px] uppercase font-bold tracking-wider px-2.5 py-1 rounded border border-slate-100/50 flex items-center gap-1">
                                        <i class="fa-solid fa-check text-[#C5A059] text-[8px]"></i> ${KaghanSafe.escapeHTML(a)}
                                    </span>
                                `).join('')}
                                ${(room.amenities || []).length > 3 ? `<span class="bg-slate-50/50 text-[#C5A059] text-[9px] uppercase font-bold px-2 py-1 rounded border border-slate-100/50">+${room.amenities.length - 3}</span>` : ''}
                            </div>
                        </div>
                        <div class="border-t border-slate-100/70 pt-4 mt-auto flex flex-wrap justify-between items-center gap-2">
                            <div class="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold">
                                <i class="fa-solid fa-user-group text-[#C5A059] text-xs"></i> Max ${room.maxGuests} Guests • ${room.bedrooms || 1} Bed
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0">
                                <button onclick="event.stopPropagation(); window.shareRoomCard('${room.id}', '${KaghanSafe.escapeHTML(room.name)}');" class="bg-slate-100 hover:bg-[#C5A059] hover:text-white text-slate-700 w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all shadow-sm" title="Share Listing">
                                    <i class="fa-solid fa-share-nodes"></i>
                                </button>
                                <button onclick="event.stopPropagation(); window.location.href='room-details.html?id=${room.id}'" class="bg-[#0B0F19] text-white text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-xl hover:bg-[#C5A059] transition-all shadow-sm">
                                    View Details
                                </button>
                                <button onclick="event.stopPropagation(); window.location.href='booking.html?id=${room.id}'" class="bg-[#C5A059] text-white text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-xl hover:bg-[#0B0F19] transition-all shadow-sm">
                                    Book Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `}).join('');

            // Post-process labels
            container.querySelectorAll('.room-cat-label').forEach(async el => {
                const catId = el.getAttribute('data-cat');
                el.innerText = await getCategoryLabel(catId);
            });

            // Card hover sync to map markers
            container.querySelectorAll('[data-room-id]').forEach(card => {
                const rId = card.getAttribute('data-room-id');
                card.addEventListener('mouseenter', () => highlightMapBubble(rId, true));
                card.addEventListener('mouseleave', () => highlightMapBubble(rId, false));
            });

            // Update map pins to match filtered list
            if (typeof updateMapMarkers === 'function') {
                updateMapMarkers(roomsList);
            }

            // Re-trigger scroll animations observer for the newly loaded rooms
            if (window.setupScrollAnimations) window.setupScrollAnimations();

            // Render Pagination controls
            if (pagination) {
                let pHTML = '';
                // Prev btn
                pHTML += `<button type="button" onclick="changePage(${currentPage - 1})" class="w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all border ${currentPage === 1 ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50' : 'border-slate-200 text-slate-600 hover:border-[#D4AF37] hover:text-[#D4AF37] bg-white shadow-sm'}" ${currentPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
                
                // Number btns
                for(let i = 1; i <= totalPages; i++) {
                    if(i === currentPage) {
                        pHTML += `<button type="button" class="w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all border border-[#D4AF37] bg-[#D4AF37] text-white shadow-md">${i}</button>`;
                    } else {
                        pHTML += `<button type="button" onclick="changePage(${i})" class="w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all border border-slate-200 text-slate-600 hover:border-[#D4AF37] hover:text-[#D4AF37] bg-white shadow-sm">${i}</button>`;
                    }
                }

                // Next btn
                pHTML += `<button type="button" onclick="changePage(${currentPage + 1})" class="w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all border ${currentPage === totalPages ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50' : 'border-slate-200 text-slate-600 hover:border-[#D4AF37] hover:text-[#D4AF37] bg-white shadow-sm'}" ${currentPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
                
                if(totalPages <= 1) pHTML = ''; // Hide if only 1 page
                
                pagination.innerHTML = pHTML;
            }
        }
    }

    // Global pagination function
    window.changePage = (page) => {
        if (page < 1) return;
        const totalPages = Math.ceil(currentFilteredRooms.length / itemsPerPage);
        if (page > totalPages && totalPages > 0) return;

        currentPage = page;
        renderRooms(currentFilteredRooms);

        const scrollTarget = document.getElementById('rooms-grid-container') || document.getElementById('rooms-grid');
        if (scrollTarget) {
            scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Modal Details Display
    window.openDetailsModal = async (roomId) => {
        const room = await KaghanDB.getRoomById(roomId);
        if (!room) return;

        const modal = document.getElementById('details-modal');
        const content = document.getElementById('modal-content');

        if (content) {
            const catLabel = await getCategoryLabel(room.type);
            const images = room.images && room.images.length ? room.images : [room.image || ''];
            
            let galleryHtml = '';
            if (images.length === 1) {
                galleryHtml = `<img src="${images[0]}" alt="${room.name}" class="w-full h-64 md:h-80 object-cover">`;
            } else {
                const thumbnails = images.slice(1, 5).map((img, idx) => `
                    <div class="w-full h-full relative group cursor-pointer" onclick="openLightbox('${img}')">
                        <img src="${img}" class="w-full h-full object-cover rounded-xl transition-all hover:opacity-90">
                        ${(images.length > 5 && idx === 3) ? `<div class="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center text-white font-bold text-sm backdrop-blur-sm">+${images.length - 5} More</div>` : ''}
                    </div>
                `).join('');

                galleryHtml = `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 h-64 md:h-80 p-2">
                        <div class="h-full cursor-pointer" onclick="openLightbox('${images[0]}')">
                            <img src="${images[0]}" alt="${room.name}" class="w-full h-full object-cover rounded-l-2xl hover:opacity-95 transition-opacity">
                        </div>
                        <div class="grid grid-cols-2 grid-rows-2 gap-2 h-full hidden md:grid">
                            ${thumbnails}
                        </div>
                    </div>
                `;
            }

            content.innerHTML = `
                <div class="relative bg-slate-100 rounded-t-3xl overflow-hidden">
                    ${galleryHtml}
                    <div class="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-[#D4AF37] border border-white/10 uppercase tracking-widest z-10 pointer-events-none">
                        ${catLabel}
                    </div>
                </div>
                <div class="p-8">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h2 class="text-2xl font-bold outfit text-slate-900">${KaghanSafe.escapeHTML(room.name)}</h2>
                            <div class="text-xs text-[#D4AF37] font-extrabold flex items-center gap-1 mt-1">
                                <i class="fa-solid fa-location-dot"></i>
                                <span>${KaghanSafe.escapeHTML(room.locationName || room.location || '')}</span>
                            </div>
                            <p class="text-slate-400 text-xs mt-1.5">Capacity: Up to ${room.maxGuests || 'N/A'} Guests</p>
                        </div>
                        <div class="text-right">
                            <span class="text-[#D4AF37] font-bold text-sm block flex items-center justify-end gap-1">
                                <i class="fa-solid fa-star"></i> ${room.rating || '5.0'} 
                            </span>
                            <span class="text-slate-400 text-[10px] uppercase font-semibold">(${room.reviewsCount || 0} verified reviews)</span>
                        </div>
                    </div>
                    
                    <div class="text-slate-600 text-sm leading-relaxed mb-6 font-light">
                        ${KaghanSafe.sanitizeHTML(room.description)}
                    </div>

                    <h4 class="text-xs uppercase tracking-widest text-[#D4AF37] font-bold mb-3">Premium Amenities Included</h4>
                    <div class="grid grid-cols-2 gap-2 mb-8">
                        ${(room.amenities || []).map(a => `
                            <div class="flex items-center gap-2 text-slate-700 text-xs">
                                <i class="fa-solid fa-circle-check text-[#D4AF37]"></i>
                                <span>${KaghanSafe.escapeHTML(a)}</span>
                            </div>
                        `).join('')}
                    </div>

                    <div class="border-t border-slate-100 pt-6 flex justify-between items-center">
                        <div>
                            <span class="text-slate-400 text-[10px] uppercase tracking-wider block font-semibold">Price per night</span>
                            <span class="text-2xl font-black text-[#D4AF37] outfit">${KaghanUI.formatPKR(room.priceDaily || room.price || 0)}</span>
                        </div>
                        <a href="booking.html?room=${room.id}" class="bg-[#D4AF37] text-white font-bold px-8 py-3.5 rounded-2xl hover:bg-[#0F172A] transition-all shadow-lg text-sm">
                            Instant Book
                        </a>
                    </div>
                </div>
            `;
        }

        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modal.firstElementChild.classList.remove('scale-95');
            }, 10);
        }
    };

    window.closeDetailsModal = () => {
        const modal = document.getElementById('details-modal');
        if (modal) {
            modal.classList.add('opacity-0');
            modal.firstElementChild.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
    };

    window.openLightbox = (imgSrc) => {
        // very basic lightbox
        const lightbox = document.createElement('div');
        lightbox.className = 'fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 opacity-0 transition-opacity';
        lightbox.onclick = () => {
            lightbox.classList.add('opacity-0');
            setTimeout(() => lightbox.remove(), 300);
        };
        const img = document.createElement('img');
        img.src = imgSrc;
        img.className = 'max-w-full max-h-full rounded-2xl shadow-2xl';
        lightbox.appendChild(img);
        document.body.appendChild(lightbox);
        setTimeout(() => lightbox.classList.remove('opacity-0'), 10);
    };

    // Extract URL query params to auto-filter on load
    async function loadParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category') || urlParams.get('type');
        const location = urlParams.get('location');
        const keyword = urlParams.get('keyword');
        // Hero search sends these param names:
        const checkin  = urlParams.get('checkin');
        const checkout = urlParams.get('checkout');
        const guests   = urlParams.get('guests');
        const stayType = urlParams.get('stayType');

        const categorySelect = document.getElementById('filter-category');
        const locationSelect = document.getElementById('filter-location');
        const searchInput = document.getElementById('filter-search');

        if (category && categorySelect) categorySelect.value = category;
        if (location && locationSelect) locationSelect.value = location;
        if (keyword && searchInput) searchInput.value = keyword;

        // Sync hidden date inputs if search-widget IDs exist on this page
        if (checkin) {
            const el = document.getElementById('search-check-in');
            if (el) el.value = checkin;
        }
        if (checkout) {
            const el = document.getElementById('search-check-out');
            if (el) el.value = checkout;
        }
        if (guests) {
            const el = document.getElementById('search-guests');
            if (el) el.value = guests;
        }
        // stayType is informational (no filter-stayType element on rooms page currently)

        await applyFilters();
    }

    window.shareRoomCard = function(roomId, roomName) {
        const title = roomName ? `${roomName} | KPH Stay` : 'KPH Stay Luxury Suite';
        const text = `Explore ${roomName || 'luxury service suite'} in Islamabad & Nathia Gali on KPH Stay!`;
        const url = `https://kphstay.com/room-details?id=${roomId}`;

        if (navigator.share) {
            navigator.share({ title, text, url }).catch(e => console.log('Share dismissed:', e));
        } else {
            navigator.clipboard.writeText(url).then(() => {
                if (window.KaghanUI) KaghanUI.showToast("Suite link copied to clipboard!", "success");
            }).catch(() => {
                prompt("Copy suite link:", url);
            });
        }
    };
})();
