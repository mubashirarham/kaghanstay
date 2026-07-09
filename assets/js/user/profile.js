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
        if (passInput) passInput.value = user.password;
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

            if (!updatedName || !updatedPass) {
                KaghanUI.showToast('Name and password cannot be empty.', 'error');
                return;
            }

            const success = await KaghanDB.updateUser(user.id, {
                name: updatedName,
                phone: updatedPhone,
                password: updatedPass
            });

            if (success) {
                KaghanUI.showToast('Profile configuration updated!', 'success');
                renderUserProfile();
            } else {
                KaghanUI.showToast('Failed to update profile.', 'error');
            }
        });
    }

    // Publish to window
    window.UserProfileModule = {
        render: renderUserProfile,
        initForm: setupProfileForm
    };
    window.renderUserProfile = renderUserProfile; // Global fallback
})();
