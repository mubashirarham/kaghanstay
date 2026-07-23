// Kaghan Hotel Management System - User Dashboard Orchestrator
document.addEventListener('DOMContentLoaded', async () => {
    // Guard route: ensure logged-in user with role 'user'
    if (!KaghanDB.guardRoute('user')) {
        return;
    }

    await initDashboard();
    setupActiveDatabaseListeners();
});

async function initDashboard() {
    // Initialize profile rendering and bindings
    if (window.UserProfileModule) {
        window.UserProfileModule.render();
        window.UserProfileModule.initForm();
    }
    
    // Initialize bookings rendering
    if (window.UserBookingsModule) {
        await window.UserBookingsModule.render();
    }

    // Initialize real-time host chat
    if (window.KaghanMessaging) {
        setupLiveHostChat();
    }
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

function setupActiveDatabaseListeners() {
    window.addEventListener('kaghan-db-bookings', async () => {
        if (window.UserBookingsModule) await window.UserBookingsModule.render();
    });

    window.addEventListener('kaghan-db-rooms', async () => {
        if (window.UserBookingsModule) await window.UserBookingsModule.render();
    });

    window.addEventListener('kaghan-db-current-user', () => {
        if (window.UserProfileModule) window.UserProfileModule.render();
    });
}

window.switchGuestTab = function(tabName) {
    const tabs = ['trips', 'wishlists', 'account'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        const content = document.getElementById(`tab-content-${t}`);
        if (btn && content) {
            if (t === tabName) {
                btn.classList.add('border-[#C5A059]', 'text-[#C5A059]');
                btn.classList.remove('border-transparent', 'text-slate-500');
                content.classList.remove('hidden');
            } else {
                btn.classList.remove('border-[#C5A059]', 'text-[#C5A059]');
                btn.classList.add('border-transparent', 'text-slate-500');
                content.classList.add('hidden');
            }
        }
    });
    if (tabName === 'wishlists') {
        renderGuestWishlists();
    }
};

async function renderGuestWishlists() {
    const container = document.getElementById('guest-wishlist-grid');
    if (!container) return;

    const wishlistIds = await KaghanDB.getWishlist();
    const rooms = await KaghanDB.getRooms();
    const savedRooms = rooms.filter(r => wishlistIds.includes(r.id));

    if (!savedRooms.length) {
        container.innerHTML = `
            <div class="col-span-3 text-center py-12 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                <i class="fa-regular fa-heart text-4xl text-slate-300 mb-3"></i>
                <h4 class="font-bold text-slate-800 text-sm">Your Wishlist is empty</h4>
                <p class="text-xs text-slate-400 font-light mt-1">Explore our luxury suites and click the heart icon to save your favorites.</p>
                <a href="../rooms.html" class="inline-block bg-[#C5A059] text-white text-xs font-bold px-5 py-2.5 rounded-xl mt-4 hover:bg-[#0B0F19] transition-all">Browse Suites</a>
            </div>
        `;
        return;
    }

    container.innerHTML = savedRooms.map(room => `
        <div class="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm flex flex-col justify-between">
            <div class="relative h-44 rounded-2xl overflow-hidden mb-3">
                <img src="${KaghanSafe.escapeHTML(room.image)}" class="w-full h-full object-cover">
                <button type="button" class="wishlist-btn active" onclick="KaghanDB.toggleWishlistItem('${room.id}'); renderGuestWishlists();">
                    <i class="fa-solid fa-heart"></i>
                </button>
            </div>
            <div>
                <h4 class="font-bold outfit text-slate-900 text-sm mb-1">${KaghanSafe.escapeHTML(room.name)}</h4>
                <p class="text-xs text-[#C5A059] font-bold">${KaghanUI.formatPKR(room.priceDaily || room.price || 0)} <span class="text-slate-400 font-normal">/night</span></p>
            </div>
            <a href="../room-details.html?id=${room.id}" class="block text-center bg-slate-900 text-white text-xs font-bold py-2 rounded-xl mt-3 hover:bg-[#C5A059] transition-all">Reserve Stay</a>
        </div>
    `).join('');
}
