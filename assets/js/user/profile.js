// Kaghan Hotel - User Dashboard Profile Module
(function() {
    function renderUserProfile() {
        const user = KaghanDB.getCurrentUser();
        if (!user) return;

        // Set text elements
        const nameGreeting = document.getElementById('user-greeting-name');
        const nameMeta = document.getElementById('user-meta-name');
        const emailMeta = document.getElementById('user-meta-email');
        if (nameGreeting) nameGreeting.innerText = user.name;
        if (nameMeta) nameMeta.innerText = user.name;
        if (emailMeta) emailMeta.innerText = user.email;

        // Fill inputs
        const nameInput = document.getElementById('profile-name');
        const phoneInput = document.getElementById('profile-phone');
        const emailInput = document.getElementById('profile-email');
        const passInput = document.getElementById('profile-pass');

        if (nameInput) nameInput.value = user.name;
        if (phoneInput) phoneInput.value = user.phone || '';
        if (emailInput) emailInput.value = user.email;
        if (passInput) {
            passInput.value = '';
            passInput.placeholder = '•••••••• (Leave blank to keep current)';
        }
    }

    function setupProfileForm() {
        const form = document.getElementById('profile-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = KaghanDB.getCurrentUser();
            if (!user) return;

            const updatedName = document.getElementById('profile-name').value.trim();
            const updatedPhone = document.getElementById('profile-phone').value.trim();
            const updatedPass = document.getElementById('profile-pass').value.trim();

            if (!updatedName) {
                KaghanUI.showToast('Name cannot be empty.', 'error');
                return;
            }

            const updatePayload = {
                name: updatedName,
                phone: updatedPhone
            };

            let success = await KaghanDB.updateUser(user.id, updatePayload);

            if (updatedPass && success) {
                try {
                    const authUser = firebase.auth().currentUser;
                    if (authUser) {
                        await authUser.updatePassword(updatedPass);
                        KaghanUI.showToast('Profile and password updated successfully!', 'success');
                    } else {
                        KaghanUI.showToast('Profile updated, but password change requires recent login.', 'warning');
                    }
                } catch (authErr) {
                    console.error("Password update error:", authErr);
                    KaghanUI.showToast('Profile updated, but password change failed: ' + authErr.message, 'error');
                }
            } else if (success) {
                KaghanUI.showToast('Profile configuration updated!', 'success');
            }
            
            renderUserProfile();
        });
    }

    // Publish to window
    window.UserProfileModule = {
        render: renderUserProfile,
        initForm: setupProfileForm
    };
    window.renderUserProfile = renderUserProfile; // Global fallback
})();
