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

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        tbody.innerHTML = filtered.map(guest => {
            let roleBadge = '';
            const role = guest.role || 'user';
            
            if (role === 'admin') {
                roleBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit"><i class="fa-solid fa-crown text-[9px]"></i> Admin</span>`;
            } else if (role === 'moderator') {
                roleBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1 w-fit"><i class="fa-solid fa-shield text-[9px]"></i> Moderator</span>`;
            } else if (role === 'editor') {
                roleBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 w-fit"><i class="fa-solid fa-[#C5A059] text-[9px]"></i> Editor</span>`;
            } else {
                roleBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 w-fit"><i class="fa-solid fa-user text-[9px]"></i> User</span>`;
            }

            const permissions = guest.permissions || DEFAULT_ROLE_PERMS[role] || [];
            const permTags = permissions.length > 0
                ? permissions.map(p => `<span class="px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">${PERM_LABELS[p] || p}</span>`).join(' ')
                : `<span class="text-[10px] text-slate-400 italic">None</span>`;

            const initials = (guest.name || 'U').split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();

            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-[#0B0F19] text-[#C5A059] font-bold text-xs flex items-center justify-center shrink-0 border border-slate-800">
                                ${initials}
                            </div>
                            <div>
                                <span class="font-bold text-slate-900 text-xs block">${KaghanSafe.escapeHTML(guest.name || 'Unnamed')}</span>
                                <span class="text-[10px] text-slate-400 font-mono">ID: ${guest.id || guest.uid || 'N/A'}</span>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-xs font-semibold text-slate-600">${KaghanSafe.escapeHTML(guest.email || '')}</td>
                    <td class="px-6 py-4 text-xs font-semibold text-slate-600">${KaghanSafe.escapeHTML(guest.phone || 'N/A')}</td>
                    <td class="px-6 py-4 text-xs font-semibold">${roleBadge}</td>
                    <td class="px-6 py-4">
                        <div class="flex flex-wrap gap-1 max-w-xs">${permTags}</div>
                    </td>
                    <td class="px-6 py-4 text-right space-x-1">
                        <button onclick="openChangeUserPasswordModal('${guest.id || guest.uid}', '${KaghanSafe.escapeHTML(guest.email || '')}', '${KaghanSafe.escapeHTML(guest.name || 'User')}')" class="text-amber-600 hover:text-amber-700 p-1.5 rounded hover:bg-amber-50 transition-colors font-semibold text-xs" title="Change User Password">
                            <i class="fa-solid fa-key text-xs"></i> Password
                        </button>
                        <button onclick="sendUserPasswordResetLink('${KaghanSafe.escapeHTML(guest.email || '')}', '${KaghanSafe.escapeHTML(guest.name || 'User')}')" class="text-blue-600 hover:text-blue-700 p-1.5 rounded hover:bg-blue-50 transition-colors font-semibold text-xs" title="Send Password Reset Email">
                            <i class="fa-solid fa-paper-plane text-xs"></i> Reset Link
                        </button>
                        <button onclick="openEditUserModal('${guest.id || guest.uid}')" class="text-slate-600 hover:text-[#C5A059] p-1.5 rounded hover:bg-slate-100 transition-colors font-semibold text-xs" title="Edit User & Permissions">
                            <i class="fa-solid fa-pen-to-square text-xs"></i> Edit
                        </button>
                        <button onclick="deleteGuestAccount('${guest.id || guest.uid}', '${KaghanSafe.escapeHTML(guest.name || '')}')" class="text-rose-500 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 transition-colors font-semibold text-xs" title="Delete Account">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
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

    // Modal controls for changing user password
    window.openChangeUserPasswordModal = (userId, userEmail, userName) => {
        document.getElementById('change-user-password-id').value = userId;
        document.getElementById('change-user-password-target').textContent = `${userName} (${userEmail})`;
        const passInput = document.getElementById('change-user-password-input');
        if (passInput) {
            passInput.value = '';
            passInput.type = 'password';
        }
        const toggleIcon = document.querySelector('#change-user-password-modal .toggle-pass-btn i');
        if (toggleIcon) {
            toggleIcon.className = 'fa-solid fa-eye text-xs';
        }

        const modal = document.getElementById('change-user-password-modal');
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => modal.classList.remove('opacity-0'), 10);
        }
    };

    window.closeChangeUserPasswordModal = () => {
        const modal = document.getElementById('change-user-password-modal');
        if (modal) {
            modal.classList.add('opacity-0');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }
    };

    window.submitChangeUserPassword = async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('change-user-password-btn');
        const origText = submitBtn ? submitBtn.innerHTML : 'Update Password';
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Updating...';
            submitBtn.disabled = true;
        }

        try {
            const userId = document.getElementById('change-user-password-id').value;
            const newPassword = document.getElementById('change-user-password-input').value.trim();

            if (!newPassword || newPassword.length < 6) {
                throw new Error("Password must be at least 6 characters long.");
            }

            await window.KaghanDB.changeUserPassword(userId, newPassword);
            KaghanUI.showToast("User password updated successfully!", "success");
            closeChangeUserPasswordModal();
        } catch (error) {
            console.error("Change password error:", error);
            KaghanUI.showToast(error.message || "Failed to update password.", "error");
        } finally {
            if (submitBtn) {
                submitBtn.innerHTML = origText;
                submitBtn.disabled = false;
            }
        }
    };

    // Modal control for Admin / User changing own logged-in password
    window.openChangeMyPasswordModal = () => {
        const modal = document.getElementById('change-my-password-modal');
        const passInput = document.getElementById('change-my-password-input');
        if (passInput) {
            passInput.value = '';
            passInput.type = 'password';
        }
        const toggleIcon = document.querySelector('#change-my-password-modal .toggle-pass-btn i');
        if (toggleIcon) {
            toggleIcon.className = 'fa-solid fa-eye text-xs';
        }
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => modal.classList.remove('opacity-0'), 10);
        }
    };

    window.closeChangeMyPasswordModal = () => {
        const modal = document.getElementById('change-my-password-modal');
        if (modal) {
            modal.classList.add('opacity-0');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }
    };

    window.submitChangeMyPassword = async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('change-my-password-btn');
        const origText = submitBtn ? submitBtn.innerHTML : 'Update My Password';
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Updating...';
            submitBtn.disabled = true;
        }

        try {
            const newPassword = document.getElementById('change-my-password-input').value.trim();
            if (!newPassword || newPassword.length < 6) {
                throw new Error("Password must be at least 6 characters long.");
            }

            await window.KaghanDB.changeMyPassword(newPassword);
            KaghanUI.showToast("Your account password has been updated successfully!", "success");
            closeChangeMyPasswordModal();
        } catch (error) {
            console.error("Change my password error:", error);
            KaghanUI.showToast(error.message || "Failed to update your password.", "error");
        } finally {
            if (submitBtn) {
                submitBtn.innerHTML = origText;
                submitBtn.disabled = false;
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
        if (document.getElementById('edit-user-password')) {
            document.getElementById('edit-user-password').value = '';
        }

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
        render: renderGuests
    };
})();
