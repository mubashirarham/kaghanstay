/**
 * ============================================================
 * Kaghan Stay - Airbnb-Grade Calendar System
 * ============================================================
 * Implements an authentic Airbnb host calendar experience:
 * 1. Multi-Unit Calendars Index with 30-Day Dot Matrix Previews
 * 2. Continuous Vertical Multi-Month Calendar View
 * 3. Daily Pricing & Strikethroughs on Unavailable Dates
 * 4. Interactive Date Selection & Quick-Actions Bottom Sheet
 * 5. Full-Featured Airbnb Pricing & Availability Settings Modal
 * ============================================================
 */

(function () {
    'use strict';

    // State
    let allRooms = [];
    let allBookings = [];
    let activeRoomId = null;
    let selectedDateStr = null;
    let activeSettingsTab = 'pricing';
    let searchQuery = '';

    // Helpers
    function getTodayISO() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function formatShortDate(isoStr) {
        if (!isoStr) return '';
        const parts = isoStr.split('-');
        if (parts.length < 3) return isoStr;
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    }

    function formatMonthTitle(year, monthIndex) {
        const d = new Date(year, monthIndex, 1);
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    function formatPriceDisplay(price) {
        const num = Number(price) || 0;
        if (num >= 1000) {
            return 'PKR ' + (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + 'k';
        }
        return 'PKR ' + num.toLocaleString();
    }

    function getRoomTypeBadge(type) {
        const map = {
            'studio': 'Studio Suite',
            '1bed': '1 Bed Apartment',
            '2bed': '2 Bed Apartment',
            '3bed': '3 Bed Apartment',
            '4bed': '4 Bed Luxury',
            '5marla': '5 Marla House',
            '10marla': '10 Marla House',
            '1kanal': '1 Kanal Villa',
            'farmhouse': 'Farmhouse Estate'
        };
        return map[type] || (type ? type.toUpperCase() : 'Suite');
    }

    /**
     * Compute 30-day dot matrix preview for a listing
     * 30 days starting from today:
     * - 'today': Red/Pink dot
     * - 'booked': Dark/Black dot
     * - 'blocked': Dark/Black dot
     * - 'available': Gray dot
     */
    function compute30DayDotMatrix(room, bookings) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const todayISO = getTodayISO();

        const roomBookedDates = new Set();
        (bookings || []).forEach(b => {
            if (b.roomId === room.id && b.status !== 'cancelled') {
                const checkIn = new Date(b.checkIn);
                const checkOut = new Date(b.checkOut);
                for (let cur = new Date(checkIn); cur < checkOut; cur.setDate(cur.getDate() + 1)) {
                    const iso = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0') + '-' + String(cur.getDate()).padStart(2, '0');
                    roomBookedDates.add(iso);
                }
            }
        });

        const blockedDatesSet = new Set(room.blockedDates || []);
        const airbnbBlockedSet = new Set(room.airbnbBlockedDates || []);

        const dots = [];
        for (let i = 0; i < 30; i++) {
            const curDate = new Date(today);
            curDate.setDate(today.getDate() + i);
            const iso = curDate.getFullYear() + '-' + String(curDate.getMonth() + 1).padStart(2, '0') + '-' + String(curDate.getDate()).padStart(2, '0');

            const isToday = iso === todayISO;
            const isBooked = roomBookedDates.has(iso);
            const isBlocked = blockedDatesSet.has(iso) || airbnbBlockedSet.has(iso);

            let type = 'available';
            if (isToday) {
                type = 'today';
            } else if (isBooked || isBlocked) {
                type = 'booked';
            }

            dots.push({ iso, type });
        }
        return dots;
    }

    /**
     * Render the Multi-Unit Calendars Index
     */
    async function renderCalendarsIndex() {
        const container = document.getElementById('airbnb-calendars-list');
        if (!container) return;

        allRooms = await KaghanDB.getRooms();
        allBookings = await KaghanDB.getBookings();

        let filtered = allRooms;
        if (searchQuery) {
            const q = searchQuery.toLowerCase().trim();
            filtered = allRooms.filter(r => 
                (r.name && r.name.toLowerCase().includes(q)) ||
                (r.location && r.location.toLowerCase().includes(q)) ||
                (r.type && r.type.toLowerCase().includes(q))
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="text-center py-16 bg-white rounded-3xl border border-slate-100 p-8 shadow-xs">
                    <div class="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-2xl mx-auto mb-4">
                        <i class="fa-solid fa-calendar-xmark"></i>
                    </div>
                    <h3 class="font-bold text-slate-800 text-base">No listings found</h3>
                    <p class="text-xs text-slate-400 mt-1">Try adjusting your search criteria.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(room => {
            const dots = compute30DayDotMatrix(room, allBookings);
            const typeLabel = getRoomTypeBadge(room.type);
            const imageSrc = room.image || (room.images && room.images.length ? room.images[0] : '../assets/images/logo.png');
            const isMaintenance = room.status === 'maintenance';

            return `
                <div onclick="window.AirbnbCalendarSystem.openListing('${room.id}')" class="bg-white border border-slate-100 hover:border-slate-300 rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                    <!-- Left: Listing Thumbnail & Info -->
                    <div class="flex items-center gap-3.5 min-w-0">
                        <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-100 shrink-0 relative border border-slate-100">
                            <img src="${KaghanSafe.escapeHTML(imageSrc)}" alt="${KaghanSafe.escapeHTML(room.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                        </div>
                        <div class="min-w-0">
                            <h3 class="font-bold text-slate-900 outfit text-sm sm:text-base truncate leading-snug group-hover:text-[#D4AF37] transition-colors">
                                ${KaghanSafe.escapeHTML(room.name)}
                            </h3>
                            <p class="text-xs text-slate-500 font-medium truncate mt-0.5">
                                ${KaghanSafe.escapeHTML(typeLabel)} &bull; ${KaghanSafe.escapeHTML(room.location || 'Islamabad')}
                            </p>
                            <div class="flex items-center gap-2 mt-2">
                                <span class="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${isMaintenance ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'}">
                                    ${isMaintenance ? 'Maintenance' : 'Listed'}
                                </span>
                                <span class="text-xs font-bold text-slate-900">
                                    ${formatPriceDisplay(room.price)} <span class="text-[10px] text-slate-400 font-normal">/ night</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Right: 30-Day Dot Matrix Availability Grid -->
                    <div class="flex flex-col items-end shrink-0 sm:pr-2">
                        <div class="text-[9px] uppercase font-bold tracking-widest text-slate-400 mb-1.5 hidden sm:block">30-Day Outlook</div>
                        <div class="grid grid-cols-10 sm:grid-cols-10 gap-1.5 p-2.5 bg-slate-50/90 rounded-2xl border border-slate-100">
                            ${dots.map(d => {
                                let dotClass = 'w-2 h-2 rounded-full transition-all';
                                if (d.type === 'today') {
                                    dotClass += ' bg-[#FF385C] scale-125 ring-2 ring-rose-300';
                                } else if (d.type === 'booked') {
                                    dotClass += ' bg-slate-900';
                                } else {
                                    dotClass += ' bg-slate-300';
                                }
                                return `<span class="${dotClass}" title="${d.iso} (${d.type})"></span>`;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Open Single Listing Calendar
     */
    async function openListing(roomId) {
        activeRoomId = roomId;
        selectedDateStr = null;

        allRooms = await KaghanDB.getRooms();
        allBookings = await KaghanDB.getBookings();

        const room = allRooms.find(r => r.id === roomId);
        if (!room) {
            KaghanUI.showToast('Listing not found', 'error');
            return;
        }

        // Show Listing View, Hide Index View
        const indexView = document.getElementById('airbnb-calendars-index-view');
        const listingView = document.getElementById('airbnb-single-calendar-view');
        if (indexView) indexView.classList.add('hidden');
        if (listingView) listingView.classList.remove('hidden');

        // Update Title & Header info
        const titleEl = document.getElementById('airbnb-calendar-room-title');
        const subtitleEl = document.getElementById('airbnb-calendar-room-subtitle');
        if (titleEl) titleEl.textContent = room.name || 'Suite Calendar';
        if (subtitleEl) subtitleEl.textContent = `${getRoomTypeBadge(room.type)} • Base: ${formatPriceDisplay(room.price)} / night`;

        renderListingCalendar(room, allBookings);
        closeQuickSheet();
    }

    /**
     * Return back to Multi-Unit Index View
     */
    function closeListing() {
        activeRoomId = null;
        selectedDateStr = null;
        closeQuickSheet();

        const indexView = document.getElementById('airbnb-calendars-index-view');
        const listingView = document.getElementById('airbnb-single-calendar-view');
        if (listingView) listingView.classList.add('hidden');
        if (indexView) indexView.classList.remove('hidden');

        renderCalendarsIndex();
    }

    /**
     * Render the Multi-Month Continuous Vertical Calendar
     */
    function renderListingCalendar(room, bookings) {
        const container = document.getElementById('airbnb-months-scroll-container');
        if (!container) return;

        const today = new Date();
        today.setHours(0,0,0,0);
        const todayISO = getTodayISO();

        // Build Booking and Blocked Sets
        const directBookingMap = new Map();
        (bookings || []).forEach(b => {
            if (b.roomId === room.id && b.status !== 'cancelled') {
                const checkIn = new Date(b.checkIn);
                const checkOut = new Date(b.checkOut);
                for (let cur = new Date(checkIn); cur < checkOut; cur.setDate(cur.getDate() + 1)) {
                    const iso = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0') + '-' + String(cur.getDate()).padStart(2, '0');
                    directBookingMap.set(iso, b);
                }
            }
        });

        const blockedDatesSet = new Set(room.blockedDates || []);
        const airbnbBlockedSet = new Set(room.airbnbBlockedDates || []);
        const customPrices = room.customPrices || {};
        const dateNotes = room.dateNotes || {};
        const basePrice = Number(room.price) || 0;
        const weekendPrice = Number(room.weekendPrice) || basePrice;

        let html = '';

        // Generate 6 Consecutive Months
        for (let m = 0; m < 6; m++) {
            const monthDate = new Date(today.getFullYear(), today.getMonth() + m, 1);
            const year = monthDate.getFullYear();
            const monthIndex = monthDate.getMonth();
            const monthTitle = formatMonthTitle(year, monthIndex);
            const firstDayIndex = new Date(year, monthIndex, 1).getDay();
            const totalDays = new Date(year, monthIndex + 1, 0).getDate();

            html += `
                <div class="mb-10 airbnb-month-block" data-month="${monthIndex}" data-year="${year}">
                    <h2 class="text-xl sm:text-2xl font-black outfit text-slate-900 mb-4 px-1">${monthTitle}</h2>
                    <div class="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
            `;

            // Empty Leading Cells
            for (let e = 0; e < firstDayIndex; e++) {
                html += `<div class="min-h-[64px] sm:min-h-[72px] pointer-events-none"></div>`;
            }

            // Days of the month
            for (let d = 1; d <= totalDays; d++) {
                const curDate = new Date(year, monthIndex, d);
                curDate.setHours(0,0,0,0);
                const isoStr = curDate.getFullYear() + '-' + String(curDate.getMonth() + 1).padStart(2, '0') + '-' + String(curDate.getDate()).padStart(2, '0');

                const isPast = curDate < today;
                const isToday = isoStr === todayISO;
                const isSelected = isoStr === selectedDateStr;
                const isDirectBooked = directBookingMap.has(isoStr);
                const isAirbnb = airbnbBlockedSet.has(isoStr);
                const isAdminBlocked = blockedDatesSet.has(isoStr);
                const isBlocked = isPast || isDirectBooked || isAirbnb || isAdminBlocked;

                // Price calculation (Custom override > Weekend > Base)
                const isWeekend = (curDate.getDay() === 5 || curDate.getDay() === 6); // Friday / Saturday
                let dayPrice = basePrice;
                if (customPrices[isoStr]) {
                    dayPrice = Number(customPrices[isoStr]);
                } else if (isWeekend && weekendPrice) {
                    dayPrice = weekendPrice;
                }

                const priceStr = formatPriceDisplay(dayPrice);
                const hasNote = dateNotes[isoStr];

                // Tile Class
                let tileClass = "airbnb-day-tile rounded-2xl p-1.5 sm:p-2 min-h-[66px] sm:min-h-[76px] flex flex-col justify-between items-center transition-all cursor-pointer select-none border relative ";
                
                if (isSelected) {
                    tileClass += "bg-[#181818] text-white border-slate-900 shadow-lg scale-[1.02] z-20 ";
                } else if (isPast) {
                    tileClass += "bg-slate-100/50 text-slate-300 border-transparent cursor-not-allowed ";
                } else if (isDirectBooked) {
                    tileClass += "bg-blue-50/70 text-blue-900 border-blue-200/60 hover:border-blue-400 ";
                } else if (isAirbnb) {
                    tileClass += "bg-amber-50/70 text-amber-900 border-amber-200/60 hover:border-amber-400 ";
                } else if (isAdminBlocked) {
                    tileClass += "bg-rose-50/70 text-rose-900 border-rose-200/60 hover:border-rose-400 ";
                } else {
                    tileClass += "bg-white text-slate-800 border-slate-100 hover:border-slate-300 hover:shadow-xs ";
                }

                // Number styling
                let numDisplay = `${d}`;
                if (isToday) {
                    numDisplay = `<span class="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#FF385C] text-white flex items-center justify-center font-black text-xs shadow-xs">${d}</span>`;
                } else if (isBlocked && !isSelected) {
                    numDisplay = `<span class="line-through font-bold ${isPast ? 'text-slate-300' : 'text-slate-500'}">${d}</span>`;
                } else {
                    numDisplay = `<span class="font-bold ${isSelected ? 'text-white' : 'text-slate-800'} text-sm">${d}</span>`;
                }

                // Subtitle (Price / Status badge)
                let subContent = '';
                if (isSelected) {
                    subContent = `<span class="text-[10px] sm:text-xs font-black text-white truncate max-w-full">${priceStr}</span>`;
                } else if (isDirectBooked) {
                    subContent = `<span class="text-[9px] font-bold text-blue-600 truncate max-w-full"><i class="fa-solid fa-circle-check text-[8px]"></i> Booked</span>`;
                } else if (isAirbnb) {
                    subContent = `<span class="text-[9px] font-bold text-amber-600 truncate max-w-full"><i class="fa-brands fa-airbnb text-[8px]"></i> Synced</span>`;
                } else if (isAdminBlocked) {
                    subContent = `<span class="text-[9px] font-bold text-rose-500 truncate max-w-full">Blocked</span>`;
                } else {
                    subContent = `<span class="text-[10px] sm:text-xs font-semibold ${isPast ? 'text-slate-300' : 'text-slate-500'} truncate max-w-full">${priceStr}</span>`;
                }

                const clickHandler = `onclick="window.AirbnbCalendarSystem.handleDateSelect('${isoStr}')"`;

                html += `
                    <div class="${tileClass}" id="tile-${isoStr}" ${clickHandler} title="${isoStr}">
                        <div class="flex items-center justify-center w-full">
                            ${numDisplay}
                        </div>
                        ${hasNote ? `<span class="w-1.5 h-1.5 rounded-full bg-amber-500 absolute top-1.5 right-1.5" title="Note: ${KaghanSafe.escapeHTML(hasNote)}"></span>` : ''}
                        <div class="w-full text-center mt-1">
                            ${subContent}
                        </div>
                    </div>
                `;
            }

            html += `</div></div>`;
        }

        container.innerHTML = html;
    }

    /**
     * Handle Date Selection & Open Quick Actions Bottom Sheet (Media 2)
     */
    function handleDateSelect(isoStr) {
        const room = allRooms.find(r => r.id === activeRoomId);
        if (!room) return;

        selectedDateStr = isoStr;

        // Re-render calendar so selected tile highlights in solid black
        renderListingCalendar(room, allBookings);

        const sheet = document.getElementById('airbnb-date-quick-sheet');
        if (!sheet) return;

        const datePill = document.getElementById('airbnb-sheet-date-pill');
        const statusLabel = document.getElementById('airbnb-sheet-status-label');
        const statusDot = document.getElementById('airbnb-sheet-status-dot');
        const noteBtn = document.getElementById('airbnb-sheet-note-btn');
        const priceDisplay = document.getElementById('airbnb-sheet-price-display');
        const toggleBlockedBtn = document.getElementById('airbnb-sheet-btn-block');
        const toggleAvailableBtn = document.getElementById('airbnb-sheet-btn-avail');

        if (datePill) datePill.textContent = formatShortDate(isoStr);

        const directBookingMap = new Map();
        (allBookings || []).forEach(b => {
            if (b.roomId === room.id && b.status !== 'cancelled') {
                const checkIn = new Date(b.checkIn);
                const checkOut = new Date(b.checkOut);
                for (let cur = new Date(checkIn); cur < checkOut; cur.setDate(cur.getDate() + 1)) {
                    const iso = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0') + '-' + String(cur.getDate()).padStart(2, '0');
                    directBookingMap.set(iso, b);
                }
            }
        });

        const blockedDatesSet = new Set(room.blockedDates || []);
        const airbnbBlockedSet = new Set(room.airbnbBlockedDates || []);
        const customPrices = room.customPrices || {};
        const dateNotes = room.dateNotes || {};

        const isDirect = directBookingMap.has(isoStr);
        const isAirbnb = airbnbBlockedSet.has(isoStr);
        const isAdminBlocked = blockedDatesSet.has(isoStr);
        const isBlocked = isDirect || isAirbnb || isAdminBlocked;

        // Status & Toggle update
        if (isDirect) {
            const b = directBookingMap.get(isoStr);
            if (statusLabel) statusLabel.textContent = `Direct Booking #${b.id || ''}`;
            if (statusDot) statusDot.className = 'w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0';
        } else if (isAirbnb) {
            if (statusLabel) statusLabel.textContent = 'Airbnb / OTA Synced';
            if (statusDot) statusDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0';
        } else if (isAdminBlocked) {
            if (statusLabel) statusLabel.textContent = 'Blocked by you';
            if (statusDot) statusDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0';
        } else {
            if (statusLabel) statusLabel.textContent = 'Available for booking';
            if (statusDot) statusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0';
        }

        // Toggle Buttons Segmented State
        if (toggleBlockedBtn && toggleAvailableBtn) {
            if (isAdminBlocked || isBlocked) {
                toggleBlockedBtn.className = 'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all bg-white text-slate-950 shadow-sm';
                toggleAvailableBtn.className = 'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all text-slate-400 hover:text-white';
            } else {
                toggleBlockedBtn.className = 'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all text-slate-400 hover:text-white';
                toggleAvailableBtn.className = 'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all bg-white text-slate-950 shadow-sm';
            }
        }

        // Note state
        const note = dateNotes[isoStr] || '';
        if (noteBtn) {
            noteBtn.innerHTML = note ? `<i class="fa-solid fa-pen text-[10px]"></i> Note: "${KaghanSafe.escapeHTML(note)}"` : `<i class="fa-solid fa-plus text-[10px]"></i> Add a note`;
        }

        // Price display
        const curDate = new Date(isoStr);
        const isWeekend = (curDate.getDay() === 5 || curDate.getDay() === 6);
        const basePrice = Number(room.price) || 0;
        const weekendPrice = Number(room.weekendPrice) || basePrice;
        let dayPrice = customPrices[isoStr] || (isWeekend && weekendPrice ? weekendPrice : basePrice);

        if (priceDisplay) {
            priceDisplay.textContent = 'PKR ' + Number(dayPrice).toLocaleString();
        }

        // Show sheet with slide up animation
        sheet.classList.remove('hidden', 'translate-y-full');
        sheet.classList.add('translate-y-0');
    }

    /**
     * Close Date Quick Sheet
     */
    function closeQuickSheet() {
        selectedDateStr = null;
        const sheet = document.getElementById('airbnb-date-quick-sheet');
        if (sheet) {
            sheet.classList.add('translate-y-full');
            setTimeout(() => sheet.classList.add('hidden'), 200);
        }
        const room = allRooms.find(r => r.id === activeRoomId);
        if (room) renderListingCalendar(room, allBookings);
    }

    /**
     * Toggle Block State for currently selected date
     */
    async function toggleCurrentDateBlock(setBlocked) {
        if (!activeRoomId || !selectedDateStr) return;

        const room = allRooms.find(r => r.id === activeRoomId);
        if (!room) return;

        const blockedSet = new Set(room.blockedDates || []);
        if (setBlocked) {
            blockedSet.add(selectedDateStr);
        } else {
            blockedSet.delete(selectedDateStr);
        }

        const newBlockedArray = Array.from(blockedSet);
        room.blockedDates = newBlockedArray;

        const success = await KaghanDB.updateRoom(activeRoomId, {
            blockedDates: newBlockedArray
        });

        if (success) {
            KaghanUI.showToast(setBlocked ? `Date ${formatShortDate(selectedDateStr)} blocked!` : `Date ${formatShortDate(selectedDateStr)} set to available!`, 'success');
            handleDateSelect(selectedDateStr);
        } else {
            KaghanUI.showToast('Failed to update date availability.', 'error');
        }
    }

    /**
     * Add / Edit Note for selected date
     */
    async function editCurrentDateNote() {
        if (!activeRoomId || !selectedDateStr) return;
        const room = allRooms.find(r => r.id === activeRoomId);
        if (!room) return;

        const currentNote = (room.dateNotes && room.dateNotes[selectedDateStr]) || '';
        const newNote = prompt(`Note for ${formatShortDate(selectedDateStr)} (e.g. VIP Stay, Maintenance, Event):`, currentNote);
        if (newNote === null) return;

        if (!room.dateNotes) room.dateNotes = {};
        if (newNote.trim()) {
            room.dateNotes[selectedDateStr] = newNote.trim();
        } else {
            delete room.dateNotes[selectedDateStr];
        }

        await KaghanDB.updateRoom(activeRoomId, { dateNotes: room.dateNotes });
        KaghanUI.showToast('Calendar note saved!', 'success');
        handleDateSelect(selectedDateStr);
    }

    /**
     * Edit Price for selected date
     */
    async function editCurrentDatePrice() {
        if (!activeRoomId || !selectedDateStr) return;
        const room = allRooms.find(r => r.id === activeRoomId);
        if (!room) return;

        const currentPrice = (room.customPrices && room.customPrices[selectedDateStr]) || room.price || 0;
        const newPriceStr = prompt(`Custom rate for ${formatShortDate(selectedDateStr)} in PKR (Default: ${room.price}):`, currentPrice);
        if (newPriceStr === null) return;

        const newPrice = Number(newPriceStr);
        if (isNaN(newPrice) || newPrice < 0) {
            KaghanUI.showToast('Please enter a valid price.', 'warning');
            return;
        }

        if (!room.customPrices) room.customPrices = {};
        if (newPrice > 0) {
            room.customPrices[selectedDateStr] = newPrice;
        } else {
            delete room.customPrices[selectedDateStr];
        }

        await KaghanDB.updateRoom(activeRoomId, { customPrices: room.customPrices });
        KaghanUI.showToast(`Custom rate PKR ${newPrice.toLocaleString()} saved for ${formatShortDate(selectedDateStr)}!`, 'success');
        handleDateSelect(selectedDateStr);
    }

    /**
     * Open Airbnb Pricing & Availability Settings Modal (Media 1)
     */
    function openSettingsModal(tab = 'pricing') {
        const room = allRooms.find(r => r.id === activeRoomId);
        if (!room) {
            KaghanUI.showToast('Please select a suite first.', 'info');
            return;
        }

        activeSettingsTab = tab;
        const modal = document.getElementById('airbnb-settings-modal');
        if (!modal) return;

        // Populate fields
        const basePriceInput = document.getElementById('airbnb-setting-base-price');
        const weekendPriceInput = document.getElementById('airbnb-setting-weekend-price');
        const smartPricingToggle = document.getElementById('airbnb-setting-smart-pricing');
        const cleaningFeeInput = document.getElementById('airbnb-setting-cleaning-fee');
        const extraGuestFeeInput = document.getElementById('airbnb-setting-extra-guest-fee');
        const weeklyDiscountInput = document.getElementById('airbnb-setting-weekly-discount');
        const monthlyDiscountInput = document.getElementById('airbnb-setting-monthly-discount');
        const minStayInput = document.getElementById('airbnb-setting-min-stay');
        const maxStayInput = document.getElementById('airbnb-setting-max-stay');
        const icalInput = document.getElementById('airbnb-setting-airbnb-ical');
        const icalExportLabel = document.getElementById('airbnb-setting-export-url');

        if (basePriceInput) basePriceInput.value = room.price || '';
        if (weekendPriceInput) weekendPriceInput.value = room.weekendPrice || '';
        if (smartPricingToggle) smartPricingToggle.checked = !!room.smartPricingEnabled;
        if (cleaningFeeInput) cleaningFeeInput.value = room.cleaningFee || '';
        if (extraGuestFeeInput) extraGuestFeeInput.value = room.extraGuestFee || '';
        if (weeklyDiscountInput) weeklyDiscountInput.value = room.weeklyDiscount || 10;
        if (monthlyDiscountInput) monthlyDiscountInput.value = room.monthlyDiscount || 20;
        if (minStayInput) minStayInput.value = room.minStay || 1;
        if (maxStayInput) maxStayInput.value = room.maxStay || 30;
        if (icalInput) icalInput.value = room.airbnbIcal || '';
        if (icalExportLabel) {
            icalExportLabel.textContent = `${window.location.origin}/.netlify/functions/ical-export?roomId=${room.id}`;
        }

        switchSettingsTab(tab);

        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('.bg-white')?.classList.remove('scale-95');
            modal.querySelector('.bg-white')?.classList.add('scale-100');
        }, 10);
    }

    /**
     * Switch Settings Modal Tabs
     */
    function switchSettingsTab(tabName) {
        activeSettingsTab = tabName;
        const tabs = ['pricing', 'discounts', 'availability', 'cancellations'];

        tabs.forEach(t => {
            const tabBtn = document.getElementById(`airbnb-tab-btn-${t}`);
            const tabContent = document.getElementById(`airbnb-tab-content-${t}`);

            if (tabBtn) {
                if (t === tabName) {
                    tabBtn.className = 'px-4 py-2 rounded-full text-xs font-bold bg-[#0F172A] text-white shadow-sm transition-all';
                } else {
                    tabBtn.className = 'px-4 py-2 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all';
                }
            }

            if (tabContent) {
                if (t === tabName) {
                    tabContent.classList.remove('hidden');
                } else {
                    tabContent.classList.add('hidden');
                }
            }
        });
    }

    /**
     * Close Settings Modal
     */
    function closeSettingsModal() {
        const modal = document.getElementById('airbnb-settings-modal');
        if (!modal) return;

        modal.classList.add('opacity-0');
        modal.querySelector('.bg-white')?.classList.remove('scale-100');
        modal.querySelector('.bg-white')?.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 250);
    }

    /**
     * Save Settings Form
     */
    async function saveSettings(event) {
        if (event) event.preventDefault();
        if (!activeRoomId) return;

        const room = allRooms.find(r => r.id === activeRoomId);
        if (!room) return;

        const basePrice = Number(document.getElementById('airbnb-setting-base-price')?.value) || room.price;
        const weekendPrice = Number(document.getElementById('airbnb-setting-weekend-price')?.value) || 0;
        const smartPricingEnabled = document.getElementById('airbnb-setting-smart-pricing')?.checked || false;
        const cleaningFee = Number(document.getElementById('airbnb-setting-cleaning-fee')?.value) || 0;
        const extraGuestFee = Number(document.getElementById('airbnb-setting-extra-guest-fee')?.value) || 0;
        const weeklyDiscount = Number(document.getElementById('airbnb-setting-weekly-discount')?.value) || 0;
        const monthlyDiscount = Number(document.getElementById('airbnb-setting-monthly-discount')?.value) || 0;
        const minStay = Number(document.getElementById('airbnb-setting-min-stay')?.value) || 1;
        const maxStay = Number(document.getElementById('airbnb-setting-max-stay')?.value) || 30;
        const airbnbIcal = document.getElementById('airbnb-setting-airbnb-ical')?.value || '';

        const updates = {
            price: basePrice,
            weekendPrice,
            smartPricingEnabled,
            cleaningFee,
            extraGuestFee,
            weeklyDiscount,
            monthlyDiscount,
            minStay,
            maxStay,
            airbnbIcal
        };

        const success = await KaghanDB.updateRoom(activeRoomId, updates);
        if (success) {
            Object.assign(room, updates);
            KaghanUI.showToast('Listing pricing and availability settings saved!', 'success');
            closeSettingsModal();
            renderListingCalendar(room, allBookings);
        } else {
            KaghanUI.showToast('Failed to save listing settings.', 'error');
        }
    }

    /**
     * Sync Active Room Airbnb iCal
     */
    async function syncActiveListingAirbnb() {
        if (!activeRoomId) return;
        const room = allRooms.find(r => r.id === activeRoomId);
        if (!room) return;

        const icalUrl = document.getElementById('airbnb-setting-airbnb-ical')?.value || room.airbnbIcal;
        if (!icalUrl) {
            KaghanUI.showToast('Please paste your Airbnb iCal link first.', 'warning');
            return;
        }

        KaghanUI.showToast('Synchronizing with Airbnb...', 'info');

        try {
            const resp = await fetch('/.netlify/functions/ical-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId: activeRoomId, icalUrl })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                KaghanUI.showToast(`Airbnb Sync Complete: ${data.blockedDatesCount || 0} date(s) locked.`, 'success');
                allRooms = await KaghanDB.getRooms();
                const updatedRoom = allRooms.find(r => r.id === activeRoomId);
                if (updatedRoom) renderListingCalendar(updatedRoom, allBookings);
            } else {
                KaghanUI.showToast(data.error || 'Failed to sync with Airbnb.', 'error');
            }
        } catch (err) {
            KaghanUI.showToast('Network error during Airbnb sync.', 'error');
        }
    }

    /**
     * Scroll smoothly to top / today in calendar
     */
    function scrollToTop() {
        const container = document.getElementById('airbnb-months-scroll-container');
        if (container) {
            container.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    /**
     * Search filter for multi-unit index
     */
    function onSearchInput(val) {
        searchQuery = val;
        renderCalendarsIndex();
    }

    // Export public module
    window.AirbnbCalendarSystem = {
        init: () => {
            renderCalendarsIndex();
        },
        render: renderCalendarsIndex,
        openListing: openListing,
        closeListing: closeListing,
        handleDateSelect: handleDateSelect,
        closeQuickSheet: closeQuickSheet,
        toggleCurrentDateBlock: toggleCurrentDateBlock,
        editCurrentDateNote: editCurrentDateNote,
        editCurrentDatePrice: editCurrentDatePrice,
        openSettingsModal: openSettingsModal,
        closeSettingsModal: closeSettingsModal,
        switchSettingsTab: switchSettingsTab,
        saveSettings: saveSettings,
        syncActiveListingAirbnb: syncActiveListingAirbnb,
        scrollToTop: scrollToTop,
        onSearchInput: onSearchInput
    };

})();
