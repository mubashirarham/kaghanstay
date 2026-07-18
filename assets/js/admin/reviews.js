// Kaghan Hotel - Admin Reviews Moderation & Reply Module
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
                                   (r.userName && r.userName.toLowerCase().includes(keyword)) ||
                                   (room.name && room.name.toLowerCase().includes(keyword)) ||
                                   (r.comment && r.comment.toLowerCase().includes(keyword));
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
            const stars = '★'.repeat(review.rating || 5) + '☆'.repeat(5 - (review.rating || 5));

            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-4">
                        <span class="font-bold text-slate-800 text-xs block">${KaghanSafe.escapeHTML(review.userName || 'Guest')}</span>
                        <span class="text-[9px] text-slate-400 font-mono">${KaghanSafe.escapeHTML(review.userId || '')}</span>
                    </td>
                    <td class="px-6 py-4 text-xs font-semibold text-slate-600">${KaghanSafe.escapeHTML(room.name || review.roomName || 'Suite')}</td>
                    <td class="px-6 py-4 text-xs font-bold text-[#D4AF37]">${stars} (${review.rating || 5}/5)</td>
                    <td class="px-6 py-4 text-xs text-slate-600 max-w-xs space-y-2">
                        <p class="italic bg-slate-50 p-2 rounded-xl border border-slate-100 font-light">"${KaghanSafe.escapeHTML(review.comment || '')}"</p>
                        ${review.adminReply ? `
                            <div class="bg-[#0B0F19] text-white text-[10px] p-2 rounded-xl border border-white/10 space-y-1">
                                <span class="text-[#C5A059] font-bold block"><i class="fa-solid fa-reply"></i> Admin Response:</span>
                                <span>${KaghanSafe.escapeHTML(review.adminReply)}</span>
                            </div>
                        ` : ''}
                    </td>
                    <td class="px-6 py-4 text-[10px] text-slate-400">
                        ${KaghanUI.formatDate(review.createdAt)}
                    </td>
                    <td class="px-6 py-4 space-y-1.5">
                        <button onclick="promptReplyReview('${review.id}', '${KaghanSafe.escapeHTML(review.adminReply || '')}')" class="w-full bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-[#C5A059] hover:text-slate-950 transition-all flex items-center justify-center gap-1.5">
                            <i class="fa-solid fa-reply text-[9px]"></i> ${review.adminReply ? 'Edit Reply' : 'Reply'}
                        </button>
                        <button onclick="deleteReviewRecord('${review.id}')" class="w-full bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-1.5">
                            <i class="fa-solid fa-trash-can text-[9px]"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.promptReplyReview = async (reviewId, existingReply) => {
        const replyText = prompt("Type your management response for this guest review:", existingReply || "");
        if (replyText === null) return;
        const cleanReply = replyText.trim();
        if (!cleanReply) return;

        try {
            await KaghanDB.replyReview(reviewId, cleanReply);
            KaghanUI.showToast("Management response published successfully!", "success");
            if (window.AdminDashboardModule) {
                await window.AdminDashboardModule.refreshAll();
            }
        } catch (err) {
            console.error("Reply review error:", err);
            KaghanUI.showToast("Failed to save response: " + err.message, "error");
        }
    };

    window.deleteReviewRecord = async (reviewId) => {
        if (!confirm(`Are you sure you want to delete this guest review?`)) return;

        const success = await KaghanDB.deleteReview(reviewId);
        if (success) {
            KaghanUI.showToast("Review deleted successfully.", "success");
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
