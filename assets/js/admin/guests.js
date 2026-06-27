// Kaghan Hotel - Admin Guest Registry Module
(function() {
    let activePointsUserId = null;

    async function renderGuests(searchKeyword = '') {
        const users = await KaghanDB.getUsers();
        const guestList = users.filter(u => u.role === 'user');
        const tbody = document.getElementById('admin-guests-tbody');
        const emptyState = document.getElementById('guests-empty-state');

        if (!tbody) return;

        const filtered = guestList.filter(u => {
            const keyword = searchKeyword.toLowerCase().trim();
            const matches = !keyword ||
                            u.name.toLowerCase().includes(keyword) ||
                            u.email.toLowerCase().includes(keyword) ||
                            (u.phone && u.phone.includes(keyword));
            return matches;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        tbody.innerHTML = filtered.map(guest => {
            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-4">
                        <span class="font-bold text-slate-800 text-sm block">${guest.name}</span>
                    </td>
                    <td class="px-6 py-4 text-xs font-semibold text-slate-600">${guest.email}</td>
                    <td class="px-6 py-4 text-xs font-semibold text-slate-600">${guest.phone || 'N/A'}</td>
                    <td class="px-6 py-4 text-sm font-extrabold text-[#D4AF37]">${guest.loyaltyPoints || 0}</td>
                    <td class="px-6 py-4 flex gap-2">
                        <button onclick="openAdjustPointsModal('${guest.id}', '${guest.name}')" class="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-[#D4AF37] hover:text-white transition-all flex items-center gap-1.5">
                            <i class="fa-solid fa-coins text-[9px]"></i> Adjust Points
                        </button>
                        <button onclick="deleteGuestAccount('${guest.id}', '${guest.name}')" class="text-rose-500 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 transition-colors" title="Delete Guest Account">
                            <i class="fa-solid fa-trash-can text-sm"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Adjust Guest Points Modal handlers
    window.openAdjustPointsModal = (userId, name) => {
        activePointsUserId = userId;
        document.getElementById('adjust-points-user-lbl').innerText = `Guest: ${name}`;
        document.getElementById('adjust-points-amount').value = '';
        
        const modal = document.getElementById('adjust-points-modal');
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.firstElementChild.classList.remove('scale-95');
        }, 10);
    };

    window.closeAdjustPointsModal = () => {
        const modal = document.getElementById('adjust-points-modal');
        modal.classList.add('opacity-0');
        modal.firstElementChild.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            activePointsUserId = null;
        }, 300);
    };

    window.saveUserPointsAdjustment = async () => {
        if (!activePointsUserId) return;
        const amount = parseInt(document.getElementById('adjust-points-amount').value);

        if (isNaN(amount) || amount === 0) {
            KaghanUI.showToast('Please enter a valid points adjustment value.', 'error');
            return;
        }

        try {
            await KaghanDB.updateUserPoints(activePointsUserId, amount);
            KaghanUI.showToast(`Points updated successfully!`, 'success');
            if (window.AdminDashboardModule) {
                await window.AdminDashboardModule.refreshAll();
            }
            closeAdjustPointsModal();
        } catch (err) {
            console.error("Error updating points:", err);
            KaghanUI.showToast('Failed to update points.', 'error');
        }
    };

    window.deleteGuestAccount = async (userId, name) => {
        if (!confirm(`Are you sure you want to permanently delete guest account "${name}" (${userId})? This will delete their credentials and profile.`)) return;

        const success = await KaghanDB.deleteUser(userId);
        if (success) {
            KaghanUI.showToast(`Guest account for ${name} has been deleted.`, 'success');
            if (window.AdminDashboardModule) {
                await window.AdminDashboardModule.refreshAll();
            }
        } else {
            KaghanUI.showToast('Failed to delete guest account.', 'error');
        }
    };

    // Export to window
    window.AdminGuestsModule = {
        render: renderGuests
    };
})();
