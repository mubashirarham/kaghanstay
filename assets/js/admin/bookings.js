// Kaghan Hotel - Admin Bookings Manager Module
(function() {
    async function renderBookings() {
        const bookings = await KaghanDB.getBookings();
        const rooms = await KaghanDB.getRooms();
        const tbody = document.getElementById('admin-bookings-tbody');
        const emptyState = document.getElementById('bookings-empty-state');

        if (!tbody) return;

        // Reset check boxes state on re-render
        const selectAll = document.getElementById('bookings-select-all');
        if (selectAll) selectAll.checked = false;
        const bulkBar = document.getElementById('booking-bulk-actions');
        if (bulkBar) bulkBar.classList.add('hidden');

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
                    booking.status === 'confirmed' ? 'text-emerald-600 border-emerald-200 bg-emerald-50/20' :
                    booking.status === 'completed' ? 'text-blue-600 border-blue-200 bg-blue-50/20' : 'text-rose-600 border-rose-200 bg-rose-50/20'
                }">
                    <option value="confirmed" ${booking.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="completed" ${booking.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="cancelled" ${booking.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            `;

            const isWalkin = booking.userId === 'usr-guest-walkin';
            const guestBadge = isWalkin 
                ? `<span class="bg-slate-200 text-slate-700 border border-slate-300 rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wide uppercase inline-block mt-1">Walk-in Guest</span>`
                : `<span class="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wide uppercase inline-block mt-1">Kaghan Member</span>`;

            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td class="px-4 py-4"><input type="checkbox" value="${booking.id}" onclick="updateBulkActionBar()" class="booking-row-checkbox rounded border-slate-300 text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer"></td>
                    <td class="px-6 py-4 text-xs font-bold text-[#D4AF37] uppercase">${KaghanSafe.escapeHTML(booking.id)}</td>
                    <td class="px-6 py-4">
                        <span class="font-bold text-slate-800 text-sm block">${KaghanSafe.escapeHTML(booking.guestName)}</span>
                        <span class="text-slate-400 text-[10px] block mt-0.5">${KaghanSafe.escapeHTML(booking.guestEmail)} | ${KaghanSafe.escapeHTML(booking.guestPhone || '')}</span>
                        ${guestBadge}
                    </td>
                    <td class="px-6 py-4 text-xs font-semibold text-slate-600">${KaghanSafe.escapeHTML(room.name)}</td>
                    <td class="px-6 py-4 text-xs text-slate-600">
                        ${KaghanUI.formatDate(booking.checkIn)} to ${KaghanUI.formatDate(booking.checkOut)}
                    </td>
                    <td class="px-6 py-4 font-bold text-slate-800 text-sm">${KaghanUI.formatPKR(booking.totalPrice)}</td>
                    <td class="px-6 py-4 flex gap-2">
                        ${statusSelect}
                        <button onclick="downloadPDFInvoice('${booking.id}')" class="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold px-2.5 py-1.5 rounded hover:bg-indigo-100 transition-all inline-flex items-center gap-1.5" title="Download PDF Invoice">
                            <i class="fa-solid fa-file-pdf text-[9px]"></i> PDF
                        </button>
                        <button onclick="openEditBookingModal('${booking.id}')" class="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded hover:bg-slate-100 transition-all inline-flex items-center gap-1.5" title="Edit Booking Details">
                            <i class="fa-solid fa-pen text-[9px]"></i> Edit
                        </button>
                        <button onclick="deleteBookingRecord('${booking.id}')" class="text-rose-500 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 transition-colors" title="Delete Booking">
                            <i class="fa-solid fa-trash-can text-sm"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Quick filter pills state sync and style update
    window.setBookingFilterStatus = (status) => {
        const select = document.getElementById('booking-filter-status');
        if (select) {
            select.value = status;
        }

        // Update pills visual style
        const pills = document.querySelectorAll('#booking-filter-pills button');
        pills.forEach(btn => {
            const isTarget = btn.id === `filter-pill-${status}`;
            if (isTarget) {
                btn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition-all border border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/15';
            } else {
                btn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition-all border border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-100';
            }
        });

        renderBookings();
    };

    // Checkbox toggling and select-all logic
    window.toggleSelectAllBookings = (selectAllEl) => {
        const checkBoxes = document.querySelectorAll('.booking-row-checkbox');
        checkBoxes.forEach(box => {
            box.checked = selectAllEl.checked;
        });
        updateBulkActionBar();
    };

    window.updateBulkActionBar = () => {
        const checkBoxes = document.querySelectorAll('.booking-row-checkbox');
        const selected = Array.from(checkBoxes).filter(box => box.checked);
        const countSpan = document.getElementById('selected-bookings-count');
        const bulkBar = document.getElementById('booking-bulk-actions');

        if (countSpan) countSpan.innerText = selected.length;

        if (bulkBar) {
            if (selected.length > 0) {
                bulkBar.classList.remove('hidden');
            } else {
                bulkBar.classList.add('hidden');
                // Deselect main toggle if everything is deselected
                const selectAll = document.getElementById('bookings-select-all');
                if (selectAll) selectAll.checked = false;
            }
        }
    };

    // Bulk actions
    window.bulkChangeBookingStatus = async (newStatus) => {
        const checkBoxes = document.querySelectorAll('.booking-row-checkbox');
        const selectedIds = Array.from(checkBoxes).filter(box => box.checked).map(box => box.value);

        if (selectedIds.length === 0) return;

        if (!confirm(`Are you sure you want to update the status of ${selectedIds.length} bookings to "${newStatus}"?`)) return;

        let successes = 0;
        for (const id of selectedIds) {
            const success = await KaghanDB.updateBookingStatus(id, newStatus);
            if (success) successes++;
        }

        KaghanUI.showToast(`Updated status for ${successes}/${selectedIds.length} bookings.`, 'success');
        if (window.AdminDashboardModule) {
            await window.AdminDashboardModule.refreshAll();
        }
    };

    window.bulkDeleteBookings = async () => {
        const checkBoxes = document.querySelectorAll('.booking-row-checkbox');
        const selectedIds = Array.from(checkBoxes).filter(box => box.checked).map(box => box.value);

        if (selectedIds.length === 0) return;

        if (!confirm(`CAUTION: Are you sure you want to permanently delete the ledger of ${selectedIds.length} bookings? This cannot be undone.`)) return;

        let successes = 0;
        for (const id of selectedIds) {
            const success = await KaghanDB.deleteBooking(id);
            if (success) successes++;
        }

        KaghanUI.showToast(`Permanently deleted ${successes}/${selectedIds.length} bookings from ledger.`, 'success');
        if (window.AdminDashboardModule) {
            await window.AdminDashboardModule.refreshAll();
        }
    };

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

    // Render Admin Calendar
    let calendarInstance = null;

    async function renderCalendar() {
        const calendarEl = document.getElementById('admin-calendar');
        if (!calendarEl || typeof FullCalendar === 'undefined') return;

        const bookings = await KaghanDB.getBookings();
        const rooms = await KaghanDB.getRooms();

        const events = bookings.map(b => {
            const room = rooms.find(r => r.id === b.roomId) || { name: 'Unknown Suite' };
            let color = '#3B82F6'; // Default Blue for completed
            if (b.status === 'confirmed') color = '#10B981'; // Green
            if (b.status === 'cancelled') color = '#EF4444'; // Red
            if (b.status === 'pending') color = '#F59E0B'; // Orange

            // FullCalendar exclusive end date logic (needs +1 day for inclusive visual rendering)
            const endDate = new Date(b.checkOut);
            endDate.setDate(endDate.getDate() + 1);

            return {
                id: b.id,
                title: `${room.name} - ${b.guestName}`,
                start: b.checkIn,
                end: endDate.toISOString().split('T')[0],
                backgroundColor: color,
                borderColor: color,
                extendedProps: {
                    status: b.status,
                    guest: b.guestName,
                    room: room.name
                }
            };
        });

        if (calendarInstance) {
            calendarInstance.removeAllEvents();
            calendarInstance.addEventSource(events);
            calendarInstance.render();
        } else {
            calendarInstance = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek'
                },
                events: events,
                eventClick: function(info) {
                    // Open the edit modal when an event is clicked
                    if (window.openEditBookingModal) {
                        window.openEditBookingModal(info.event.id);
                    }
                }
            });
            calendarInstance.render();
        }
    }

    // Export to window
    window.AdminBookingsModule = {
        render: async () => {
            await renderBookings();
            await renderCalendar();
        },
        renderCalendar: renderCalendar
    };
})();
