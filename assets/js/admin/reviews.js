// Kaghan Hotel - Admin Reviews Moderation Module
(function() {
    async function renderReviews() {
        const reviews = await KaghanDB.getReviews();
        const rooms = await KaghanDB.getRooms();
        const tbody = document.getElementById('admin-reviews-tbody');
        const emptyState = document.getElementById('reviews-empty-state');

        if (!tbody) return;

        const keyword = (document.getElementById('review-search-input')?.value || '').toLowerCase().trim();

        let filtered = reviews.filter(r => {
            const room = rooms.find(rm => rm.id === r.roomId) || { name: '' };
            const matchesKeyword = !keyword ||
                                   r.userName.toLowerCase().includes(keyword) ||
                                   room.name.toLowerCase().includes(keyword) ||
                                   r.comment.toLowerCase().includes(keyword);
            return matchesKeyword;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        tbody.innerHTML = filtered.map(review => {
            const room = rooms.find(rm => rm.id === review.roomId) || { name: 'Unknown Room' };
            const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-4">
                        <span class="font-bold text-slate-800 text-xs block">${KaghanSafe.escapeHTML(review.userName)}</span>
                    </td>
                    <td class="px-6 py-4 text-xs font-semibold text-slate-600">${KaghanSafe.escapeHTML(room.name)}</td>
                    <td class="px-6 py-4 text-xs font-bold text-[#D4AF37]">${stars} (${review.rating}/5)</td>
                    <td class="px-6 py-4 text-xs text-slate-500 max-w-xs truncate" title="${KaghanSafe.escapeHTML(review.comment)}">
                        ${KaghanSafe.escapeHTML(review.comment)}
                    </td>
                    <td class="px-6 py-4 text-[10px] text-slate-400">
                        ${KaghanUI.formatDate(review.createdAt)}
                    </td>
                    <td class="px-6 py-4">
                        <button onclick="deleteReviewRecord('${review.id}')" class="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-rose-600 hover:text-white transition-all flex items-center gap-1.5">
                            <i class="fa-solid fa-trash-can text-[9px]"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.deleteReviewRecord = async (reviewId) => {
        if (!confirm(`Are you sure you want to delete this guest review? This will automatically recalculate the room's average rating.`)) return;

        const success = await KaghanDB.deleteReview(reviewId);
        if (success) {
            KaghanUI.showToast("Review deleted successfully, and room ratings re-calculated.", "success");
            if (window.AdminDashboardModule) {
                await window.AdminDashboardModule.refreshAll();
            }
        } else {
            KaghanUI.showToast("Failed to delete review record.", "error");
        }
    };

    // Export to window
    window.AdminReviewsModule = {
        render: renderReviews
    };
})();
