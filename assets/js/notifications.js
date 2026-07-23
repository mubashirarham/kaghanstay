// Kaghan Stay - In-App Notifications Module (Owner-Scoped)

(function() {
    'use strict';

    window.KaghanNotifications = {
        getNotifications: async function() {
            const user = KaghanDB.getCurrentUser();
            if (!user || (!user.uid && !user.id)) return [];
            const uid = user.uid || user.id;

            try {
                const snap = await firebase.firestore().collection('notifications').doc(uid).get();
                if (snap.exists) {
                    return snap.data().list || [];
                }
                return [];
            } catch (err) {
                console.warn("Notifications read error:", err);
                return [];
            }
        },

        renderNotificationDropdown: async function(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;

            const list = await this.getNotifications();
            if (list.length === 0) {
                container.innerHTML = `
                    <div class="p-4 text-center text-xs text-slate-400 font-medium">
                        <i class="fa-solid fa-bell-slash text-base mb-1 block text-slate-300"></i>
                        No new notifications.
                    </div>
                `;
                return;
            }

            container.innerHTML = list.map(item => `
                <div class="p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors text-xs space-y-1">
                    <div class="font-bold text-slate-900 flex justify-between items-center">
                        <span>${KaghanSafe.escapeHTML(item.title)}</span>
                        <span class="text-[9px] text-slate-400 font-normal">${KaghanUI.formatDate(item.createdAt || new Date())}</span>
                    </div>
                    <p class="text-slate-600 font-light text-[11px] leading-relaxed">${KaghanSafe.escapeHTML(item.message)}</p>
                </div>
            `).join('');
        }
    };
})();
