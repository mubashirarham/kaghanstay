// Kaghan Hotel - User Dashboard Bookings Module
(function() {
    let activeCancelId = null;
    let activeRescheduleBooking = null;
    let rescheduleRoom = null;
    let newReschedulePrice = 0;

    // Render User Booking History (Asynchronous from Firestore)
    // Render User Booking History (Asynchronous from Firestore)
    async function renderUserBookings() {
        const user = KaghanDB.getCurrentUser();
        if (!user) return;

        const allBookings = await KaghanDB.getBookings();
        const bookings = allBookings.filter(b => b.userId === user.id);
        const rooms = await KaghanDB.getRooms();
        
        // Split bookings by status
        const activeBookings = bookings.filter(b => b.status === 'confirmed');
        const previousBookings = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

        // Dynamic statistics computation
        const activeCount = activeBookings.length;
        
        let totalNights = 0;
        let totalSpend = 0;
        
        bookings.forEach(b => {
            if (b.status === 'confirmed' || b.status === 'completed') {
                const inDate = new Date(b.checkIn);
                const outDate = new Date(b.checkOut);
                const nights = Math.max(1, Math.ceil((outDate - inDate) / (1000 * 3600 * 24)));
                totalNights += nights;
                totalSpend += b.totalPrice;
            }
        });

        // Set metrics elements
        const statActive = document.getElementById('stat-active-bookings');
        const statNights = document.getElementById('stat-nights-stayed');
        const statSpend = document.getElementById('stat-total-spend');

        if (statActive) statActive.innerText = activeCount;
        if (statNights) statNights.innerText = `${totalNights} Night${totalNights !== 1 ? 's' : ''}`;
        if (statSpend) statSpend.innerText = KaghanUI.formatPKR(totalSpend);

        // Helper to render booking rows
        function renderBookingRow(booking) {
            const room = rooms.find(r => r.id === booking.roomId) || { name: 'Unknown Room', price: 0 };
            
            let statusBadge = '';
            if (booking.status === 'confirmed') {
                statusBadge = '<span class="bg-emerald-50 text-emerald-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-150">Confirmed</span>';
            } else if (booking.status === 'completed') {
                statusBadge = '<span class="bg-blue-50 text-blue-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-blue-150">Completed</span>';
            } else if (booking.status === 'cancelled') {
                statusBadge = '<span class="bg-rose-50 text-rose-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-rose-150">Cancelled</span>';
            } else {
                statusBadge = `<span class="bg-slate-50 text-slate-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-slate-200">${booking.status}</span>`;
            }

            const canCancel = booking.status === 'confirmed';
            const canReschedule = booking.status === 'confirmed';
            const canReview = booking.status === 'completed';

            let actionsHtml = '';
            if (canCancel) {
                actionsHtml += `
                    <button onclick="confirmCancelBooking('${booking.id}')" class="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold px-2 py-1 rounded hover:bg-rose-100 transition-all inline-flex items-center gap-1">
                        <i class="fa-solid fa-ban text-[9px]"></i> Cancel
                    </button>
                    <button onclick="openRescheduleModal('${booking.id}')" class="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold px-2 py-1 rounded hover:bg-slate-100 transition-all inline-flex items-center gap-1 ml-1.5">
                        <i class="fa-solid fa-calendar-days text-[9px]"></i> Reschedule
                    </button>
                `;
            }
            if (canReview) {
                actionsHtml += `
                    <button onclick="openReviewModal('${booking.id}', '${room.id}', '${room.name}')" class="bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold px-2 py-1 rounded hover:bg-[#D4AF37] hover:text-white transition-all inline-flex items-center gap-1">
                        <i class="fa-solid fa-star text-[9px]"></i> Write Review
                    </button>
                `;
            }
            if (!actionsHtml) {
                actionsHtml = '<span class="text-xs text-slate-400 font-semibold italic">No actions</span>';
            }

            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-4 text-xs font-bold text-[#D4AF37] uppercase">${booking.id}</td>
                    <td class="px-6 py-4">
                        <span class="font-bold text-slate-800 text-xs block">${room.name}</span>
                        <span class="text-[9px] text-[#D4AF37] font-bold block mt-0.5"><i class="fa-solid fa-location-dot text-[8px] mr-1"></i>${room.location || 'Islamabad'}</span>
                        <span class="text-slate-400 text-[9px] block mt-0.5">${KaghanUI.formatPKR(room.price)} / Night</span>
                    </td>
                    <td class="px-6 py-4 text-xs font-semibold text-slate-600">
                        ${KaghanUI.formatDate(booking.checkIn)} to ${KaghanUI.formatDate(booking.checkOut)}
                    </td>
                    <td class="px-6 py-4 font-bold text-slate-800 text-xs">${KaghanUI.formatPKR(booking.totalPrice)}</td>
                    <td class="px-6 py-4">${statusBadge}</td>
                    <td class="px-6 py-4">${actionsHtml}</td>
                </tr>
            `;
        }

        // Render Active Table
        const activeTbody = document.getElementById('active-bookings-tbody');
        const activeEmpty = document.getElementById('active-bookings-empty-state');
        if (activeTbody) {
            if (activeBookings.length === 0) {
                activeTbody.innerHTML = '';
                if (activeEmpty) activeEmpty.classList.remove('hidden');
            } else {
                if (activeEmpty) activeEmpty.classList.add('hidden');
                activeTbody.innerHTML = activeBookings.map(renderBookingRow).join('');
            }
        }

        // Render Previous/History Table
        const previousTbody = document.getElementById('previous-bookings-tbody');
        const previousEmpty = document.getElementById('previous-bookings-empty-state');
        if (previousTbody) {
            if (previousBookings.length === 0) {
                previousTbody.innerHTML = '';
                if (previousEmpty) previousEmpty.classList.remove('hidden');
            } else {
                if (previousEmpty) previousEmpty.classList.add('hidden');
                previousTbody.innerHTML = previousBookings.map(renderBookingRow).join('');
            }
        }
    }

    // Cancellation logic
    window.confirmCancelBooking = (bookingId) => {
        activeCancelId = bookingId;
        const modal = document.getElementById('cancel-confirm-modal');
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modal.firstElementChild.classList.remove('scale-95');
            }, 10);
        }
    };

    window.closeCancelModal = () => {
        const modal = document.getElementById('cancel-confirm-modal');
        if (modal) {
            modal.classList.add('opacity-0');
            modal.firstElementChild.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
                activeCancelId = null;
            }, 300);
        }
    };

    window.executeCancelBooking = async () => {
        if (!activeCancelId) return;

        const res = await KaghanDB.updateBookingStatus(activeCancelId, 'cancelled');
        if (res) {
            KaghanUI.showToast(`Booking ${activeCancelId} has been successfully cancelled.`, 'success');
            if (window.renderUserProfile) window.renderUserProfile();
            await renderUserBookings();
            closeCancelModal();
        } else {
            KaghanUI.showToast('Could not cancel booking.', 'error');
        }
    };

    // Rescheduling logic
    window.openRescheduleModal = async (bookingId) => {
        const bookings = await KaghanDB.getBookings();
        activeRescheduleBooking = bookings.find(b => b.id === bookingId);
        if (!activeRescheduleBooking) return;

        rescheduleRoom = await KaghanDB.getRoomById(activeRescheduleBooking.roomId);
        if (!rescheduleRoom) return;

        const checkInInput = document.getElementById('reschedule-check-in');
        const checkOutInput = document.getElementById('reschedule-check-out');
        const warningDiv = document.getElementById('reschedule-warning');

        if (checkInInput && checkOutInput) {
            const today = new Date().toISOString().split('T')[0];
            checkInInput.min = today;
            checkInInput.value = activeRescheduleBooking.checkIn;
            
            const checkInDate = new Date(activeRescheduleBooking.checkIn);
            const nextDay = new Date(checkInDate);
            nextDay.setDate(nextDay.getDate() + 1);
            checkOutInput.min = nextDay.toISOString().split('T')[0];
            checkOutInput.value = activeRescheduleBooking.checkOut;
        }

        if (warningDiv) warningDiv.classList.add('hidden');
        await calculateReschedulePrice();

        const modal = document.getElementById('reschedule-modal');
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modal.firstElementChild.classList.remove('scale-95');
            }, 10);
        }
    };

    window.closeRescheduleModal = () => {
        const modal = document.getElementById('reschedule-modal');
        if (modal) {
            modal.classList.add('opacity-0');
            modal.firstElementChild.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
                activeRescheduleBooking = null;
                rescheduleRoom = null;
            }, 300);
        }
    };

    window.calculateReschedulePrice = async () => {
        if (!activeRescheduleBooking || !rescheduleRoom) return;

        const checkInVal = document.getElementById('reschedule-check-in').value;
        const checkOutVal = document.getElementById('reschedule-check-out').value;
        const warningDiv = document.getElementById('reschedule-warning');
        const submitBtn = document.getElementById('reschedule-submit-btn');

        if (!checkInVal || !checkOutVal) return;

        const inDate = new Date(checkInVal);
        const outDate = new Date(checkOutVal);

        // Adjust out minimum on changing inDate
        const checkOutInput = document.getElementById('reschedule-check-out');
        const nextDay = new Date(inDate);
        nextDay.setDate(nextDay.getDate() + 1);
        if (checkOutInput) {
            checkOutInput.min = nextDay.toISOString().split('T')[0];
            if (outDate <= inDate) {
                checkOutInput.value = nextDay.toISOString().split('T')[0];
            }
        }

        const nights = Math.max(1, Math.ceil((outDate - inDate) / (1000 * 3600 * 24)));
        const subtotal = rescheduleRoom.price * nights;
        const tax = Math.round(subtotal * 0.15); // 15% GST

        // Apply loyalty discounts if user qualifies
        let discount = 0;
        const user = KaghanDB.getCurrentUser();
        
        // Mock checking points logic
        if (user && user.role === 'user') {
            const points = user.loyaltyPoints || 0;
            // Check points tier discount
            let tierDiscountPct = 0;
            if (points >= 500) {
                tierDiscountPct = 0.10; // Elite 10%
            } else if (points >= 200) {
                tierDiscountPct = 0.05; // Executive 5%
            }
            discount = Math.round(subtotal * tierDiscountPct);
        }

        newReschedulePrice = (subtotal + tax) - discount;
        document.getElementById('reschedule-price-lbl').innerText = KaghanUI.formatPKR(newReschedulePrice);

        // Check availability overlap (ignore current booking ID to prevent self-overlap)
        const bookings = await KaghanDB.getBookings();
        let overlap = false;

        for (const b of bookings) {
            if (b.roomId === activeRescheduleBooking.roomId && b.id !== activeRescheduleBooking.id && b.status !== 'cancelled') {
                const bIn = new Date(b.checkIn);
                const bOut = new Date(b.checkOut);
                if (inDate < bOut && outDate > bIn) {
                    overlap = true;
                    break;
                }
            }
        }

        if (overlap) {
            if (warningDiv) {
                warningDiv.innerText = "Error: Room is already booked for these dates.";
                warningDiv.classList.remove('hidden');
            }
            if (submitBtn) submitBtn.disabled = true;
        } else {
            if (warningDiv) warningDiv.classList.add('hidden');
            if (submitBtn) submitBtn.disabled = false;
        }
    };

    window.executeRescheduleBooking = async () => {
        if (!activeRescheduleBooking) return;

        const checkInVal = document.getElementById('reschedule-check-in').value;
        const checkOutVal = document.getElementById('reschedule-check-out').value;

        if (!checkInVal || !checkOutVal) {
            KaghanUI.showToast("Please choose valid dates.", "error");
            return;
        }

        const success = await KaghanDB.updateBookingDates(activeRescheduleBooking.id, checkInVal, checkOutVal, newReschedulePrice);
        if (success) {
            KaghanUI.showToast("Reservation rescheduled successfully!", "success");
            await renderUserBookings();
            closeRescheduleModal();
        } else {
            KaghanUI.showToast("Could not save new schedule details.", "error");
        }
    };

    // Publish helper to window
    window.UserBookingsModule = {
        render: renderUserBookings
    };
})();
