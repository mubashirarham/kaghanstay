// Kaghan Hotel - Admin Guest Registry Module
(function() {
    let activePointsUserId = null;

    async function renderGuests(searchKeyword = '') {
        const users = await KaghanDB.getUsers();
        const guestList = users;
        const tbody = document.getElementById('admin-guests-tbody');
        const emptyState = document.getElementById('guests-empty-state');

        if (!tbody) return;

        const filtered = guestList.filter(u => {
            const keyword = searchKeyword.toLowerCase().trim();
            const matches = !keyword ||
                            (u.name && u.name.toLowerCase().includes(keyword)) ||
                            (u.email && u.email.toLowerCase().includes(keyword)) ||
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
            const roleBadge = guest.role === 'admin' 
                ? `<span class="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Admin</span>`
                : `<span class="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">User</span>`;
            
            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-4">
                        <span class="font-bold text-slate-800 text-sm block">${KaghanSafe.escapeHTML(guest.name || '')}</span>
                    </td>
                    <td class="px-6 py-4 text-xs font-semibold text-slate-600">${KaghanSafe.escapeHTML(guest.email || '')}</td>
                    <td class="px-6 py-4 text-xs font-semibold text-slate-600">${KaghanSafe.escapeHTML(guest.phone || 'N/A')}</td>
                    <td class="px-6 py-4 text-xs font-semibold">${roleBadge}</td>
                    <td class="px-6 py-4 text-right">
                        <button onclick="deleteGuestAccount('${guest.id}', '${KaghanSafe.escapeHTML(guest.name || '')}')" class="text-rose-500 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 transition-colors" title="Delete Account">
                            <i class="fa-solid fa-trash-can text-sm"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.deleteGuestAccount = async (userId, name) => {
        if (!confirm(`Are you sure you want to permanently delete account "${name}" (${userId})? This will delete their credentials and profile.`)) return;

        const success = await KaghanDB.deleteUser(userId);
        if (success) {
            KaghanUI.showToast(`Account for ${name} has been deleted.`, 'success');
            if (window.AdminDashboardModule) {
                await window.AdminDashboardModule.refreshAll();
            } else {
                await renderGuests();
            }
        } else {
            KaghanUI.showToast('Failed to delete account.', 'error');
        }
    };

    // Modal controls for adding user/admin
    window.openAddUserModal = () => {
        const modal = document.getElementById('add-user-modal');
        document.getElementById('add-user-form').reset();
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => modal.classList.remove('opacity-0'), 10);
        }
    };

    window.closeAddUserModal = () => {
        const modal = document.getElementById('add-user-modal');
        if (modal) {
            modal.classList.add('opacity-0');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }
    };

    document.getElementById('add-user-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
        submitBtn.disabled = true;

        try {
            const userData = {
                name: document.getElementById('add-user-name').value.trim(),
                email: document.getElementById('add-user-email').value.trim(),
                phone: document.getElementById('add-user-phone').value.trim(),
                password: document.getElementById('add-user-password').value,
                role: document.getElementById('add-user-role').value
            };

            if (userData.password.length < 6) {
                throw new Error("Password must be at least 6 characters long.");
            }

            await window.KaghanDB.createUser(userData);
            
            KaghanUI.showToast("Account created successfully!", "success");
            closeAddUserModal();
            
            if (window.AdminDashboardModule) {
                await window.AdminDashboardModule.refreshAll();
            } else {
                await renderGuests();
            }
        } catch (error) {
            console.error("Create user error:", error);
            KaghanUI.showToast(error.message || "Failed to create account.", "error");
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    // Export to window
    window.AdminGuestsModule = {
        render: renderGuests
    };
})();
