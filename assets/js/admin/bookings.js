// Kaghan Hotel - Admin Bookings Manager Module
(function() {
    async function renderBookings() {
        const bookings = await KaghanDB.getBookings();
        const rooms = await KaghanDB.getRooms();
        const tbody = document.getElementById('admin-bookings-tbody');
        const emptyState = document.getElementById('bookings-empty-state');

        if (!tbody) return;

        const keyword = (document.getElementById('booking-search-input')?.value || '').toLowerCase().trim();
        const statusFilter = document.getElementById('booking-filter-status')?.value || 'all';

        let filtered = bookings.filter(b => {
            const matchesKeyword = !keyword || 
                                   b.id.toLowerCase().includes(keyword) || 
                                   b.guestName.toLowerCase().includes(keyword) || 
                                   b.guestEmail.toLowerCase().includes(keyword) ||
                                   b.guestPhone.includes(keyword);
            const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
            return matchesKeyword && matchesStatus;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        tbody.innerHTML = filtered.map(booking => {
            const room = rooms.find(r => r.id === booking.roomId) || { name: 'Unknown Suite' };
            
            let statusSelect = `
                <select onchange="changeBookingStatus('${booking.id}', this.value)" class="bg-slate-50 border border-slate-200 rounded-lg text-[11px] px-2 py-1 outline-none font-bold cursor-pointer ${
                    booking.status === 'confirmed' ? 'text-emerald-600 border-emerald-250 bg-emerald-50/20' :
                    booking.status === 'completed' ? 'text-blue-600 border-blue-250 bg-blue-50/20' : 'text-rose-600 border-rose-250 bg-rose-50/20'
                }">
                    <option value="confirmed" ${booking.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="completed" ${booking.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="cancelled" ${booking.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            `;

            const isWalkin = booking.userId === 'usr-guest-walkin';
            const guestBadge = isWalkin 
                ? `<span class="bg-slate-150 text-slate-700 border border-slate-300 rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wide uppercase inline-block mt-1">Walk-in Guest</span>`
                : `<span class="bg-indigo-50 text-indigo-700 border border-indigo-150 rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wide uppercase inline-block mt-1">Kaghan Member</span>`;

            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-4 text-xs font-bold text-[#D4AF37] uppercase">${booking.id}</td>
                    <td class="px-6 py-4">
                        <span class="font-bold text-slate-800 text-sm block">${booking.guestName}</span>
                        <span class="text-slate-400 text-[10px] block mt-0.5">${booking.guestEmail} | ${booking.guestPhone}</span>
                        ${guestBadge}
                    </td>
                    <td class="px-6 py-4 text-xs font-semibold text-slate-600">${room.name}</td>
                    <td class="px-6 py-4 text-xs text-slate-600">
                        ${KaghanUI.formatDate(booking.checkIn)} to ${KaghanUI.formatDate(booking.checkOut)}
                    </td>
                    <td class="px-6 py-4 font-bold text-slate-800 text-sm">${KaghanUI.formatPKR(booking.totalPrice)}</td>
                    <td class="px-6 py-4 flex items-center gap-2">
                        ${statusSelect}
                        <button onclick="deleteBookingRecord('${booking.id}')" class="text-rose-500 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 transition-colors" title="Delete Booking Ledger">
                            <i class="fa-solid fa-trash-can text-sm"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.changeBookingStatus = async (id, newStatus) => {
        const success = await KaghanDB.updateBookingStatus(id, newStatus);
        if (success) {
            KaghanUI.showToast(`Booking ${id} status updated to ${newStatus}.`, 'success');
            if (window.AdminDashboardModule) {
                await window.AdminDashboardModule.refreshAll();
            }
        } else {
            KaghanUI.showToast('Failed to update booking status.', 'error');
        }
    };

    window.deleteBookingRecord = async (bookingId) => {
        if (!confirm(`Are you sure you want to permanently delete booking ledger "${bookingId}"?`)) return;

        const success = await KaghanDB.deleteBooking(bookingId);
        if (success) {
            KaghanUI.showToast(`Booking record ${bookingId} successfully deleted.`, 'success');
            if (window.AdminDashboardModule) {
                await window.AdminDashboardModule.refreshAll();
            }
        } else {
            KaghanUI.showToast('Failed to delete booking record.', 'error');
        }
    };

    // Export to window
    window.AdminBookingsModule = {
        render: renderBookings
    };
})();
