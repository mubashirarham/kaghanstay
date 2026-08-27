// Kaghan Stay — Admin Dynamic Promotional Popups & VIP Offer Studio
// Supports multi-campaign popup management (Create, Clone, Delete, Toggle ON/OFF), granular page targeting (Enable/Disable specific pages, custom URL wildcards), categorized icon picker modal, VIP perks builder, countdown timers, and live simulator.

window.AdminAnnouncementModule = {
    initialized: false,
    previewDevice: 'desktop', // 'desktop' | 'tablet' | 'mobile'
    previewCountdownTimer: null,
    availableCoupons: [],
    activePerkIconTargetIdx: null,
    activePopupId: 'popup-1',

    // List of all campaigns
    popups: [
        {
            id: 'popup-1',
            name: '👑 Direct Booking Privilege (15% Off)',
            active: true,
            layout: 'center-modal',
            theme: 'royal-gold',
            bgColor: '#0B0F19',
            textColor: '#FFFFFF',
            accentColor: '#D4AF37',
            badgeBg: '#D4AF37',
            badgeTextColor: '#0B0F19',
            badgeText: '✨ EXCLUSIVE PRIVILEGE',
            title: 'Unlock Direct Booking Privilege',
            subtitle: 'Book directly on our official portal to enjoy guaranteed lowest rates, VIP amenities, and signature hospitality in Islamabad & Murree.',
            promoCode: 'DIRECT15',
            discountPercent: 15,
            claimAction: 'auto-apply',
            primaryCtaText: 'Claim 15% Off & Book Now',
            primaryCtaUrl: 'booking.html',
            secondaryCtaText: 'No thanks, I will pay full price',
            
            perksEnabled: true,
            perks: [
                { id: 'perk-1', icon: 'fa-tags', title: '15% Direct Discount', desc: 'Instant checkout deduction', tag: '15% OFF', color: 'gold' },
                { id: 'perk-2', icon: 'fa-mug-saucer', title: 'Free Gourmet Breakfast', desc: 'Complimentary daily service', tag: 'FREE', color: 'amber' },
                { id: 'perk-3', icon: 'fa-van-shuttle', title: 'Free Airport Shuttle', desc: 'On selected luxury suites', tag: 'VIP', color: 'gold' },
                { id: 'perk-4', icon: 'fa-clock', title: 'Early Check-In', desc: 'Subject to suite availability', tag: 'FLEXIBLE', color: 'emerald' }
            ],

            countdownEnabled: true,
            countdownExpiry: '',
            countdownLabel: '⚡ Flash Offer Ends In:',

            // Page Targeting & Inclusion / Exclusion Rules
            targetingMode: 'all', // 'all' | 'specific_include' | 'specific_exclude'
            targetPages: ['home', 'rooms', 'room-details', 'booking', 'blog', 'contact'],
            excludedPages: [],
            customUrls: '',

            // Triggers
            triggerType: 'delay',
            delaySeconds: 3,
            scrollThreshold: 30,
            snoozeDuration: '24h'
        }
    ],

    // Comprehensive Categorized Icon Library
    iconLibrary: [
        {
            category: '👑 Privileges & Luxury',
            icons: [
                { id: 'fa-crown', name: 'Crown / VIP' },
                { id: 'fa-gem', name: 'Gem / Luxury' },
                { id: 'fa-sparkles', name: 'Sparkles' },
                { id: 'fa-wand-magic-sparkles', name: 'Magic Sparkles' },
                { id: 'fa-award', name: 'Award Medal' },
                { id: 'fa-star', name: 'Five Star' },
                { id: 'fa-shield-halved', name: 'Shield / Guaranteed' },
                { id: 'fa-certificate', name: 'Certificate' },
                { id: 'fa-heart', name: 'Heart' },
                { id: 'fa-hand-sparkles', name: 'Signature Service' }
            ]
        },
        {
            category: '☕ Dining & Breakfast',
            icons: [
                { id: 'fa-mug-saucer', name: 'Hot Tea / Coffee' },
                { id: 'fa-utensils', name: 'Dining Utensils' },
                { id: 'fa-champagne-glasses', name: 'Champagne / High Tea' },
                { id: 'fa-wine-glass', name: 'Wine Glass' },
                { id: 'fa-bowl-food', name: 'Gourmet Food' },
                { id: 'fa-apple-whole', name: 'Fresh Fruit' },
                { id: 'fa-cookie-bite', name: 'Bakery / Treats' },
                { id: 'fa-kitchen-set', name: 'Equipped Kitchen' },
                { id: 'fa-bottle-water', name: 'Mineral Water' }
            ]
        },
        {
            category: '🚗 Transport & Airport',
            icons: [
                { id: 'fa-car', name: 'Luxury Car / Valet' },
                { id: 'fa-van-shuttle', name: 'Airport Shuttle' },
                { id: 'fa-plane', name: 'Flight / Airport' },
                { id: 'fa-plane-departure', name: 'Departure' },
                { id: 'fa-taxi', name: 'Chauffeur Taxi' },
                { id: 'fa-location-dot', name: 'Prime Location' },
                { id: 'fa-compass', name: 'Sightseeing / Tour' },
                { id: 'fa-gas-pump', name: 'Free Parking' }
            ]
        },
        {
            category: '🏷️ Discounts & Savings',
            icons: [
                { id: 'fa-tags', name: 'Price Tags' },
                { id: 'fa-tag', name: 'Single Tag' },
                { id: 'fa-percent', name: 'Percent Off' },
                { id: 'fa-gift', name: 'Gift Box' },
                { id: 'fa-receipt', name: 'Best Rate Receipt' },
                { id: 'fa-money-bill-wave', name: 'Cashback / Savings' },
                { id: 'fa-credit-card', name: 'No Prepayment' },
                { id: 'fa-wallet', name: 'Wallet Savings' }
            ]
        },
        {
            category: '🕒 Timing & Flexibility',
            icons: [
                { id: 'fa-clock', name: 'Clock / 24h' },
                { id: 'fa-hourglass-half', name: 'Flexible Time' },
                { id: 'fa-calendar-check', name: 'Instant Confirmation' },
                { id: 'fa-calendar-days', name: 'Flexible Dates' },
                { id: 'fa-bell-concierge', name: '24/7 Concierge' },
                { id: 'fa-key', name: 'Self Check-in' },
                { id: 'fa-door-open', name: 'Early Access' },
                { id: 'fa-bed', name: 'King Bed Setup' }
            ]
        },
        {
            category: '🏡 Suite & Comfort Amenities',
            icons: [
                { id: 'fa-wifi', name: 'High-Speed Wi-Fi' },
                { id: 'fa-tv', name: 'Smart TV / Netflix' },
                { id: 'fa-snowflake', name: 'Air Conditioning' },
                { id: 'fa-fire', name: 'Heater / Fireplace' },
                { id: 'fa-water-ladder', name: 'Pool Access' },
                { id: 'fa-spa', name: 'Spa & Wellness' },
                { id: 'fa-mountain-sun', name: 'Mountain View' },
                { id: 'fa-tree', name: 'Nature & Pine View' },
                { id: 'fa-shower', name: 'Rain Shower / Geyser' },
                { id: 'fa-couch', name: 'Luxury Lounge' },
                { id: 'fa-broom', name: 'Daily Housekeeping' }
            ]
        }
    ],

    // Categorized Perk Library for 1-Click Addition
    curatedPerkLibrary: {
        'culinary': [
            { icon: 'fa-mug-saucer', title: 'Free Gourmet Breakfast', desc: 'Complimentary daily breakfast spread', tag: 'FREE', color: 'gold' },
            { icon: 'fa-champagne-glasses', title: 'VIP Welcome High Tea', desc: 'Complimentary signature tea & snacks', tag: 'VIP', color: 'amber' },
            { icon: 'fa-apple-whole', title: 'Fresh Fruit Basket', desc: 'Platter delivered on suite arrival', tag: 'FREE', color: 'emerald' },
            { icon: 'fa-bottle-water', title: 'Unlimited Mineral Water', desc: 'Complimentary bottles daily', tag: 'FREE', color: 'cyan' }
        ],
        'transport': [
            { icon: 'fa-van-shuttle', title: 'Free Airport Shuttle', desc: 'Chauffeur airport transfer on suites', tag: 'VIP', color: 'gold' },
            { icon: 'fa-car', title: 'Free Secured Valet Parking', desc: '24/7 dedicated surveillance parking', tag: 'FREE', color: 'emerald' },
            { icon: 'fa-compass', title: 'Sightseeing Tour Guide', desc: 'Local Murree & Islamabad tour tips', tag: 'BONUS', color: 'sapphire' }
        ],
        'flexibility': [
            { icon: 'fa-clock', title: 'Priority Early Check-In', desc: 'Subject to suite availability (11 AM)', tag: 'FLEX', color: 'gold' },
            { icon: 'fa-hourglass-half', title: 'Guaranteed Late Checkout', desc: 'Relax until 2:00 PM on departure', tag: 'POPULAR', color: 'amber' },
            { icon: 'fa-shield-halved', title: '100% Free Cancellation', desc: 'Risk-free booking up to 24h prior', tag: 'RISK FREE', color: 'emerald' },
            { icon: 'fa-credit-card', title: 'No Prepayment Required', desc: 'Pay on arrival at property check-in', tag: 'EASY', color: 'cyan' }
        ],
        'privileges': [
            { icon: 'fa-tags', title: '15% Direct Discount', desc: 'Guaranteed lowest rate across all portals', tag: '15% OFF', color: 'gold' },
            { icon: 'fa-wifi', title: 'Ultra High-Speed Wi-Fi', desc: 'Dedicated 100Mbps optical line', tag: '100MBPS', color: 'cyan' },
            { icon: 'fa-mountain-sun', title: 'Scenic Valley View Guarantee', desc: 'Panoramic Margalla & Pine views', tag: 'SCENIC', color: 'emerald' },
            { icon: 'fa-crown', title: 'VIP Concierge Hotline', desc: 'Direct WhatsApp 24/7 butler service', tag: 'EXCLUSIVE', color: 'purple' }
        ]
    },

    // Curated Luxury Color Palettes
    presets: {
        'royal-gold': {
            label: '👑 Royal Gold Obsidian',
            bgColor: '#0B0F19',
            textColor: '#FFFFFF',
            accentColor: '#D4AF37',
            badgeBg: '#D4AF37',
            badgeTextColor: '#0B0F19'
        },
        'midnight-sapphire': {
            label: '🌌 Midnight Sapphire',
            bgColor: '#0F172A',
            textColor: '#F8FAFC',
            accentColor: '#38BDF8',
            badgeBg: '#38BDF8',
            badgeTextColor: '#0F172A'
        },
        'emerald-valley': {
            label: '🌲 Pine Valley Emerald',
            bgColor: '#064E3B',
            textColor: '#ECFDF5',
            accentColor: '#34D399',
            badgeBg: '#34D399',
            badgeTextColor: '#064E3B'
        },
        'crimson-sunset': {
            label: '🌅 Velvet Crimson',
            bgColor: '#450A0A',
            textColor: '#FFF1F2',
            accentColor: '#FDA4AF',
            badgeBg: '#FDA4AF',
            badgeTextColor: '#450A0A'
        },
        'pure-obsidian': {
            label: '💎 Minimalist Pure Dark',
            bgColor: '#000000',
            textColor: '#F1F5F9',
            accentColor: '#E2E8F0',
            badgeBg: '#FFFFFF',
            badgeTextColor: '#000000'
        },
        'opal-pearl': {
            label: '✨ Opal Pearl Luxe (Light)',
            bgColor: '#F8FAFC',
            textColor: '#0F172A',
            accentColor: '#B45309',
            badgeBg: '#B45309',
            badgeTextColor: '#FFFFFF'
        }
    },

    getCurrentPopup: function() {
        const found = this.popups.find(p => p.id === this.activePopupId);
        return found || this.popups[0] || {};
    },

    init: async function(force = false) {
        if (this.initialized && !force) return;
        this.initialized = true;

        try {
            const saved = await window.KaghanDB.getAnnouncement();
            if (saved && typeof saved === 'object') {
                if (Array.isArray(saved.popups) && saved.popups.length > 0) {
                    this.popups = saved.popups.map(p => ({
                        ...p,
                        active: p.active !== false && p.enabled !== false
                    }));
                    this.activePopupId = saved.activePopupId || this.popups[0].id;
                } else if (saved.title || saved.layout || saved.active !== undefined || saved.enabled !== undefined) {
                    // Single popup or legacy object
                    const isActive = saved.active !== false && saved.enabled !== false;
                    const migrated = { 
                        ...this.popups[0], 
                        ...saved, 
                        id: saved.id || 'popup-1',
                        active: isActive 
                    };
                    this.popups = [migrated];
                    this.activePopupId = migrated.id;
                }
            }
        } catch (e) {
            console.warn("Could not load promo settings, using defaults:", e);
        }

        // Set default expiry date and properties for popups if missing
        this.popups.forEach(p => {
            if (p.active === undefined) p.active = true;
            if (!p.countdownExpiry) {
                const d = new Date();
                d.setDate(d.getDate() + 7);
                d.setHours(23, 59, 0, 0);
                p.countdownExpiry = d.toISOString().slice(0, 16);
            }
            if (!Array.isArray(p.targetPages)) p.targetPages = ['home', 'rooms', 'room-details', 'booking', 'blog', 'contact'];
            if (!Array.isArray(p.excludedPages)) p.excludedPages = [];
        });

        await this.loadCouponsDatabase();
        this.renderCampaignList();
        this.populateFormFields();
        this.renderPerksEditor();
        this.renderIconPickerModal();
        this.updateLivePreview();
        this.startPreviewCountdown();
    },

    render: function() {
        this.init(true);
    },

    // ============================================================
    // === MULTI-POPUP CAMPAIGN MANAGEMENT (Add, Clone, Delete, Toggle) ===
    // ============================================================
    renderCampaignList: function() {
        const container = document.getElementById('promo-campaigns-list');
        if (!container) return;

        container.innerHTML = this.popups.map((p) => {
            const isSelected = p.id === this.activePopupId;
            const statusBadge = p.active 
                ? `<span class="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active</span>`
                : `<span class="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Paused</span>`;

            return `
            <div class="p-3.5 rounded-2xl border transition-all ${isSelected ? 'border-[#D4AF37] bg-amber-50/20 shadow-md ring-1 ring-[#D4AF37]/30' : 'border-slate-200 bg-white hover:border-slate-300'} flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0 cursor-pointer" onclick="AdminAnnouncementModule.selectPopup('${p.id}')">
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#D4AF37] text-slate-950 font-black' : 'bg-slate-100 text-slate-600 font-bold'} text-xs">
                        <i class="fa-solid ${p.layout === 'corner-floater' ? 'fa-square' : p.layout === 'slide-drawer' ? 'fa-sheet-plastic' : 'fa-window-maximize'}"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2">
                            <h4 class="text-xs font-bold text-slate-900 truncate leading-tight ${isSelected ? 'text-amber-950' : ''}">${p.name || p.title || 'Untitled Campaign'}</h4>
                            ${statusBadge}
                        </div>
                        <p class="text-[10px] text-slate-400 font-light truncate mt-0.5">
                            Layout: <span class="font-medium text-slate-600">${p.layout || 'center-modal'}</span> • Code: <span class="font-mono font-bold text-amber-700">${p.promoCode || 'NONE'}</span> • Target: <span class="font-medium text-slate-600">${p.targetingMode || 'all'}</span>
                        </p>
                    </div>
                </div>

                <!-- Actions: Toggle ON/OFF, Edit, Clone, Delete -->
                <div class="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <!-- Toggle Switch -->
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-bold text-slate-500">${p.active ? 'ON' : 'OFF'}</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" onchange="AdminAnnouncementModule.togglePopupStatus('${p.id}', this.checked)" class="sr-only peer" ${p.active ? 'checked' : ''}>
                            <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

                    <!-- Edit Selector Button -->
                    <button type="button" onclick="AdminAnnouncementModule.selectPopup('${p.id}')" class="px-3 py-1.5 text-xs font-bold rounded-xl ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} transition-colors">
                        ${isSelected ? 'Editing' : 'Edit'}
                    </button>

                    <!-- Clone -->
                    <button type="button" onclick="AdminAnnouncementModule.clonePopup('${p.id}')" class="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 transition-colors text-xs" title="Duplicate Campaign">
                        <i class="fa-solid fa-copy"></i>
                    </button>

                    <!-- Delete -->
                    <button type="button" onclick="AdminAnnouncementModule.deletePopup('${p.id}')" class="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors text-xs disabled:opacity-30" ${this.popups.length <= 1 ? 'disabled title="Cannot delete last campaign"' : 'title="Delete Campaign"'}>
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
            `;
        }).join('');
    },

    selectPopup: function(id) {
        this.activePopupId = id;
        this.renderCampaignList();
        this.populateFormFields();
        this.renderPerksEditor();
        this.updateLivePreview();
    },

    createPopup: function(presetType = 'discount') {
        const newId = 'popup-' + Date.now();
        const d = new Date();
        d.setDate(d.getDate() + 7);
        d.setHours(23, 59, 0, 0);

        let newPopup = {
            id: newId,
            name: `New Campaign #${this.popups.length + 1}`,
            active: true,
            layout: 'center-modal',
            theme: 'royal-gold',
            bgColor: '#0B0F19',
            textColor: '#FFFFFF',
            accentColor: '#D4AF37',
            badgeBg: '#D4AF37',
            badgeTextColor: '#0B0F19',
            badgeText: '✨ SPECIAL OFFER',
            title: 'Unlock Direct Booking Privilege',
            subtitle: 'Book directly on our official portal to enjoy guaranteed lowest rates and luxury perks.',
            promoCode: 'STAY15',
            discountPercent: 15,
            claimAction: 'auto-apply',
            primaryCtaText: 'Claim Offer & Book',
            primaryCtaUrl: 'booking.html',
            secondaryCtaText: 'No thanks, I will pay full price',
            perksEnabled: true,
            perks: [
                { id: 'perk-1', icon: 'fa-tags', title: '15% Direct Discount', desc: 'Instant price reduction', tag: '15% OFF', color: 'gold' },
                { id: 'perk-2', icon: 'fa-mug-saucer', title: 'Free Breakfast', desc: 'Fresh daily breakfast', tag: 'FREE', color: 'amber' }
            ],
            countdownEnabled: true,
            countdownExpiry: d.toISOString().slice(0, 16),
            countdownLabel: '⚡ Flash Offer Ends In:',
            targetingMode: 'all',
            targetPages: ['home', 'rooms', 'room-details', 'booking', 'blog', 'contact'],
            excludedPages: [],
            customUrls: '',
            triggerType: 'delay',
            delaySeconds: 3,
            scrollThreshold: 30,
            snoozeDuration: '24h'
        };

        if (presetType === 'floater') {
            newPopup.name = '✨ Corner Deal Floater';
            newPopup.layout = 'corner-floater';
            newPopup.badgeText = '⚡ VIP DEAL';
            newPopup.title = 'Special Member Rate';
        } else if (presetType === 'drawer') {
            newPopup.name = '🎁 Slide-Up Notice Drawer';
            newPopup.layout = 'slide-drawer';
            newPopup.badgeText = '📢 SPECIAL ANNOUNCEMENT';
            newPopup.title = 'Complimentary Breakfast Included on All Stays';
        }

        this.popups.push(newPopup);
        this.activePopupId = newId;
        this.renderCampaignList();
        this.populateFormFields();
        this.renderPerksEditor();
        this.updateLivePreview();

        if (window.KaghanUI && window.KaghanUI.showToast) {
            window.KaghanUI.showToast(`Created new popup campaign: "${newPopup.name}"`, "success");
        }
    },

    clonePopup: function(id) {
        const source = this.popups.find(p => p.id === id);
        if (!source) return;

        const cloned = JSON.parse(JSON.stringify(source));
        cloned.id = 'popup-' + Date.now();
        cloned.name = `${source.name || 'Campaign'} (Copy)`;
        
        this.popups.push(cloned);
        this.activePopupId = cloned.id;
        this.renderCampaignList();
        this.populateFormFields();
        this.renderPerksEditor();
        this.updateLivePreview();

        if (window.KaghanUI && window.KaghanUI.showToast) {
            window.KaghanUI.showToast(`Cloned campaign: "${cloned.name}"`, "success");
        }
    },

    deletePopup: function(id) {
        if (this.popups.length <= 1) {
            if (window.KaghanUI && window.KaghanUI.showToast) {
                window.KaghanUI.showToast("Cannot delete the only campaign. You must have at least one popup.", "warning");
            } else {
                alert("Cannot delete the only campaign.");
            }
            return;
        }

        const target = this.popups.find(p => p.id === id);
        const name = target ? target.name : 'this popup';
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

        this.popups = this.popups.filter(p => p.id !== id);
        if (this.activePopupId === id) {
            this.activePopupId = this.popups[0].id;
        }

        this.renderCampaignList();
        this.populateFormFields();
        this.renderPerksEditor();
        this.updateLivePreview();

        if (window.KaghanUI && window.KaghanUI.showToast) {
            window.KaghanUI.showToast(`Deleted campaign "${name}".`, "info");
        }
    },

    togglePopupStatus: async function(id, activeState) {
        const p = this.popups.find(item => item.id === id);
        if (!p) return;
        p.active = activeState;

        const cur = this.getCurrentPopup();
        if (cur.id === id) {
            cur.active = activeState;
            const activeToggle = document.getElementById('promo-active-toggle');
            const statusTxt = document.getElementById('promo-active-status-text');
            if (activeToggle) activeToggle.checked = activeState;
            if (statusTxt) statusTxt.textContent = activeState ? 'Active (ON)' : 'Paused (OFF)';
        }

        this.renderCampaignList();
        this.populateFormFields();
        this.updateLivePreview();

        // Persist toggle state immediately so reloading never resets it
        await this.saveAnnouncementSettings(true);

        if (window.KaghanUI && window.KaghanUI.showToast) {
            window.KaghanUI.showToast(`Popup "${p.name}" turned ${activeState ? 'ON (Active)' : 'OFF (Paused)'}.`, activeState ? "success" : "info");
        }
    },

    // ============================================================
    // === FORM FIELDS & GRANULAR PAGE TARGETING ===
    // ============================================================
    loadCouponsDatabase: async function() {
        try {
            if (window.KaghanDB && window.KaghanDB.getCoupons) {
                const coupons = await window.KaghanDB.getCoupons();
                this.availableCoupons = (coupons || []).filter(c => c.active !== false);
                this.populateCouponDropdown();
            }
        } catch (e) {
            console.warn("Could not load coupons for promo studio:", e);
        }
    },

    populateCouponDropdown: function() {
        const select = document.getElementById('promo-coupon-select');
        if (!select) return;

        select.innerHTML = '<option value="">-- Connect Active Coupon Code --</option>';
        this.availableCoupons.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.code || c.id;
            opt.textContent = `${c.code} — (${c.discount || c.percentage || 15}% OFF)`;
            select.appendChild(opt);
        });

        const cur = this.getCurrentPopup();
        if (cur.promoCode) {
            select.value = cur.promoCode;
        }
    },

    onCouponSelected: function(selectEl) {
        const selectedCode = selectEl.value;
        const cur = this.getCurrentPopup();
        if (!selectedCode) return;

        const found = this.availableCoupons.find(c => (c.code || c.id) === selectedCode);
        cur.promoCode = selectedCode;
        if (found && (found.discount || found.percentage)) {
            cur.discountPercent = parseInt(found.discount || found.percentage, 10);
        }

        this.populateFormFields();
        this.updateLivePreview();
    },

    populateFormFields: function() {
        const d = this.getCurrentPopup();

        // Campaign Name
        const nameInput = document.getElementById('promo-campaign-name');
        if (nameInput) nameInput.value = d.name || '';

        // Master toggle
        const activeToggle = document.getElementById('promo-active-toggle');
        const statusTxt = document.getElementById('promo-active-status-text');
        const isAct = d.active !== false;
        if (activeToggle) activeToggle.checked = isAct;
        if (statusTxt) statusTxt.textContent = isAct ? 'Active (ON)' : 'Paused (OFF)';

        // Layout Selector
        const layoutSelect = document.getElementById('promo-layout-select');
        if (layoutSelect) layoutSelect.value = d.layout || 'center-modal';

        // Colors & Theme
        const bgInput = document.getElementById('promo-bg-color');
        if (bgInput) bgInput.value = d.bgColor || '#0B0F19';

        const textInput = document.getElementById('promo-text-color');
        if (textInput) textInput.value = d.textColor || '#FFFFFF';

        const accentInput = document.getElementById('promo-accent-color');
        if (accentInput) accentInput.value = d.accentColor || '#D4AF37';

        const badgeBgInput = document.getElementById('promo-badge-bg');
        if (badgeBgInput) badgeBgInput.value = d.badgeBg || '#D4AF37';

        const badgeTextInput = document.getElementById('promo-badge-text-color');
        if (badgeTextInput) badgeTextInput.value = d.badgeTextColor || '#0B0F19';

        // Offer Content
        const badgeText = document.getElementById('promo-badge-text');
        if (badgeText) badgeText.value = d.badgeText || '';

        const titleInput = document.getElementById('promo-title');
        if (titleInput) titleInput.value = d.title || '';

        const subtitleInput = document.getElementById('promo-subtitle');
        if (subtitleInput) subtitleInput.value = d.subtitle || '';

        const codeInput = document.getElementById('promo-code');
        if (codeInput) codeInput.value = d.promoCode || '';

        const discountInput = document.getElementById('promo-discount-pct');
        if (discountInput) discountInput.value = d.discountPercent || 15;

        const ctaTextInput = document.getElementById('promo-cta-text');
        if (ctaTextInput) ctaTextInput.value = d.primaryCtaText || '';

        const ctaUrlInput = document.getElementById('promo-cta-url');
        if (ctaUrlInput) ctaUrlInput.value = d.primaryCtaUrl || 'booking.html';

        // Perks Toggle
        const perksToggle = document.getElementById('promo-perks-toggle');
        if (perksToggle) perksToggle.checked = d.perksEnabled !== false;

        // Countdown
        const cdToggle = document.getElementById('promo-countdown-toggle');
        if (cdToggle) cdToggle.checked = d.countdownEnabled !== false;

        const cdExpiry = document.getElementById('promo-countdown-expiry');
        if (cdExpiry) cdExpiry.value = d.countdownExpiry || '';

        const cdLabel = document.getElementById('promo-countdown-label');
        if (cdLabel) cdLabel.value = d.countdownLabel || '';

        // Triggers
        const triggerSelect = document.getElementById('promo-trigger-select');
        if (triggerSelect) triggerSelect.value = d.triggerType || 'delay';

        const delaySlider = document.getElementById('promo-delay-slider');
        const delayVal = document.getElementById('promo-delay-val');
        if (delaySlider) delaySlider.value = d.delaySeconds || 3;
        if (delayVal) delayVal.textContent = `${d.delaySeconds || 3}s`;

        const scrollSlider = document.getElementById('promo-scroll-slider');
        const scrollVal = document.getElementById('promo-scroll-val');
        if (scrollSlider) scrollSlider.value = d.scrollThreshold || 30;
        if (scrollVal) scrollVal.textContent = `${d.scrollThreshold || 30}%`;

        // Granular Page Targeting
        const modeSelect = document.getElementById('promo-targeting-mode');
        if (modeSelect) modeSelect.value = d.targetingMode || 'all';

        this.updatePageTargetingUI();

        const customUrls = document.getElementById('promo-custom-urls');
        if (customUrls) customUrls.value = d.customUrls || '';

        const snoozeSelect = document.getElementById('promo-snooze-duration');
        if (snoozeSelect) snoozeSelect.value = d.snoozeDuration || '24h';
    },

    updatePageTargetingUI: function() {
        const d = this.getCurrentPopup();
        const mode = d.targetingMode || 'all';

        const checklistWrap = document.getElementById('promo-page-checklists-wrap');
        if (checklistWrap) {
            checklistWrap.style.display = 'block';
        }

        // Set Include checkboxes
        const targetPages = Array.isArray(d.targetPages) ? d.targetPages : [];
        const includeChecks = document.querySelectorAll('.page-target-include-cb');
        includeChecks.forEach(cb => {
            cb.checked = targetPages.includes(cb.dataset.page);
        });

        // Set Exclude checkboxes (Always default exclude rooms and booking pages)
        if (!Array.isArray(d.excludedPages)) d.excludedPages = ['rooms', 'booking', 'room-details'];
        if (!d.excludedPages.includes('rooms')) d.excludedPages.push('rooms');
        if (!d.excludedPages.includes('booking')) d.excludedPages.push('booking');
        if (!d.excludedPages.includes('room-details')) d.excludedPages.push('room-details');

        const excludeChecks = document.querySelectorAll('.page-target-exclude-cb');
        excludeChecks.forEach(cb => {
            cb.checked = d.excludedPages.includes(cb.dataset.page);
        });
    },

    onTargetPageCheckboxChange: function(pageKey, type, isChecked) {
        const d = this.getCurrentPopup();
        if (type === 'include') {
            if (!Array.isArray(d.targetPages)) d.targetPages = [];
            if (isChecked) {
                if (!d.targetPages.includes(pageKey)) d.targetPages.push(pageKey);
            } else {
                d.targetPages = d.targetPages.filter(p => p !== pageKey);
            }
        } else if (type === 'exclude') {
            if (!Array.isArray(d.excludedPages)) d.excludedPages = [];
            if (isChecked) {
                if (!d.excludedPages.includes(pageKey)) d.excludedPages.push(pageKey);
            } else {
                d.excludedPages = d.excludedPages.filter(p => p !== pageKey);
            }
        }
    },

    onFieldChange: function(field, value) {
        const cur = this.getCurrentPopup();
        cur[field] = value;

        // Also update matching item in this.popups array
        const found = this.popups.find(p => p.id === cur.id);
        if (found) {
            found[field] = value;
        }

        if (field === 'name') {
            this.renderCampaignList();
        }

        if (field === 'active') {
            const statusTxt = document.getElementById('promo-active-status-text');
            if (statusTxt) statusTxt.textContent = value ? 'Active (ON)' : 'Paused (OFF)';
            this.renderCampaignList();
            // Automatically persist active toggle state
            this.saveAnnouncementSettings(true);
        }

        if (field === 'delaySeconds') {
            const valEl = document.getElementById('promo-delay-val');
            if (valEl) valEl.textContent = `${value}s`;
        }
        if (field === 'scrollThreshold') {
            const valEl = document.getElementById('promo-scroll-val');
            if (valEl) valEl.textContent = `${value}%`;
        }
        if (field === 'targetingMode') {
            this.updatePageTargetingUI();
            this.renderCampaignList();
        }

        this.updateLivePreview();
    },

    applyPreset: function(presetKey) {
        const preset = this.presets[presetKey];
        const cur = this.getCurrentPopup();
        if (!preset || !cur) return;

        cur.theme = presetKey;
        cur.bgColor = preset.bgColor;
        cur.textColor = preset.textColor;
        cur.accentColor = preset.accentColor;
        cur.badgeBg = preset.badgeBg;
        cur.badgeTextColor = preset.badgeTextColor;

        this.populateFormFields();
        this.updateLivePreview();

        if (window.KaghanUI && window.KaghanUI.showToast) {
            window.KaghanUI.showToast(`Applied ${preset.label} palette!`, "info");
        }
    },

    setDevicePreview: function(device) {
        this.previewDevice = device;
        const container = document.getElementById('promo-simulator-frame');
        const buttons = document.querySelectorAll('.device-preview-btn');

        buttons.forEach(b => {
            if (b.dataset.device === device) {
                b.classList.add('bg-[#D4AF37]', 'text-slate-950', 'font-black');
                b.classList.remove('bg-slate-800', 'text-slate-400');
            } else {
                b.classList.remove('bg-[#D4AF37]', 'text-slate-950', 'font-black');
                b.classList.add('bg-slate-800', 'text-slate-400');
            }
        });

        if (container) {
            if (device === 'mobile') {
                container.style.maxWidth = '380px';
            } else if (device === 'tablet') {
                container.style.maxWidth = '640px';
            } else {
                container.style.maxWidth = '100%';
            }
        }

        this.updateLivePreview();
    },

    // ============================================================
    // === VIP PERKS & AMENITIES MANAGEMENT ===
    // ============================================================
    renderPerksEditor: function() {
        const list = document.getElementById('promo-perks-list');
        if (!list) return;

        const cur = this.getCurrentPopup();
        const perks = cur.perks || [];
        if (perks.length === 0) {
            list.innerHTML = `<div class="text-xs text-slate-400 py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">No VIP perks added yet. Pick from the curated library above or click "+ Add Custom Perk".</div>`;
            return;
        }

        list.innerHTML = perks.map((p, idx) => {
            const iconClass = p.icon || 'fa-gift';
            const color = p.color || 'gold';
            const tag = p.tag || '';

            const colorClasses = {
                gold: 'bg-amber-400/10 text-amber-500 border-amber-400/30',
                emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
                sapphire: 'bg-sky-500/10 text-sky-600 border-sky-500/30',
                purple: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
                amber: 'bg-orange-500/10 text-orange-600 border-orange-500/30'
            };
            const currentBadgeClass = colorClasses[color] || colorClasses.gold;

            return `
            <div class="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-amber-400/40 transition-all">
                
                <!-- Icon Button with 1-Click Picker Trigger -->
                <div class="flex items-center gap-2 shrink-0">
                    <button type="button" onclick="AdminAnnouncementModule.openIconPicker(${idx})" class="w-11 h-11 rounded-xl flex flex-col items-center justify-center border transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-xs ${currentBadgeClass}" title="Click to pick icon">
                        <i class="fa-solid ${iconClass} text-base"></i>
                        <span class="text-[8px] font-bold uppercase tracking-tighter opacity-80 mt-0.5">Change</span>
                    </button>
                </div>

                <!-- Titles & Descriptions -->
                <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 flex-grow min-w-0">
                    <div class="sm:col-span-5">
                        <label class="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Perk Title</label>
                        <input type="text" value="${p.title || ''}" oninput="AdminAnnouncementModule.updatePerk(${idx}, 'title', this.value)" placeholder="Perk Title (e.g. Free Breakfast)" class="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#D4AF37] font-bold text-slate-900 bg-slate-50/50">
                    </div>
                    <div class="sm:col-span-4">
                        <label class="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Short Description</label>
                        <input type="text" value="${p.desc || ''}" oninput="AdminAnnouncementModule.updatePerk(${idx}, 'desc', this.value)" placeholder="Short info (e.g. Daily service)" class="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#D4AF37] text-slate-600 bg-slate-50/50">
                    </div>
                    <div class="sm:col-span-3">
                        <label class="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Highlight Tag</label>
                        <input type="text" value="${tag}" oninput="AdminAnnouncementModule.updatePerk(${idx}, 'tag', this.value.toUpperCase())" placeholder="e.g. FREE, VIP" class="w-full px-2.5 py-1.5 text-xs font-bold uppercase border border-slate-200 rounded-xl outline-none focus:border-[#D4AF37] text-amber-700 bg-amber-50/40">
                    </div>
                </div>

                <!-- Color Theme & Ordering Controls -->
                <div class="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <select onchange="AdminAnnouncementModule.updatePerk(${idx}, 'color', this.value)" class="text-[11px] font-bold py-1.5 px-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 outline-none focus:border-[#D4AF37]" title="Accent Theme">
                        <option value="gold" ${color === 'gold' ? 'selected' : ''}>👑 Gold</option>
                        <option value="emerald" ${color === 'emerald' ? 'selected' : ''}>🌲 Emerald</option>
                        <option value="sapphire" ${color === 'sapphire' ? 'selected' : ''}>🌌 Sapphire</option>
                        <option value="amber" ${color === 'amber' ? 'selected' : ''}>☀️ Amber</option>
                        <option value="purple" ${color === 'purple' ? 'selected' : ''}>💜 Purple</option>
                    </select>

                    <div class="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                        <button type="button" onclick="AdminAnnouncementModule.movePerk(${idx}, -1)" class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-950 hover:bg-white transition-all disabled:opacity-30" ${idx === 0 ? 'disabled' : ''} title="Move Up">
                            <i class="fa-solid fa-chevron-up text-[10px]"></i>
                        </button>
                        <button type="button" onclick="AdminAnnouncementModule.movePerk(${idx}, 1)" class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-950 hover:bg-white transition-all disabled:opacity-30" ${idx === perks.length - 1 ? 'disabled' : ''} title="Move Down">
                            <i class="fa-solid fa-chevron-down text-[10px]"></i>
                        </button>
                    </div>

                    <button type="button" onclick="AdminAnnouncementModule.removePerk(${idx})" class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Delete Perk">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </div>
            </div>
            `;
        }).join('');
    },

    addPerk: function(customPerk = null) {
        const cur = this.getCurrentPopup();
        if (!Array.isArray(cur.perks)) cur.perks = [];
        
        let newPerk = {
            id: 'perk-' + Date.now(),
            icon: 'fa-wand-magic-sparkles',
            title: 'New VIP Privilege',
            desc: 'Exclusive perk for direct booking',
            tag: 'VIP',
            color: 'gold'
        };

        if (customPerk) {
            newPerk = { ...newPerk, ...customPerk, id: 'perk-' + Date.now() };
        }

        cur.perks.push(newPerk);
        this.renderPerksEditor();
        this.updateLivePreview();

        if (window.KaghanUI && window.KaghanUI.showToast) {
            window.KaghanUI.showToast(`Added perk: "${newPerk.title}"`, "success");
        }
    },

    addCuratedPerk: function(categoryKey, perkIdx) {
        const cat = this.curatedPerkLibrary[categoryKey];
        if (!cat || !cat[perkIdx]) return;
        this.addPerk(cat[perkIdx]);
    },

    updatePerk: function(idx, key, val) {
        const cur = this.getCurrentPopup();
        if (!cur.perks || !cur.perks[idx]) return;
        cur.perks[idx][key] = val;
        this.updateLivePreview();
    },

    movePerk: function(idx, direction) {
        const cur = this.getCurrentPopup();
        const perks = cur.perks;
        if (!perks) return;
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= perks.length) return;

        const temp = perks[idx];
        perks[idx] = perks[targetIdx];
        perks[targetIdx] = temp;

        this.renderPerksEditor();
        this.updateLivePreview();
    },

    removePerk: function(idx) {
        const cur = this.getCurrentPopup();
        if (!cur.perks) return;
        cur.perks.splice(idx, 1);
        this.renderPerksEditor();
        this.updateLivePreview();
    },

    // ============================================================
    // === INTERACTIVE ICON PICKER MODAL ===
    // ============================================================
    renderIconPickerModal: function() {
        let modal = document.getElementById('kaghan-icon-picker-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'kaghan-icon-picker-modal';
            modal.className = 'fixed inset-0 z-[999999] hidden items-center justify-center p-4';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="fixed inset-0 bg-black/80 backdrop-blur-sm" onclick="AdminAnnouncementModule.closeIconPicker()"></div>
            <div class="relative w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col z-10 animate-fade-in">
                
                <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div class="flex items-center gap-2.5">
                        <div class="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-[#D4AF37] flex items-center justify-center text-lg">
                            <i class="fa-solid fa-icons"></i>
                        </div>
                        <div>
                            <h3 class="text-base font-extrabold outfit text-slate-900 leading-tight">Pick a Perk Icon</h3>
                            <p class="text-xs text-slate-400 font-light">Select from travel, dining, luxury, discount, and suite amenities.</p>
                        </div>
                    </div>
                    <button type="button" onclick="AdminAnnouncementModule.closeIconPicker()" class="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div class="my-4 relative">
                    <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                    <input type="text" id="icon-picker-search" oninput="AdminAnnouncementModule.filterIcons(this.value)" placeholder="Search icons (e.g., breakfast, car, wifi, crown, clock, discount)..." class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:border-[#D4AF37] focus:bg-white transition-all font-medium">
                </div>

                <div id="icon-picker-grid" class="overflow-y-auto space-y-5 pr-1 flex-grow">
                    ${this.renderIconCategoriesHTML()}
                </div>

                <div class="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>Click any icon to instantly select and apply.</span>
                    <button type="button" onclick="AdminAnnouncementModule.closeIconPicker()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-all">Cancel</button>
                </div>
            </div>
        `;
    },

    renderIconCategoriesHTML: function(searchQuery = '') {
        const query = searchQuery.trim().toLowerCase();
        
        return this.iconLibrary.map(cat => {
            const filteredIcons = cat.icons.filter(icon => {
                if (!query) return true;
                return icon.id.toLowerCase().includes(query) || icon.name.toLowerCase().includes(query);
            });

            if (filteredIcons.length === 0) return '';

            return `
            <div>
                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-2">
                    ${cat.category} <span class="text-[10px] text-slate-400 font-normal">(${filteredIcons.length})</span>
                </h4>
                <div class="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                    ${filteredIcons.map(icon => `
                        <button type="button" onclick="AdminAnnouncementModule.selectIcon('${icon.id}')" class="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-100 hover:border-amber-400/50 hover:bg-amber-50/40 transition-all text-center group cursor-pointer active:scale-95">
                            <div class="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-amber-400/20 text-slate-700 group-hover:text-amber-600 flex items-center justify-center text-lg mb-1.5 transition-colors">
                                <i class="fa-solid ${icon.id}"></i>
                            </div>
                            <span class="text-[10px] font-semibold text-slate-600 group-hover:text-slate-900 truncate w-full leading-tight">${icon.name}</span>
                            <span class="text-[8px] font-mono text-slate-400 truncate w-full mt-0.5">${icon.id}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
            `;
        }).join('');
    },

    openIconPicker: function(perkIdx) {
        this.activePerkIconTargetIdx = perkIdx;
        const modal = document.getElementById('kaghan-icon-picker-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            const search = document.getElementById('icon-picker-search');
            if (search) {
                search.value = '';
                this.filterIcons('');
                setTimeout(() => search.focus(), 100);
            }
        }
    },

    closeIconPicker: function() {
        const modal = document.getElementById('kaghan-icon-picker-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        this.activePerkIconTargetIdx = null;
    },

    filterIcons: function(query) {
        const grid = document.getElementById('icon-picker-grid');
        if (grid) {
            grid.innerHTML = this.renderIconCategoriesHTML(query);
        }
    },

    selectIcon: function(iconClass) {
        const cur = this.getCurrentPopup();
        if (this.activePerkIconTargetIdx !== null && cur.perks && cur.perks[this.activePerkIconTargetIdx]) {
            cur.perks[this.activePerkIconTargetIdx].icon = iconClass;
            this.renderPerksEditor();
            this.updateLivePreview();

            if (window.KaghanUI && window.KaghanUI.showToast) {
                window.KaghanUI.showToast(`Updated icon to "${iconClass}"!`, "success");
            }
        }
        this.closeIconPicker();
    },

    // Countdown Presets
    setCountdownPreset: function(hours) {
        const cur = this.getCurrentPopup();
        const d = new Date(Date.now() + hours * 60 * 60 * 1000);
        cur.countdownExpiry = d.toISOString().slice(0, 16);
        cur.countdownEnabled = true;
        this.populateFormFields();
        this.updateLivePreview();
    },

    setCountdownEndOfMonth: function() {
        const cur = this.getCurrentPopup();
        const d = new Date();
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        cur.countdownExpiry = nextMonth.toISOString().slice(0, 16);
        cur.countdownEnabled = true;
        this.populateFormFields();
        this.updateLivePreview();
    },

    // ============================================================
    // === REAL-TIME LIVE SIMULATOR ===
    // ============================================================
    updateLivePreview: function() {
        const previewWrap = document.getElementById('promo-simulator-content');
        if (!previewWrap) return;

        const d = this.getCurrentPopup();
        const bg = d.bgColor || '#0B0F19';
        const textColor = d.textColor || '#FFFFFF';
        const accentColor = d.accentColor || '#D4AF37';
        const badgeBg = d.badgeBg || accentColor;
        const badgeTextColor = d.badgeTextColor || '#0B0F19';
        const badgeText = d.badgeText || '✨ EXCLUSIVE PRIVILEGE';
        const title = d.title || 'Unlock Direct Booking Privilege';
        const subtitle = d.subtitle || 'Book directly on our official portal to enjoy guaranteed lowest rates, VIP amenities, and signature hospitality.';
        const promoCode = d.promoCode || 'DIRECT15';
        const primaryCtaText = d.primaryCtaText || (promoCode ? `Claim ${promoCode} & Book` : 'Explore Luxury Suites');
        const secondaryCtaText = d.secondaryCtaText || 'No thanks, I will pay full price';
        const perks = d.perks || [];

        // Perks HTML in Simulator
        const perksHtml = (d.perksEnabled !== false && perks.length > 0) ? `
            <div class="grid grid-cols-2 gap-2 my-4 text-left">
                ${perks.map(p => {
                    const tagHtml = p.tag ? `<span class="inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 ml-1">${p.tag}</span>` : '';
                    return `
                    <div class="flex items-start gap-2 p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-amber-400/30 transition-all">
                        <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs">
                            <i class="fa-solid ${p.icon || 'fa-gift'}"></i>
                        </div>
                        <div class="min-w-0 flex-grow">
                            <div class="text-[11px] font-bold text-white truncate leading-tight flex items-center justify-between">
                                <span class="truncate">${p.title || ''}</span>
                                ${tagHtml}
                            </div>
                            <div class="text-[9px] text-slate-400 truncate font-light mt-0.5">${p.desc || ''}</div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        ` : '';

        // Countdown HTML in Simulator
        const countdownHtml = (d.countdownEnabled && d.countdownExpiry) ? `
            <div class="my-3 p-2.5 rounded-2xl bg-black/40 border border-amber-400/20 flex flex-col items-center gap-1.5">
                <span class="text-[9px] uppercase font-bold tracking-wider text-amber-300/90 flex items-center gap-1">
                    <i class="fa-solid fa-fire text-amber-400 animate-pulse"></i> ${d.countdownLabel || '⚡ Flash Offer Ends In:'}
                </span>
                <div class="flex items-center gap-1.5 font-mono text-xs">
                    <div class="bg-white/10 px-2 py-0.5 rounded text-white font-black"><span id="sim-days">06</span><span class="text-[7px] text-slate-400 block -mt-0.5">DAYS</span></div>
                    <span class="text-amber-400 font-bold">:</span>
                    <div class="bg-white/10 px-2 py-0.5 rounded text-white font-black"><span id="sim-hours">23</span><span class="text-[7px] text-slate-400 block -mt-0.5">HOURS</span></div>
                    <span class="text-amber-400 font-bold">:</span>
                    <div class="bg-white/10 px-2 py-0.5 rounded text-white font-black"><span id="sim-mins">59</span><span class="text-[7px] text-slate-400 block -mt-0.5">MINS</span></div>
                    <span class="text-amber-400 font-bold">:</span>
                    <div class="bg-white/10 px-2 py-0.5 rounded text-amber-400 font-black"><span id="sim-secs">45</span><span class="text-[7px] text-slate-400 block -mt-0.5">SECS</span></div>
                </div>
            </div>
        ` : '';

        // Promo Code Box in Simulator
        const couponBoxHtml = promoCode ? `
            <div class="flex items-center justify-between gap-2 p-2 rounded-2xl bg-amber-400/10 border border-dashed border-amber-400/40 my-2">
                <div class="flex items-center gap-2 min-w-0 pl-1 text-left">
                    <i class="fa-solid fa-tag text-amber-400 text-xs shrink-0"></i>
                    <div class="min-w-0">
                        <span class="text-[8px] uppercase font-bold text-amber-300/80 block leading-tight">Discount Code</span>
                        <span class="font-mono text-xs font-black text-white tracking-widest truncate block">${promoCode}</span>
                    </div>
                </div>
                <button type="button" onclick="AdminAnnouncementModule.testCopyPromo('${promoCode}')" class="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-xs shrink-0 flex items-center gap-1">
                    <i class="fa-solid fa-copy text-[9px]"></i> Copy
                </button>
            </div>
        ` : '';

        if (d.layout === 'corner-floater') {
            previewWrap.innerHTML = `
                <div class="flex items-end justify-end w-full h-full p-4">
                    <div class="w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-white/10 text-left relative" style="background: ${bg}; color: ${textColor};">
                        <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider mb-2" style="background: ${badgeBg}; color: ${badgeTextColor};">
                            <i class="fa-solid fa-crown text-[8px]"></i> <span>${badgeText}</span>
                        </div>
                        <h4 class="text-sm font-bold outfit text-white mb-1">${title}</h4>
                        <p class="text-[11px] text-slate-300 font-light mb-3">${subtitle}</p>
                        ${couponBoxHtml}
                        <button type="button" class="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-950 text-center shadow-md" style="background: ${accentColor};">
                            ${primaryCtaText}
                        </button>
                    </div>
                </div>
            `;
        } else if (d.layout === 'slide-drawer') {
            previewWrap.innerHTML = `
                <div class="flex items-end justify-center w-full h-full p-4">
                    <div class="w-full max-w-lg rounded-3xl p-4 shadow-2xl border border-white/10 flex items-center justify-between gap-3 text-left" style="background: ${bg}; color: ${textColor};">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-400/20 text-amber-400 text-base border border-amber-400/30">
                                <i class="fa-solid fa-crown"></i>
                            </div>
                            <div class="min-w-0">
                                <h4 class="text-xs font-bold outfit text-white truncate">${title}</h4>
                                <span class="text-[10px] text-slate-300 truncate block">${subtitle}</span>
                            </div>
                        </div>
                        <button type="button" class="py-2 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-950 shrink-0 shadow-md" style="background: ${accentColor};">
                            Claim Deal
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Center Modal
            previewWrap.innerHTML = `
                <div class="flex items-center justify-center w-full h-full p-4">
                    <div class="w-full max-w-md rounded-3xl p-6 text-center shadow-2xl border border-white/10 relative overflow-hidden" style="background: ${bg}; color: ${textColor};">
                        
                        <div class="absolute -top-16 -left-16 w-32 h-32 rounded-full blur-2xl opacity-30 pointer-events-none" style="background: ${accentColor};"></div>
                        <div class="absolute -bottom-16 -right-16 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none" style="background: ${accentColor};"></div>

                        <div class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-md mb-2" style="background: ${badgeBg}; color: ${badgeTextColor};">
                            <i class="fa-solid fa-crown text-[8px]"></i> <span>${badgeText}</span>
                        </div>

                        <h3 class="text-lg sm:text-xl font-black outfit text-white leading-snug mb-1.5">${title}</h3>
                        <p class="text-xs text-slate-300 font-light leading-relaxed max-w-xs mx-auto">${subtitle}</p>

                        ${perksHtml}
                        ${countdownHtml}
                        ${couponBoxHtml}

                        <div class="mt-4 space-y-1.5">
                            <button type="button" class="w-full py-3 px-5 rounded-2xl font-black text-xs uppercase tracking-wider text-slate-950 shadow-lg flex items-center justify-center gap-2" style="background: linear-gradient(135deg, ${accentColor} 0%, #F59E0B 100%);">
                                <span>${primaryCtaText}</span> <i class="fa-solid fa-arrow-right text-xs"></i>
                            </button>
                            <span class="text-[10px] text-slate-400 block">${secondaryCtaText}</span>
                        </div>
                    </div>
                </div>
            `;
        }
    },

    startPreviewCountdown: function() {
        clearInterval(this.previewCountdownTimer);
        this.previewCountdownTimer = setInterval(() => {
            const cur = this.getCurrentPopup();
            if (!cur || !cur.countdownExpiry) return;
            const diff = new Date(cur.countdownExpiry).getTime() - Date.now();
            if (diff > 0) {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((diff / (1000 * 60)) % 60);
                const seconds = Math.floor((diff / 1000) % 60);

                const dEl = document.getElementById('sim-days');
                const hEl = document.getElementById('sim-hours');
                const mEl = document.getElementById('sim-mins');
                const sEl = document.getElementById('sim-secs');

                if (dEl) dEl.textContent = String(days).padStart(2, '0');
                if (hEl) hEl.textContent = String(hours).padStart(2, '0');
                if (mEl) mEl.textContent = String(minutes).padStart(2, '0');
                if (sEl) sEl.textContent = String(seconds).padStart(2, '0');
            }
        }, 1000);
    },

    testCopyPromo: function(code) {
        if (window.KaghanUI && window.KaghanUI.showToast) {
            window.KaghanUI.showToast(`✨ Tested Promo Copy: "${code}"`, "info");
        }
    },

    testTriggerLive: function() {
        if (window.KaghanPromotions) {
            window.KaghanPromotions.data = this.getCurrentPopup();
            window.KaghanPromotions.show(true);
        }
    },

    // Save & Publish to Firestore
    saveAnnouncementSettings: async function(isSilent = false) {
        const btn = document.getElementById('save-promo-btn');
        const origHtml = btn ? btn.innerHTML : '';
        if (btn && !isSilent) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-sm"></i> Publishing...`;
        }

        try {
            const cur = this.getCurrentPopup();
            
            // Sync current popup into this.popups array
            const targetIdx = this.popups.findIndex(p => p.id === cur.id);
            if (targetIdx !== -1) {
                this.popups[targetIdx] = { ...this.popups[targetIdx], ...cur };
            }

            const anyActive = this.popups.some(p => p.active !== false);

            const payload = {
                ...cur,
                active: cur.active !== false,
                enabled: anyActive,
                popups: this.popups,
                activePopupId: this.activePopupId,
                updatedAt: new Date().toISOString(),
                messages: [
                    {
                        id: 'msg-1',
                        text: `${cur.title || ''}: ${cur.subtitle || ''}`,
                        linkText: cur.primaryCtaText || '',
                        linkUrl: cur.primaryCtaUrl || '',
                        promoCode: cur.promoCode || ''
                    }
                ]
            };

            await window.KaghanDB.saveAnnouncement(payload);

            if (!isSilent) {
                if (window.KaghanUI && window.KaghanUI.showToast) {
                    window.KaghanUI.showToast("🎉 All popup campaigns and page targeting rules published live!", "success");
                } else {
                    alert("Promotional popups published successfully!");
                }
            }
        } catch (err) {
            console.error("Save promo error:", err);
            if (!isSilent) {
                if (window.KaghanUI && window.KaghanUI.showToast) {
                    window.KaghanUI.showToast(`Failed to publish: ${err.message}`, "error");
                } else {
                    alert(`Error saving: ${err.message}`);
                }
            }
        } finally {
            if (btn && !isSilent) {
                btn.disabled = false;
                btn.innerHTML = origHtml;
            }
        }
    }
};

// Aliases for system integration
window.AdminPromotionsModule = window.AdminAnnouncementModule;

// Auto-run when tab opens or DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.AdminAnnouncementModule) window.AdminAnnouncementModule.init();
    });
} else {
    if (window.AdminAnnouncementModule) window.AdminAnnouncementModule.init();
}
