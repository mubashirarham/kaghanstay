// Kaghan Hotel - Rooms Explorer Module
// Handles filtering, sorting, card rendering, and room details modals.

(function() {
    // Initialize Rooms Page actions on load
    document.addEventListener('DOMContentLoaded', async () => {
        // Exit if not on the rooms layout page
        if (!document.getElementById('rooms-grid')) return;

        await initRoomsPage();
    });

    async function initRoomsPage() {
        renderNavbar();
        setupRoomsEventListeners();

        // Listen for real-time rooms updates
        window.addEventListener('kaghan-db-rooms', () => {
            applyFilters();
        });

        await loadParams();
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

        if (priceSlider) {
            document.getElementById('price-val').innerText = KaghanUI.formatPKR(priceSlider.value);
        }
        await applyFilters();
    };

    // Filter calculations
    async function applyFilters() {
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

        let filtered = rooms.filter(room => {
            const matchesKeyword = !keyword || 
                                   room.name.toLowerCase().includes(keyword) || 
                                   room.description.toLowerCase().includes(keyword) ||
                                   room.amenities.some(a => a.toLowerCase().includes(keyword));
            const matchesCategory = category === 'all' || room.type === category;
            const matchesLocation = location === 'all' || (room.location || 'Islamabad') === location;
            const matchesPrice = room.price <= maxPrice;
            return matchesKeyword && matchesCategory && matchesLocation && matchesPrice;
        });

        // Sorting
        if (sortBy === 'price-low') {
            filtered.sort((a, b) => a.price - b.price);
        } else if (sortBy === 'price-high') {
            filtered.sort((a, b) => b.price - a.price);
        } else if (sortBy === 'rating') {
            filtered.sort((a, b) => b.rating - a.rating);
        }

        renderRooms(filtered);
    }

    function renderRooms(roomsList) {
        const container = document.getElementById('rooms-grid');
        const fallback = document.getElementById('no-rooms-fallback');
        const countLabel = document.getElementById('results-count');

        if (countLabel) countLabel.innerText = roomsList.length;

        if (roomsList.length === 0) {
            if (container) container.innerHTML = '';
            if (fallback) fallback.classList.remove('hidden');
            return;
        }

        if (fallback) fallback.classList.add('hidden');
        if (container) {
            container.innerHTML = roomsList.map(room => `
                <div class="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-md hover-lift group">
                    <div class="relative h-56 overflow-hidden">
                        <img src="${room.image}" alt="${room.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        <div class="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#D4AF37] border border-white/10 uppercase tracking-widest">
                            ${room.type}
                        </div>
                    </div>
                    <div class="p-6">
                        <div class="flex justify-between items-start mb-1">
                            <h3 class="text-lg font-bold outfit text-[#0F172A] leading-tight">${room.name}</h3>
                            <div class="flex items-center gap-1 text-[#D4AF37] font-bold text-xs">
                                <i class="fa-solid fa-star"></i>
                                <span>${room.rating}</span>
                            </div>
                        </div>
                        <div class="text-[10px] text-slate-400 font-bold mb-3 flex items-center gap-1">
                            <i class="fa-solid fa-location-dot text-[#D4AF37] text-[9px]"></i>
                            <span>${room.location || 'Islamabad'}</span>
                        </div>
                        <p class="text-slate-500 text-xs line-clamp-2 font-light leading-relaxed mb-4">
                            ${room.description}
                        </p>
                        <div class="flex flex-wrap gap-1.5 mb-6">
                            ${room.amenities.slice(0, 3).map(a => `
                                <span class="bg-slate-50 text-slate-500 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-slate-100">
                                    ${a}
                                </span>
                            `).join('')}
                            ${room.amenities.length > 3 ? `<span class="bg-slate-50 text-[#D4AF37] text-[9px] uppercase font-bold px-2 py-0.5 rounded border border-slate-100">+${room.amenities.length - 3}</span>` : ''}
                        </div>
                        <div class="border-t border-slate-100 pt-5 flex justify-between items-center">
                            <div>
                                <span class="text-slate-400 text-[9px] uppercase tracking-wider block font-semibold">${room.isApartment ? 'Rates starting from' : 'Rate Per Night'}</span>
                                <span class="text-lg font-extrabold text-[#D4AF37] outfit">${KaghanUI.formatPKR(room.price)}</span>
                                ${room.isApartment ? `<span class="text-slate-400 text-[10px] block font-light">Daily, Weekly & Monthly rents</span>` : ''}
                            </div>
                            <div class="flex gap-2">
                                <button onclick="openDetailsModal('${room.id}')" class="border border-slate-200 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-all">
                                    Details
                                </button>
                                <a href="booking.html?room=${room.id}" class="bg-[#0F172A] text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-[#D4AF37] transition-all shadow-sm">
                                    Book Now
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    // Modal Details Display
    window.openDetailsModal = async (roomId) => {
        const room = await KaghanDB.getRoomById(roomId);
        if (!room) return;

        const modal = document.getElementById('details-modal');
        const content = document.getElementById('modal-content');

        if (content) {
            content.innerHTML = `
                <div class="relative h-64">
                    <img src="${room.image}" alt="${room.name}" class="w-full h-full object-cover">
                    <div class="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-[#D4AF37] border border-white/10 uppercase tracking-widest">
                        ${room.type} Suite
                    </div>
                </div>
                <div class="p-8">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h2 class="text-2xl font-bold outfit text-slate-900">${room.name}</h2>
                            <div class="text-xs text-[#D4AF37] font-extrabold flex items-center gap-1 mt-1">
                                <i class="fa-solid fa-location-dot"></i>
                                <span>${room.location || 'Islamabad'}</span>
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
                    
                    <p class="text-slate-600 text-sm leading-relaxed mb-6 font-light">
                        ${room.description}
                    </p>

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
                            <span class="text-slate-400 text-[10px] uppercase tracking-wider block font-semibold">${room.isApartment ? 'Daily Rate' : 'Price per night'}</span>
                            <span class="text-2xl font-black text-[#D4AF37] outfit">${KaghanUI.formatPKR(room.price)}</span>
                            ${room.isApartment ? `
                                <div class="text-xs text-slate-500 mt-2 space-y-1">
                                    <div>Weekly Rate: <strong class="text-[#D4AF37]">${KaghanUI.formatPKR(room.priceWeekly)} / Week</strong></div>
                                    <div>Monthly Rate: <strong class="text-[#D4AF37]">${KaghanUI.formatPKR(room.priceMonthly)} / Month</strong></div>
                                </div>
                            ` : ''}
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

    async function loadParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('type');
        if (type && type !== 'all') {
            const categorySelect = document.getElementById('filter-category');
            if (categorySelect) categorySelect.value = type;
        }
        const location = urlParams.get('location');
        if (location && location !== 'all') {
            const locationSelect = document.getElementById('filter-location');
            if (locationSelect) locationSelect.value = location;
        }
        await applyFilters();
    }
})();
