// Kaghan Hotel Management System - User Dashboard Orchestrator
document.addEventListener('DOMContentLoaded', async () => {
    // Guard route: ensure logged-in user with role 'user'
    if (!KaghanDB.guardRoute('user')) {
        return;
    }

    await initDashboard();
    setupActiveDatabaseListeners();

    // Check URL query parameters for active tab
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab') || 'overview';
    switchGuestTab(initialTab);
});

let currentListingFilter = 'all';

async function initDashboard() {
    const currentUser = KaghanDB.getCurrentUser();
    if (currentUser && currentUser.onboarded !== true && !window.location.pathname.includes('onboarding.html')) {
        window.location.href = 'onboarding.html';
        return;
    }

    updateHeaderUserProfile();

    // Initialize profile rendering and bindings
    if (window.UserProfileModule) {
        window.UserProfileModule.render();
        window.UserProfileModule.initForm();
    }
    
    // Initialize bookings rendering
    if (window.UserBookingsModule) {
        await window.UserBookingsModule.render();
    }

    // Initialize category squircles from Admin DB
    await renderCategorySquircles();

    // Initialize all resort listings on main page
    await renderAllUserListings();

    // Initialize notifications feed
    renderGuestNotifications();

    // Initialize real-time host chat
    if (window.KaghanMessaging) {
        setupLiveHostChat();
    }
}

window.addEventListener('kaghan-db-categories', async () => {
    await renderCategorySquircles();
});

async function renderCategorySquircles() {
    const scrollContainer = document.getElementById('user-category-squircles-scroll');
    if (!scrollContainer) return;

    let categories = [];
    try {
        categories = await KaghanDB.getCategories();
    } catch (e) {
        console.warn("Failed to load categories from DB:", e);
    }

    // Default fallback categories if DB has none
    if (!categories || !categories.length) {
        categories = [
            { id: 'studio', label: 'Studio', icon: 'fa-hotel' },
            { id: '1bed', label: '1 Bed Suite', icon: 'fa-bed' },
            { id: '2bed', label: '2 Bed Suite', icon: 'fa-house-user' },
            { id: '3bed', label: '3 Bed Suite', icon: 'fa-building' },
            { id: 'farmhouse', label: 'Farmhouse', icon: 'fa-mountain-city' }
        ];
    }

    function formatFAClass(rawIcon) {
        if (!rawIcon) return 'fa-solid fa-hotel';
        let str = rawIcon.trim();
        if (!str.includes('fa-')) str = 'fa-' + str;
        if (!str.includes('fa-solid') && !str.includes('fa-regular') && !str.includes('fa-brands') && !str.includes('fa-duotone')) {
            str = 'fa-solid ' + str;
        }
        return str;
    }

    let html = `
        <button onclick="filterUserListings('all', this)" class="squircle-filter-btn group flex flex-col items-center gap-2 text-center p-2 rounded-2xl hover:bg-white transition-all shrink-0">
            <div class="w-16 h-16 md:w-20 md:h-20 squircle-thumb bg-[#0B0F19] text-[#C5A059] flex items-center justify-center text-2xl shadow-sm border-2 border-transparent group-hover:border-[#C5A059] transition-all">
                <i class="fa-solid fa-border-all"></i>
            </div>
            <span class="text-xs font-bold text-slate-800 group-hover:text-[#C5A059] truncate w-20">All Suites</span>
        </button>
    `;

    categories.forEach(cat => {
        const catId = cat.id || cat.slug || (cat.label || cat.name || '').toLowerCase();
        const catLabel = cat.label || cat.name || 'Suite';
        const iconClass = formatFAClass(cat.icon || 'fa-hotel');
        
        let thumbContent;
        if (cat.image && cat.image.trim() && !cat.image.includes('apartment_')) {
            thumbContent = `<img src="${KaghanSafe.escapeHTML(cat.image)}" alt="${KaghanSafe.escapeHTML(catLabel)}" class="w-full h-full object-cover" onerror="this.src='../assets/images/logo.png'">`;
        } else {
            thumbContent = `
                <div class="w-full h-full bg-[#0B0F19] text-[#C5A059] flex items-center justify-center text-2xl transition-all group-hover:bg-[#C5A059] group-hover:text-[#0B0F19]">
                    <i class="${KaghanSafe.escapeHTML(iconClass)}"></i>
                </div>
            `;
        }

        html += `
            <button onclick="filterUserListings('${KaghanSafe.escapeHTML(catId)}', this)" class="squircle-filter-btn group flex flex-col items-center gap-2 text-center p-2 rounded-2xl hover:bg-white transition-all shrink-0">
                <div class="w-16 h-16 md:w-20 md:h-20 squircle-thumb bg-slate-200 relative shadow-sm border-2 border-transparent group-hover:border-[#C5A059] transition-all">
                    ${thumbContent}
                </div>
                <span class="text-xs font-bold text-slate-800 group-hover:text-[#C5A059] truncate w-20">${KaghanSafe.escapeHTML(catLabel)}</span>
            </button>
        `;
    });

    scrollContainer.innerHTML = html;
}

function updateHeaderUserProfile() {
    const user = KaghanDB.getCurrentUser();
    if (!user) return;

    const nameEl = document.getElementById('header-user-name');
    const avatarEl = document.getElementById('header-user-initial');
    const greetingEl = document.getElementById('user-greeting-name');

    const displayName = user.name || user.displayName || (user.email ? user.email.split('@')[0] : 'Guest');
    if (nameEl) nameEl.textContent = displayName;
    if (greetingEl) greetingEl.textContent = displayName;
    if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();
}

function setupLiveHostChat() {
    const user = KaghanDB.getCurrentUser();
    if (!user || (!user.uid && !user.id)) return;

    const guestUid = user.uid || user.id;
    const streamContainer = document.getElementById('guest-chat-stream');
    const form = document.getElementById('guest-chat-form');
    const input = document.getElementById('guest-chat-input');

    if (!streamContainer) return;

    // Mark as read by guest when opening
    KaghanMessaging.markThreadRead(guestUid, 'guest');

    // Subscribe to real-time messages
    KaghanMessaging.subscribeToGuestThread(guestUid, messages => {
        if (!messages || messages.length === 0) {
            streamContainer.innerHTML = `
                <div class="text-center text-xs text-slate-400 py-8">
                    <i class="fa-solid fa-handshake text-2xl mb-2 text-[#C5A059]"></i>
                    <p class="font-bold text-slate-700">No messages yet</p>
                    <p class="font-light">Type a message below to ask questions about your stay.</p>
                </div>
            `;
            return;
        }

        streamContainer.innerHTML = messages.map(m => {
            const isGuest = m.senderRole === 'guest';
            return `
                <div class="flex flex-col ${isGuest ? 'items-end' : 'items-start'} space-y-1">
                    <div class="max-w-[80%] p-3.5 rounded-2xl text-xs ${
                        isGuest 
                        ? 'bg-[#0B0F19] text-white rounded-br-none shadow-sm' 
                        : 'bg-white text-slate-800 rounded-bl-none border border-slate-200/80 shadow-xs'
                    }">
                        <div class="font-bold text-[10px] ${isGuest ? 'text-[#C5A059]' : 'text-slate-500'} mb-1">
                            ${KaghanSafe.escapeHTML(m.senderName || (isGuest ? 'You' : 'Resort Host'))}
                        </div>
                        <p class="leading-relaxed whitespace-pre-wrap">${KaghanSafe.escapeHTML(m.text)}</p>
                    </div>
                    <span class="text-[9px] text-slate-400 font-medium px-1">${KaghanUI.formatDate(m.createdAt || new Date())}</span>
                </div>
            `;
        }).join('');

        streamContainer.scrollTop = streamContainer.scrollHeight;
    });

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = input ? input.value.trim() : '';
            if (!text) return;
            input.value = '';
            await KaghanMessaging.sendGuestMessage(text);
        });
    }
}

// Quick host request chips handler
window.sendQuickHostRequest = function(text) {
    const input = document.getElementById('guest-chat-input');
    if (input) {
        input.value = text;
        const form = document.getElementById('guest-chat-form');
        if (form) form.dispatchEvent(new Event('submit'));
    }
};

function setupActiveDatabaseListeners() {
    window.addEventListener('kaghan-db-bookings', async () => {
        if (window.UserBookingsModule) await window.UserBookingsModule.render();
    });

    window.addEventListener('kaghan-db-rooms', async () => {
        if (window.UserBookingsModule) await window.UserBookingsModule.render();
        await renderAllUserListings();
    });

    window.addEventListener('kaghan-db-current-user', () => {
        if (window.UserProfileModule) window.UserProfileModule.render();
    });
}

window.switchGuestTab = function(tabName) {
    const allTabs = ['overview', 'trips', 'wishlists', 'notifications', 'support', 'account'];
    
    // Fallback default
    if (!allTabs.includes(tabName)) tabName = 'overview';

    allTabs.forEach(t => {
        const btns = document.querySelectorAll(`.tab-btn-${t}`);
        const dockItems = document.querySelectorAll(`.dock-item-${t}`);
        const content = document.getElementById(`tab-content-${t}`);
        
        btns.forEach(btn => {
            if (t === tabName) {
                btn.classList.add('bg-[#C5A059]', 'text-white', 'shadow-md', 'font-bold');
                btn.classList.remove('bg-white/10', 'text-slate-300', 'hover:bg-white/20');
            } else {
                btn.classList.remove('bg-[#C5A059]', 'text-white', 'shadow-md', 'font-bold');
                btn.classList.add('bg-white/10', 'text-slate-300', 'hover:bg-white/20');
            }
        });

        dockItems.forEach(dock => {
            if (t === tabName) {
                dock.classList.add('active');
            } else {
                dock.classList.remove('active');
            }
        });

        if (content) {
            if (t === tabName) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        }
    });

    // Update URL query parameter
    const newUrl = `${window.location.pathname}?tab=${tabName}`;
    window.history.replaceState({ tab: tabName }, '', newUrl);

    // Trigger tab specific renderers
    if (tabName === 'wishlists') {
        renderGuestWishlists();
    } else if (tabName === 'notifications') {
        renderGuestNotifications();
    } else if (tabName === 'overview') {
        renderAllUserListings();
    }
};

// Filter listings on the main app page
window.filterUserListings = function(cat, btnEl) {
    currentListingFilter = cat;
    const filterBtns = document.querySelectorAll('.user-listing-filter-btn');
    filterBtns.forEach(btn => {
        if (btn === btnEl) {
            btn.classList.add('bg-[#0B0F19]', 'text-white', 'shadow-md');
            btn.classList.remove('bg-white', 'text-slate-600', 'hover:bg-slate-100');
        } else {
            btn.classList.remove('bg-[#0B0F19]', 'text-white', 'shadow-md');
            btn.classList.add('bg-white', 'text-slate-600', 'hover:bg-slate-100');
        }
    });
    renderAllUserListings();
};

async function renderAllUserListings() {
    const container = document.getElementById('user-all-listings-grid');
    if (!container) return;

    const rooms = await KaghanDB.getRooms();
    const savedWishlist = await KaghanDB.getWishlist();

    let filtered = rooms;
    if (currentListingFilter !== 'all') {
        const cat = currentListingFilter.toLowerCase();
        filtered = rooms.filter(r => {
            const rType = (r.type || '').toLowerCase();
            const rName = (r.name || '').toLowerCase();
            if (cat === 'studio') return rType.includes('studio') || rName.includes('studio');
            if (cat === '1bed') return rType.includes('1') || rName.includes('1') || rType.includes('studio');
            if (cat === '2bed') return rType.includes('2') || rName.includes('2');
            if (cat === '3bed') return rType.includes('3') || rName.includes('3');
            if (cat === 'farmhouse') return rType.includes('farm') || rName.includes('farm') || rType.includes('villa');
            return rType.includes(cat) || rName.includes(cat);
        });
    }

    if (!filtered.length) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                <i class="fa-solid fa-hotel text-4xl text-slate-300 mb-3"></i>
                <h4 class="font-bold text-slate-800 text-sm">No suites found for this filter</h4>
                <p class="text-xs text-slate-400 font-light mt-1">Select another category or click "All Suites".</p>
                <button onclick="filterUserListings('all', this)" class="inline-block bg-[#C5A059] text-white text-xs font-bold px-5 py-2.5 rounded-xl mt-4 hover:bg-[#0B0F19] transition-all shadow-md">Show All Suites</button>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(room => {
        const isSaved = savedWishlist.includes(room.id);
        const mainImg = room.image || (room.images && room.images.length ? room.images[0] : '../assets/images/room1.jpg');
        const formattedPrice = KaghanUI.formatPKR(room.priceDaily || room.price || 0);
        
        return `
            <div class="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm flex flex-col justify-between hover-lift transition-all relative overflow-hidden group">
                <div class="relative h-52 rounded-2xl overflow-hidden mb-3 bg-slate-100">
                    <img src="${KaghanSafe.escapeHTML(mainImg)}" alt="${KaghanSafe.escapeHTML(room.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    
                    <button type="button" class="wishlist-btn ${isSaved ? 'active' : ''}" onclick="event.stopPropagation(); KaghanDB.toggleWishlistItem('${room.id}'); renderAllUserListings();" aria-label="Wishlist">
                        <i class="${isSaved ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                    </button>

                    <!-- Floating Gold Price Pill Badge -->
                    <div class="absolute bottom-3 left-3 gold-price-pill">
                        ${formattedPrice} <span class="font-normal text-[10px] opacity-80">/night</span>
                    </div>

                    <!-- Location Tag -->
                    <div class="absolute top-3 left-3 bg-[#0B0F19]/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white font-bold flex items-center gap-1 border border-white/10">
                        <i class="fa-solid fa-location-dot text-[#C5A059]"></i> ${KaghanSafe.escapeHTML(room.location || 'Kaghan')}
                    </div>
                </div>
                
                <div class="space-y-2 flex-grow">
                    <div class="flex justify-between items-start">
                        <h4 class="font-bold outfit text-slate-900 text-base leading-tight group-hover:text-[#C5A059] transition-colors">${KaghanSafe.escapeHTML(room.name)}</h4>
                        <div class="flex items-center gap-1 text-[#C5A059] font-bold text-xs bg-[#C5A059]/10 px-2 py-0.5 rounded-lg shrink-0">
                            <i class="fa-solid fa-star text-[10px]"></i>
                            <span>${room.rating || '4.8'}</span>
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap gap-1 pt-1">
                        ${(room.amenities || []).slice(0, 3).map(a => `
                            <span class="bg-slate-50 text-slate-500 text-[9px] uppercase font-bold px-2 py-0.5 rounded border border-slate-100">
                                ${KaghanSafe.escapeHTML(a)}
                            </span>
                        `).join('')}
                    </div>
                </div>

                <div class="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between gap-2">
                    <span class="text-[10px] text-slate-500 font-semibold"><i class="fa-solid fa-user-group text-[#C5A059] mr-1"></i>Max ${room.maxGuests || 2} Guests</span>
                    <div class="flex gap-2 shrink-0 items-center">
                        <a href="room-details.html?id=${room.id}" class="border border-slate-200 text-slate-700 text-[10px] font-bold px-3 py-2 rounded-xl hover:bg-slate-100 transition-all">Details</a>
                        <!-- Circular Gold Action Arrow Button -->
                        <a href="../booking.html?room=${room.id}" class="w-9 h-9 rounded-full bg-[#C5A059] hover:bg-[#0B0F19] hover:text-white text-slate-900 flex items-center justify-center transition-all shadow-md" title="Reserve Suite">
                            <i class="fa-solid fa-arrow-right text-xs"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function renderGuestWishlists() {
    const container = document.getElementById('guest-wishlist-grid');
    if (!container) return;

    const wishlistIds = await KaghanDB.getWishlist();
    const rooms = await KaghanDB.getRooms();
    const savedRooms = rooms.filter(r => wishlistIds.includes(r.id));

    if (!savedRooms.length) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                <i class="fa-regular fa-heart text-4xl text-slate-300 mb-3"></i>
                <h4 class="font-bold text-slate-800 text-sm">Your Wishlist is empty</h4>
                <p class="text-xs text-slate-400 font-light mt-1">Explore our luxury suites and click the heart icon to save your favorites.</p>
                <button onclick="switchGuestTab('overview')" class="inline-block bg-[#C5A059] text-white text-xs font-bold px-5 py-2.5 rounded-xl mt-4 hover:bg-[#0B0F19] transition-all shadow-md">Browse All Listings</button>
            </div>
        `;
        return;
    }

    container.innerHTML = savedRooms.map(room => `
        <div class="bg-white rounded-3xl border border-slate-100 p-4 shadow-md flex flex-col justify-between hover-lift">
            <div class="relative h-48 rounded-2xl overflow-hidden mb-3">
                <img src="${KaghanSafe.escapeHTML(room.image)}" alt="${KaghanSafe.escapeHTML(room.name || 'Room photo')}" class="w-full h-full object-cover">
                <button type="button" class="wishlist-btn active" onclick="KaghanDB.toggleWishlistItem('${room.id}'); renderGuestWishlists();">
                    <i class="fa-solid fa-heart"></i>
                </button>
                <div class="absolute bottom-3 left-3 bg-[#0B0F19]/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white font-bold">
                    <i class="fa-solid fa-location-dot text-[#C5A059] mr-1"></i>${KaghanSafe.escapeHTML(room.location || 'Islamabad')}
                </div>
            </div>
            <div class="space-y-1">
                <h4 class="font-bold outfit text-slate-900 text-base leading-snug">${KaghanSafe.escapeHTML(room.name)}</h4>
                <p class="text-xs text-[#C5A059] font-black">${KaghanUI.formatPKR(room.priceDaily || room.price || 0)} <span class="text-slate-400 font-normal">/night</span></p>
            </div>
            <div class="flex gap-2 mt-4">
                <a href="../room-details.html?id=${room.id}" class="w-1/2 text-center border border-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl hover:bg-slate-100 transition-all">Details</a>
                <a href="../booking.html?id=${room.id}" class="w-1/2 text-center bg-[#C5A059] text-white text-xs font-bold py-2.5 rounded-xl hover:bg-[#0B0F19] transition-all shadow-sm">Reserve</a>
            </div>
        </div>
    `).join('');
}

async function renderGuestNotifications() {
    const container = document.getElementById('guest-notifications-list');
    if (!container) return;

    const user = KaghanDB.getCurrentUser();
    if (!user) return;

    const allBookings = await KaghanDB.getBookings();
    const userBookings = allBookings.filter(b => b.userId === user.id);

    // Build notifications feed
    let notifs = [
        {
            id: 'n-welcome',
            title: 'Welcome to KPH Stay Guest Console!',
            desc: 'Thank you for registering. Manage your stays, request room upgrades, and chat with resort hosts directly from your personal dashboard.',
            time: 'Account Verified',
            type: 'info',
            icon: 'fa-shield-halved text-blue-500 bg-blue-50'
        }
    ];

    userBookings.forEach(b => {
        if (b.status === 'confirmed') {
            notifs.unshift({
                id: `n-${b.id}`,
                title: `Reservation ${b.id} Confirmed!`,
                desc: `Your stay from ${KaghanUI.formatDate(b.checkIn)} to ${KaghanUI.formatDate(b.checkOut)} is active. Click "Digital Pass" in your Stays tab for mobile key & Wi-Fi details.`,
                time: KaghanUI.formatDate(b.createdAt || new Date()),
                type: 'success',
                icon: 'fa-calendar-check text-[#C5A059] bg-[#C5A059]/10'
            });
        }
    });

    container.innerHTML = notifs.map(n => `
        <div class="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start gap-4 hover:border-slate-200 transition-all">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 ${n.icon}">
                <i class="fa-solid ${n.id.startsWith('n-welcome') ? 'fa-user-check' : 'fa-bell'}"></i>
            </div>
            <div class="flex-grow space-y-1">
                <div class="flex justify-between items-center">
                    <h4 class="font-bold text-slate-800 text-xs">${KaghanSafe.escapeHTML(n.title)}</h4>
                    <span class="text-[10px] text-slate-400 font-medium">${n.time}</span>
                </div>
                <p class="text-xs text-slate-500 font-light leading-relaxed">${KaghanSafe.escapeHTML(n.desc)}</p>
            </div>
        </div>
    `).join('');
}

// Digital Key Pass Modal functions
window.openDigitalPassModal = async function(bookingId) {
    const modal = document.getElementById('digital-pass-modal');
    if (!modal) return;

    const allBookings = await KaghanDB.getBookings();
    const booking = allBookings.find(b => b.id === bookingId);
    if (!booking) return;

    const rooms = await KaghanDB.getRooms();
    const room = rooms.find(r => r.id === booking.roomId) || { name: 'Luxury Suite', location: 'Islamabad' };

    document.getElementById('pass-booking-id').innerText = booking.id;
    document.getElementById('pass-room-name').innerText = room.name;
    document.getElementById('pass-location').innerText = room.location || 'Islamabad';
    document.getElementById('pass-dates').innerText = `${KaghanUI.formatDate(booking.checkIn)} - ${KaghanUI.formatDate(booking.checkOut)}`;
    document.getElementById('pass-guest-name').innerText = booking.guestName || 'Valued Guest';

    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.firstElementChild.classList.remove('scale-95');
    }, 10);
};

window.closeDigitalPassModal = function() {
    const modal = document.getElementById('digital-pass-modal');
    if (!modal) return;
    modal.classList.add('opacity-0');
    modal.firstElementChild.classList.add('scale-95');
    document.body.classList.remove('modal-open');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

window.copyWifiPassword = function() {
    navigator.clipboard.writeText('KPH-Resort-5G!2026');
    KaghanUI.showToast('Wi-Fi Password copied to clipboard!', 'success');
};
