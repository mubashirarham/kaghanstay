// Kaghan Stay — Admin Coupons & Promo Codes Module
// Manages coupon creation, discount percentage, status toggling, and live Firestore sync.

window.AdminCouponsModule = {
    currentCoupons: [],
    initialized: false,

    init: async function() {
        if (this.initialized) return;
        this.initialized = true;

        if (window.KaghanDB_Cache && window.KaghanDB_Cache.coupons) {
            this.currentCoupons = window.KaghanDB_Cache.coupons;
            this.render();
        }

        try {
            if (window.KaghanDB && window.KaghanDB.getCoupons) {
                const list = await window.KaghanDB.getCoupons();
                if (list && list.length) {
                    this.currentCoupons = list;
                    this.render();
                }
            }
        } catch (e) {
            console.warn("Could not fetch coupons:", e);
        }
    },

    render: function(filterQuery = '') {
        const tbody = document.getElementById('admin-coupons-tbody');
        const summary = document.getElementById('coupons-count-summary');
        if (!tbody) return;

        let filtered = this.currentCoupons || [];
        if (filterQuery.trim()) {
            const q = filterQuery.trim().toLowerCase();
            filtered = filtered.filter(c => (c.code || c.id || '').toLowerCase().includes(q));
        }

        if (summary) {
            summary.textContent = `Showing ${filtered.length} of ${this.currentCoupons.length} promotional coupons`;
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-12 text-center">
                        <div class="w-12 h-12 rounded-full bg-amber-50 text-[#D4AF37] flex items-center justify-center text-xl mx-auto mb-2 border border-amber-200">
                            <i class="fa-solid fa-tags"></i>
                        </div>
                        <h4 class="text-xs font-bold text-slate-800">No Coupons Found</h4>
                        <p class="text-[11px] text-slate-400 font-light mt-0.5">Click "+ Create New Coupon" to generate discount codes for guests.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(cp => {
            const code = cp.code || cp.id || 'PROMO';
            const discount = cp.discountPercentage || cp.discount || cp.percentage || 15;
            const isActive = (cp.isActive !== false && cp.active !== false);

            const safeEscape = (str) => {
                if (window.KaghanSafe && window.KaghanSafe.escapeHTML) return window.KaghanSafe.escapeHTML(str);
                return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
            };

            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-black font-mono bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg tracking-wider">${safeEscape(code)}</span>
                            <button type="button" onclick="AdminCouponsModule.copyCoupon('${code}')" class="text-slate-400 hover:text-slate-700 p-1 text-xs" title="Copy code">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <i class="fa-solid fa-percent text-[10px]"></i> ${discount}% OFF
                        </span>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-xs text-slate-500 font-medium">Sitewide Booking</span>
                    </td>
                    <td class="px-6 py-4">
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" onchange="AdminCouponsModule.toggleCouponStatus('${cp.id || code}', this.checked)" class="sr-only peer" ${isActive ? 'checked' : ''}>
                            <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                            <span class="ml-2 text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-emerald-600' : 'text-slate-400'}">
                                ${isActive ? 'Active' : 'Paused'}
                            </span>
                        </label>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-1">
                            <button type="button" onclick="AdminCouponsModule.deleteCoupon('${cp.id || code}')" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors text-xs" title="Delete Coupon">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    copyCoupon: function(code) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(code);
        }
        if (window.KaghanUI && window.KaghanUI.showToast) {
            window.KaghanUI.showToast(`Copied "${code}" to clipboard!`, "info");
        }
    },

    openAddCouponModal: function() {
        const modal = document.getElementById('add-coupon-modal');
        const form = document.getElementById('add-coupon-form');
        if (form) form.reset();
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => modal.classList.remove('opacity-0'), 10);
            const input = document.getElementById('add-coupon-code');
            if (input) setTimeout(() => input.focus(), 50);
        }
    },

    closeAddCouponModal: function() {
        const modal = document.getElementById('add-coupon-modal');
        if (modal) {
            modal.classList.add('opacity-0');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }
    },

    submitCouponForm: async function(e) {
        if (e) e.preventDefault();
        const codeInput = document.getElementById('add-coupon-code');
        const discountInput = document.getElementById('add-coupon-discount');
        const submitBtn = document.getElementById('add-coupon-submit-btn');

        const code = (codeInput ? codeInput.value : '').trim().toUpperCase();
        const discount = parseInt(discountInput ? discountInput.value : '15', 10) || 15;

        if (!code) {
            if (window.KaghanUI) window.KaghanUI.showToast("Please enter a valid coupon code.", "warning");
            return;
        }

        const origHtml = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Creating...';
        }

        try {
            const cpData = {
                id: code,
                code: code,
                discountPercentage: discount,
                discount: discount,
                isActive: true,
                createdAt: new Date().toISOString()
            };

            await window.KaghanDB.saveCoupon(cpData);
            
            // Add to local cache if not present
            const exists = this.currentCoupons.find(c => (c.code || c.id) === code);
            if (exists) {
                Object.assign(exists, cpData);
            } else {
                this.currentCoupons.unshift(cpData);
            }

            this.render();
            this.closeAddCouponModal();

            if (window.KaghanUI && window.KaghanUI.showToast) {
                window.KaghanUI.showToast(`🎉 Coupon "${code}" (${discount}% OFF) created successfully!`, "success");
            }
        } catch (err) {
            console.error("Create coupon error:", err);
            if (window.KaghanUI && window.KaghanUI.showToast) {
                window.KaghanUI.showToast(`Failed to create coupon: ${err.message}`, "error");
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = origHtml;
            }
        }
    },

    deleteCoupon: async function(id) {
        if (!confirm(`Are you sure you want to delete coupon code "${id}"?`)) return;

        try {
            await window.KaghanDB.deleteCoupon(id);
            this.currentCoupons = this.currentCoupons.filter(c => c.id !== id && c.code !== id);
            this.render();

            if (window.KaghanUI && window.KaghanUI.showToast) {
                window.KaghanUI.showToast(`Coupon "${id}" deleted successfully.`, "info");
            }
        } catch (err) {
            console.error("Delete coupon error:", err);
            if (window.KaghanUI && window.KaghanUI.showToast) {
                window.KaghanUI.showToast(`Failed to delete coupon: ${err.message}`, "error");
            }
        }
    },

    toggleCouponStatus: async function(id, newStatus) {
        try {
            const cp = this.currentCoupons.find(c => c.id === id || c.code === id);
            if (cp) {
                cp.isActive = newStatus;
                cp.active = newStatus;
                await window.KaghanDB.saveCoupon(cp);
                this.render();
                if (window.KaghanUI && window.KaghanUI.showToast) {
                    window.KaghanUI.showToast(`Coupon "${id}" marked as ${newStatus ? 'Active' : 'Paused'}.`, "success");
                }
            }
        } catch (err) {
            console.error("Toggle coupon status error:", err);
            if (window.KaghanUI && window.KaghanUI.showToast) {
                window.KaghanUI.showToast(`Failed to update coupon status: ${err.message}`, "error");
            }
        }
    }
};

// Global Listeners & Aliases for window functions
window.openAddCouponModal = () => AdminCouponsModule.openAddCouponModal();
window.closeAddCouponModal = () => AdminCouponsModule.closeAddCouponModal();
window.deleteCoupon = (id) => AdminCouponsModule.deleteCoupon(id);
window.toggleCouponStatus = (id, status) => AdminCouponsModule.toggleCouponStatus(id, status);

window.addEventListener('kaghan-db-coupons', (e) => {
    AdminCouponsModule.currentCoupons = e.detail || [];
    AdminCouponsModule.render();
});

// Auto-run on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AdminCouponsModule.init());
} else {
    AdminCouponsModule.init();
}
