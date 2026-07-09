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
                        <button onclick="deleteGuestAccount('${guest.id}', '${guest.name}')" class="text-rose-500 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 transition-colors" title="Delete Guest Account">
                            <i class="fa-solid fa-trash-can text-sm"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }


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
