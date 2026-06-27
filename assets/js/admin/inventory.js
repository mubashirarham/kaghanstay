// Kaghan Hotel - Admin Room Inventory Module
(function() {
    let activeEditRoomId = null;

    async function renderRooms() {
        const rooms = await KaghanDB.getRooms();
        const grid = document.getElementById('admin-rooms-grid');

        if (!grid) return;

        grid.innerHTML = rooms.map(room => `
            <div class="bg-white border border-slate-100 rounded-3xl p-5 flex flex-col justify-between hover:border-[#D4AF37] transition-all shadow-md group">
                <div>
                    <div class="relative h-44 overflow-hidden rounded-2xl mb-4">
                        <img src="${room.image}" alt="${room.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        <div class="absolute top-3 right-3">
                            <select onchange="changeRoomStatus('${room.id}', this.value)" class="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border outline-none cursor-pointer shadow-sm ${
                                room.status === 'available' ? 'bg-emerald-500 text-white border-transparent' : 'bg-amber-500 text-white border-transparent'
                            }">
                                <option value="available" ${room.status === 'available' ? 'selected' : ''}>Available</option>
                                <option value="maintenance" ${room.status === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-bold text-[#0F172A] outfit text-sm leading-tight">${room.name}</h4>
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
                    <button onclick="openEditRoomModal('${room.id}')" class="bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-bold px-3 py-2 rounded-lg hover:bg-slate-100 transition-all">
                        Edit Details
                    </button>
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

    // Edit Room Modal operations
    window.openEditRoomModal = async (id) => {
        activeEditRoomId = id;
        const room = await KaghanDB.getRoomById(id);
        if (!room) return;

        document.getElementById('edit-room-name-lbl').innerText = room.name;
        document.getElementById('edit-room-name').value = room.name;
        document.getElementById('edit-room-type').value = room.type;
        document.getElementById('edit-room-price').value = room.price;
        document.getElementById('edit-room-guests').value = room.maxGuests || 2;
        document.getElementById('edit-room-desc').value = room.description;
        document.getElementById('edit-room-amenities').value = room.amenities.join(', ');

        const modal = document.getElementById('edit-room-modal');
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.firstElementChild.classList.remove('scale-95');
        }, 10);
    };

    window.closeEditRoomModal = () => {
        const modal = document.getElementById('edit-room-modal');
        modal.classList.add('opacity-0');
        modal.firstElementChild.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
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

            const name = document.getElementById('edit-room-name').value.trim();
            const type = document.getElementById('edit-room-type').value;
            const price = parseInt(document.getElementById('edit-room-price').value);
            const maxGuests = parseInt(document.getElementById('edit-room-guests').value);
            const description = document.getElementById('edit-room-desc').value.trim();
            const amenitiesInput = document.getElementById('edit-room-amenities').value.trim();

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
                maxGuests,
                description,
                amenities
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
        });
    }

    // Add new room with Cloudinary uploads
    function setupAddRoomForm() {
        const form = document.getElementById('add-room-form');
        if (!form) return;
        
        window.openAddRoomModal = () => {
            const modal = document.getElementById('add-room-modal');
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modal.firstElementChild.classList.remove('scale-95');
            }, 10);
        };

        window.closeAddRoomModal = () => {
            const modal = document.getElementById('add-room-modal');
            modal.classList.add('opacity-0');
            modal.firstElementChild.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
                form.reset();
            }, 300);
        };

        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('add-room-name').value.trim();
            const type = document.getElementById('add-room-type').value;
            const price = parseInt(document.getElementById('add-room-price').value);
            const description = document.getElementById('add-room-desc').value.trim();
            const amenitiesInput = document.getElementById('add-room-amenities').value.trim();
            const imgInput = document.getElementById('add-room-image');
            
            if (!name || isNaN(price) || price <= 0 || !description) {
                KaghanUI.showToast('Please enter valid room details.', 'error');
                return;
            }

            let imageUrl = imgInput ? imgInput.value.trim() : '';
            if (!imageUrl) {
                imageUrl = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'; // fallback
            }

            const amenities = amenitiesInput
                ? amenitiesInput.split(',').map(a => a.trim()).filter(a => a !== '')
                : ['King Bed', 'High-Speed Wi-Fi', 'Smart TV'];

            const newRoom = {
                id: 'room-' + type + '-' + Date.now(),
                name,
                type,
                price,
                image: imageUrl,
                amenities,
                status: 'available',
                description,
                maxGuests: type === 'presidential' ? 6 : type === 'executive' ? 3 : 2,
                rating: 5.0,
                reviewsCount: 0
            };

            await KaghanDB.addRoom(newRoom);
            KaghanUI.showToast(`Suite "${name}" added to resort inventory!`, 'success');
            
            if (window.AdminDashboardModule) {
                await window.AdminDashboardModule.refreshAll();
            }
            closeAddRoomModal();
        });
    }

    // Export to window
    window.AdminInventoryModule = {
        render: renderRooms,
        initForms: () => {
            setupEditRoomForm();
            setupAddRoomForm();
        }
    };
})();
