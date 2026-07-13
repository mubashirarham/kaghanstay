// Admin Management for Coupons

let currentCoupons = [];

window.addEventListener('kaghan-db-coupons', (e) => {
    currentCoupons = e.detail;
    renderCoupons();
});

// Initial Render Fallback
if (window.KaghanDB_Cache && window.KaghanDB_Cache.coupons) {
    currentCoupons = window.KaghanDB_Cache.coupons;
    renderCoupons();
}

function renderCoupons() {
    const tbody = document.getElementById('admin-coupons-tbody');
    if (!tbody) return;

    if (currentCoupons.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-slate-400 text-xs">No coupons available.</td></tr>`;
        return;
    }

    tbody.innerHTML = currentCoupons.map(cp => `
        <tr class="border-b border-slate-55 hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4">
                <span class="text-xs font-bold font-mono bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-1 rounded">${KaghanSafe.escapeHTML(cp.code)}</span>
            </td>
            <td class="px-6 py-4">
                <span class="text-xs text-slate-800 font-semibold">${cp.discountPercentage}% OFF</span>
            </td>
            <td class="px-6 py-4">
                <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${cp.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}">
                    ${cp.isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td class="px-6 py-4 text-right">
                <button onclick="toggleCouponStatus('${cp.id}', ${!cp.isActive})" class="text-slate-400 hover:text-[#D4AF37] transition-colors p-1.5 mr-2" title="Toggle Status">
                    <i class="fa-solid fa-power-off text-sm"></i>
                </button>
                <button onclick="deleteCoupon('${cp.id}')" class="text-slate-400 hover:text-rose-500 transition-colors p-1.5" title="Delete">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Modal Logic
window.openAddCouponModal = () => {
    const modal = document.getElementById('add-coupon-modal');
    document.getElementById('add-coupon-form').reset();
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.remove('opacity-0'), 10);
    }
};

window.closeAddCouponModal = () => {
    const modal = document.getElementById('add-coupon-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
};

document.getElementById('add-coupon-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Creating...';
    btn.disabled = true;

    try {
        const code = document.getElementById('add-coupon-code').value.trim().toUpperCase();
        const cpData = {
            id: code,
            code: code,
            discountPercentage: parseInt(document.getElementById('add-coupon-discount').value, 10),
            isActive: true
        };

        await window.KaghanDB.saveCoupon(cpData);
        if (window.KaghanUI) window.KaghanUI.showToast("Coupon created successfully!", "success");
        closeAddCouponModal();
    } catch (error) {
        console.error(error);
        if (window.KaghanUI) window.KaghanUI.showToast("Failed to create coupon.", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// Delete Functions
window.deleteCoupon = async (id) => {
    if (confirm(`Are you sure you want to delete coupon "${id}"?`)) {
        try {
            await window.KaghanDB.deleteCoupon(id);
            if (window.KaghanUI) window.KaghanUI.showToast("Coupon deleted.", "success");
        } catch(e) {
            console.error(e);
            if (window.KaghanUI) window.KaghanUI.showToast("Failed to delete.", "error");
        }
    }
};

window.toggleCouponStatus = async (id, newStatus) => {
    try {
        const cp = currentCoupons.find(c => c.id === id);
        if (cp) {
            cp.isActive = newStatus;
            await window.KaghanDB.saveCoupon(cp);
            if (window.KaghanUI) window.KaghanUI.showToast(`Coupon marked as ${newStatus ? 'Active' : 'Inactive'}.`, "success");
        }
    } catch(e) {
        console.error(e);
        if (window.KaghanUI) window.KaghanUI.showToast("Failed to update status.", "error");
    }
};
