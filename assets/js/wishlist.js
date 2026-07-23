// Kaghan Stay - Guest Wishlist Management Module (Airbnb UX Style)

(function() {
    'use strict';

    window.loadGuestWishlist = async function() {
        const container = document.getElementById('wishlist-grid-container');
        const emptyState = document.getElementById('wishlist-empty-state');
        if (!container) return;

        container.innerHTML = `
            <div class="col-span-full py-12 text-center text-slate-400">
                <i class="fa-solid fa-spinner fa-spin text-2xl mb-2 text-[#C5A059]"></i>
                <p class="text-xs">Loading saved stays...</p>
            </div>
        `;

        try {
            const wishlistIds = await KaghanDB.getWishlist();
            if (!wishlistIds || wishlistIds.length === 0) {
                container.innerHTML = '';
                if (emptyState) emptyState.classList.remove('hidden');
                return;
            }

            const allRooms = await KaghanDB.getRooms();
            const savedRooms = allRooms.filter(r => wishlistIds.includes(r.id));

            if (savedRooms.length === 0) {
                container.innerHTML = '';
                if (emptyState) emptyState.classList.remove('hidden');
                return;
            }

            if (emptyState) emptyState.classList.add('hidden');

            container.innerHTML = savedRooms.map((room, idx) => `
                <div data-animate="fade-up" style="transition-delay: ${idx * 80}ms;" onclick="KaghanUI.openRoomDetailModal('${room.id}')" class="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer flex flex-col justify-between h-full hover-lift relative">
                    <div class="relative h-48 overflow-hidden bg-slate-100 shrink-0">
                        <img src="${KaghanSafe.escapeHTML(room.image)}" alt="${KaghanSafe.escapeHTML(room.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-500">
                        <button type="button" class="wishlist-btn active" onclick="event.stopPropagation(); window.removeWishlistItem('${room.id}');" aria-label="Remove from Wishlist" title="Unsave Stay">
                            <i class="fa-solid fa-heart"></i>
                        </button>
                        <div class="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-bold text-[#C5A059] uppercase tracking-wider">
                            ${KaghanSafe.escapeHTML(room.type || 'Suite')}
                        </div>
                    </div>
                    <div class="p-5 flex-grow flex flex-col justify-between">
                        <div>
                            <div class="flex justify-between items-start mb-1">
                                <h3 class="font-bold outfit text-base text-slate-900 leading-tight group-hover:text-[#C5A059] transition-colors">${KaghanSafe.escapeHTML(room.name)}</h3>
                                <span class="text-xs font-bold text-[#C5A059]"><i class="fa-solid fa-star text-[10px]"></i> ${room.rating || '5.0'}</span>
                            </div>
                            <p class="text-[10px] text-slate-400 font-semibold mb-3 flex items-center gap-1 uppercase tracking-wider">
                                <i class="fa-solid fa-location-dot text-[#C5A059]"></i> ${KaghanSafe.escapeHTML(room.location || 'Islamabad')}
                            </p>
                        </div>
                        <div class="border-t border-slate-100 pt-3 flex justify-between items-center mt-auto">
                            <div>
                                <span class="text-[9px] uppercase font-bold text-slate-400 block">Rate</span>
                                <span class="text-sm font-black text-[#C5A059] outfit">${KaghanUI.formatPKR(room.priceDaily || room.price || 0)}</span>
                                <span class="text-[10px] text-slate-400 font-normal">/night</span>
                            </div>
                            <button onclick="event.stopPropagation(); window.location.href='../booking.html?id=${room.id}'" class="bg-[#0B0F19] text-white text-[10px] uppercase font-bold px-3.5 py-2 rounded-xl hover:bg-[#C5A059] transition-colors">
                                Book Stay
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

        } catch (err) {
            console.error("Wishlist load error:", err);
            container.innerHTML = `<div class="col-span-full text-center text-rose-500 py-6 text-xs">Failed to load wishlist items.</div>`;
        }
    };

    window.removeWishlistItem = async function(roomId) {
        const res = await KaghanDB.toggleWishlistItem(roomId);
        if (res.success) {
            window.loadGuestWishlist();
        }
    };

    // Auto-listen for wishlist updates
    window.addEventListener('kaghan-wishlist-updated', () => {
        if (typeof window.loadGuestWishlist === 'function') {
            window.loadGuestWishlist();
        }
    });
})();
