// Kaghan Hotel - Admin Bookings Manager Module
(function() {
    let adminBookingsPage = 1;
    const adminBookingsPerPage = 8;

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
            const pagContainer = document.getElementById('admin-bookings-pagination');
            if (pagContainer) pagContainer.classList.add('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        const totalPages = Math.ceil(filtered.length / adminBookingsPerPage);
        if (adminBookingsPage > totalPages) adminBookingsPage = 1;

        const startIndex = (adminBookingsPage - 1) * adminBookingsPerPage;
        const paginated = filtered.slice(startIndex, startIndex + adminBookingsPerPage);

        tbody.innerHTML = paginated.map(booking => {
            const room = rooms.find(r => r.id === booking.roomId) || { name: 'Unknown Suite' };
            
            const badge = KaghanUI.getStatusBadge(booking.status);
            let statusSelect = `
                <select onchange="changeBookingStatus('${booking.id}', this.value)" class="bg-slate-50 border border-slate-200 rounded-lg text-[11px] px-2 py-1 outline-none font-bold cursor-pointer ${badge.classes}">
                    <option value="confirmed" ${booking.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="completed" ${booking.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="cancelled" ${booking.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            `;

            const isWalkin = booking.userId === 'usr-guest-walkin';
            const guestBadge = isWalkin 
                ? `<span class="bg-slate-200 text-slate-700 border border-slate-300 rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wide uppercase inline-block mt-1">Walk-in Guest</span>`
                : `<span class="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wide uppercase inline-block mt-1">Kaghan Member</span>`;

            const couponBadge = booking.couponUsed
                ? (booking.couponProvider === 'golootlo' || booking.couponUsed === 'KPHSTAY' || booking.couponUsed === 'KPHSGL12' || (booking.couponUsed && booking.couponUsed.startsWith('GOL'))
                    ? `<span class="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-wide inline-flex items-center gap-1 mt-1"><i class="fa-solid fa-gift text-emerald-600"></i> Golootlo (${KaghanSafe.escapeHTML(booking.couponUsed)})</span>`
                    : `<span class="bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wide inline-flex items-center gap-1 mt-1"><i class="fa-solid fa-tag"></i> ${KaghanSafe.escapeHTML(booking.couponUsed)}</span>`)
                : '';

            return `
                <tr onclick="openBookingDetails('${booking.id}')" class="border-b border-slate-100 hover:bg-amber-50/40 transition-colors cursor-pointer group">
                    <td class="px-4 py-4" onclick="event.stopPropagation()">
                        <input type="checkbox" value="${booking.id}" onclick="updateBulkActionBar()" class="booking-row-checkbox rounded border-slate-300 text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer">
                    </td>
                    <td class="px-6 py-4 text-xs font-extrabold text-[#D4AF37] uppercase font-mono group-hover:underline">
                        ${KaghanSafe.escapeHTML(booking.id)}
                    </td>
                    <td class="px-6 py-4">
                        <span class="font-bold text-slate-800 text-sm block group-hover:text-[#D4AF37] transition-colors">${KaghanSafe.escapeHTML(booking.guestName)}</span>
                        <span class="text-slate-400 text-[10px] block mt-0.5">${KaghanSafe.escapeHTML(booking.guestEmail)} | ${KaghanSafe.escapeHTML(booking.guestPhone || '')}</span>
                        <div class="flex flex-wrap gap-1 items-center mt-1">
                            ${guestBadge}
                            ${couponBadge}
                        </div>
                    </td>
                    <td class="px-6 py-4 text-xs font-semibold text-slate-600">${KaghanSafe.escapeHTML(room.name)}</td>
                    <td class="px-6 py-4 text-xs text-slate-600">
                        ${KaghanUI.formatDate(booking.checkIn)} to ${KaghanUI.formatDate(booking.checkOut)}
                    </td>
                    <td class="px-6 py-4 font-bold text-slate-800 text-sm font-mono">${KaghanUI.formatPKR(booking.totalPrice)}</td>
                    <td class="px-6 py-4 flex gap-1.5 items-center" onclick="event.stopPropagation()">
                        ${statusSelect}
                        <button onclick="event.stopPropagation(); openBookingDetails('${booking.id}')" class="bg-amber-50 border border-amber-200 text-[#B8860B] hover:bg-amber-100 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all inline-flex items-center gap-1" title="View Full Booking Details">
                            <i class="fa-solid fa-eye text-[9px]"></i> View
                        </button>
                        <button onclick="event.stopPropagation(); downloadPDFInvoice('${booking.id}')" class="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all inline-flex items-center gap-1" title="Download PDF Invoice">
                            <i class="fa-solid fa-file-pdf text-[9px]"></i> PDF
                        </button>
                        <button onclick="event.stopPropagation(); openEditBookingModal('${booking.id}')" class="bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all inline-flex items-center gap-1" title="Edit Booking Details">
                            <i class="fa-solid fa-pen text-[9px]"></i> Edit
                        </button>
                        <button onclick="event.stopPropagation(); deleteBookingRecord('${booking.id}')" class="text-rose-500 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 transition-colors" title="Delete Booking">
                            <i class="fa-solid fa-trash-can text-sm"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        if (window.KaghanUI && window.KaghanUI.renderPaginationControls) {
            KaghanUI.renderPaginationControls({
                container: 'admin-bookings-pagination',
                currentPage: adminBookingsPage,
                totalPages: totalPages,
                totalItems: filtered.length,
                itemsPerPage: adminBookingsPerPage,
                onPageChange: (p) => {
                    adminBookingsPage = p;
                    renderBookings();
                }
            });
        }
    }

    // Quick filter pills state sync and style update
    window.setBookingFilterStatus = (status) => {
        adminBookingsPage = 1;
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

        let newBookingId = '';
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const arr = new Uint8Array(5);
            crypto.getRandomValues(arr);
            const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
            newBookingId = 'BK-' + hex;
        } else {
            newBookingId = 'BK-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
        }

        // Uniqueness check with short retry loop
        const existingBookings = await KaghanDB.getBookings();
        let retryCount = 0;
        while (existingBookings.some(b => b.id === newBookingId) && retryCount < 5) {
            if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
                const arr = new Uint8Array(5);
                crypto.getRandomValues(arr);
                newBookingId = 'BK-' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
            } else {
                newBookingId = 'BK-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
            }
            retryCount++;
        }

        const newBooking = {
            id: newBookingId,
            userId: 'usr-guest-walkin', // Walk-in indicator
            roomId,
            guestName,
            guestEmail,
            guestPhone,
            checkIn,
            checkOut,
            totalPrice,
            status,
            createdAt: KaghanDB.formatLocalDate(new Date())
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

        const isMobile = window.innerWidth < 768;

        if (calendarInstance) {
            calendarInstance.removeAllEvents();
            calendarInstance.addEventSource(events);
            calendarInstance.render();
            setTimeout(() => {
                try { calendarInstance.updateSize(); } catch(e){}
            }, 60);
        } else {
            calendarInstance = new FullCalendar.Calendar(calendarEl, {
                initialView: isMobile ? 'dayGridMonth' : 'dayGridMonth',
                headerToolbar: isMobile ? {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,listMonth'
                } : {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,listMonth'
                },
                buttonText: {
                    today: 'Today',
                    dayGridMonth: 'Month',
                    timeGridWeek: 'Week',
                    listMonth: 'List'
                },
                height: 'auto',
                events: events,
                eventClick: function(info) {
                    // Open the edit modal when an event is clicked
                    if (window.openEditBookingModal) {
                        window.openEditBookingModal(info.event.id);
                    }
                }
            });
            calendarInstance.render();
            setTimeout(() => {
                try { calendarInstance.updateSize(); } catch(e){}
            }, 60);
        }
    }

    // Auto-update calendar dimensions on window resize
    window.addEventListener('resize', () => {
        if (calendarInstance) {
            try { calendarInstance.updateSize(); } catch(e){}
        }
    });

    // --- BOOKING DETAILS CONTROLLER ---
    let activeDetailBookingId = null;

    window.openBookingDetails = async (bookingId) => {
        if (!bookingId) return;
        activeDetailBookingId = bookingId;

        const bookings = await KaghanDB.getBookings();
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) {
            if (window.KaghanUI) KaghanUI.showToast(`Booking record ${bookingId} not found.`, 'error');
            return;
        }

        const rooms = await KaghanDB.getRooms();
        const room = rooms.find(r => r.id === booking.roomId) || { 
            name: booking.propertyName || 'Luxury Accommodation',
            price: booking.totalPrice,
            location: 'Islamabad'
        };

        const inDate = new Date(booking.checkIn);
        const outDate = new Date(booking.checkOut);
        let nights = 1;
        if (!isNaN(inDate.getTime()) && !isNaN(outDate.getTime())) {
            nights = Math.max(1, Math.ceil((outDate - inDate) / (1000 * 3600 * 24)));
        }

        const grandTotal = Number(booking.grandTotal || booking.totalPrice || 0);
        const accomCharges = booking.accomCharges !== undefined ? Number(booking.accomCharges) : (booking.subtotal ? Number(booking.subtotal) : grandTotal);
        const cleaningFee = Number(booking.cleaningFee || 0);
        const extraGuestCharges = Number(booking.extraGuestCharges || 0);
        const otherCharges = Number(booking.otherCharges || (booking.upgradesTotal || 0));
        const subtotal = booking.subtotal !== undefined ? Number(booking.subtotal) : (accomCharges + cleaningFee + extraGuestCharges + otherCharges);
        const discount = Number(booking.discount || booking.discountAmount || 0);
        const advancePaid = booking.advancePaid !== undefined ? Number(booking.advancePaid) : (booking.paymentStatus === 'PAID' ? grandTotal : Number(booking.advanceAmount || 0));
        const balanceDue = booking.balanceDue !== undefined ? Number(booking.balanceDue) : Math.max(0, grandTotal - advancePaid);
        const paymentStatus = (booking.paymentStatus || (balanceDue === 0 ? 'PAID' : (advancePaid > 0 ? 'PARTIALLY PAID' : 'UNPAID'))).toUpperCase();
        const isPaid = paymentStatus === 'PAID';

        const bookingSource = booking.bookingSource || (booking.userId === 'usr-guest-walkin' ? 'Walk-in Guest' : 'KPHStay.com');
        const invoiceNo = booking.invoiceNo || `KPH-INV-${(booking.id || '').replace(/^KPH-BOOK-|^BK-/, '')}`;

        // Header & Breadcrumb
        const bcId = document.getElementById('detail-booking-breadcrumb-id');
        if (bcId) bcId.textContent = booking.id;
        const titleEl = document.getElementById('detail-booking-title');
        if (titleEl) titleEl.textContent = `Booking Details — ${booking.guestName}`;

        const statusSelect = document.getElementById('detail-booking-status-select');
        if (statusSelect) statusSelect.value = booking.status || 'confirmed';

        const standaloneLink = document.getElementById('detail-standalone-link');
        if (standaloneLink) standaloneLink.href = `booking-details.html?id=${encodeURIComponent(booking.id)}`;

        // Ribbon
        const ribId = document.getElementById('detail-ribbon-id');
        if (ribId) ribId.textContent = booking.id;
        const ribSource = document.getElementById('detail-ribbon-source');
        if (ribSource) ribSource.textContent = bookingSource;
        const ribNights = document.getElementById('detail-ribbon-nights');
        if (ribNights) ribNights.textContent = `${nights} Night${nights > 1 ? 's' : ''}`;
        const ribDates = document.getElementById('detail-ribbon-dates');
        if (ribDates) ribDates.textContent = `${KaghanUI.formatDate(booking.checkIn)} → ${KaghanUI.formatDate(booking.checkOut)}`;
        const ribTotal = document.getElementById('detail-ribbon-total');
        if (ribTotal) ribTotal.textContent = KaghanUI.formatPKR(grandTotal);
        const ribPayStatus = document.getElementById('detail-ribbon-payment-status');
        if (ribPayStatus) {
            ribPayStatus.textContent = paymentStatus;
            ribPayStatus.className = `text-[10px] font-extrabold uppercase mt-0.5 ${isPaid ? 'text-emerald-600' : (balanceDue === 0 ? 'text-emerald-600' : 'text-amber-600')}`;
        }
        const ribBalance = document.getElementById('detail-ribbon-balance');
        if (ribBalance) ribBalance.textContent = KaghanUI.formatPKR(balanceDue);
        const ribAdvance = document.getElementById('detail-ribbon-advance');
        if (ribAdvance) ribAdvance.textContent = `Advance: ${KaghanUI.formatPKR(advancePaid)}`;

        // Guest Card
        const gName = document.getElementById('detail-guest-name');
        if (gName) gName.textContent = booking.guestName;
        const gPhone = document.getElementById('detail-guest-phone');
        if (gPhone) gPhone.textContent = booking.guestPhone || 'N/A';
        const gEmail = document.getElementById('detail-guest-email');
        if (gEmail) gEmail.textContent = booking.guestEmail || 'N/A';
        const gEmailLink = document.getElementById('detail-email-link');
        if (gEmailLink) gEmailLink.href = `mailto:${booking.guestEmail || ''}`;
        const gCnic = document.getElementById('detail-guest-cnic');
        if (gCnic) gCnic.textContent = booking.cnicPassport || booking.cnic || 'Verified at Check-in';

        const phoneActions = document.getElementById('detail-phone-actions');
        if (phoneActions && booking.guestPhone) {
            const cleanPhone = booking.guestPhone.replace(/[^0-9+]/g, '');
            const waPhone = cleanPhone.replace(/^0/, '92').replace(/^\+/, '');
            phoneActions.innerHTML = `
                <a href="tel:${cleanPhone}" class="w-6 h-6 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px]" title="Call Guest"><i class="fa-solid fa-phone"></i></a>
                <a href="https://wa.me/${waPhone}" target="_blank" class="w-6 h-6 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px]" title="WhatsApp Guest"><i class="fa-brands fa-whatsapp"></i></a>
            `;
        } else if (phoneActions) {
            phoneActions.innerHTML = '';
        }

        const isWalkin = booking.userId === 'usr-guest-walkin';
        const guestBadgeEl = document.getElementById('detail-guest-type-badge');
        if (guestBadgeEl) {
            guestBadgeEl.innerHTML = isWalkin
                ? `<span class="bg-slate-200 text-slate-700 border border-slate-300 rounded-full px-3 py-1 text-[10px] font-bold tracking-wide uppercase">Walk-in Guest</span>`
                : `<span class="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-3 py-1 text-[10px] font-bold tracking-wide uppercase">Kaghan Member</span>`;
        }

        // Suite Details
        const sName = document.getElementById('detail-suite-name');
        if (sName) sName.textContent = room.name || 'Luxury Suite';
        const sRate = document.getElementById('detail-suite-rate');
        if (sRate) sRate.textContent = `${KaghanUI.formatPKR(room.price || (grandTotal / nights))} / Night`;
        const sId = document.getElementById('detail-suite-id');
        if (sId) sId.textContent = `Room ID: ${room.id || booking.roomId}`;
        const sLoc = document.getElementById('detail-suite-location-badge');
        if (sLoc) sLoc.textContent = room.location || 'Islamabad';
        const sThumb = document.getElementById('detail-suite-thumb');
        if (sThumb) {
            sThumb.src = (room.images && room.images[0]) || room.image || '../assets/images/logo.png';
        }

        const stayCheckin = document.getElementById('detail-stay-checkin');
        if (stayCheckin) stayCheckin.textContent = KaghanUI.formatDate(booking.checkIn);
        const stayCheckout = document.getElementById('detail-stay-checkout');
        if (stayCheckout) stayCheckout.textContent = KaghanUI.formatDate(booking.checkOut);
        const stayNights = document.getElementById('detail-stay-nights');
        if (stayNights) stayNights.textContent = `${nights} Night${nights > 1 ? 's' : ''}`;
        const stayGuests = document.getElementById('detail-stay-guests');
        if (stayGuests) stayGuests.textContent = `${booking.adults || 2} Adults`;
        const stayChildren = document.getElementById('detail-stay-children');
        if (stayChildren) stayChildren.textContent = `${booking.children || 0} Children`;

        const specialNotes = document.getElementById('detail-special-notes');
        if (specialNotes) specialNotes.textContent = booking.specialRequests || booking.notes || 'No special requests specified for this stay.';

        // Billing
        const lineRoomLbl = document.getElementById('detail-line-room-lbl');
        if (lineRoomLbl) lineRoomLbl.textContent = `Accommodation (${nights} Night${nights > 1 ? 's' : ''}):`;
        const lineRoomVal = document.getElementById('detail-line-room-val');
        if (lineRoomVal) lineRoomVal.textContent = KaghanUI.formatPKR(accomCharges);

        const cleaningRow = document.getElementById('detail-line-cleaning-row');
        if (cleaningRow) {
            if (cleaningFee > 0) {
                cleaningRow.classList.remove('hidden');
                document.getElementById('detail-line-cleaning-val').textContent = KaghanUI.formatPKR(cleaningFee);
            } else {
                cleaningRow.classList.add('hidden');
            }
        }

        const extraRow = document.getElementById('detail-line-extra-row');
        if (extraRow) {
            if (extraGuestCharges > 0) {
                extraRow.classList.remove('hidden');
                document.getElementById('detail-line-extra-val').textContent = KaghanUI.formatPKR(extraGuestCharges);
            } else {
                extraRow.classList.add('hidden');
            }
        }

        const upgradesRow = document.getElementById('detail-line-upgrades-row');
        if (upgradesRow) {
            if (otherCharges > 0) {
                upgradesRow.classList.remove('hidden');
                document.getElementById('detail-line-upgrades-val').textContent = KaghanUI.formatPKR(otherCharges);
            } else {
                upgradesRow.classList.add('hidden');
            }
        }

        const discountRow = document.getElementById('detail-line-discount-row');
        if (discountRow) {
            if (discount > 0) {
                discountRow.classList.remove('hidden');
                const discLbl = document.getElementById('detail-discount-lbl');
                if (discLbl) discLbl.textContent = `Discount ${booking.couponUsed ? `(${booking.couponUsed})` : ''}:`;
                document.getElementById('detail-line-discount-val').textContent = `- ${KaghanUI.formatPKR(discount)}`;
            } else {
                discountRow.classList.add('hidden');
            }
        }

        const grandTotalEl = document.getElementById('detail-grand-total');
        if (grandTotalEl) grandTotalEl.textContent = KaghanUI.formatPKR(grandTotal);
        const advEl = document.getElementById('detail-advance-paid');
        if (advEl) advEl.textContent = KaghanUI.formatPKR(advancePaid);
        const balEl = document.getElementById('detail-balance-due');
        if (balEl) {
            balEl.textContent = KaghanUI.formatPKR(balanceDue);
            balEl.className = balanceDue > 0 ? 'text-rose-600 font-extrabold text-sm' : 'text-emerald-600 font-extrabold text-sm';
        }

        const payMethodEl = document.getElementById('detail-payment-method');
        if (payMethodEl) payMethodEl.textContent = booking.paymentMethod || 'Credit/Debit Card / Direct Pay';
        const payRefEl = document.getElementById('detail-payment-ref');
        if (payRefEl) payRefEl.textContent = booking.transactionNo || booking.paymentRef || booking.id || 'N/A';
        const invNoEl = document.getElementById('detail-invoice-no');
        if (invNoEl) invNoEl.textContent = `#${invoiceNo}`;

        const billBadge = document.getElementById('detail-billing-status-badge');
        if (billBadge) {
            billBadge.textContent = paymentStatus;
            billBadge.className = isPaid 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wide uppercase'
                : 'bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wide uppercase';
        }

        // Live Official Invoice Preview
        const previewContainer = document.getElementById('detail-live-invoice-container');
        if (previewContainer && window.getCleanInvoiceHTML) {
            previewContainer.innerHTML = window.getCleanInvoiceHTML(booking, room);
        }

        // Switch to detail tab
        if (window.switchTab) {
            window.switchTab('booking-details');
        }
        window.location.hash = `#booking?id=${encodeURIComponent(booking.id)}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.backToBookings = () => {
        activeDetailBookingId = null;
        if (window.switchTab) {
            window.switchTab('bookings');
        }
        window.location.hash = '#bookings';
    };

    window.updateBookingDetailStatus = async (newStatus) => {
        if (!activeDetailBookingId) return;
        const success = await KaghanDB.updateBookingStatus(activeDetailBookingId, newStatus);
        if (success) {
            KaghanUI.showToast(`Booking ${activeDetailBookingId} status updated to ${newStatus}.`, 'success');
            await renderBookings();
            if (window.AdminDashboardModule) {
                await window.AdminDashboardModule.refreshAll();
            }
            // Refresh detail view
            await openBookingDetails(activeDetailBookingId);
        } else {
            KaghanUI.showToast('Failed to update booking status.', 'error');
        }
    };

    window.triggerDetailPDFDownload = async () => {
        if (!activeDetailBookingId) return;
        const btn = document.getElementById('detail-download-pdf-btn');
        const origHTML = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>Generating...</span>';
            btn.disabled = true;
        }
        try {
            await window.downloadPDFInvoice(activeDetailBookingId);
        } finally {
            if (btn) {
                btn.innerHTML = origHTML;
                btn.disabled = false;
            }
        }
    };

    window.openDetailEditModal = () => {
        if (activeDetailBookingId && window.openEditBookingModal) {
            window.openEditBookingModal(activeDetailBookingId);
        }
    };

    window.printBookingDetailReceipt = () => {
        if (!activeDetailBookingId) return;
        const container = document.getElementById('detail-live-invoice-container');
        const invoiceContent = container ? container.innerHTML : '';
        const printWin = window.open('', '_blank');
        if (printWin) {
            printWin.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>KPH Stay Official Invoice - ${activeDetailBookingId}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
                    <style>
                        body { margin: 0; padding: 24px; font-family: 'Inter', sans-serif; display: flex; justify-content: center; background: #fff; }
                        @media print {
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    ${invoiceContent}
                    <script>window.onload = function() { window.print(); };</script>
                </body>
                </html>
            `);
            printWin.document.close();
        }
    };

    // Export to window
    window.AdminBookingsModule = {
        render: async () => {
            await renderBookings();
            if (window.AirbnbCalendarSystem) {
                await window.AirbnbCalendarSystem.render();
            } else {
                await renderCalendar();
            }
        },
        renderCalendar: async () => {
            if (window.AirbnbCalendarSystem) {
                await window.AirbnbCalendarSystem.render();
            } else {
                await renderCalendar();
            }
        },
        openBookingDetails: (id) => window.openBookingDetails(id)
    };
})();
