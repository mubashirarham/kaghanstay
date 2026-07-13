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
            <button onclick="deleteCategory('${cat.id}')" class="text-slate-400 hover:text-rose-500 transition-colors p-1.5" title="Delete">
                <i class="fa-solid fa-trash-can text-sm"></i>
            </button>
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
