// Kaghan Hotel - Rooms Explorer Module
// Handles filtering, sorting, card rendering, and room details modals.

(function() {
    // Initialize Rooms Page actions on load
    document.addEventListener('DOMContentLoaded', async () => {
        // Exit if not on the rooms layout page
        if (!document.getElementById('rooms-grid')) return;

        await initRoomsPage();
    });

    // Pagination Globals
    let currentPage = 1;
    const itemsPerPage = 6;

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
            // Mock coordinates based on location name if missing
            let lat = room.lat;
            let lng = room.lng;
            
            if (!lat || !lng) {
                // Fuzzy fallback coordinates for demonstration
                const locStr = (room.location || '').toLowerCase();
                if (locStr.includes('nathia')) { lat = 34.0722; lng = 73.3831; }
                else if (locStr.includes('murree')) { lat = 33.9070; lng = 73.3943; }
                else { lat = 33.7294 + (Math.random()*0.02 - 0.01); lng = 73.0931 + (Math.random()*0.02 - 0.01); } // Default ISB scattered
            }

            const priceText = KaghanUI.formatPKR(room.priceDaily || room.price);
            
            // Custom divIcon for price marker (Airbnb style)
            const icon = L.divIcon({
                className: 'custom-map-marker',
                html: `<div class="bg-white px-3 py-1.5 rounded-2xl shadow-lg border border-slate-200 text-xs font-bold text-slate-800 hover:bg-[#D4AF37] hover:text-white transition-colors cursor-pointer hover:scale-110 transform-gpu">${priceText}</div>`,
                iconSize: [80, 30],
                iconAnchor: [40, 15]
            });

            const marker = L.marker([lat, lng], { icon: icon }).addTo(mapInstance);
            bounds.extend([lat, lng]);

            // Popup logic
            marker.bindPopup(`
                <div class="p-2 w-48 font-sans">
                    <img src="${room.image}" class="w-full h-24 object-cover rounded-xl mb-2">
                    <h4 class="font-bold text-sm text-slate-800 leading-tight">${room.name}</h4>
                    <p class="text-xs text-[#D4AF37] font-bold mt-1">${priceText} / Night</p>
                    <a href="booking.html?id=${room.id}" class="block text-center bg-slate-900 text-white text-xs py-1.5 rounded-lg mt-2 hover:bg-[#D4AF37]">Book Now</a>
                </div>
            `);

            mapMarkers.push(marker);
        });

        if (mapMarkers.length > 0) {
            mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }

    async function populateFilters() {
        const categories = await KaghanDB.getCategories();
        const locations = await KaghanDB.getLocations();

        // Populate Location Select
        const locationSelect = document.getElementById('filter-location');
        if (locationSelect) {
            let currentVal = locationSelect.value;
            locationSelect.innerHTML = `<option value="all">All Locations</option>` +
                locations.map(l => `<option value="${l.id}">${l.label}</option>`).join('');
            if(locations.find(l => l.id === currentVal)) locationSelect.value = currentVal;
        }

        // Populate Category Select
        const categorySelect = document.getElementById('filter-category');
        if (categorySelect) {
            let currentVal = categorySelect.value;
            categorySelect.innerHTML = `<option value="all">All Categories</option>` +
                categories.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
            if(categories.find(c => c.id === currentVal)) categorySelect.value = currentVal;
        }

        // Populate Custom Category Filter Bar
        const customCategoryContainer = document.getElementById('custom-category-filters');
        if (customCategoryContainer) {
            let html = `
                <button data-value="all" type="button" class="category-filter-btn flex flex-col items-center gap-2 group active-category opacity-100 hover:opacity-100 transition-opacity min-w-[64px]">
                    <div class="w-8 h-8 flex items-center justify-center text-slate-800 text-2xl group-[.active-category]:text-[#D4AF37]"><i class="fa-solid fa-border-all"></i></div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-[.active-category]:text-slate-900 group-[.active-category]:border-b-2 group-[.active-category]:border-[#D4AF37] pb-1">All</span>
                </button>
            `;

            categories.forEach(cat => {
                const iconOrImg = cat.image 
                    ? `<img src="${cat.image}" class="w-full h-full object-cover rounded-lg group-[.active-category]:ring-2 ring-[#D4AF37] ring-offset-2">` 
                    : `<i class="fa-solid ${cat.icon}"></i>`;
                    
                html += `
                    <button data-value="${cat.id}" type="button" class="category-filter-btn flex flex-col items-center gap-2 group opacity-60 hover:opacity-100 transition-opacity min-w-[64px]">
                        <div class="w-8 h-8 flex items-center justify-center text-slate-800 text-2xl group-[.active-category]:text-[#D4AF37]">${iconOrImg}</div>
                        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-[.active-category]:text-slate-900 group-[.active-category]:border-b-2 group-[.active-category]:border-[#D4AF37] pb-1">${cat.label}</span>
                    </button>
                `;
            });
            customCategoryContainer.innerHTML = html;
        }

        // Rebind custom category buttons since they were recreated
        rebindCustomCategoryButtons();
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
        if (priceSlider) priceSlider.value = 150000;
        if (sortSelect) sortSelect.value = 'default';

        // Uncheck all amenity checkboxes
        const amenityCheckboxes = document.querySelectorAll('input[name="filter-amenity"]');
        amenityCheckboxes.forEach(cb => cb.checked = false);

        if (priceSlider) {
            document.getElementById('price-val').innerText = KaghanUI.formatPKR(priceSlider.value);
        }
        await applyFilters();
    };

    // Filter calculations
    async function applyFilters() {
        const container = document.getElementById('rooms-grid');
        if (container) {
            container.innerHTML = `
                <div class="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm flex flex-col justify-between h-[450px]">
                    <div class="skeleton h-48 w-full rounded-2xl mb-6 animate-pulse"></div>
                    <div class="skeleton h-6 w-3/4 rounded mb-3 animate-pulse"></div>
                    <div class="skeleton h-4 w-1/2 rounded mb-6 animate-pulse"></div>
                    <div class="skeleton h-4 w-full rounded mb-3 animate-pulse"></div>
                    <div class="skeleton h-4 w-5/6 rounded mb-8 animate-pulse"></div>
                    <div class="flex justify-between items-center mt-auto flex-row">
                        <div class="skeleton h-10 w-24 rounded animate-pulse"></div>
                        <div class="skeleton h-10 w-24 rounded animate-pulse"></div>
                    </div>
                </div>
                <div class="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm flex flex-col justify-between h-[450px]">
                    <div class="skeleton h-48 w-full rounded-2xl mb-6 animate-pulse"></div>
                    <div class="skeleton h-6 w-3/4 rounded mb-3 animate-pulse"></div>
                    <div class="skeleton h-4 w-1/2 rounded mb-6 animate-pulse"></div>
                    <div class="skeleton h-4 w-full rounded mb-3 animate-pulse"></div>
                    <div class="skeleton h-4 w-5/6 rounded mb-8 animate-pulse"></div>
                    <div class="flex justify-between items-center mt-auto flex-row">
                        <div class="skeleton h-10 w-24 rounded animate-pulse"></div>
                        <div class="skeleton h-10 w-24 rounded animate-pulse"></div>
                    </div>
                </div>
            `;
        }

        setTimeout(async () => {
            const rooms = await KaghanDB.getRooms();
            const searchInput = document.getElementById('filter-search');
            const categorySelect = document.getElementById('filter-category');
            const locationSelect = document.getElementById('filter-location');
            const priceSlider = document.getElementById('filter-price');
            const sortSelect = document.getElementById('sort-by');

            const keyword = searchInput ? searchInput.value.toLowerCase() : '';
            const category = categorySelect ? categorySelect.value : 'all';
            const location = locationSelect ? locationSelect.value : 'all';
            const maxPrice = priceSlider ? parseInt(priceSlider.value) : 150000;
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
                const matchesKeyword = !keyword || 
                                       room.name.toLowerCase().includes(keyword) || 
                                       room.description.toLowerCase().includes(keyword) ||
                                       room.amenities.some(a => a.toLowerCase().includes(keyword));
                const matchesCategory = category === 'all' || room.type === category;
                const matchesLocation = location === 'all' || room.location === location;
                const matchesPrice = room.price <= maxPrice;
                
                // Room must contain all selected amenities
                const matchesAmenities = selectedAmenities.every(selectedA => 
                    room.amenities.some(roomA => roomA.toLowerCase().includes(selectedA))
                );

                return matchesKeyword && matchesCategory && matchesLocation && matchesPrice && matchesAmenities;
            });

            // Sorting
            if (sortBy === 'price-low') {
                filtered.sort((a, b) => a.price - b.price);
            } else if (sortBy === 'price-high') {
                filtered.sort((a, b) => b.price - a.price);
            } else if (sortBy === 'rating') {
                filtered.sort((a, b) => b.rating - a.rating);
            }

            // Reset to page 1 on filter change
            currentPage = 1;
            renderRooms(filtered);
        }, 300);
    }

    async function getCategoryLabel(categoryId) {
        const categories = await KaghanDB.getCategories();
        const cat = categories.find(c => c.id === categoryId);
        return cat ? cat.label : categoryId;
    }

    function renderRooms(roomsList) {
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

        // Pagination calculations
        const totalPages = Math.ceil(roomsList.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedRooms = roomsList.slice(startIndex, endIndex);

        if (container) {
            container.innerHTML = paginatedRooms.map((room, idx) => {
                let mainImg = room.image || (room.images && room.images.length ? room.images[0] : '');
                return `
                return `
                <div data-animate="fade-up" style="transition-delay: ${idx * 80}ms;" onclick="KaghanUI.openRoomDetailModal('${room.id}')" class="bg-white/80 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-[#C5A059]/10 shadow-[0_12px_40px_-15px_rgba(11,15,25,0.05)] hover:border-[#C5A059]/30 transition-all duration-500 group cursor-pointer flex flex-col h-full hover-lift">
                    <div class="relative h-56 overflow-hidden bg-slate-100 shrink-0">
                        <img src="${KaghanSafe.escapeHTML(mainImg)}" alt="${KaghanSafe.escapeHTML(room.name)}" class="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-95 transition-all duration-700">
                        <div class="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-sm border border-white/20 text-[10px] font-bold uppercase tracking-wider text-[#C5A059] flex items-center gap-1.5">
                            ${room.originalPrice ? `<span class="line-through text-slate-400 font-semibold text-[9px]">${KaghanUI.formatPKR(room.originalPrice)}</span>` : ''}
                            <span>${KaghanUI.formatPKR(room.priceDaily || room.price)} <span class="text-slate-400 lowercase font-medium">/night</span></span>
                        </div>
                        <div class="absolute top-4 right-4 backdrop-blur-md bg-[#0B0F19]/65 px-3 py-1.5 rounded-full text-[9px] font-bold text-[#C5A059] border border-white/10 uppercase tracking-widest room-cat-label" data-cat="${room.type}">
                            ${KaghanSafe.escapeHTML(room.type)}
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
                                ${KaghanSafe.sanitizeHTML(room.description)}
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
                        <div class="border-t border-slate-100/70 pt-4 mt-auto flex justify-between items-center">
                            <div class="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
                                <i class="fa-solid fa-user-group text-[#C5A059] text-xs"></i> Max ${room.maxGuests} Guests
                            </div>
                            <button onclick="event.stopPropagation(); window.location.href='booking.html?room=${room.id}'" class="bg-[#0B0F19] text-white text-[10px] uppercase tracking-wider font-bold px-4 py-2.5 rounded-xl hover:bg-[#C5A059] transition-all shadow-sm">
                                Book Now
                            </button>
                        </div>
                    </div>
                </div>
            `}).join('');

            // Post-process labels
            container.querySelectorAll('.room-cat-label').forEach(async el => {
                const catId = el.getAttribute('data-cat');
                el.innerText = await getCategoryLabel(catId);
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
                pHTML += `<button onclick="changePage(${currentPage - 1})" class="w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all border ${currentPage === 1 ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50' : 'border-slate-200 text-slate-600 hover:border-[#D4AF37] hover:text-[#D4AF37] bg-white shadow-sm'}" ${currentPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
                
                // Number btns
                for(let i = 1; i <= totalPages; i++) {
                    if(i === currentPage) {
                        pHTML += `<button class="w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all border border-[#D4AF37] bg-[#D4AF37] text-white shadow-md">${i}</button>`;
                    } else {
                        pHTML += `<button onclick="changePage(${i})" class="w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all border border-slate-200 text-slate-600 hover:border-[#D4AF37] hover:text-[#D4AF37] bg-white shadow-sm">${i}</button>`;
                    }
                }

                // Next btn
                pHTML += `<button onclick="changePage(${currentPage + 1})" class="w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all border ${currentPage === totalPages ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50' : 'border-slate-200 text-slate-600 hover:border-[#D4AF37] hover:text-[#D4AF37] bg-white shadow-sm'}" ${currentPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
                
                if(totalPages <= 1) pHTML = ''; // Hide if only 1 page
                
                pagination.innerHTML = pHTML;
            }
        }
    }

    // Global pagination function
    window.changePage = (page) => {
        currentPage = page;
        // Re-run filter/render logic (it will use the current filter state but updated currentPage)
        applyFilters(); 
        window.scrollTo({ top: document.getElementById('rooms-grid-container').offsetTop - 100, behavior: 'smooth' });
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
                            <h2 class="text-2xl font-bold outfit text-slate-900">${room.name}</h2>
                            <div class="text-xs text-[#D4AF37] font-extrabold flex items-center gap-1 mt-1">
                                <i class="fa-solid fa-location-dot"></i>
                                <span>${room.locationName || room.location}</span>
                            </div>
                            <p class="text-slate-400 text-xs mt-1.5">Capacity: Up to ${room.maxGuests} Guests</p>
                        </div>
                        <div class="text-right">
                            <span class="text-[#D4AF37] font-bold text-sm block flex items-center justify-end gap-1">
                                <i class="fa-solid fa-star"></i> ${room.rating} 
                            </span>
                            <span class="text-slate-400 text-[10px] uppercase font-semibold">(${room.reviewsCount} verified reviews)</span>
                        </div>
                    </div>
                    
                    <div class="text-slate-600 text-sm leading-relaxed mb-6 font-light">
                        ${KaghanSafe.sanitizeHTML(room.description)}
                    </div>

                    <h4 class="text-xs uppercase tracking-widest text-[#D4AF37] font-bold mb-3">Premium Amenities Included</h4>
                    <div class="grid grid-cols-2 gap-2 mb-8">
                        ${room.amenities.map(a => `
                            <div class="flex items-center gap-2 text-slate-700 text-xs">
                                <i class="fa-solid fa-circle-check text-[#D4AF37]"></i>
                                <span>${a}</span>
                            </div>
                        `).join('')}
                    </div>

                    <div class="border-t border-slate-100 pt-6 flex justify-between items-center">
                        <div>
                            <span class="text-slate-400 text-[10px] uppercase tracking-wider block font-semibold">Price per night</span>
                            <span class="text-2xl font-black text-[#D4AF37] outfit">${KaghanUI.formatPKR(room.price)}</span>
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
        const category = urlParams.get('category');
        const location = urlParams.get('location');

        const categorySelect = document.getElementById('filter-category');
        const locationSelect = document.getElementById('filter-location');

        let shouldFilter = false;
        if (category && categorySelect) {
            categorySelect.value = category;
            shouldFilter = true;
        }
        if (location && locationSelect) {
            locationSelect.value = location;
            shouldFilter = true;
        }

        if (shouldFilter) {
            await applyFilters();
        } else {
            // initial render
            await applyFilters();
        }
    }
})();
