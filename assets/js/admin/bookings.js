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
                        <button onclick="openEditBookingModal('${booking.id}')" class="text-slate-500 hover:text-[#D4AF37] p-1.5 rounded hover:bg-slate-50 transition-colors" title="Edit Booking">
                            <i class="fa-solid fa-pen-to-square text-sm"></i>
                        </button>
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

    let adminRoomsList = [];
    let activeEditBookingId = null;

    window.openAddBookingModal = async () => {
        adminRoomsList = await KaghanDB.getRooms();
        const select = document.getElementById('add-booking-room');
        if (select) {
            select.innerHTML = adminRoomsList.map(r => `
                <option value="${r.id}" data-price="${r.price}">${r.name} (${r.location || 'Islamabad'}) - PKR ${r.price}</option>
            `).join('');
        }
        
        // Default dates
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        document.getElementById('add-booking-checkin').value = today;
        document.getElementById('add-booking-checkout').value = tomorrowStr;
        
        calculateAdminAddBookingPrice();

        const modal = document.getElementById('add-booking-modal');
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.firstElementChild.classList.remove('scale-95');
        }, 10);
    };

    window.closeAddBookingModal = () => {
        const modal = document.getElementById('add-booking-modal');
        modal.classList.add('opacity-0');
        modal.firstElementChild.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.getElementById('add-booking-form').reset();
        }, 300);
    };

    window.calculateAdminAddBookingPrice = () => {
        const roomSelect = document.getElementById('add-booking-room');
        const checkinStr = document.getElementById('add-booking-checkin').value;
        const checkoutStr = document.getElementById('add-booking-checkout').value;
        const priceInput = document.getElementById('add-booking-price');

        if (!roomSelect || !checkinStr || !checkoutStr || !priceInput) return;

        const selectedOption = roomSelect.options[roomSelect.selectedIndex];
        if (!selectedOption) return;
        const roomPrice = parseFloat(selectedOption.getAttribute('data-price')) || 0;

        const nights = Math.max(1, Math.round((new Date(checkoutStr) - new Date(checkinStr)) / (1000 * 60 * 60 * 24)));
        priceInput.value = roomPrice * nights;
    };

    window.submitAddBooking = async (e) => {
        e.preventDefault();
        const guestName = document.getElementById('add-booking-name').value.trim();
        const guestEmail = document.getElementById('add-booking-email').value.trim();
        const guestPhone = document.getElementById('add-booking-phone').value.trim();
        const roomId = document.getElementById('add-booking-room').value;
        const checkIn = document.getElementById('add-booking-checkin').value;
        const checkOut = document.getElementById('add-booking-checkout').value;
        const totalPrice = parseInt(document.getElementById('add-booking-price').value) || 0;
        const status = document.getElementById('add-booking-status').value;

        if (!guestName || !guestEmail || !guestPhone || !roomId || !checkIn || !checkOut || totalPrice <= 0) {
            KaghanUI.showToast('Please enter valid booking details.', 'error');
            return;
        }

        const isAvailable = await KaghanDB.isRoomAvailable(roomId, checkIn, checkOut);
        if (!isAvailable) {
            if (!confirm('This suite has overlapping reservations for the selected dates. Do you want to force book anyway?')) {
                return;
            }
        }

        const newBooking = {
            id: 'BK-' + Math.floor(1000 + Math.random() * 9000),
            userId: 'usr-guest-walkin', // Walk-in indicator
            roomId,
            guestName,
            guestEmail,
            guestPhone,
            checkIn,
            checkOut,
            totalPrice,
            status,
            createdAt: new Date().toISOString().split('T')[0]
        };

        const success = await KaghanDB.addBooking(newBooking);
        if (success) {
            KaghanUI.showToast(`Walk-in booking ${newBooking.id} created successfully!`, 'success');
            await renderBookings();
            if (window.AdminDashboardModule) {
                await window.AdminDashboardModule.refreshAll();
            }
            closeAddBookingModal();
        } else {
            KaghanUI.showToast('Failed to save booking.', 'error');
        }
    };

    window.openEditBookingModal = async (id) => {
        activeEditBookingId = id;
        const bookings = await KaghanDB.getBookings();
        const booking = bookings.find(b => b.id === id);
        if (!booking) return;

        adminRoomsList = await KaghanDB.getRooms();
        const select = document.getElementById('edit-booking-room');
        if (select) {
            select.innerHTML = adminRoomsList.map(r => `
                <option value="${r.id}" data-price="${r.price}">${r.name} (${r.location || 'Islamabad'}) - PKR ${r.price}</option>
            `).join('');
            select.value = booking.roomId;
        }

        document.getElementById('edit-booking-id-lbl').innerText = `Booking ID: ${booking.id}`;
        document.getElementById('edit-booking-name').value = booking.guestName;
        document.getElementById('edit-booking-email').value = booking.guestEmail;
        document.getElementById('edit-booking-phone').value = booking.guestPhone;
        document.getElementById('edit-booking-checkin').value = booking.checkIn;
        document.getElementById('edit-booking-checkout').value = booking.checkOut;
        document.getElementById('edit-booking-price').value = booking.totalPrice;
        document.getElementById('edit-booking-status').value = booking.status;

        const modal = document.getElementById('edit-booking-modal');
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.firstElementChild.classList.remove('scale-95');
        }, 10);
    };

    window.closeEditBookingModal = () => {
        const modal = document.getElementById('edit-booking-modal');
        modal.classList.add('opacity-0');
        modal.firstElementChild.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            activeEditBookingId = null;
            document.getElementById('edit-booking-form').reset();
        }, 300);
    };

    window.calculateAdminEditBookingPrice = () => {
        const roomSelect = document.getElementById('edit-booking-room');
        const checkinStr = document.getElementById('edit-booking-checkin').value;
        const checkoutStr = document.getElementById('edit-booking-checkout').value;
        const priceInput = document.getElementById('edit-booking-price');

        if (!roomSelect || !checkinStr || !checkoutStr || !priceInput) return;

        const selectedOption = roomSelect.options[roomSelect.selectedIndex];
        if (!selectedOption) return;
        const roomPrice = parseFloat(selectedOption.getAttribute('data-price')) || 0;

        const nights = Math.max(1, Math.round((new Date(checkoutStr) - new Date(checkinStr)) / (1000 * 60 * 60 * 24)));
        priceInput.value = roomPrice * nights;
    };

    window.submitEditBooking = async (e) => {
        e.preventDefault();
        if (!activeEditBookingId) return;

        const guestName = document.getElementById('edit-booking-name').value.trim();
        const guestEmail = document.getElementById('edit-booking-email').value.trim();
        const guestPhone = document.getElementById('edit-booking-phone').value.trim();
        const roomId = document.getElementById('edit-booking-room').value;
        const checkIn = document.getElementById('edit-booking-checkin').value;
        const checkOut = document.getElementById('edit-booking-checkout').value;
        const totalPrice = parseInt(document.getElementById('edit-booking-price').value) || 0;
        const status = document.getElementById('edit-booking-status').value;

        if (!guestName || !guestEmail || !guestPhone || !roomId || !checkIn || !checkOut || totalPrice <= 0) {
            KaghanUI.showToast('Please enter valid booking details.', 'error');
            return;
        }

        const updatedData = {
            roomId,
            guestName,
            guestEmail,
            guestPhone,
            checkIn,
            checkOut,
            totalPrice,
            status
        };

        const success = await KaghanDB.updateBookingDetails(activeEditBookingId, updatedData);
        if (success) {
            KaghanUI.showToast(`Booking details for ${activeEditBookingId} updated successfully!`, 'success');
            await renderBookings();
            if (window.AdminDashboardModule) {
                await window.AdminDashboardModule.refreshAll();
            }
            closeEditBookingModal();
        } else {
            KaghanUI.showToast('Failed to update booking details.', 'error');
        }
    };

    // Export to window
    window.AdminBookingsModule = {
        render: renderBookings
    };
})();
