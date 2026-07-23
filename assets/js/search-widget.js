// Kaghan Stay - Search & Calendar Widget Module (Airbnb UX Style)
// Reusable date range picker calendar & guest stepper overlay

(function() {
    'use strict';

    let currentCheckIn = null;
    let currentCheckOut = null;
    let activeMonthIndex = 0; // Offset from current month
    let selectedAdults = 2;
    let selectedChildren = 0;

    // Helper: format YYYY-MM-DD
    function formatDateIso(dateObj) {
        if (!dateObj) return '';
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
            
            this.setupHeroSearchDOM();
            this.setupCalendarModalDOM();
        },

        setupHeroSearchDOM: function() {
            const checkInInput = document.getElementById(this.targetCheckInId);
            const checkOutInput = document.getElementById(this.targetCheckOutId);
            const guestsSelect = document.getElementById(this.targetGuestsId);

            if (!checkInInput || !checkOutInput) return;

            // Set initial values if present
            if (checkInInput.value) currentCheckIn = new Date(checkInInput.value);
            if (checkOutInput.value) currentCheckOut = new Date(checkOutInput.value);

            // Listen for changes
            checkInInput.addEventListener('change', () => {
                if (checkInInput.value) currentCheckIn = new Date(checkInInput.value);
                this.updateTriggerLabels();
            });
            checkOutInput.addEventListener('change', () => {
                if (checkOutInput.value) currentCheckOut = new Date(checkOutInput.value);
                this.updateTriggerLabels();
            });

            this.updateTriggerLabels();
        },

        toggleGuestStepperPopover: function() {
            const popover = document.getElementById('guest-stepper-popover');
            if (popover) {
                popover.classList.toggle('hidden');
            }
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
            }
            this.updateTriggerLabels();
        },

        updateTriggerLabels: function() {
            const triggerText = document.getElementById('search-date-trigger-text');
            if (triggerText) {
                if (currentCheckIn && currentCheckOut) {
                    triggerText.textContent = `${formatDateDisplay(currentCheckIn)} – ${formatDateDisplay(currentCheckOut)}`;
                } else if (currentCheckIn) {
                    triggerText.textContent = `${formatDateDisplay(currentCheckIn)} – Select Checkout`;
                } else {
                    triggerText.textContent = 'Add dates';
                }
            }

            const guestText = document.getElementById('search-guest-trigger-text');
            if (guestText) {
                const total = selectedAdults + selectedChildren;
                guestText.textContent = `${total} guest${total > 1 ? 's' : ''}`;
            }

            // Sync hidden inputs
            const checkInInput = document.getElementById(this.targetCheckInId);
            const checkOutInput = document.getElementById(this.targetCheckOutId);
            const guestsInput = document.getElementById(this.targetGuestsId);

            if (checkInInput && currentCheckIn) checkInInput.value = formatDateIso(currentCheckIn);
            if (checkOutInput && currentCheckOut) checkOutInput.value = formatDateIso(currentCheckOut);
            if (guestsInput) guestsInput.value = String(selectedAdults + selectedChildren);
        },

        setupCalendarModalDOM: function() {
            if (document.getElementById('kph-calendar-overlay')) return;

            const overlay = document.createElement('div');
            overlay.id = 'kph-calendar-overlay';
            overlay.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] hidden flex items-center justify-center p-4 transition-all duration-300';
            
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
                            <button type="button" id="prev-month-btn" class="px-4 py-2 border border-slate-300 rounded-full hover:bg-slate-100 text-sm font-semibold flex items-center gap-2">
                                <i class="fa-solid fa-chevron-left text-xs"></i> Prev
                            </button>
                            <span id="calendar-month-heading" class="font-bold text-slate-800 text-base"></span>
                            <button type="button" id="next-month-btn" class="px-4 py-2 border border-slate-300 rounded-full hover:bg-slate-100 text-sm font-semibold flex items-center gap-2">
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

            document.getElementById('prev-month-btn')?.addEventListener('click', () => {
                if (activeMonthIndex > 0) {
                    activeMonthIndex--;
                    this.renderCalendarMonths();
                }
            });

            document.getElementById('next-month-btn')?.addEventListener('click', () => {
                activeMonthIndex++;
                this.renderCalendarMonths();
            });

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
        },

        openCalendarModal: function(roomBookedDates = []) {
            this.bookedDates = roomBookedDates;
            const overlay = document.getElementById('kph-calendar-overlay');
            if (overlay) {
                overlay.classList.remove('hidden');
                this.renderCalendarMonths();
            }
        },

        closeCalendarModal: function() {
            const overlay = document.getElementById('kph-calendar-overlay');
            if (overlay) overlay.classList.add('hidden');
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
            monthDiv.querySelectorAll('button[data-date]:not([disabled])').forEach(btn => {
                btn.addEventListener('click', () => {
                    const dateStr = btn.getAttribute('data-date');
                    const clickedDate = new Date(dateStr + 'T00:00:00');

                    if (!currentCheckIn || (currentCheckIn && currentCheckOut)) {
                        currentCheckIn = clickedDate;
                        currentCheckOut = null;
                    } else if (currentCheckIn && !currentCheckOut) {
                        if (clickedDate < currentCheckIn) {
                            currentCheckIn = clickedDate;
                        } else if (clickedDate.getTime() === currentCheckIn.getTime()) {
                            currentCheckIn = null;
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
                    this.renderCalendarMonths();
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

    // Dismiss guest stepper popover when clicking outside
    document.addEventListener('click', (e) => {
        const popover = document.getElementById('guest-stepper-popover');
        if (!popover || popover.classList.contains('hidden')) return;
        if (!e.target.closest('#guest-stepper-popover') && !e.target.closest('button[onclick*="toggleGuestStepperPopover"]')) {
            popover.classList.add('hidden');
        }
    });

    // Auto-init if DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.KaghanSearchWidget.init());
    } else {
        window.KaghanSearchWidget.init();
    }
})();
