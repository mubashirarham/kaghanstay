// Kaghan Hotel - Admin Room Inventory Module
(function() {
    let activeEditRoomId = null;
    let editRoomMap = null;
    let editRoomMarker = null;
    let addRoomMap = null;
    let addRoomMarker = null;
    let editQuill = null;
    let addQuill = null;

    async function populateSelects() {
        const typeSelects = [document.getElementById('add-room-type'), document.getElementById('edit-room-type')];
        const locationSelects = [document.getElementById('add-room-location'), document.getElementById('edit-room-location')];
        
        const categories = await KaghanDB.getCategories();
        const locations = await KaghanDB.getLocations();

        const catOptions = categories.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
        const locOptions = locations.map(l => `<option value="${l.id}">${l.label}</option>`).join('');

        typeSelects.forEach(select => {
            if (select) select.innerHTML = catOptions;
        });
        locationSelects.forEach(select => {
            if (select) select.innerHTML = locOptions;
        });
    }

    async function renderRooms() {
        const rooms = await KaghanDB.getRooms();
        const grid = document.getElementById('admin-rooms-grid');

        if (!grid) return;

        grid.innerHTML = rooms.map(room => `
            <div class="bg-white border border-slate-100 rounded-3xl p-5 flex flex-col justify-between hover:border-[#D4AF37] transition-all shadow-md group">
                <div>
                    <div class="relative h-44 overflow-hidden rounded-2xl mb-4 bg-slate-100">
                        <img src="${room.image || (room.images && room.images.length ? room.images[0] : '')}" alt="${room.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        <div class="absolute top-3 right-3">
                            <select onchange="changeRoomStatus('${room.id}', this.value)" class="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border outline-none cursor-pointer shadow-sm ${
                                room.status === 'available' ? 'bg-emerald-500 text-white border-transparent' : 'bg-amber-500 text-white border-transparent'
                            }">
                                <option value="available" ${room.status === 'available' ? 'selected' : ''}>Available</option>
                                <option value="maintenance" ${room.status === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                            </select>
                        </div>
                        ${room.images && room.images.length > 1 ? `<div class="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[9px] px-2 py-1 rounded-lg font-bold"><i class="fa-solid fa-images"></i> +${room.images.length - 1}</div>` : ''}
                    </div>
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-bold text-[#0F172A] outfit text-sm leading-tight">${room.name}</h4>
                    </div>
                    <div class="text-[10px] text-[#D4AF37] font-bold mb-3 flex items-center gap-1">
                        <i class="fa-solid fa-location-dot text-[9px]"></i>
                        <span>${room.location || 'Islamabad'}</span>
                    </div>
                    <p class="text-slate-400 text-xs line-clamp-2 mb-4 font-light leading-relaxed">
                        ${room.description}
                    </p>
                    <div class="flex flex-wrap gap-1 mb-4">
                        ${room.amenities.slice(0, 3).map(a => `
                            <span class="bg-slate-50 text-slate-500 text-[8px] uppercase font-bold px-2 py-0.5 rounded border border-slate-100">${a}</span>
                        `).join('')}
                        ${room.amenities.length > 3 ? `<span class="bg-slate-50 text-[#D4AF37] text-[8px] font-bold px-2 py-0.5 rounded border border-slate-100">+${room.amenities.length - 3}</span>` : ''}
                    </div>
                </div>

                <div class="border-t border-slate-100 pt-4 flex justify-between items-center mt-4">
                    <div>
                        <span class="text-slate-400 text-[8px] uppercase tracking-wider block font-bold">Price per night</span>
                        <span class="text-sm font-black text-[#D4AF37]">${KaghanUI.formatPKR(room.price)}</span>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="deleteRoomRecord('${room.id}')" class="bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-bold px-2.5 py-2 rounded-lg hover:bg-rose-100 hover:text-rose-700 transition-all" title="Delete Room Style">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                        <button onclick="openEditRoomModal('${room.id}')" class="bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-bold px-3 py-2 rounded-lg hover:bg-slate-100 transition-all">
                            Edit Details
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    window.changeRoomStatus = async (id, newStatus) => {
        const success = await KaghanDB.updateRoom(id, { status: newStatus });
        if (success) {
            KaghanUI.showToast(`Room status updated to ${newStatus}.`, 'success');
            if (window.AdminDashboardModule) {
                await window.AdminDashboardModule.refreshAll();
            }
        } else {
            KaghanUI.showToast('Failed to update room status.', 'error');
        }
    };

    // Gallery helpers
    function renderGalleryPreview(containerId, dataInputId, imageUrls) {
        const container = document.getElementById(containerId);
        const dataInput = document.getElementById(dataInputId);
        if (!container || !dataInput) return;
        
        dataInput.value = JSON.stringify(imageUrls);

        if (imageUrls.length === 0) {
            container.innerHTML = `<span class="text-[10px] text-slate-400 m-auto">No images uploaded.</span>`;
            return;
        }

        container.innerHTML = imageUrls.map((url, idx) => `
            <div class="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-slate-200 group">
                <img src="${url}" class="w-full h-full object-cover">
                <button type="button" onclick="removeGalleryImage('${containerId}', '${dataInputId}', ${idx})" class="absolute top-1 right-1 bg-white rounded-full w-5 h-5 flex items-center justify-center text-rose-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fa-solid fa-times text-[10px]"></i>
                </button>
            </div>
        `).join('');
    }

    window.removeGalleryImage = (containerId, dataInputId, indexToRemove) => {
        const dataInput = document.getElementById(dataInputId);
        if (!dataInput) return;
        const currentUrls = JSON.parse(dataInput.value || '[]');
        currentUrls.splice(indexToRemove, 1);
        renderGalleryPreview(containerId, dataInputId, currentUrls);
    };

    function setupCloudinaryGallery(btnId, containerId, dataInputId) {
        document.getElementById(btnId)?.addEventListener('click', () => {
            if (typeof cloudinary === 'undefined') {
                if(window.KaghanUI) KaghanUI.showToast("Cloudinary widget not loaded.", "error");
                return;
            }
            let uploadedUrls = [];
            cloudinary.openUploadWidget({
                cloudName: 'dis1ptaip',
                uploadPreset: 'mubashir',
                sources: ['local', 'url', 'camera'],
                multiple: true,
                cropping: false,
                defaultSource: 'local'
            }, (error, result) => {
                if (!error && result) {
                    if (result.event === "success") {
                        uploadedUrls.push(result.info.secure_url);
                    } else if (result.event === "queues-end") {
                        if (uploadedUrls.length > 0) {
                            const dataInput = document.getElementById(dataInputId);
                            const currentUrls = JSON.parse(dataInput.value || '[]');
                            const newUrls = [...currentUrls, ...uploadedUrls];
                            renderGalleryPreview(containerId, dataInputId, newUrls);
                            if(window.KaghanUI) KaghanUI.showToast(`${uploadedUrls.length} image(s) added to gallery!`, "success");
                            uploadedUrls = [];
                        }
                    }
                }
            });
        });
    }

    // Edit Room Modal operations
    window.openEditRoomModal = async (id) => {
        activeEditRoomId = id;
        const room = await KaghanDB.getRoomById(id);
        if (!room) return;

        await populateSelects();

        document.getElementById('edit-room-name-lbl').innerText = room.name;
        document.getElementById('edit-room-name').value = room.name;
        
        setTimeout(() => {
            document.getElementById('edit-room-type').value = room.type;
            document.getElementById('edit-room-location').value = room.location || 'islamabad';
        }, 50);

        document.getElementById('edit-room-price').value = room.price;
        document.getElementById('edit-room-price-weekly').value = room.priceWeekly || '';
        document.getElementById('edit-room-price-monthly').value = room.priceMonthly || '';
        document.getElementById('edit-room-guests').value = room.maxGuests || 2;
        if(editQuill) {
            editQuill.root.innerHTML = room.description || '';
        }
        document.getElementById('edit-room-amenities').value = room.amenities.join(', ');

        const imagesArray = room.images || (room.image ? [room.image] : []);
        renderGalleryPreview('edit-room-gallery-preview', 'edit-room-images-data', imagesArray);

        const modal = document.getElementById('edit-room-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            
            // Initialize Edit Map
            const lat = room.lat || 33.7294; // Default to Islamabad
            const lng = room.lng || 73.0931;
            document.getElementById('edit-room-lat').value = lat;
            document.getElementById('edit-room-lng').value = lng;
            
            if (!editRoomMap) {
                editRoomMap = L.map('edit-room-map').setView([lat, lng], 11);
                L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; OpenStreetMap'
                }).addTo(editRoomMap);
                editRoomMarker = L.marker([lat, lng], {draggable: true}).addTo(editRoomMap);
                
                editRoomMap.on('click', (e) => {
                    editRoomMarker.setLatLng(e.latlng);
                    document.getElementById('edit-room-lat').value = e.latlng.lat;
                    document.getElementById('edit-room-lng').value = e.latlng.lng;
                });
                
                editRoomMarker.on('dragend', (e) => {
                    const position = editRoomMarker.getLatLng();
                    document.getElementById('edit-room-lat').value = position.lat;
                    document.getElementById('edit-room-lng').value = position.lng;
                });
            } else {
                editRoomMap.setView([lat, lng], 11);
                editRoomMarker.setLatLng([lat, lng]);
                editRoomMap.invalidateSize();
            }
        }, 300); // give time for transition so map size calculates correctly
    };

    window.closeEditRoomModal = () => {
        const modal = document.getElementById('edit-room-modal');
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            activeEditRoomId = null;
        }, 300);
    };

    // Save edited changes
    function setupEditRoomForm() {
        const editForm = document.getElementById('edit-room-form');
        if (!editForm) return;

        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!activeEditRoomId) return;

            const btn = editForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
            btn.disabled = true;

            try {
                const name = document.getElementById('edit-room-name').value.trim();
                const type = document.getElementById('edit-room-type').value;
                const location = document.getElementById('edit-room-location').value;
                const price = parseInt(document.getElementById('edit-room-price').value);
                const priceWeekly = parseInt(document.getElementById('edit-room-price-weekly').value);
                const priceMonthly = parseInt(document.getElementById('edit-room-price-monthly').value);
                const maxGuests = parseInt(document.getElementById('edit-room-guests').value);
                const description = editQuill ? editQuill.root.innerHTML.trim() : '';
                const amenitiesInput = document.getElementById('edit-room-amenities').value.trim();
                const imagesStr = document.getElementById('edit-room-images-data').value;
                const imagesArray = JSON.parse(imagesStr || '[]');
                const lat = parseFloat(document.getElementById('edit-room-lat').value);
                const lng = parseFloat(document.getElementById('edit-room-lng').value);

                if (!name || isNaN(price) || price <= 0 || !description || isNaN(maxGuests) || maxGuests <= 0) {
                    KaghanUI.showToast('Please enter valid room details.', 'error');
                    return;
                }

                const amenities = amenitiesInput
                    ? amenitiesInput.split(',').map(a => a.trim()).filter(a => a !== '')
                    : ['King Bed', 'High-Speed Wi-Fi', 'Smart TV'];

                const updatedData = {
                    name,
                    type,
                    price,
                    isApartment: true,
                    priceWeekly: isNaN(priceWeekly) ? null : priceWeekly,
                    priceMonthly: isNaN(priceMonthly) ? null : priceMonthly,
                    maxGuests,
                    description,
                    amenities,
                    location,
                    lat: isNaN(lat) ? null : lat,
                    lng: isNaN(lng) ? null : lng,
                    images: imagesArray,
                    image: imagesArray.length > 0 ? imagesArray[0] : ''
                };

                const success = await KaghanDB.updateRoom(activeEditRoomId, updatedData);
                if (success) {
                    KaghanUI.showToast('Room style details updated successfully!', 'success');
                    if (window.AdminDashboardModule) {
                        await window.AdminDashboardModule.refreshAll();
                    }
                    closeEditRoomModal();
                } else {
                    KaghanUI.showToast('Failed to update room details.', 'error');
                }
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // Add new room with Cloudinary uploads
    function setupAddRoomForm() {
        const form = document.getElementById('add-room-form');
        if (!form) return;
        
        window.openAddRoomModal = async () => {
            await populateSelects();
            renderGalleryPreview('add-room-gallery-preview', 'add-room-images-data', []);
            const modal = document.getElementById('add-room-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            if (addQuill) {
                addQuill.root.innerHTML = '';
            }
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                
                // Initialize Add Map
                const lat = 33.7294; // Default to Islamabad
                const lng = 73.0931;
                document.getElementById('add-room-lat').value = lat;
                document.getElementById('add-room-lng').value = lng;
                
                if (!addRoomMap) {
                    addRoomMap = L.map('add-room-map').setView([lat, lng], 11);
                    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                        attribution: '&copy; OpenStreetMap'
                    }).addTo(addRoomMap);
                    addRoomMarker = L.marker([lat, lng], {draggable: true}).addTo(addRoomMap);
                    
                    addRoomMap.on('click', (e) => {
                        addRoomMarker.setLatLng(e.latlng);
                        document.getElementById('add-room-lat').value = e.latlng.lat;
                        document.getElementById('add-room-lng').value = e.latlng.lng;
                    });
                    
                    addRoomMarker.on('dragend', (e) => {
                        const position = addRoomMarker.getLatLng();
                        document.getElementById('add-room-lat').value = position.lat;
                        document.getElementById('add-room-lng').value = position.lng;
                    });
                } else {
                    addRoomMap.setView([lat, lng], 11);
                    addRoomMarker.setLatLng([lat, lng]);
                    addRoomMap.invalidateSize();
                }
            }, 300);
        };

        window.closeAddRoomModal = () => {
            const modal = document.getElementById('add-room-modal');
            modal.classList.add('opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                form.reset();
            }, 300);
        };

        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = newForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
            btn.disabled = true;

            try {
                const name = document.getElementById('add-room-name').value.trim();
                const type = document.getElementById('add-room-type').value;
                const location = document.getElementById('add-room-location').value;
                const price = parseInt(document.getElementById('add-room-price').value);
                const priceWeekly = parseInt(document.getElementById('add-room-price-weekly').value);
                const priceMonthly = parseInt(document.getElementById('add-room-price-monthly').value);
                const maxGuests = parseInt(document.getElementById('add-room-guests').value);
                const description = addQuill ? addQuill.root.innerHTML.trim() : '';
                const amenitiesInput = document.getElementById('add-room-amenities').value.trim();
                
                const imagesStr = document.getElementById('add-room-images-data').value;
                const imagesArray = JSON.parse(imagesStr || '[]');
                const lat = parseFloat(document.getElementById('add-room-lat').value);
                const lng = parseFloat(document.getElementById('add-room-lng').value);

                if (!name || isNaN(price) || price <= 0 || !description || isNaN(maxGuests) || maxGuests <= 0) {
                    KaghanUI.showToast('Please enter valid room details.', 'error');
                    return;
                }

                let imageUrl = imagesArray.length > 0 ? imagesArray[0] : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
                if (imagesArray.length === 0) imagesArray.push(imageUrl);

                const amenities = amenitiesInput
                    ? amenitiesInput.split(',').map(a => a.trim()).filter(a => a !== '')
                    : ['King Bed', 'High-Speed Wi-Fi', 'Smart TV'];

                const newRoom = {
                    id: 'room-' + type + '-' + Date.now(),
                    name,
                    type,
                    price,
                    isApartment: true,
                    priceWeekly: isNaN(priceWeekly) ? null : priceWeekly,
                    priceMonthly: isNaN(priceMonthly) ? null : priceMonthly,
                    image: imageUrl,
                    images: imagesArray,
                    maxGuests,
                    description,
                    amenities,
                    location,
                    lat: isNaN(lat) ? null : lat,
                    lng: isNaN(lng) ? null : lng,
                    status: 'available',
                    rating: 5.0,
                    reviewsCount: 0
                };

                await KaghanDB.addRoom(newRoom);
                KaghanUI.showToast(`Suite "${name}" added to resort inventory!`, 'success');
                
                if (window.AdminDashboardModule) {
                    await window.AdminDashboardModule.refreshAll();
                }
                closeAddRoomModal();
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    window.deleteRoomRecord = async (roomId) => {
        if (!confirm(`Are you sure you want to permanently delete room/suite style "${roomId}"?`)) return;
        const success = await KaghanDB.deleteRoom(roomId);
        if (success) {
            KaghanUI.showToast(`Room style ${roomId} successfully removed.`, 'success');
            if (window.AdminDashboardModule) {
                await window.AdminDashboardModule.refreshAll();
            }
        } else {
            KaghanUI.showToast('Failed to delete room style.', 'error');
        }
    };

    // Export to window
    window.AdminInventoryModule = {
        render: renderRooms,
        initForms: () => {
            setupEditRoomForm();
            setupAddRoomForm();
            setupCloudinaryGallery('upload-edit-room-img-btn', 'edit-room-gallery-preview', 'edit-room-images-data');
            setupCloudinaryGallery('upload-add-room-img-btn', 'add-room-gallery-preview', 'add-room-images-data');
            
            // Initialize Quill
            if (typeof Quill !== 'undefined') {
                const toolbarOptions = [
                    ['bold', 'italic', 'underline', 'strike'],        
                    ['blockquote', 'code-block'],
                    [{ 'header': 1 }, { 'header': 2 }],               
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'color': [] }, { 'background': [] }],          
                    ['clean']                                         
                ];
                
                if (document.getElementById('edit-room-desc-quill')) {
                    editQuill = new Quill('#edit-room-desc-quill', {
                        theme: 'snow',
                        placeholder: 'Write a comprehensive suite description...',
                        modules: { toolbar: toolbarOptions }
                    });
                }
                
                if (document.getElementById('add-room-desc-quill')) {
                    addQuill = new Quill('#add-room-desc-quill', {
                        theme: 'snow',
                        placeholder: 'Write a comprehensive suite description...',
                        modules: { toolbar: toolbarOptions }
                    });
                }
            }
        }
    };
})();
