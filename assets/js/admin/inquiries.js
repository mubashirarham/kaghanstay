/**
 * KPH Stay Admin Panel - Inquiries Management Module
 */

window.KaghanInquiries = (function() {
    let _inquiries = [];

    async function loadInquiries() {
        const container = document.getElementById('admin-inquiries-list');
        const emptyState = document.getElementById('admin-inquiries-empty');
        const badge = document.getElementById('admin-unread-inquiries-count');
        const totalStat = document.getElementById('stat-total-inquiries');
        const unreadStat = document.getElementById('stat-unread-inquiries');
        const todayStat = document.getElementById('stat-today-inquiries');

        if (!container) return;

        try {
            // Fetch via KaghanDB or direct Firestore snapshot
            if (window.firebase && firebase.firestore) {
                const snap = await firebase.firestore().collection('inquiries').orderBy('createdAt', 'desc').get();
                _inquiries = [];
                snap.forEach(doc => {
                    _inquiries.push({ id: doc.id, ...doc.data() });
                });
            } else if (window.KaghanDB && window.KaghanDB.executeAdminAction) {
                _inquiries = await KaghanDB.executeAdminAction('getInquiries', {}) || [];
            }

            // Stats
            const total = _inquiries.length;
            const unread = _inquiries.filter(i => i.status === 'unread' || !i.read).length;
            const todayStr = new Date().toISOString().split('T')[0];
            const todayCount = _inquiries.filter(i => (i.createdAt || '').startsWith(todayStr)).length;

            if (totalStat) totalStat.textContent = total;
            if (unreadStat) unreadStat.textContent = unread;
            if (todayStat) todayStat.textContent = todayCount;

            if (badge) {
                if (unread > 0) {
                    badge.textContent = unread;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }

            if (total === 0) {
                container.innerHTML = '';
                if (emptyState) emptyState.classList.remove('hidden');
                return;
            }

            if (emptyState) emptyState.classList.add('hidden');

            // Render Inquiry Cards/Rows
            container.innerHTML = _inquiries.map(inq => {
                const isUnread = inq.status === 'unread' || !inq.read;
                const formattedDate = inq.createdAt ? new Date(inq.createdAt).toLocaleString('en-PK', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                }) : 'N/A';

                const nameSafe = KaghanSafe ? KaghanSafe.escapeHTML(inq.name || 'Guest') : (inq.name || 'Guest');
                const emailSafe = KaghanSafe ? KaghanSafe.escapeHTML(inq.email || '') : (inq.email || '');
                const subjectSafe = KaghanSafe ? KaghanSafe.escapeHTML(inq.subject || 'General Inquiry') : (inq.subject || 'General Inquiry');
                const messageSafe = KaghanSafe ? KaghanSafe.escapeHTML(inq.message || '') : (inq.message || '');

                return `
                <div class="bg-white rounded-2xl border ${isUnread ? 'border-amber-300 bg-amber-50/20' : 'border-slate-100'} p-6 shadow-sm transition-all hover:shadow-md">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full ${isUnread ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'} flex items-center justify-center font-bold text-sm">
                                <i class="fa-solid fa-envelope"></i>
                            </div>
                            <div>
                                <h4 class="font-bold outfit text-slate-900 text-base flex items-center gap-2">
                                    ${nameSafe}
                                    ${isUnread ? '<span class="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black uppercase">Unread</span>' : '<span class="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold uppercase">Read</span>'}
                                </h4>
                                <a href="mailto:${emailSafe}" class="text-xs text-[#D4AF37] font-medium hover:underline flex items-center gap-1">
                                    <i class="fa-solid fa-at text-[10px]"></i> ${emailSafe}
                                </a>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="text-xs text-slate-400 font-medium block"><i class="fa-solid fa-clock mr-1"></i>${formattedDate}</span>
                        </div>
                    </div>

                    <div class="mb-4">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Subject</span>
                        <h5 class="text-sm font-bold text-slate-800 mb-2">${subjectSafe}</h5>
                        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                            ${messageSafe}
                        </div>
                    </div>

                    <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        ${isUnread ? `
                            <button onclick="KaghanInquiries.markRead('${inq.id}')" class="bg-slate-800 hover:bg-[#D4AF37] hover:text-slate-950 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1">
                                <i class="fa-solid fa-check-double text-[10px]"></i> Mark Read
                            </button>
                        ` : ''}
                        <a href="mailto:${emailSafe}?subject=Re: ${encodeURIComponent(subjectSafe)}&body=${encodeURIComponent('\n\n--- Original Inquiry ---\nFrom: ' + nameSafe + '\nSubject: ' + subjectSafe + '\nMessage: ' + messageSafe)}" class="bg-slate-900 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1">
                            <i class="fa-solid fa-reply text-[10px]"></i> Reply Email
                        </a>
                        <button onclick="KaghanInquiries.deleteInquiry('${inq.id}')" class="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1">
                            <i class="fa-solid fa-trash-can text-[10px]"></i> Delete
                        </button>
                    </div>
                </div>
                `;
            }).join('');

        } catch (err) {
            console.error('[Inquiries Module] Error loading inquiries:', err);
            if (window.KaghanUI) KaghanUI.showToast('Failed to load contact inquiries.', 'error');
        }
    }

    async function markRead(id) {
        try {
            if (window.firebase && firebase.firestore) {
                await firebase.firestore().collection('inquiries').doc(id).update({ status: 'read', read: true });
            } else if (window.KaghanDB && window.KaghanDB.executeAdminAction) {
                await KaghanDB.executeAdminAction('markInquiryRead', { id });
            }
            if (window.KaghanUI) KaghanUI.showToast('Inquiry marked as read.', 'success');
            await loadInquiries();
        } catch (err) {
            console.error('Error marking inquiry as read:', err);
            if (window.KaghanUI) KaghanUI.showToast('Failed to update inquiry status.', 'error');
        }
    }

    async function deleteInquiry(id) {
        if (!confirm('Are you sure you want to delete this contact inquiry?')) return;
        try {
            if (window.firebase && firebase.firestore) {
                await firebase.firestore().collection('inquiries').doc(id).delete();
            } else if (window.KaghanDB && window.KaghanDB.executeAdminAction) {
                await KaghanDB.executeAdminAction('deleteInquiry', { id });
            }
            if (window.KaghanUI) KaghanUI.showToast('Inquiry deleted successfully.', 'success');
            await loadInquiries();
        } catch (err) {
            console.error('Error deleting inquiry:', err);
            if (window.KaghanUI) KaghanUI.showToast('Failed to delete inquiry.', 'error');
        }
    }

    return {
        loadInquiries,
        markRead,
        deleteInquiry
    };
})();
