// Kaghan Hotel - Admin Guest Registry & User Roles Permission Module
(function() {
    const PERM_LABELS = {
        manage_bookings: 'Bookings',
        manage_rooms: 'Rooms',
        manage_reviews: 'Reviews',
        manage_guests: 'Guests',
        manage_discounts: 'Discounts',
        manage_settings: 'Settings'
    };

    const DEFAULT_ROLE_PERMS = {
        admin: ['manage_bookings', 'manage_rooms', 'manage_reviews', 'manage_guests', 'manage_discounts', 'manage_settings'],
        moderator: ['manage_bookings', 'manage_reviews', 'manage_guests'],
        editor: ['manage_rooms', 'manage_discounts', 'manage_reviews'],
        user: []
    };

    let cachedUsers = [];
    let selectedUserIds = new Set();

    function updateMetricsAndBulkToolbar(filteredUsers = []) {
        const total = cachedUsers.length;
        const adminsCount = cachedUsers.filter(u => ['admin', 'moderator', 'editor'].includes(u.role)).length;
        const usersCount = cachedUsers.filter(u => !u.role || u.role === 'user').length;
        const selectedCount = selectedUserIds.size;

        const totalEl = document.getElementById('stat-guests-total');
        const adminsEl = document.getElementById('stat-guests-admins');
        const usersEl = document.getElementById('stat-guests-users');
        const selectedEl = document.getElementById('stat-guests-selected');
        const summaryEl = document.getElementById('guests-count-summary');

        if (totalEl) totalEl.textContent = total;
        if (adminsEl) adminsEl.textContent = adminsCount;
        if (usersEl) usersEl.textContent = usersCount;
        if (selectedEl) selectedEl.textContent = selectedCount;

        if (summaryEl) {
            summaryEl.textContent = `Showing ${filteredUsers.length} of ${total} registered account(s)`;
        }

        // Bulk Actions Bar
        const bulkBar = document.getElementById('guest-bulk-actions-bar');
        const bulkLabel = document.getElementById('guest-bulk-count-label');
        const masterCb = document.getElementById('guest-select-all-cb');

        if (bulkBar) {
            if (selectedCount > 0) {
                bulkBar.classList.remove('hidden');
                if (bulkLabel) bulkLabel.textContent = `${selectedCount} account(s) selected`;
            } else {
                bulkBar.classList.add('hidden');
            }
        }

        if (masterCb) {
            const currentFilteredIds = filteredUsers.map(u => u.id || u.uid);
            if (currentFilteredIds.length > 0 && currentFilteredIds.every(id => selectedUserIds.has(id))) {
                masterCb.checked = true;
                masterCb.indeterminate = false;
            } else if (currentFilteredIds.some(id => selectedUserIds.has(id))) {
                masterCb.checked = false;
                masterCb.indeterminate = true;
            } else {
                masterCb.checked = false;
                masterCb.indeterminate = false;
            }
        }
    }

    async function renderGuests(searchKeyword = '') {
        cachedUsers = await KaghanDB.getUsers();
        const roleFilter = document.getElementById('guest-role-filter')?.value || '';
        const tbody = document.getElementById('admin-guests-tbody');
        const emptyState = document.getElementById('guests-empty-state');

        if (!tbody) return;

        const filtered = cachedUsers.filter(u => {
            const keyword = searchKeyword.toLowerCase().trim();
            const matchesKeyword = !keyword ||
                            (u.name && u.name.toLowerCase().includes(keyword)) ||
                            (u.email && u.email.toLowerCase().includes(keyword)) ||
                            (u.phone && u.phone.includes(keyword));
            
            const matchesRole = !roleFilter || (u.role || 'user') === roleFilter;
            return matchesKeyword && matchesRole;
        });

        updateMetricsAndBulkToolbar(filtered);

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        tbody.innerHTML = filtered.map(guest => {
            const uid = guest.id || guest.uid;
            const isSelected = selectedUserIds.has(uid);
            let roleBadge = '';
            const role = guest.role || 'user';
            
            if (role === 'admin') {
                roleBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit"><i class="fa-solid fa-crown text-[9px]"></i> Admin</span>`;
            } else if (role === 'moderator') {
                roleBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1 w-fit"><i class="fa-solid fa-shield text-[9px]"></i> Moderator</span>`;
            } else if (role === 'editor') {
                roleBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 w-fit"><i class="fa-solid fa-user-pen text-[9px]"></i> Editor</span>`;
            } else {
                roleBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 w-fit"><i class="fa-solid fa-user text-[9px]"></i> User</span>`;
            }

            const permissions = guest.permissions || DEFAULT_ROLE_PERMS[role] || [];
            const permTags = permissions.length > 0
                ? permissions.map(p => `<span class="px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">${PERM_LABELS[p] || p}</span>`).join(' ')
                : `<span class="text-[10px] text-slate-400 italic">None</span>`;

            const initials = (guest.name || 'U').split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();

            return `
                <tr class="border-b border-slate-100 ${isSelected ? 'bg-amber-50/40' : 'hover:bg-slate-50/50'} transition-colors">
                    <td class="px-4 py-3.5 text-center">
                        <input type="checkbox" class="guest-row-cb rounded border-slate-300 text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer" data-id="${uid}" ${isSelected ? 'checked' : ''} onchange="AdminGuestsModule.onRowCbChange(this)">
                    </td>
                    <td class="px-6 py-3.5">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-[#0B0F19] text-[#C5A059] font-bold text-xs flex items-center justify-center shrink-0 border border-slate-800 shadow-sm">
                                ${initials}
                            </div>
                            <div>
                                <span class="font-bold text-slate-900 text-xs block">${KaghanSafe.escapeHTML(guest.name || 'Unnamed')}</span>
                                <span class="text-[10px] text-slate-400 font-mono">ID: ${uid}</span>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-3.5 text-xs font-semibold text-slate-600">${KaghanSafe.escapeHTML(guest.email || '')}</td>
                    <td class="px-6 py-3.5 text-xs font-semibold text-slate-600">${KaghanSafe.escapeHTML(guest.phone || 'N/A')}</td>
                    <td class="px-6 py-3.5 text-xs font-semibold">${roleBadge}</td>
                    <td class="px-6 py-3.5">
                        <div class="flex flex-wrap gap-1 max-w-xs">${permTags}</div>
                    </td>
                    <td class="px-6 py-3.5 text-right whitespace-nowrap">
                        <button onclick="openEditUserModal('${uid}')" class="bg-slate-900 hover:bg-[#D4AF37] hover:text-slate-950 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ml-auto shadow-sm" title="Edit Profile, Change Password & Delete Account">
                            <i class="fa-solid fa-user-pen text-xs"></i> Edit Account
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function toggleSelectAll(masterCb) {
        const isChecked = masterCb.checked;
        const rowCbs = document.querySelectorAll('.guest-row-cb');
        rowCbs.forEach(cb => {
            cb.checked = isChecked;
            const uid = cb.getAttribute('data-id');
            if (uid) {
                if (isChecked) selectedUserIds.add(uid);
                else selectedUserIds.delete(uid);
            }
        });
        updateMetricsAndBulkToolbar(cachedUsers);
    }

    function onRowCbChange(cb) {
        const uid = cb.getAttribute('data-id');
        if (!uid) return;
        if (cb.checked) {
            selectedUserIds.add(uid);
        } else {
            selectedUserIds.delete(uid);
        }
        updateMetricsAndBulkToolbar(cachedUsers);
    }

    function clearSelection() {
        selectedUserIds.clear();
        const masterCb = document.getElementById('guest-select-all-cb');
        if (masterCb) masterCb.checked = false;
        renderGuests(document.getElementById('guest-search-input')?.value || '');
    }

    async function bulkChangeRole() {
        const roleSelect = document.getElementById('guest-bulk-role-select');
        const newRole = roleSelect ? roleSelect.value : '';
        if (!newRole) {
            KaghanUI.showToast("Please select a target role to apply.", "warning");
            return;
        }
        if (selectedUserIds.size === 0) {
            KaghanUI.showToast("No account rows selected.", "warning");
            return;
        }

        if (!confirm(`Are you sure you want to change the role of ${selectedUserIds.size} selected account(s) to "${newRole.toUpperCase()}"?`)) return;

        let successCount = 0;
        const totalToUpdate = selectedUserIds.size;
        const defaultPerms = DEFAULT_ROLE_PERMS[newRole] || [];

        for (const uid of Array.from(selectedUserIds)) {
            try {
                await KaghanDB.adminUpdateUser(uid, {
                    role: newRole,
                    permissions: defaultPerms,
                    updatedAt: new Date().toISOString()
                });
                successCount++;
            } catch (err) {
                console.error(`Bulk role update error for ${uid}:`, err);
            }
        }

        KaghanUI.showToast(`Successfully updated role for ${successCount} of ${totalToUpdate} account(s)!`, "success");
        clearSelection();
        await renderGuests();
    }

    async function bulkSendPasswordReset() {
        if (selectedUserIds.size === 0) {
            KaghanUI.showToast("No account rows selected.", "warning");
            return;
        }

        const selectedUsers = cachedUsers.filter(u => selectedUserIds.has(u.id || u.uid));
        const validEmails = selectedUsers.filter(u => u.email && u.email.includes('@'));

        if (validEmails.length === 0) {
            KaghanUI.showToast("None of the selected accounts have valid email addresses.", "warning");
            return;
        }

        if (!confirm(`Send password reset emails to ${validEmails.length} selected account(s)?`)) return;

        let sentCount = 0;
        for (const u of validEmails) {
            try {
                const res = await KaghanDB.sendPasswordResetEmail(u.email);
                if (res.success) sentCount++;
            } catch (err) {
                console.error(`Bulk password reset error for ${u.email}:`, err);
            }
        }

        KaghanUI.showToast(`Password reset emails dispatched to ${sentCount} account(s)!`, "success");
        clearSelection();
    }

    async function bulkDeleteAccounts() {
        if (selectedUserIds.size === 0) {
            KaghanUI.showToast("No account rows selected.", "warning");
            return;
        }

        const count = selectedUserIds.size;
        if (!confirm(`⚠️ DANGER: Are you sure you want to permanently delete ${count} selected user account(s)? This action cannot be undone.`)) return;

        let deletedCount = 0;
        for (const uid of Array.from(selectedUserIds)) {
            try {
                const success = await KaghanDB.deleteUser(uid);
                if (success) deletedCount++;
            } catch (err) {
                console.error(`Bulk delete error for ${uid}:`, err);
            }
        }

        KaghanUI.showToast(`Permanently deleted ${deletedCount} of ${count} selected account(s).`, "success");
        clearSelection();
        await renderGuests();
    }

    // Modal Action Helper 1: Update Password directly from Edit User Modal
    async function updatePasswordFromEditModal() {
        const userId = document.getElementById('edit-user-id')?.value;
        const passInput = document.getElementById('edit-user-password');
        const newPassword = passInput ? passInput.value.trim() : '';

        if (!userId) {
            KaghanUI.showToast("No user account selected.", "error");
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            KaghanUI.showToast("Password must be at least 6 characters long.", "warning");
            return;
        }

        try {
            await window.KaghanDB.changeUserPassword(userId, newPassword);
            KaghanUI.showToast("User password updated successfully!", "success");
            if (passInput) passInput.value = '';
        } catch (err) {
            console.error("Update password from edit modal error:", err);
            KaghanUI.showToast(err.message || "Failed to update user password.", "error");
        }
    }

    // Modal Action Helper 2: Send Password Reset Link from Edit User Modal
    async function sendResetLinkFromEditModal() {
        const email = document.getElementById('edit-user-email')?.value?.trim();
        const name = document.getElementById('edit-user-name')?.value?.trim() || 'User';

        if (!email || !email.includes('@')) {
            KaghanUI.showToast("Please enter a valid email address.", "warning");
            return;
        }
        await sendUserPasswordResetLink(email, name);
    }

    // Modal Action Helper 3: Delete Account directly from Edit User Modal
    async function deleteAccountFromEditModal() {
        const userId = document.getElementById('edit-user-id')?.value;
        const name = document.getElementById('edit-user-name')?.value?.trim() || 'User';

        if (!userId) {
            KaghanUI.showToast("No user account selected.", "error");
            return;
        }

        closeEditUserModal();
        await deleteGuestAccount(userId, name);
    }

    // Global Helper: Toggle password input visibility (Show / Hide plaintext as typed)
    window.togglePasswordVisibility = (inputId, btn) => {
        const input = document.getElementById(inputId);
        if (!input) return;
        const icon = btn ? btn.querySelector('i') : null;
        if (input.type === 'password') {
            input.type = 'text';
            if (icon) {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        } else {
            input.type = 'password';
            if (icon) {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        }
    };

    // Role filter change listener
    document.getElementById('guest-role-filter')?.addEventListener('change', () => {
        const keyword = document.getElementById('guest-search-input')?.value || '';
        renderGuests(keyword);
    });

    document.getElementById('guest-search-input')?.addEventListener('input', (e) => {
        renderGuests(e.target.value);
    });

    window.deleteGuestAccount = async (userId, name) => {
        const currentUser = KaghanDB.getCurrentUser();
        if (currentUser && currentUser.role !== 'admin') {
            const userPerms = currentUser.permissions || (window.DEFAULT_ROLE_PERMS ? window.DEFAULT_ROLE_PERMS[currentUser.role] : []);
            if (!userPerms || !userPerms.includes('manage_guests')) {
                KaghanUI.showToast("Access Denied: You do not have permission to delete user accounts.", "error");
                return;
            }
        }

        if (!confirm(`Are you sure you want to permanently delete account "${name}" (${userId})? This will remove their credentials and profile.`)) return;

        const success = await KaghanDB.deleteUser(userId);
        if (success) {
            KaghanUI.showToast(`Account for ${name} has been permanently deleted.`, 'success');
            if (window.AdminDashboardModule) {
                await window.AdminDashboardModule.refreshAll();
            } else {
                await renderGuests();
            }
        } else {
            KaghanUI.showToast('Failed to delete account from database.', 'error');
        }
    };

    window.sendUserPasswordResetLink = async (email, name) => {
        if (!email || !email.includes('@')) {
            KaghanUI.showToast("User does not have a valid email address.", "error");
            return;
        }
        if (!confirm(`Send password reset email to ${name} (${email})?`)) return;
        try {
            const res = await KaghanDB.sendPasswordResetEmail(email);
            if (res.success) {
                KaghanUI.showToast(`Password reset link sent to ${email}`, "success");
            } else {
                KaghanUI.showToast(res.message || "Failed to send reset email.", "error");
            }
        } catch (e) {
            console.error("Send reset email error:", e);
            KaghanUI.showToast(e.message || "Failed to send reset email.", "error");
        }
    };

    // Auto check/uncheck permissions checkboxes based on role selection
    window.onRoleChangeSyncPerms = (roleSelectId, containerClass) => {
        const role = document.getElementById(roleSelectId)?.value;
        const defaultPerms = DEFAULT_ROLE_PERMS[role] || [];
        document.querySelectorAll(`.${containerClass}`).forEach(cb => {
            cb.checked = defaultPerms.includes(cb.value);
        });
    };

    // Modal controls for adding user
    window.openAddUserModal = () => {
        const modal = document.getElementById('add-user-modal');
        document.getElementById('add-user-form')?.reset();
        window.onRoleChangeSyncPerms('add-user-role', 'add-user-perm-cb');
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

    // Modal controls for editing user
    window.openEditUserModal = (userId) => {
        const user = cachedUsers.find(u => (u.id === userId || u.uid === userId));
        if (!user) {
            KaghanUI.showToast("User record not found.", "error");
            return;
        }

        document.getElementById('edit-user-id').value = userId;
        document.getElementById('edit-user-name').value = user.name || '';
        document.getElementById('edit-user-email').value = user.email || '';
        document.getElementById('edit-user-phone').value = user.phone || '';
        document.getElementById('edit-user-role').value = user.role || 'user';
        
        const passInput = document.getElementById('edit-user-password');
        if (passInput) passInput.value = '';

        const subtitleEl = document.getElementById('edit-user-modal-subtitle');
        if (subtitleEl) subtitleEl.textContent = `Managing credentials for ${user.name || 'User'} (${user.email || userId})`;

        const userPerms = user.permissions || DEFAULT_ROLE_PERMS[user.role || 'user'] || [];
        document.querySelectorAll('.edit-user-perm-cb').forEach(cb => {
            cb.checked = userPerms.includes(cb.value);
        });

        const modal = document.getElementById('edit-user-modal');
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => modal.classList.remove('opacity-0'), 10);
        }
    };

    window.closeEditUserModal = () => {
        const modal = document.getElementById('edit-user-modal');
        if (modal) {
            modal.classList.add('opacity-0');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }
    };

    // Submit Add User Form
    document.getElementById('add-user-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Creating...';
        submitBtn.disabled = true;

        try {
            const permissions = Array.from(document.querySelectorAll('.add-user-perm-cb:checked')).map(cb => cb.value);
            const userData = {
                name: document.getElementById('add-user-name').value.trim(),
                email: document.getElementById('add-user-email').value.trim(),
                phone: document.getElementById('add-user-phone').value.trim(),
                password: document.getElementById('add-user-password').value,
                role: document.getElementById('add-user-role').value,
                permissions: permissions
            };

            if (userData.password.length < 6) {
                throw new Error("Password must be at least 6 characters long.");
            }

            await window.KaghanDB.createUser(userData);
            
            KaghanUI.showToast(`Account created with ${userData.role.toUpperCase()} privileges!`, "success");
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

    // Submit Edit User Form
    document.getElementById('edit-user-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
        submitBtn.disabled = true;

        try {
            const userId = document.getElementById('edit-user-id').value;
            const permissions = Array.from(document.querySelectorAll('.edit-user-perm-cb:checked')).map(cb => cb.value);
            
            const updateData = {
                id: userId,
                name: document.getElementById('edit-user-name').value.trim(),
                email: document.getElementById('edit-user-email').value.trim(),
                phone: document.getElementById('edit-user-phone').value.trim(),
                role: document.getElementById('edit-user-role').value,
                permissions: permissions,
                updatedAt: new Date().toISOString()
            };

            await window.KaghanDB.adminUpdateUser(userId, updateData);
            
            KaghanUI.showToast(`User profile and role permissions updated!`, "success");
            closeEditUserModal();
            
            if (window.AdminDashboardModule) {
                await window.AdminDashboardModule.refreshAll();
            } else {
                await renderGuests();
            }
        } catch (error) {
            console.error("Edit user error:", error);
            KaghanUI.showToast(error.message || "Failed to update user profile.", "error");
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    // Export to window
    window.AdminGuestsModule = {
        render: renderGuests,
        toggleSelectAll,
        onRowCbChange,
        clearSelection,
        bulkChangeRole,
        bulkSendPasswordReset,
        bulkDeleteAccounts,
        updatePasswordFromEditModal,
        sendResetLinkFromEditModal,
        deleteAccountFromEditModal
    };
})();
