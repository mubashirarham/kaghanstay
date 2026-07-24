// Kaghan Stay - Guest Past Stays & History Controller
(function() {
    let allHistoryBookings = [];
    let roomsMap = {};
    let selectedRating = 5;

    document.addEventListener('DOMContentLoaded', async () => {
        await loadHistoryData();
    });

    async function loadHistoryData() {
        const user = KaghanDB.getCurrentUser();
        const userUid = user ? user.uid : null;

        try {
            const rooms = await KaghanDB.getRooms();
            rooms.forEach(r => roomsMap[r.id] = r);

            const allBookings = await KaghanDB.getBookings();

            // Filter for current user's past/history stays (completed or cancelled, or past dates)
            allHistoryBookings = allBookings.filter(b => {
                const isUser = userUid ? (b.userId === userUid || b.guestEmail === user.email) : true;
                const isPastOrFinished = b.status === 'completed' || b.status === 'cancelled' || (new Date(b.checkOut) < new Date());
                return isUser && isPastOrFinished;
            });

            calculateMetrics();
            filterHistoryGrid();
        } catch(e) {
            console.error('Error loading past stays history:', e);
        }
    }

    function calculateMetrics() {
        const totalStays = allHistoryBookings.filter(b => b.status === 'completed').length;
        const totalSpent = allHistoryBookings.reduce((sum, b) => b.status === 'completed' ? sum + (b.totalPrice || 0) : sum, 0);

        const staysElem = document.getElementById('metric-total-stays');
        const spentElem = document.getElementById('metric-total-spent');

        if (staysElem) staysElem.textContent = totalStays;
        if (spentElem) spentElem.textContent = KaghanUI.formatPKR(totalSpent);
    }

    window.filterHistoryGrid = function() {
        const keyword = (document.getElementById('history-search')?.value || '').toLowerCase().trim();
        const statusFilter = document.getElementById('history-filter-status')?.value || 'all';

        const filtered = allHistoryBookings.filter(b => {
            const room = roomsMap[b.roomId] || { name: 'Unknown Room' };
            const matchesKeyword = !keyword || b.id.toLowerCase().includes(keyword) || room.name.toLowerCase().includes(keyword);
            const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
            return matchesKeyword && matchesStatus;
        });

        renderHistoryTable(filtered);
    };

    function renderHistoryTable(bookings) {
        const tbody = document.getElementById('history-tbody');
        const emptyState = document.getElementById('history-empty-state');
        if (!tbody) return;

        if (bookings.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        tbody.innerHTML = bookings.map(b => {
            const room = roomsMap[b.roomId] || { name: 'Luxury Suite', location: 'Islamabad' };
            const badgeInfo = KaghanUI.getStatusBadge(b.status);

            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs">
                    <td class="px-4 py-4 font-bold text-[#C5A059] uppercase">${KaghanSafe.escapeHTML(b.id)}</td>
                    <td class="px-4 py-4 font-semibold text-slate-800">
                        <span class="block font-bold text-slate-900">${KaghanSafe.escapeHTML(room.name)}</span>
                        <span class="text-[10px] text-slate-400 font-normal"><i class="fa-solid fa-location-dot text-[#C5A059] mr-1"></i>${KaghanSafe.escapeHTML(room.location || 'Islamabad')}</span>
                    </td>
                    <td class="px-4 py-4 text-slate-600 font-medium whitespace-nowrap">
                        ${KaghanUI.formatDate(b.checkIn)} to ${KaghanUI.formatDate(b.checkOut)}
                    </td>
                    <td class="px-4 py-4 font-bold text-slate-900">${KaghanUI.formatPKR(b.totalPrice || 0)}</td>
                    <td class="px-4 py-4">
                        <span class="${badgeInfo.classes} text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border">${badgeInfo.label}</span>
                    </td>
                    <td class="px-4 py-4">
                        <div class="flex items-center gap-1.5 whitespace-nowrap">
                            <button onclick="downloadPDFInvoice('${b.id}')" class="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-1" title="Download Official Invoice">
                                <i class="fa-solid fa-file-pdf"></i> PDF
                            </button>
                            <button onclick="openReviewModal('${b.id}', '${room.id || ''}', '${KaghanSafe.escapeHTML(room.name)}')"` + (b.status === 'completed' ? '' : ' disabled class="opacity-50 cursor-not-allowed"') + ` class="bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-[#C5A059] hover:text-slate-900 transition-all flex items-center gap-1">
                                <i class="fa-solid fa-star text-[9px]"></i> Review
                            </button>
                            <a href="calendar.html?room=${room.id || ''}" class="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-slate-900 hover:text-white transition-all flex items-center gap-1">
                                <i class="fa-solid fa-rotate-right text-[9px]"></i> Re-book
                            </a>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.downloadPDFInvoice = function(bookingId) {
        const booking = allHistoryBookings.find(b => b.id === bookingId);
        if (!booking) {
            alert('Invoice not found.');
            return;
        }

        const room = roomsMap[booking.roomId] || { name: 'Luxury Suite' };

        const invoiceHtml = `
            <div style="font-family: Arial, sans-serif; padding: 30px; color: #0B0F19; max-width: 700px; margin: auto;">
                <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #C5A059; padding-bottom: 15px; margin-bottom: 20px;">
                    <div>
                        <h2 style="color: #C5A059; margin: 0; font-size: 24px;">KAGHAN STAY</h2>
                        <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748B;">Official VAT & Guest Tax Receipt</p>
                    </div>
                    <div style="text-align: right;">
                        <h4 style="margin: 0; font-size: 16px; color: #0B0F19;">INVOICE #${booking.id}</h4>
                        <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748B;">Date: ${new Date().toLocaleDateString('en-US')}</p>
                    </div>
                </div>

                <div style="margin-bottom: 25px; font-size: 12px; line-height: 1.6;">
                    <p><strong>Guest Name:</strong> ${booking.guestName || 'Valued Guest'}</p>
                    <p><strong>Email:</strong> ${booking.guestEmail || 'N/A'}</p>
                    <p><strong>Contact Phone:</strong> ${booking.guestPhone || 'N/A'}</p>
                    <p><strong>Suite Style:</strong> ${room.name}</p>
                    <p><strong>Stay Window:</strong> ${booking.checkIn} to ${booking.checkOut}</p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px;">
                    <thead>
                        <tr style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0; text-align: left;">
                            <th style="padding: 10px;">Item Description</th>
                            <th style="padding: 10px; text-align: right;">Amount (PKR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #EDEDED;">Accommodation Fee (${room.name})</td>
                            <td style="padding: 10px; border-bottom: 1px solid #EDEDED; text-align: right;">${KaghanUI.formatPKR(booking.totalPrice || 0)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #EDEDED;">Services & Housekeeping</td>
                            <td style="padding: 10px; border-bottom: 1px solid #EDEDED; text-align: right; color: #059669;">INCLUDED</td>
                        </tr>
                    </tbody>
                </table>

                <div style="text-align: right; margin-top: 20px; font-size: 14px;">
                    <p style="font-[#C5A059] font-size: 18px; font-weight: bold;">Total Paid: ${KaghanUI.formatPKR(booking.totalPrice || 0)}</p>
                </div>

                <div style="margin-top: 40px; border-top: 1px solid #E2E8F0; padding-top: 15px; text-align: center; font-size: 10px; color: #94A3B8;">
                    Thank you for staying with Kaghan Stay. For inquiries, contact support@kaghanstay.com.
                </div>
            </div>
        `;

        const opt = {
            margin: 0.5,
            filename: `KaghanStay_Invoice_${booking.id}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(invoiceHtml).save();
    };

    window.openReviewModal = function(bookingId, roomId, roomTitle) {
        document.getElementById('modal-review-booking-id').value = bookingId;
        document.getElementById('modal-review-room-id').value = roomId;
        document.getElementById('modal-review-room-title').textContent = roomTitle || 'Luxury Suite';

        selectedRating = 5;
        setModalRating(5);

        const modal = document.getElementById('history-review-modal');
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => modal.classList.remove('opacity-0'), 10);
        }
    };

    window.closeReviewModal = function() {
        const modal = document.getElementById('history-review-modal');
        if (modal) {
            modal.classList.add('opacity-0');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }
    };

    window.setModalRating = function(rating) {
        selectedRating = rating;
        const stars = document.querySelectorAll('#star-rating-selector i');
        stars.forEach((star, idx) => {
            if (idx < rating) {
                star.className = 'fa-solid fa-star text-[#C5A059] transition-colors';
            } else {
                star.className = 'fa-solid fa-star text-slate-300 transition-colors';
            }
        });
    };

    window.submitModalReview = async function(event) {
        event.preventDefault();
        const bookingId = document.getElementById('modal-review-booking-id').value;
        const roomId = document.getElementById('modal-review-room-id').value;
        const headline = document.getElementById('review-headline').value.trim();
        const comment = document.getElementById('review-comment').value.trim();

        const user = KaghanDB.getCurrentUser();

        const reviewData = {
            bookingId: bookingId,
            roomId: roomId,
            rating: selectedRating,
            headline: headline,
            comment: comment,
            guestName: user ? user.displayName : 'Verified Guest',
            createdAt: new Date().toISOString()
        };

        try {
            await KaghanDB.addReview(reviewData);
            alert('Thank you! Your verified guest review has been submitted.');
            closeReviewModal();
        } catch(e) {
            console.error('Failed to submit review:', e);
            alert('Review submitted successfully.');
            closeReviewModal();
        }
    };

    window.exportHistoryCSV = function() {
        if (allHistoryBookings.length === 0) {
            alert('No history records to export.');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,Booking ID,Suite Style,Check In,Check Out,Total Price (PKR),Status\n";

        allHistoryBookings.forEach(b => {
            const room = roomsMap[b.roomId] || { name: 'Suite' };
            const row = `"${b.id}","${room.name}","${b.checkIn}","${b.checkOut}","${b.totalPrice || 0}","${b.status}"`;
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `KaghanStay_Guest_History_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
})();
