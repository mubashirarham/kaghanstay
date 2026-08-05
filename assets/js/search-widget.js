// Kaghan Stay - Search & Calendar Widget Module (Airbnb UX Style)
// Reusable date range picker calendar & guest stepper overlay

(function() {
    'use strict';

    let currentCheckIn = null;
    let currentCheckOut = null;
    let activeMonthIndex = 0; // Offset from current month
    let selectedAdults = 2;
    let selectedChildren = 0;
    let selectedInfants = 0;

    // Helper: format YYYY-MM-DD
    function formatDateIso(dateObj) {
        if (!dateObj) return '';
        if (window.KaghanDB && typeof KaghanDB.formatLocalDate === 'function') {
            return KaghanDB.formatLocalDate(dateObj);
        }
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // Helper: format display "MMM DD"
    function formatDateDisplay(dateObj) {
        if (!dateObj) return '';
        return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    window.KaghanSearchWidget = {
        init: function(options = {}) {
            this.targetCheckInId = options.checkInId || 'search-check-in';
            this.targetCheckOutId = options.checkOutId || 'search-check-out';
            this.targetGuestsId = options.guestsId || 'search-guests';
            
            this.setupCalendarModalDOM();
            this.setupHeroSearchDOM();
        },

        setupHeroSearchDOM: function() {
            const checkInInput = document.getElementById(this.targetCheckInId);
            const checkOutInput = document.getElementById(this.targetCheckOutId);
            const guestsSelect = document.getElementById(this.targetGuestsId);

            if (!checkInInput || !checkOutInput) return;

            const parseDate = (val) => window.KaghanDB && typeof KaghanDB.parseLocalDate === 'function' ? KaghanDB.parseLocalDate(val) : new Date(val);

            // Set initial values if present
            if (checkInInput.value) currentCheckIn = parseDate(checkInInput.value);
            if (checkOutInput.value) currentCheckOut = parseDate(checkOutInput.value);

            // Listen for changes
            checkInInput.addEventListener('change', () => {
                if (checkInInput.value) currentCheckIn = parseDate(checkInInput.value);
                this.updateTriggerLabels();
            });
            checkOutInput.addEventListener('change', () => {
                if (checkOutInput.value) currentCheckOut = parseDate(checkOutInput.value);
                this.updateTriggerLabels();
            });

            this.updateTriggerLabels();
            this.highlightActivePreset();
        },

        toggleGuestStepperPopover: function() {
            const popover = document.getElementById('guest-stepper-popover');
            if (popover) {
                popover.classList.toggle('hidden');
            }
        },

        setGuests: function(adults = 2, children = 0, infants = 0) {
            selectedAdults = Math.max(1, Math.min(10, parseInt(adults, 10) || 1));
            selectedChildren = Math.max(0, Math.min(6, parseInt(children, 10) || 0));
            selectedInfants = Math.max(0, Math.min(5, parseInt(infants, 10) || 0));

            const adultsEl = document.getElementById('stepper-adults-count');
            if (adultsEl) adultsEl.textContent = selectedAdults;

            const childrenEl = document.getElementById('stepper-children-count');
            if (childrenEl) childrenEl.textContent = selectedChildren;

            const infantsEl = document.getElementById('stepper-infants-count');
            if (infantsEl) infantsEl.textContent = selectedInfants;

            this.updateTriggerLabels();
            this.highlightActivePreset();
        },

        setGuestPreset: function(adults = 2, children = 0, infants = 0) {
            this.setGuests(adults, children, infants);
        },

        highlightActivePreset: function() {
            const popover = document.getElementById('guest-stepper-popover');
            if (!popover) return;
            const buttons = popover.querySelectorAll('.preset-btn');
            buttons.forEach(btn => {
                const a = parseInt(btn.getAttribute('data-adults'), 10);
                const c = parseInt(btn.getAttribute('data-children'), 10);
                const i = parseInt(btn.getAttribute('data-infants') || '0', 10);
                if (a === selectedAdults && c === selectedChildren && i === selectedInfants) {
                    btn.classList.add('bg-[#C5A059]', 'text-white', 'border-[#C5A059]');
                    btn.classList.remove('bg-white/5');
                } else {
                    btn.classList.remove('bg-[#C5A059]', 'text-white', 'border-[#C5A059]');
                    btn.classList.add('bg-white/5');
                }
            });
        },

        changeGuests: function(type, delta) {
            if (type === 'adults') {
                selectedAdults = Math.max(1, Math.min(10, selectedAdults + delta));
                const el = document.getElementById('stepper-adults-count');
                if (el) el.textContent = selectedAdults;
            } else if (type === 'children') {
                selectedChildren = Math.max(0, Math.min(6, selectedChildren + delta));
                const el = document.getElementById('stepper-children-count');
                if (el) el.textContent = selectedChildren;
            } else if (type === 'infants') {
                selectedInfants = Math.max(0, Math.min(5, selectedInfants + delta));
                const el = document.getElementById('stepper-infants-count');
                if (el) el.textContent = selectedInfants;
            }
            this.updateTriggerLabels();
            this.highlightActivePreset();
        },

        updateTriggerLabels: function() {
            const checkInInput = document.getElementById(this.targetCheckInId);
            const checkOutInput = document.getElementById(this.targetCheckOutId);
            const guestsInput = document.getElementById(this.targetGuestsId);

            if (checkInInput && currentCheckIn) {
                checkInInput.value = formatDateIso(currentCheckIn);
            }
            if (checkOutInput && currentCheckOut) {
                checkOutInput.value = formatDateIso(currentCheckOut);
            }

            const triggerText = document.getElementById('search-date-trigger-text');
            if (triggerText) {
                if (currentCheckIn && currentCheckOut) {
                    const diffTime = Math.abs(currentCheckOut - currentCheckIn);
                    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    triggerText.textContent = `${formatDateDisplay(currentCheckIn)} – ${formatDateDisplay(currentCheckOut)} (${nights} night${nights > 1 ? 's' : ''})`;
                } else if (currentCheckIn) {
                    triggerText.textContent = `${formatDateDisplay(currentCheckIn)} – Select Checkout`;
                } else {
                    triggerText.textContent = 'Add dates';
                }
            }

            const guestText = document.getElementById('search-guest-trigger-text');
            if (guestText) {
                const total = selectedAdults + selectedChildren;
                let text = `${total} guest${total > 1 ? 's' : ''}`;
                if (selectedInfants > 0) {
                    text += `, ${selectedInfants} infant${selectedInfants > 1 ? 's' : ''}`;
                }
                guestText.textContent = text;
            }

            if (guestsInput) guestsInput.value = String(selectedAdults + selectedChildren);
        },

        setupCalendarModalDOM: function() {
            let overlay = document.getElementById('kph-calendar-overlay');
            if (overlay) return overlay;

            if (!document.body) return null;

            overlay = document.createElement('div');
            overlay.id = 'kph-calendar-overlay';
            overlay.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; background-color: rgba(15, 23, 42, 0.85) !important; backdrop-filter: blur(8px) !important; -webkit-backdrop-filter: blur(8px) !important; z-index: 99999999 !important; display: none; align-items: center; justify-content: center; padding: 1rem !important; overflow-y: auto !important;';
            
            overlay.innerHTML = `
                <div class="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <!-- Header -->
                    <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <div class="flex items-center gap-4">
                            <h3 class="font-bold text-lg text-slate-900 outfit">Select Stay Dates</h3>
                            <!-- Flexible dates selector -->
                            <div class="hidden sm:flex items-center gap-1 bg-slate-200/70 p-1 rounded-full text-xs font-semibold">
                                <button type="button" class="px-3 py-1 rounded-full bg-white text-slate-900 shadow-sm flex-dates-btn" data-flex="exact">Exact dates</button>
                                <button type="button" class="px-3 py-1 rounded-full text-slate-600 hover:text-slate-900 flex-dates-btn" data-flex="1">± 1 day</button>
                                <button type="button" class="px-3 py-1 rounded-full text-slate-600 hover:text-slate-900 flex-dates-btn" data-flex="3">± 3 days</button>
                            </div>
                        </div>
                        <button type="button" id="close-calendar-modal" class="w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700 transition-colors">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <!-- Calendar Body (2 Months Side by Side) -->
                    <div class="p-6 overflow-y-auto flex-grow">
                        <div class="flex justify-between items-center mb-6">
                            <button type="button" onclick="KaghanSearchWidget.prevMonth()" id="prev-month-btn" class="px-4 py-2 border border-slate-300 rounded-full hover:bg-slate-100 text-sm font-semibold flex items-center gap-2 cursor-pointer">
                                <i class="fa-solid fa-chevron-left text-xs"></i> Prev
                            </button>
                            <span id="calendar-month-heading" class="font-bold text-slate-800 text-base"></span>
                            <button type="button" onclick="KaghanSearchWidget.nextMonth()" id="next-month-btn" class="px-4 py-2 border border-slate-300 rounded-full hover:bg-slate-100 text-sm font-semibold flex items-center gap-2 cursor-pointer">
                                Next <i class="fa-solid fa-chevron-right text-xs"></i>
                            </button>
                        </div>

                        <div id="calendar-months-container" class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <!-- Dynamically populated month grids -->
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                        <button type="button" id="clear-dates-btn" class="text-sm font-semibold text-slate-600 hover:text-slate-900 underline">Clear dates</button>
                        <div class="flex items-center gap-3">
                            <span id="selected-range-summary" class="text-sm font-semibold text-slate-700 hidden sm:inline"></span>
                            <button type="button" id="apply-dates-btn" class="bg-[#C5A059] hover:bg-[#A88443] text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-md transition-all">Save & Apply</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Bind Events
            document.getElementById('close-calendar-modal')?.addEventListener('click', () => this.closeCalendarModal());
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.closeCalendarModal();
            });

            document.getElementById('prev-month-btn')?.addEventListener('click', () => this.prevMonth());
            document.getElementById('next-month-btn')?.addEventListener('click', () => this.nextMonth());

            document.getElementById('clear-dates-btn')?.addEventListener('click', () => {
                currentCheckIn = null;
                currentCheckOut = null;
                this.renderCalendarMonths();
                this.updateTriggerLabels();
            });

            document.getElementById('apply-dates-btn')?.addEventListener('click', () => {
                this.updateTriggerLabels();
                this.closeCalendarModal();
                // Dispatch event for room filters
                window.dispatchEvent(new CustomEvent('kaghan-dates-changed', {
                    detail: { checkIn: formatDateIso(currentCheckIn), checkOut: formatDateIso(currentCheckOut) }
                }));
            });

            // Flexible dates tab toggles
            overlay.querySelectorAll('.flex-dates-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    overlay.querySelectorAll('.flex-dates-btn').forEach(b => {
                        b.classList.remove('bg-white', 'text-slate-900', 'shadow-sm');
                        b.classList.add('text-slate-600');
                    });
                    btn.classList.add('bg-white', 'text-slate-900', 'shadow-sm');
                    btn.classList.remove('text-slate-600');
                });
            });
            return overlay;
        },

        openCalendarModal: function(roomBookedDates = []) {
            this.bookedDates = roomBookedDates;
            let overlay = document.getElementById('kph-calendar-overlay') || this.setupCalendarModalDOM();
            if (overlay) {
                overlay.style.setProperty('display', 'flex', 'important');
                overlay.style.setProperty('z-index', '99999999', 'important');
                overlay.style.setProperty('visibility', 'visible', 'important');
                overlay.style.setProperty('opacity', '1', 'important');
                overlay.classList.remove('hidden');
                this.renderCalendarMonths();
            }
        },

        closeCalendarModal: function() {
            const overlay = document.getElementById('kph-calendar-overlay');
            if (overlay) {
                overlay.classList.add('hidden');
                overlay.style.setProperty('display', 'none', 'important');
            }
        },

        nextMonth: function() {
            activeMonthIndex++;
            this.renderCalendarMonths();
        },

        prevMonth: function() {
            if (activeMonthIndex > 0) {
                activeMonthIndex--;
                this.renderCalendarMonths();
            }
        },

        renderCalendarMonths: function() {
            const container = document.getElementById('calendar-months-container');
            const heading = document.getElementById('calendar-month-heading');
            if (!container) return;

            container.innerHTML = '';
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Month 1
            const m1Date = new Date(today.getFullYear(), today.getMonth() + activeMonthIndex, 1);
            // Month 2
            const m2Date = new Date(today.getFullYear(), today.getMonth() + activeMonthIndex + 1, 1);

            if (heading) {
                heading.textContent = `${m1Date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} – ${m2Date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
            }

            container.appendChild(this.createMonthGrid(m1Date, today));
            container.appendChild(this.createMonthGrid(m2Date, today));

            this.updateSummaryText();
        },

        createMonthGrid: function(monthDate, today) {
            const year = monthDate.getFullYear();
            const month = monthDate.getMonth();
            const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            const firstDayIndex = new Date(year, month, 1).getDay();
            const totalDays = new Date(year, month + 1, 0).getDate();

            const monthDiv = document.createElement('div');
            monthDiv.className = 'select-none';

            let html = `
                <div class="text-center font-bold text-slate-800 text-sm mb-3 md:hidden">${monthName}</div>
                <div class="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-2">
                    <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                </div>
                <div class="grid grid-cols-7 gap-1 text-center text-xs font-medium">
            `;

            // Blank spaces
            for (let i = 0; i < firstDayIndex; i++) {
                html += `<div></div>`;
            }

            for (let day = 1; day <= totalDays; day++) {
                const cellDate = new Date(year, month, day);
                cellDate.setHours(0, 0, 0, 0);
                const isoStr = formatDateIso(cellDate);

                const isPast = cellDate < today;
                const isBooked = this.bookedDates && this.bookedDates.includes(isoStr);
                const isDisabled = isPast || isBooked;

                const isCheckIn = currentCheckIn && cellDate.getTime() === currentCheckIn.getTime();
                const isCheckOut = currentCheckOut && cellDate.getTime() === currentCheckOut.getTime();
                const isInRange = currentCheckIn && currentCheckOut && cellDate > currentCheckIn && cellDate < currentCheckOut;

                let classes = "h-9 rounded-lg flex items-center justify-center cursor-pointer transition-all relative text-xs ";

                if (isPast) {
                    classes += "text-slate-300 cursor-not-allowed ";
                } else if (isBooked) {
                    classes += "bg-rose-50 text-rose-300 line-through opacity-70 cursor-not-allowed font-medium ";
                } else if (isCheckIn || isCheckOut) {
                    classes += "bg-[#C5A059] text-white font-bold shadow-md z-10 ";
                } else if (isInRange) {
                    classes += "bg-[#C5A059]/20 text-slate-900 font-semibold ";
                } else {
                    classes += "hover:bg-slate-100 text-slate-800 font-medium ";
                }

                const titleAttr = isBooked ? 'title="Date is booked or unavailable"' : '';
                html += `<button type="button" class="${classes}" data-date="${isoStr}" ${isDisabled ? 'disabled' : ''} ${titleAttr}>${day}</button>`;
            }

            html += `</div>`;
            monthDiv.innerHTML = html;

            // Add click listeners to day cells
            // Add click listeners to day cells
            monthDiv.querySelectorAll('button[data-date]:not([disabled])').forEach(btn => {
                btn.addEventListener('click', () => {
                    const dateStr = btn.getAttribute('data-date');
                    const parseDate = (val) => window.KaghanDB && typeof KaghanDB.parseLocalDate === 'function' ? KaghanDB.parseLocalDate(val) : new Date(val + 'T00:00:00');
                    const clickedDate = parseDate(dateStr);
                    const stayType = document.getElementById('hero-stay-type')?.value || window.activeStayType || 'daily';

                    if (!currentCheckIn || (currentCheckIn && currentCheckOut)) {
                        currentCheckIn = clickedDate;
                        const defaultEnd = new Date(clickedDate);
                        if (stayType === 'weekly') {
                            defaultEnd.setDate(clickedDate.getDate() + 7);
                            currentCheckOut = defaultEnd;
                            if (window.KaghanUI) KaghanUI.showToast("Weekly Rate active: 7 nights minimum auto-locked.", "success");
                        } else if (stayType === 'monthly') {
                            defaultEnd.setDate(clickedDate.getDate() + 30);
                            currentCheckOut = defaultEnd;
                            if (window.KaghanUI) KaghanUI.showToast("Monthly Rate active: 30 nights minimum auto-locked.", "success");
                        } else {
                            currentCheckOut = null;
                        }
                    } else if (currentCheckIn && !currentCheckOut) {
                        if (clickedDate < currentCheckIn) {
                            currentCheckIn = clickedDate;
                            const defaultEnd = new Date(clickedDate);
                            if (stayType === 'weekly') {
                                defaultEnd.setDate(clickedDate.getDate() + 7);
                                currentCheckOut = defaultEnd;
                            } else if (stayType === 'monthly') {
                                defaultEnd.setDate(clickedDate.getDate() + 30);
                                currentCheckOut = defaultEnd;
                            }
                        } else if (clickedDate.getTime() === currentCheckIn.getTime()) {
                            currentCheckIn = null;
                        } else {
                            const nightsCount = Math.ceil((clickedDate - currentCheckIn) / (1000 * 3600 * 24));
                            if (stayType === 'weekly' && nightsCount < 7) {
                                const minEnd = new Date(currentCheckIn);
                                minEnd.setDate(currentCheckIn.getDate() + 7);
                                currentCheckOut = minEnd;
                                if (window.KaghanUI) KaghanUI.showToast("Weekly Rate requires minimum 7 nights. 7 days auto-locked.", "warning");
                            } else if (stayType === 'monthly' && nightsCount < 30) {
                                const minEnd = new Date(currentCheckIn);
                                minEnd.setDate(currentCheckIn.getDate() + 30);
                                currentCheckOut = minEnd;
                                if (window.KaghanUI) KaghanUI.showToast("Monthly Rate requires minimum 30 nights. 30 days auto-locked.", "warning");
                            } else {
                                // Check if any date in [currentCheckIn, clickedDate] is booked
                                let hasBookedInRange = false;
                                for (let d = new Date(currentCheckIn); d < clickedDate; d.setDate(d.getDate() + 1)) {
                                    const dStr = formatDateIso(d);
                                    if (this.bookedDates && this.bookedDates.includes(dStr)) {
                                        hasBookedInRange = true;
                                        break;
                                    }
                                }

                                if (hasBookedInRange) {
                                    if (window.KaghanUI) {
                                        KaghanUI.showToast("Selected range includes unavailable dates. Please choose continuous open dates.", "warning");
                                    }
                                    currentCheckOut = null;
                                } else {
                                    currentCheckOut = clickedDate;
                                }
                            }
                        }
                    }
                    this.renderCalendarMonths();
                    this.updateTriggerLabels();

                    // Auto-close modal after check-out is selected for seamless UX
                    if (currentCheckIn && currentCheckOut) {
                        setTimeout(() => {
                            this.closeCalendarModal();
                            window.dispatchEvent(new CustomEvent('kaghan-dates-changed', {
                                detail: { checkIn: formatDateIso(currentCheckIn), checkOut: formatDateIso(currentCheckOut) }
                            }));
                        }, 400);
                    }
                });
            });

            return monthDiv;
        },

        updateSummaryText: function() {
            const summary = document.getElementById('selected-range-summary');
            if (!summary) return;
            if (currentCheckIn && currentCheckOut) {
                const diffTime = Math.abs(currentCheckOut - currentCheckIn);
                const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                summary.textContent = `${nights} night${nights > 1 ? 's' : ''} (${formatDateDisplay(currentCheckIn)} – ${formatDateDisplay(currentCheckOut)})`;
            } else if (currentCheckIn) {
                summary.textContent = `Check-in: ${formatDateDisplay(currentCheckIn)} (Select check-out)`;
            } else {
                summary.textContent = 'Select check-in date';
            }
        }
    };

    window.setGuestPreset = function(adults, children, infants) {
        if (window.KaghanSearchWidget && typeof window.KaghanSearchWidget.setGuests === 'function') {
            window.KaghanSearchWidget.setGuests(adults, children, infants);
        }
    };

    window.populateSearchDropdownsFromDB = async function() {
        if (!window.KaghanDB || typeof KaghanDB.getCategories !== 'function') return;

        try {
            const locations = await KaghanDB.getLocations();
            const firestoreCategories = await KaghanDB.getCategories();
            const rooms = await KaghanDB.getRooms();

            // Preset category mapping & icon metadata
            const categoryMeta = {
                '07': { label: 'Penthouse', icon: 'fa-building-user', sub: 'Luxury Penthouse Suites' },
                'penthouse': { label: 'Penthouse', icon: 'fa-building-user', sub: 'Luxury Penthouse Suites' },
                '08': { label: 'General Room', icon: 'fa-bed', sub: 'Standard & Economy Stays' },
                'general room': { label: 'General Room', icon: 'fa-bed', sub: 'Standard & Economy Stays' },
                'general': { label: 'General Room', icon: 'fa-bed', sub: 'Standard & Economy Stays' },
                '09': { label: 'Valley View Room', icon: 'fa-mountain-sun', sub: 'Panoramic Mountain & Valley Stays' },
                'valley view room': { label: 'Valley View Room', icon: 'fa-mountain-sun', sub: 'Panoramic Mountain & Valley Stays' },
                'valley view': { label: 'Valley View Room', icon: 'fa-mountain-sun', sub: 'Panoramic Mountain & Valley Stays' },
                'studio': { label: 'Studio Furnished', icon: 'fa-cube', sub: 'Compact Luxury Suite (1-2 Guests)' },
                'studio furnished': { label: 'Studio Furnished', icon: 'fa-cube', sub: 'Compact Luxury Suite (1-2 Guests)' },
                '1bed': { label: '1 Bed Furnished', icon: 'fa-bed', sub: 'Executive Couple Suite (2 Guests)' },
                '1-bed': { label: '1 Bed Furnished', icon: 'fa-bed', sub: 'Executive Couple Suite (2 Guests)' },
                '1bed furnished': { label: '1 Bed Furnished', icon: 'fa-bed', sub: 'Executive Couple Suite (2 Guests)' },
                '1 bed furnished': { label: '1 Bed Furnished', icon: 'fa-bed', sub: 'Executive Couple Suite (2 Guests)' },
                '1 bed': { label: '1 Bed Furnished', icon: 'fa-bed', sub: 'Executive Couple Suite (2 Guests)' },
                '2bed': { label: '2 Bed Furnished', icon: 'fa-door-open', sub: 'Family Apartment Suite (4 Guests)' },
                '2-bed': { label: '2 Bed Furnished', icon: 'fa-door-open', sub: 'Family Apartment Suite (4 Guests)' },
                '2bed furnished': { label: '2 Bed Furnished', icon: 'fa-door-open', sub: 'Family Apartment Suite (4 Guests)' },
                '2 bed furnished': { label: '2 Bed Furnished', icon: 'fa-door-open', sub: 'Family Apartment Suite (4 Guests)' },
                '2 bed': { label: '2 Bed Furnished', icon: 'fa-door-open', sub: 'Family Apartment Suite (4 Guests)' },
                '3bed': { label: '3 Bed Furnished', icon: 'fa-house-chimney', sub: 'Spacious Family Suite (6 Guests)' },
                '3-bed': { label: '3 Bed Furnished', icon: 'fa-house-chimney', sub: 'Spacious Family Suite (6 Guests)' },
                '3bed furnished': { label: '3 Bed Furnished', icon: 'fa-house-chimney', sub: 'Spacious Family Suite (6 Guests)' },
                '3 bed furnished': { label: '3 Bed Furnished', icon: 'fa-house-chimney', sub: 'Spacious Family Suite (6 Guests)' },
                '3 bed': { label: '3 Bed Furnished', icon: 'fa-house-chimney', sub: 'Spacious Family Suite (6 Guests)' },
                '4bed': { label: '4 Bed Furnished', icon: 'fa-building', sub: 'Luxury Penthouse Suite (8 Guests)' },
                '4-bed': { label: '4 Bed Furnished', icon: 'fa-building', sub: 'Luxury Penthouse Suite (8 Guests)' },
                '4bed furnished': { label: '4 Bed Furnished', icon: 'fa-building', sub: 'Luxury Penthouse Suite (8 Guests)' },
                '4 bed furnished': { label: '4 Bed Furnished', icon: 'fa-building', sub: 'Luxury Penthouse Suite (8 Guests)' },
                '4 bed': { label: '4 Bed Furnished', icon: 'fa-building', sub: 'Luxury Penthouse Suite (8 Guests)' },
                'farmhouse': { label: 'Furnished Farmhouse', icon: 'fa-tree', sub: 'Grand Alpine Estate (10+ Guests)' },
                'furnished farmhouse': { label: 'Furnished Farmhouse', icon: 'fa-tree', sub: 'Grand Alpine Estate (10+ Guests)' }
            };

            // Map to hold merged category items: id -> { id, label, logo, icon, sub }
            const categoryMap = new Map();

            (firestoreCategories || []).forEach(cat => {
                if (!cat) return;
                const rawId = (cat.id || cat.name || cat.label || '').toString().trim();
                if (!rawId) return;
                const key = rawId.toLowerCase();
                const meta = categoryMeta[key] || {};
                categoryMap.set(key, {
                    id: cat.id || rawId,
                    label: cat.label || cat.name || meta.label || rawId,
                    logo: cat.logo || cat.image || cat.iconUrl || meta.logo || null,
                    icon: cat.icon || meta.icon || 'fa-hotel',
                    sub: cat.subtitle || cat.description || meta.sub || 'Luxury suites & stays'
                });
            });

            (rooms || []).forEach(r => {
                const rCat = (r.category || r.categoryId || r.categoryName || r.type || '').toString().trim();
                if (!rCat) return;

                const key = rCat.toLowerCase();
                const meta = categoryMeta[key] || {};

                if (!categoryMap.has(key)) {
                    categoryMap.set(key, {
                        id: r.category || r.categoryId || rCat,
                        label: r.categoryName || meta.label || rCat,
                        logo: meta.logo || null,
                        icon: meta.icon || 'fa-hotel',
                        sub: meta.sub || 'Luxury suites & stays'
                    });
                }
            });

            const validCategories = Array.from(categoryMap.values());

            // 1. Populate Hero Custom Location Dropdown (#dropdown-location)
            const locMenu = document.querySelector('#dropdown-location .dropdown-menu');
            if (locMenu) {
                let html = `
                    <div class="dropdown-item selected" data-value="all">
                        <div class="icon-wrapper"><i class="fa-solid fa-globe"></i></div>
                        <div class="flex flex-col min-w-0">
                            <span class="font-bold text-white text-xs">All Locations</span>
                            <span class="text-[10px] text-slate-300 font-normal leading-tight">Explore all destinations in Pakistan</span>
                        </div>
                    </div>
                `;
                locations.forEach(loc => {
                    const id = loc.id || loc.name;
                    const name = loc.label || loc.name || id;
                    const nameLower = name.toLowerCase();
                    const icon = loc.icon || (nameLower.includes('islamabad') ? 'fa-city' : nameLower.includes('nathia') ? 'fa-mountain-sun' : nameLower.includes('murree') ? 'fa-tree' : 'fa-location-dot');
                    const sub = loc.subtitle || loc.description || `Luxury stays & resorts in ${name}`;

                    html += `
                        <div class="dropdown-item" data-value="${KaghanSafe.escapeHTML(id)}">
                            <div class="icon-wrapper"><i class="fa-solid ${icon}"></i></div>
                            <div class="flex flex-col min-w-0">
                                <span class="font-bold text-white text-xs">${KaghanSafe.escapeHTML(name)}</span>
                                <span class="text-[10px] text-slate-300 font-normal leading-tight">${KaghanSafe.escapeHTML(sub)}</span>
                            </div>
                        </div>
                    `;
                });
                locMenu.innerHTML = html;
            }

            // 2. Populate Hero Custom Suite Style Dropdown (#dropdown-type)
            const typeMenu = document.querySelector('#dropdown-type .dropdown-menu');
            if (typeMenu) {
                let html = `
                    <div class="dropdown-item selected" data-value="all">
                        <div class="icon-wrapper"><i class="fa-solid fa-border-all"></i></div>
                        <div class="flex flex-col min-w-0">
                            <span class="font-bold text-white text-xs">All Styles</span>
                            <span class="text-[10px] text-slate-300 font-normal leading-tight">Browse Studio, Penthouses & Farmhouses</span>
                        </div>
                    </div>
                `;
                validCategories.forEach(cat => {
                    const iconOrLogo = (cat.logo || cat.image)
                        ? `<img src="${KaghanSafe.escapeHTML(cat.logo || cat.image)}" alt="${KaghanSafe.escapeHTML(cat.label)}" class="w-4 h-4 object-contain rounded-full">`
                        : `<i class="fa-solid ${cat.icon || 'fa-hotel'}"></i>`;

                    html += `
                        <div class="dropdown-item" data-value="${KaghanSafe.escapeHTML(cat.id)}">
                            <div class="icon-wrapper">${iconOrLogo}</div>
                            <div class="flex flex-col min-w-0">
                                <span class="font-bold text-white text-xs">${KaghanSafe.escapeHTML(cat.label)}</span>
                                <span class="text-[10px] text-slate-300 font-normal leading-tight">${KaghanSafe.escapeHTML(cat.sub)}</span>
                            </div>
                        </div>
                    `;
                });
                typeMenu.innerHTML = html;
            }

            // 3. Populate Standard Select Dropdowns across all pages
            const locationSelects = document.querySelectorAll('#quick-filter-location, #filter-location, #search-location-select');
            locationSelects.forEach(select => {
                if (select) {
                    const currentVal = select.value || 'all';
                    let opts = `<option value="all" class="bg-[#0F172A] text-white">📍 All Destinations</option>`;
                    locations.forEach(l => {
                        opts += `<option value="${KaghanSafe.escapeHTML(l.id || l.name)}" class="bg-[#0F172A] text-white">${KaghanSafe.escapeHTML(l.label || l.name)}</option>`;
                    });
                    select.innerHTML = opts;
                    select.value = currentVal;
                }
            });

            const categorySelects = document.querySelectorAll('#quick-filter-category, #filter-category, #search-category-select');
            categorySelects.forEach(select => {
                if (select) {
                    const currentVal = select.value || 'all';
                    let opts = `<option value="all" class="bg-[#0F172A] text-white">🏢 All Suite Types</option>`;
                    validCategories.forEach(c => {
                        opts += `<option value="${KaghanSafe.escapeHTML(c.id)}" class="bg-[#0F172A] text-white">${KaghanSafe.escapeHTML(c.label)}</option>`;
                    });
                    select.innerHTML = opts;
                    select.value = currentVal;
                }
            });

        } catch (err) {
            console.warn('[KaghanSearchWidget] Failed to populate dropdowns from DB:', err);
        }
    };

    // Dismiss guest stepper popover when clicking outside
    document.addEventListener('click', (e) => {
        const popover = document.getElementById('guest-stepper-popover');
        if (!popover || popover.classList.contains('hidden')) return;
        if (!e.target.closest('#guest-stepper-popover') && !e.target.closest('button[onclick*="toggleGuestStepperPopover"]')) {
            popover.classList.add('hidden');
        }
    });

    // Auto-init & auto-populate search dropdowns from Firestore DB
    const autoInit = () => {
        window.KaghanSearchWidget.init();
        if (window.populateSearchDropdownsFromDB) {
            window.populateSearchDropdownsFromDB();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }
})();
