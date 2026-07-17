// System Settings Management for Categories and Locations

let currentCategories = [];
let currentLocations = [];

window.addEventListener('kaghan-db-categories', (e) => {
    currentCategories = e.detail;
    renderCategories();
});

window.addEventListener('kaghan-db-locations', (e) => {
    currentLocations = e.detail;
    renderLocations();
});

// Initial Render Fallbacks (if events already fired)
if (window.KaghanDB_Cache && window.KaghanDB_Cache.categories) {
    currentCategories = window.KaghanDB_Cache.categories;
    renderCategories();
}
if (window.KaghanDB_Cache && window.KaghanDB_Cache.locations) {
    currentLocations = window.KaghanDB_Cache.locations;
    renderLocations();
}

function renderCategories() {
    const list = document.getElementById('admin-categories-list');
    if (!list) return;

    if (currentCategories.length === 0) {
        list.innerHTML = `<p class="text-xs text-slate-400">No categories found.</p>`;
        return;
    }

    list.innerHTML = currentCategories.map(cat => `
        <div class="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 overflow-hidden">
                    ${cat.image ? `<img src="${KaghanSafe.escapeHTML(cat.image)}" class="w-full h-full object-cover">` : `<i class="fa-solid ${KaghanSafe.escapeHTML(cat.icon)} text-sm"></i>`}
                </div>
                <div>
                    <h4 class="text-xs font-bold text-slate-900">${KaghanSafe.escapeHTML(cat.label)}</h4>
                    <span class="text-[9px] text-slate-400 font-mono">ID: ${KaghanSafe.escapeHTML(cat.id)}</span>
                </div>
            </div>
            <div class="flex items-center gap-1.5">
                <button onclick="editCategory('${cat.id}')" class="text-slate-450 hover:text-[#C5A059] transition-colors p-1.5" title="Edit">
                    <i class="fa-solid fa-pen-to-square text-sm"></i>
                </button>
                <button onclick="deleteCategory('${cat.id}')" class="text-slate-450 hover:text-rose-500 transition-colors p-1.5" title="Delete">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderLocations() {
    const list = document.getElementById('admin-locations-list');
    if (!list) return;

    if (currentLocations.length === 0) {
        list.innerHTML = `<p class="text-xs text-slate-400">No locations found.</p>`;
        return;
    }

    list.innerHTML = currentLocations.map(loc => `
        <div class="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div>
                <h4 class="text-xs font-bold text-slate-900">${KaghanSafe.escapeHTML(loc.label)}</h4>
                <span class="text-[9px] text-slate-400 font-mono">ID: ${KaghanSafe.escapeHTML(loc.id)}</span>
            </div>
            <button onclick="deleteLocation('${loc.id}')" class="text-slate-400 hover:text-rose-500 transition-colors p-1.5" title="Delete">
                <i class="fa-solid fa-trash-can text-sm"></i>
            </button>
        </div>
    `).join('');
}

// Category Modal Logic
window.openAddCategoryModal = () => {
    const modal = document.getElementById('add-category-modal');
    document.getElementById('add-category-form').reset();
    
    // Reset modal title and ID readonly state
    const title = document.querySelector('#add-category-modal h3');
    if (title) title.innerText = "Add New Category";
    document.getElementById('add-category-id').readOnly = false;
    document.getElementById('add-category-id').classList.remove('bg-slate-200', 'cursor-not-allowed');

    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.remove('opacity-0'), 10);
    }
};

window.editCategory = (id) => {
    const cat = currentCategories.find(c => c.id === id);
    if (!cat) return;

    // Fill details
    document.getElementById('add-category-id').value = cat.id;
    document.getElementById('add-category-id').readOnly = true;
    document.getElementById('add-category-id').classList.add('bg-slate-200', 'cursor-not-allowed');
    document.getElementById('add-category-label').value = cat.label;
    document.getElementById('add-category-icon').value = cat.icon || 'fa-bed';
    document.getElementById('add-category-image').value = cat.image || '';

    // Adjust title
    const title = document.querySelector('#add-category-modal h3');
    if (title) title.innerText = "Edit Category Name & Details";

    const modal = document.getElementById('add-category-modal');
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.remove('opacity-0'), 10);
    }
};

window.closeAddCategoryModal = () => {
    const modal = document.getElementById('add-category-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
};

document.getElementById('add-category-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
    btn.disabled = true;

    try {
        const catData = {
            id: document.getElementById('add-category-id').value.trim().toLowerCase(),
            label: document.getElementById('add-category-label').value.trim(),
            icon: document.getElementById('add-category-icon').value.trim(),
            image: document.getElementById('add-category-image').value.trim()
        };

        await window.KaghanDB.saveCategory(catData);
        if (window.KaghanUI) window.KaghanUI.showToast("Category added successfully!", "success");
        closeAddCategoryModal();
    } catch (error) {
        console.error(error);
        if (window.KaghanUI) window.KaghanUI.showToast("Failed to add category.", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// Location Modal Logic
window.openAddLocationModal = () => {
    const modal = document.getElementById('add-location-modal');
    document.getElementById('add-location-form').reset();
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.remove('opacity-0'), 10);
    }
};

window.closeAddLocationModal = () => {
    const modal = document.getElementById('add-location-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
};

document.getElementById('add-location-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
    btn.disabled = true;

    try {
        const locData = {
            id: document.getElementById('add-location-id').value.trim().toLowerCase(),
            label: document.getElementById('add-location-label').value.trim()
        };

        await window.KaghanDB.saveLocation(locData);
        if (window.KaghanUI) window.KaghanUI.showToast("Location added successfully!", "success");
        closeAddLocationModal();
    } catch (error) {
        console.error(error);
        if (window.KaghanUI) window.KaghanUI.showToast("Failed to add location.", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// Delete Functions
window.deleteCategory = async (id) => {
    if (confirm(`Are you sure you want to delete category "${id}"?`)) {
        try {
            await window.KaghanDB.deleteCategory(id);
            if (window.KaghanUI) window.KaghanUI.showToast("Category deleted.", "success");
        } catch(e) {
            console.error(e);
            if (window.KaghanUI) window.KaghanUI.showToast("Failed to delete.", "error");
        }
    }
};

window.deleteLocation = async (id) => {
    if (confirm(`Are you sure you want to delete location "${id}"?`)) {
        try {
            await window.KaghanDB.deleteLocation(id);
            if (window.KaghanUI) window.KaghanUI.showToast("Location deleted.", "success");
        } catch(e) {
            console.error(e);
            if (window.KaghanUI) window.KaghanUI.showToast("Failed to delete.", "error");
        }
    }
};

// Cloudinary Upload for Category
document.getElementById('upload-cat-img-btn')?.addEventListener('click', () => {
    if (typeof cloudinary === 'undefined') {
        if(window.KaghanUI) window.KaghanUI.showToast("Cloudinary widget not loaded.", "error");
        return;
    }
    cloudinary.openUploadWidget({
        cloudName: 'dis1ptaip',
        uploadPreset: 'mubashir',
        sources: ['local', 'url', 'camera'],
        multiple: false,
        cropping: false,
        defaultSource: 'local'
    }, (error, result) => {
        if (!error && result && result.event === "success") {
            document.getElementById('add-category-image').value = result.info.secure_url;
            if(window.KaghanUI) window.KaghanUI.showToast("Category image uploaded!", "success");
        }
    });
});

// Dynamic Premium Upgrades Management
let currentUpgrades = [];

window.addEventListener('kaghan-db-upgrades', (e) => {
    currentUpgrades = e.detail;
    renderUpgrades();
});

if (window.KaghanDB_Cache && window.KaghanDB_Cache.upgrades) {
    currentUpgrades = window.KaghanDB_Cache.upgrades;
    renderUpgrades();
}

function renderUpgrades() {
    const list = document.getElementById('admin-upgrades-list');
    if (!list) return;

    if (currentUpgrades.length === 0) {
        list.innerHTML = `<div class="col-span-full text-center py-6"><p class="text-xs text-slate-400">No premium upgrades found. Default upgrades will be used on the checkout page.</p></div>`;
        return;
    }

    list.innerHTML = currentUpgrades.map(up => `
        <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between h-full">
            <div>
                <div class="flex justify-between items-start gap-2 mb-2">
                    <h4 class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <i class="fa-solid ${KaghanSafe.escapeHTML(up.icon || 'fa-plus')} text-[#C5A059] text-sm"></i>
                        ${KaghanSafe.escapeHTML(up.name)}
                    </h4>
                    <span class="text-[10px] font-black text-[#C5A059] whitespace-nowrap">
                        ${KaghanUI.formatPKR(up.price)}${up.priceType === 'night' ? '/N' : ''}
                    </span>
                </div>
                <p class="text-slate-500 text-[10px] leading-relaxed font-light mb-4">${KaghanSafe.escapeHTML(up.description)}</p>
            </div>
            <div class="flex gap-2 justify-end pt-3 border-t border-slate-105">
                <button onclick="editUpgrade('${up.id}')" class="text-slate-450 hover:text-[#C5A059] text-[10px] font-bold py-1 px-2.5 rounded hover:bg-slate-100 transition-colors flex items-center gap-1">
                    <i class="fa-solid fa-pen-to-square"></i> Edit
                </button>
                <button onclick="deleteUpgrade('${up.id}')" class="text-slate-450 hover:text-rose-500 text-[10px] font-bold py-1 px-2.5 rounded hover:bg-slate-100 transition-colors flex items-center gap-1">
                    <i class="fa-solid fa-trash-can"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

window.openAddUpgradeModal = () => {
    const modal = document.getElementById('add-upgrade-modal');
    document.getElementById('add-upgrade-form').reset();
    
    const title = document.querySelector('#add-upgrade-modal h3');
    if (title) title.innerText = "Add Premium Upgrade";
    document.getElementById('add-upgrade-id').readOnly = false;
    document.getElementById('add-upgrade-id').classList.remove('bg-slate-200', 'cursor-not-allowed');

    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.remove('opacity-0'), 10);
    }
};

window.closeAddUpgradeModal = () => {
    const modal = document.getElementById('add-upgrade-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
};

window.editUpgrade = (id) => {
    const up = currentUpgrades.find(u => u.id === id);
    if (!up) return;

    document.getElementById('add-upgrade-id').value = up.id;
    document.getElementById('add-upgrade-id').readOnly = true;
    document.getElementById('add-upgrade-id').classList.add('bg-slate-200', 'cursor-not-allowed');
    
    document.getElementById('add-upgrade-name').value = up.name;
    document.getElementById('add-upgrade-price').value = up.price;
    document.getElementById('add-upgrade-type').value = up.priceType || 'flat';
    document.getElementById('add-upgrade-icon').value = up.icon || 'fa-car-side';
    document.getElementById('add-upgrade-desc').value = up.description || '';

    const title = document.querySelector('#add-upgrade-modal h3');
    if (title) title.innerText = "Edit Premium Upgrade";

    const modal = document.getElementById('add-upgrade-modal');
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.remove('opacity-0'), 10);
    }
};

document.getElementById('add-upgrade-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
    btn.disabled = true;

    try {
        const upData = {
            id: document.getElementById('add-upgrade-id').value.trim().toLowerCase(),
            name: document.getElementById('add-upgrade-name').value.trim(),
            price: parseInt(document.getElementById('add-upgrade-price').value),
            priceType: document.getElementById('add-upgrade-type').value,
            icon: document.getElementById('add-upgrade-icon').value,
            description: document.getElementById('add-upgrade-desc').value.trim()
        };

        await window.KaghanDB.saveUpgrade(upData);
        if (window.KaghanUI) window.KaghanUI.showToast("Premium upgrade saved successfully!", "success");
        closeAddUpgradeModal();
    } catch (error) {
        console.error(error);
        if (window.KaghanUI) window.KaghanUI.showToast(error.message || "Failed to save upgrade.", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

window.deleteUpgrade = async (id) => {
    if (confirm(`Are you sure you want to delete upgrade service "${id}"?`)) {
        try {
            await window.KaghanDB.deleteUpgrade(id);
            if (window.KaghanUI) window.KaghanUI.showToast("Upgrade service deleted.", "success");
        } catch(e) {
            console.error(e);
            if (window.KaghanUI) window.KaghanUI.showToast("Failed to delete upgrade.", "error");
        }
    }
};

