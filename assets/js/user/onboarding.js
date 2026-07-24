// Kaghan Stay - Guest Onboarding Stepper Controller
(function() {
    let currentStep = 1;
    let selectedAvatar = 'gold-crown';
    let userPreferences = {
        suiteType: 'studio',
        bedding: 'king',
        view: 'mountain',
        shuttle: false,
        breakfast: true,
        welcomeHamper: true
    };

    document.addEventListener('DOMContentLoaded', async () => {
        const user = KaghanDB.getCurrentUser();
        if (user) {
            if (user.displayName) document.getElementById('onboard-name').value = user.displayName;
            if (user.phone) document.getElementById('onboard-phone').value = user.phone;
        }
        updateProgressBar();
    });

    window.goToStep = function(stepNum) {
        if (stepNum < 1 || stepNum > 4) return;

        // Hide all step cards
        document.querySelectorAll('.onboarding-step-card').forEach(card => card.classList.add('hidden'));

        // Show target step card
        const target = document.getElementById(`step-card-${stepNum}`);
        if (target) target.classList.remove('hidden');

        currentStep = stepNum;
        updateProgressBar();
    };

    function updateProgressBar() {
        const bar = document.getElementById('onboarding-progress-bar');
        const counterText = document.getElementById('step-counter-text');
        const titleBadge = document.getElementById('step-title-badge');

        const stepTitles = {
            1: 'Personal Details',
            2: 'Stay Preferences',
            3: 'Concierge Extras',
            4: 'Loyalty Membership'
        };

        if (bar) bar.style.width = `${(currentStep / 4) * 100}%`;
        if (counterText) counterText.textContent = `Step ${currentStep} of 4`;
        if (titleBadge) titleBadge.textContent = stepTitles[currentStep] || '';
    }

    window.selectAvatar = function(avatarKey, btn) {
        selectedAvatar = avatarKey;
        document.querySelectorAll('.avatar-option-btn').forEach(b => {
            b.classList.remove('border-white', 'shadow-lg');
            b.classList.add('border-transparent', 'opacity-70');
        });
        if (btn) {
            btn.classList.remove('border-transparent', 'opacity-70');
            btn.classList.add('border-white', 'shadow-lg');
        }
    };

    window.selectPrefOption = function(groupKey, val, btn) {
        userPreferences[groupKey] = val;
        const parent = btn.parentElement;
        parent.querySelectorAll('button').forEach(b => {
            b.classList.remove('border-[#C5A059]', 'bg-[#C5A059]/10', 'text-white');
            b.classList.add('border-white/10', 'bg-slate-900/60', 'text-slate-300');
        });
        btn.classList.remove('border-white/10', 'bg-slate-900/60', 'text-slate-300');
        btn.classList.add('border-[#C5A059]', 'bg-[#C5A059]/10', 'text-white');
    };

    window.handleStep1Submit = function(event) {
        event.preventDefault();
        const name = document.getElementById('onboard-name').value.trim();
        const phone = document.getElementById('onboard-phone').value.trim();
        const title = document.getElementById('onboard-title').value;

        if (!name) {
            alert('Please enter your full display name.');
            return;
        }

        userPreferences.title = title;
        userPreferences.displayName = name;
        userPreferences.phone = phone;
        userPreferences.avatar = selectedAvatar;

        goToStep(2);
    };

    window.finishOnboarding = async function() {
        // Collect step 3 checkboxes
        userPreferences.shuttle = document.getElementById('addon-shuttle')?.checked || false;
        userPreferences.breakfast = document.getElementById('addon-breakfast')?.checked || false;
        userPreferences.welcomeHamper = document.getElementById('addon-welcome-hamper')?.checked || false;
        userPreferences.view = document.getElementById('pref-view')?.value || 'mountain';

        const user = KaghanDB.getCurrentUser();
        const uid = user ? user.uid : null;

        const updateData = {
            displayName: userPreferences.displayName || (user ? user.displayName : 'Guest'),
            phone: userPreferences.phone || (user ? user.phone : ''),
            onboarded: true,
            preferences: userPreferences,
            loyaltyPoints: (user && user.loyaltyPoints) ? user.loyaltyPoints + 500 : 500
        };

        try {
            if (uid) {
                await KaghanDB.updateUser(uid, updateData);
            } else {
                localStorage.setItem('kaghan_guest_preferences', JSON.stringify(updateData));
            }
        } catch(e) {
            console.warn('Onboarding save notice:', e);
        }

        window.location.href = 'index.html';
    };
})();
