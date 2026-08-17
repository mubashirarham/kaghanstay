// Kaghan Stay — Admin Dynamic Announcement Bar Controller
// Manages real-time preview, multi-message ticker feed, visual palettes, typography, icons, emojis, special perks, limited-time countdowns, and discount auto-apply.

window.AdminAnnouncementModule = {
    initialized: false,
    currentData: {
        active: true,
        theme: 'royal-gold',
        bgColor: '#0B0F19',
        textColor: '#FFFFFF',
        accentColor: '#D4AF37',
        badgeBg: '#D4AF37',
        badgeTextColor: '#0B0F19',
        badgeText: '✨ SPECIAL OFFER',
        fontFamily: 'outfit',
        fontSize: '12px',
        dismissible: true,
        rotationInterval: 5,
        // Special Perks & VIP Incentives
        perksEnabled: true,
        perkBadge: 'VIP 15% OFF',
        perkText: 'Free Gourmet Breakfast & High Tea',
        perkIcon: 'fa-gift',
        // Limited-Time Offer Countdown
        countdownEnabled: true,
        countdownExpiry: '',
        countdownLabel: '⚡ Flash Offer Ends:',
        // Promo Code & 1-Click Auto-Apply
        promoCode: 'DIRECT15',
        discountPercent: 15,
        claimAction: 'auto-apply',
        messages: [
            {
                id: 'msg-1',
                emoji: '✨',
                icon: 'fa-sparkles',
                text: 'Exclusive Direct Booking Privilege: Save 15% + Free Welcome High Tea on all luxury 2BHK Suites!',
                linkText: 'Claim 15% Off',
                linkUrl: 'booking.html',
                linkTarget: '_self',
                promoCode: 'DIRECT15',
                perkBadge: '15% OFF + FREE TEA'
            },
            {
                id: 'msg-2',
                emoji: '🏔️',
                icon: 'fa-mountain-sun',
                text: 'Limited Season Pass: Margalla Hills View Suites now include complimentary early check-in.',
                linkText: 'Reserve Now',
                linkUrl: 'rooms.html',
                linkTarget: '_self',
                promoCode: '',
                perkBadge: 'EARLY CHECK-IN'
            }
        ]
    },
    previewIndex: 0,
    previewTimer: null,
    previewCountdownTimer: null,
    availableCoupons: [],

    // Preset luxury themes
    presets: {
        'royal-gold': {
            label: '👑 KPH Royal Gold',
            bgColor: '#0B0F19',
            textColor: '#FFFFFF',
            accentColor: '#D4AF37',
            badgeBg: '#D4AF37',
            badgeTextColor: '#0B0F19'
        },
        'midnight-sapphire': {
            label: '🌌 Midnight Sapphire',
            bgColor: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)',
            textColor: '#F8FAFC',
            accentColor: '#38BDF8',
            badgeBg: '#38BDF8',
            badgeTextColor: '#0F172A'
        },
        'emerald-valley': {
            label: '🌲 Pine Valley Emerald',
            bgColor: 'linear-gradient(135deg, #064E3B 0%, #022C22 100%)',
            textColor: '#ECFDF5',
            accentColor: '#34D399',
            badgeBg: '#34D399',
            badgeTextColor: '#064E3B'
        },
        'crimson-sunset': {
            label: '🌅 Velvet Crimson',
            bgColor: 'linear-gradient(135deg, #450A0A 0%, #7F1D1D 100%)',
            textColor: '#FFF1F2',
            accentColor: '#FDA4AF',
            badgeBg: '#FDA4AF',
            badgeTextColor: '#450A0A'
        },
        'pure-obsidian': {
            label: '💎 Minimalist Obsidian',
            bgColor: '#000000',
            textColor: '#F1F5F9',
            accentColor: '#E2E8F0',
            badgeBg: '#FFFFFF',
            badgeTextColor: '#000000'
        },
        'warm-amber': {
            label: '☀️ Sunrise Amber',
            bgColor: 'linear-gradient(135deg, #78350F 0%, #B45309 100%)',
            textColor: '#FFFBEB',
            accentColor: '#FDE68A',
            badgeBg: '#FDE68A',
            badgeTextColor: '#78350F'
        }
    },

    // Special Perk Presets
    perkPresets: [
        { badge: '🏷️ 15% OFF', text: 'Exclusive 15% Direct Discount', icon: 'fa-tags' },
        { badge: '☕ FREE BREAKFAST', text: 'Complimentary Daily Continental Breakfast', icon: 'fa-mug-saucer' },
        { badge: '🚗 FREE AIRPORT PICKUP', text: 'Complimentary Chauffeur Airport Transfer', icon: 'fa-car' },
        { badge: '🕒 EARLY CHECK-IN', text: 'Priority Early Check-in & Late Checkout', icon: 'fa-clock' },
        { badge: '🛡️ FREE CANCELLATION', text: '100% Risk-Free Refundable Booking', icon: 'fa-shield-halved' },
        { badge: '🌟 VIP WELCOME TEA', text: 'Complimentary Fruit Basket & High Tea', icon: 'fa-crown' },
        { badge: '⚡ FLASH SALE', text: 'Limited-Time Secret Member Rate', icon: 'fa-bolt' }
    ],

    init: async function() {
        if (this.initialized) return;
        this.initialized = true;

        // Set default expiry date if none exists (7 days in future)
        if (!this.currentData.countdownExpiry) {
            const d = new Date();
            d.setDate(d.getDate() + 7);
            d.setHours(23, 59, 0, 0);
            this.currentData.countdownExpiry = d.toISOString().slice(0, 16);
        }

        try {
            const saved = await window.KaghanDB.getAnnouncement();
            if (saved && typeof saved === 'object') {
                this.currentData = { ...this.currentData, ...saved };
                if (!Array.isArray(this.currentData.messages) || this.currentData.messages.length === 0) {
                    this.currentData.messages = [
                        {
                            id: 'msg-1',
                            emoji: '✨',
                            icon: 'fa-sparkles',
                            text: 'Exclusive Direct Booking Privilege: Save 15% + Free Welcome High Tea on all 2BHK Suites!',
                            linkText: 'Claim 15% Off',
                            linkUrl: 'booking.html',
                            linkTarget: '_self',
                            promoCode: 'DIRECT15',
                            perkBadge: '15% OFF + FREE TEA'
                        }
                    ];
                }
            }
        } catch(e) {
            console.warn("Announcement admin init notice:", e);
        }

        // Load existing coupons for quick dropdown assignment
        this.loadFirestoreCoupons();

        this.render();
    },

    loadFirestoreCoupons: async function() {
        try {
            const coupons = await window.KaghanDB.getCoupons();
            this.availableCoupons = coupons || [];
            this.populateCouponDropdown();
        } catch(e) {
            console.warn("Coupon load notice:", e);
        }
    },

    populateCouponDropdown: function() {
        const select = document.getElementById('announcement-coupon-select');
        if (!select) return;

        select.innerHTML = `
            <option value="">-- Or Select Existing Active Coupon --</option>
            ${this.availableCoupons.map(c => `
                <option value="${c.code || c.id}" data-discount="${c.discountPercentage || 0}">
                    ${c.code || c.id} (${c.discountPercentage || 0}% OFF)
                </option>
            `).join('')}
        `;
    },

    render: function() {
        const container = document.getElementById('admin-announcement-view-container');
        if (!container) return;

        // Core Toggles
        const toggle = document.getElementById('announcement-active-toggle');
        if (toggle) toggle.checked = this.currentData.active !== false;

        const dismissToggle = document.getElementById('announcement-dismissible-toggle');
        if (dismissToggle) dismissToggle.checked = this.currentData.dismissible !== false;

        const intervalInput = document.getElementById('announcement-interval-input');
        const intervalLbl = document.getElementById('announcement-interval-val');
        if (intervalInput) {
            intervalInput.value = this.currentData.rotationInterval || 5;
            if (intervalLbl) intervalLbl.textContent = `${intervalInput.value}s`;
        }

        const fontSelect = document.getElementById('announcement-font-select');
        if (fontSelect) fontSelect.value = this.currentData.fontFamily || 'outfit';

        const sizeSelect = document.getElementById('announcement-size-select');
        if (sizeSelect) sizeSelect.value = this.currentData.fontSize || '12px';

        const badgeTextInput = document.getElementById('announcement-badge-text');
        if (badgeTextInput) badgeTextInput.value = this.currentData.badgeText || '';

        // Special Perks fields
        const perksToggle = document.getElementById('announcement-perks-toggle');
        if (perksToggle) perksToggle.checked = this.currentData.perksEnabled !== false;

        const perkBadgeInput = document.getElementById('announcement-perk-badge');
        if (perkBadgeInput) perkBadgeInput.value = this.currentData.perkBadge || '';

        const perkTextInput = document.getElementById('announcement-perk-text');
        if (perkTextInput) perkTextInput.value = this.currentData.perkText || '';

        const perkIconInput = document.getElementById('announcement-perk-icon');
        if (perkIconInput) perkIconInput.value = this.currentData.perkIcon || 'fa-gift';

        // Countdown Timer fields
        const cdToggle = document.getElementById('announcement-countdown-toggle');
        if (cdToggle) cdToggle.checked = this.currentData.countdownEnabled !== false;

        const cdExpiryInput = document.getElementById('announcement-countdown-expiry');
        if (cdExpiryInput && this.currentData.countdownExpiry) {
            cdExpiryInput.value = this.currentData.countdownExpiry.slice(0, 16);
        }

        const cdLabelInput = document.getElementById('announcement-countdown-label');
        if (cdLabelInput) cdLabelInput.value = this.currentData.countdownLabel || '⚡ Flash Offer Ends:';

        // Promo Code fields
        const promoInput = document.getElementById('announcement-promo-code');
        if (promoInput) promoInput.value = this.currentData.promoCode || '';

        const discountInput = document.getElementById('announcement-discount-pct');
        if (discountInput) discountInput.value = this.currentData.discountPercent || '';

        const claimActionSelect = document.getElementById('announcement-claim-action');
        if (claimActionSelect) claimActionSelect.value = this.currentData.claimAction || 'auto-apply';

        // Colors
        this.syncColorInputs();

        // Render Message Feed Cards
        this.renderMessageFeedList();

        // Update Live Preview
        this.updateLivePreview();
        this.startPreviewRotation();
        this.startPreviewCountdownTicking();
    },

    syncColorInputs: function() {
        const bgInput = document.getElementById('announcement-bg-color');
        const textInput = document.getElementById('announcement-text-color');
        const accentInput = document.getElementById('announcement-accent-color');
        const badgeBgInput = document.getElementById('announcement-badge-bg');
        const badgeTextInput = document.getElementById('announcement-badge-text-color');

        if (bgInput) bgInput.value = this.currentData.bgColor && this.currentData.bgColor.startsWith('#') ? this.currentData.bgColor : '#0B0F19';
        if (textInput) textInput.value = this.currentData.textColor || '#FFFFFF';
        if (accentInput) accentInput.value = this.currentData.accentColor || '#D4AF37';
        if (badgeBgInput) badgeBgInput.value = this.currentData.badgeBg || '#D4AF37';
        if (badgeTextInput) badgeTextInput.value = this.currentData.badgeTextColor || '#0B0F19';
    },

    setCountdownPreset: function(hours) {
        const d = new Date();
        d.setHours(d.getHours() + hours);
        const iso = d.toISOString().slice(0, 16);
        this.currentData.countdownExpiry = iso;
        const input = document.getElementById('announcement-countdown-expiry');
        if (input) input.value = iso;
        this.updateLivePreview();
    },

    setCountdownEndOfMonth: function() {
        const d = new Date();
        const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        const iso = endOfMonth.toISOString().slice(0, 16);
        this.currentData.countdownExpiry = iso;
        const input = document.getElementById('announcement-countdown-expiry');
        if (input) input.value = iso;
        this.updateLivePreview();
    },

    applyPerkPreset: function(index) {
        const p = this.perkPresets[index];
        if (!p) return;

        this.currentData.perkBadge = p.badge;
        this.currentData.perkText = p.text;
        this.currentData.perkIcon = p.icon;

        const badgeInput = document.getElementById('announcement-perk-badge');
        if (badgeInput) badgeInput.value = p.badge;

        const textInput = document.getElementById('announcement-perk-text');
        if (textInput) textInput.value = p.text;

        const iconInput = document.getElementById('announcement-perk-icon');
        if (iconInput) iconInput.value = p.icon;

        this.updateLivePreview();
    },

    onCouponSelected: function(selectEl) {
        const val = selectEl.value;
        if (!val) return;

        const selectedOption = selectEl.options[selectEl.selectedIndex];
        const discount = selectedOption.getAttribute('data-discount') || '15';

        this.currentData.promoCode = val;
        this.currentData.discountPercent = parseInt(discount, 10);

        const promoInput = document.getElementById('announcement-promo-code');
        if (promoInput) promoInput.value = val;

        const discInput = document.getElementById('announcement-discount-pct');
        if (discInput) discInput.value = discount;

        this.updateLivePreview();
    },

    getLiveCountdownString: function() {
        const msg = (this.currentData.messages && this.currentData.messages[this.previewIndex]) || {};
        const expiry = msg.countdownExpiry || this.currentData.countdownExpiry;
        const enabled = (msg.countdownEnabled !== undefined ? msg.countdownEnabled : this.currentData.countdownEnabled);

        if (!enabled || !expiry) return null;

        const diff = new Date(expiry).getTime() - Date.now();
        if (diff <= 0) return { expired: true, text: '00:00:00' };

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        let timeStr = '';
        if (days > 0) timeStr += `${days}d `;
        timeStr += `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;

        const label = msg.countdownLabel || this.currentData.countdownLabel || 'Ends in:';
        return { expired: false, timeStr, label };
    },

    startPreviewCountdownTicking: function() {
        clearInterval(this.previewCountdownTimer);
        this.previewCountdownTimer = setInterval(() => {
            const cdData = this.getLiveCountdownString();
            const cdValEl = document.getElementById('preview-cd-timer-val');
            if (cdValEl && cdData) {
                if (cdData.expired) {
                    cdValEl.textContent = 'Offer Expired';
                } else {
                    cdValEl.textContent = cdData.timeStr;
                }
            }
        }, 1000);
    },

    renderMessageFeedList: function() {
        const list = document.getElementById('announcement-messages-list');
        if (!list) return;

        const messages = this.currentData.messages || [];

        if (messages.length === 0) {
            list.innerHTML = `
                <div class="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p class="text-xs text-slate-400 font-medium mb-3">No announcement messages in feed yet.</p>
                    <button type="button" onclick="AdminAnnouncementModule.addMessage()" class="px-4 py-2 bg-slate-900 hover:bg-[#D4AF37] hover:text-slate-900 text-white rounded-xl text-xs font-bold transition-all">
                        <i class="fa-solid fa-plus mr-1"></i> Add First Message
                    </button>
                </div>
            `;
            return;
        }

        const emojiPresets = ['✨', '🏔️', '🏨', '🔥', '🎁', '🌟', '🏷️', '❄️', '☀️', '📢', '🔑', '☕', '🚗', '🎉', '💎', '📍'];

        list.innerHTML = messages.map((msg, index) => `
            <div class="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 shadow-xs relative transition-all hover:border-[#D4AF37]/50" data-msg-index="${index}">
                <!-- Card Header -->
                <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/60">
                    <div class="flex items-center gap-2">
                        <span class="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center">${index + 1}</span>
                        <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Announcement Message #${index + 1}</h4>
                        ${index === 0 ? '<span class="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">Primary</span>' : ''}
                    </div>
                    <div class="flex items-center gap-1">
                        ${index > 0 ? `
                            <button type="button" onclick="AdminAnnouncementModule.moveMessage(${index}, -1)" class="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center text-xs transition-colors" title="Move Up">
                                <i class="fa-solid fa-arrow-up"></i>
                            </button>
                        ` : ''}
                        ${index < messages.length - 1 ? `
                            <button type="button" onclick="AdminAnnouncementModule.moveMessage(${index}, 1)" class="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center text-xs transition-colors" title="Move Down">
                                <i class="fa-solid fa-arrow-down"></i>
                            </button>
                        ` : ''}
                        <button type="button" onclick="AdminAnnouncementModule.removeMessage(${index})" class="w-7 h-7 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center text-xs transition-colors" title="Delete Message">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>

                <!-- Fields -->
                <div class="space-y-4">
                    <!-- Text -->
                    <div>
                        <label class="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                            Announcement Text <span class="text-rose-500">*</span>
                        </label>
                        <input type="text" value="${window.KaghanSafe ? window.KaghanSafe.escapeHTML(msg.text || '') : (msg.text || '')}" oninput="AdminAnnouncementModule.updateMessageField(${index}, 'text', this.value)" placeholder="e.g. Book direct on KPH Stay and save 15% on luxury suites!" class="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-white text-slate-800 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all">
                    </div>

                    <!-- Emoji & Icon Selectors -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Emoji Icon</label>
                            <div class="flex items-center gap-2">
                                <input type="text" value="${window.KaghanSafe ? window.KaghanSafe.escapeHTML(msg.emoji || '') : (msg.emoji || '')}" oninput="AdminAnnouncementModule.updateMessageField(${index}, 'emoji', this.value)" placeholder="✨" class="w-16 border border-slate-200 rounded-xl px-2 py-2 text-center text-base bg-white text-slate-800 outline-none focus:border-[#D4AF37]">
                                <div class="flex flex-wrap gap-1 overflow-x-auto">
                                    ${emojiPresets.slice(0, 8).map(em => `
                                        <button type="button" onclick="AdminAnnouncementModule.updateMessageField(${index}, 'emoji', '${em}')" class="w-7 h-7 rounded-lg bg-white border border-slate-200 text-xs hover:scale-110 hover:border-[#D4AF37] transition-all flex items-center justify-center">${em}</button>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">FontAwesome Icon Class (Optional)</label>
                            <div class="relative">
                                <i class="fa-solid ${msg.icon || 'fa-sparkles'} absolute left-3 top-3 text-slate-400 text-xs"></i>
                                <input type="text" value="${window.KaghanSafe ? window.KaghanSafe.escapeHTML(msg.icon || '') : (msg.icon || '')}" oninput="AdminAnnouncementModule.updateMessageField(${index}, 'icon', this.value)" placeholder="fa-sparkles, fa-tag, fa-gift..." class="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs bg-white text-slate-800 outline-none focus:border-[#D4AF37]">
                            </div>
                        </div>
                    </div>

                    <!-- Perk Badge Override & Promo Code for Message -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/50">
                        <div>
                            <label class="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Special Perk Badge (Optional Override)</label>
                            <input type="text" value="${window.KaghanSafe ? window.KaghanSafe.escapeHTML(msg.perkBadge || '') : (msg.perkBadge || '')}" oninput="AdminAnnouncementModule.updateMessageField(${index}, 'perkBadge', this.value)" placeholder="e.g. 15% OFF + FREE BREAKFAST" class="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 outline-none focus:border-[#D4AF37]">
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Promo Code (Optional)</label>
                            <input type="text" value="${window.KaghanSafe ? window.KaghanSafe.escapeHTML(msg.promoCode || '') : (msg.promoCode || '')}" oninput="AdminAnnouncementModule.updateMessageField(${index}, 'promoCode', this.value)" placeholder="e.g. DIRECT15" class="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 outline-none focus:border-[#D4AF37] uppercase">
                        </div>
                    </div>

                    <!-- Action Link / CTA -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200/50">
                        <div>
                            <label class="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Button Text (Optional)</label>
                            <input type="text" value="${window.KaghanSafe ? window.KaghanSafe.escapeHTML(msg.linkText || '') : (msg.linkText || '')}" oninput="AdminAnnouncementModule.updateMessageField(${index}, 'linkText', this.value)" placeholder="e.g. Claim 15% Off" class="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 outline-none focus:border-[#D4AF37]">
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Target URL</label>
                            <input type="text" value="${window.KaghanSafe ? window.KaghanSafe.escapeHTML(msg.linkUrl || '') : (msg.linkUrl || '')}" oninput="AdminAnnouncementModule.updateMessageField(${index}, 'linkUrl', this.value)" placeholder="booking.html, rooms.html..." class="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 outline-none focus:border-[#D4AF37]">
                        </div>
                        <div class="flex items-end pb-1">
                            <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                                <input type="checkbox" ${msg.linkTarget === '_blank' ? 'checked' : ''} onchange="AdminAnnouncementModule.updateMessageField(${index}, 'linkTarget', this.checked ? '_blank' : '_self')" class="w-4 h-4 rounded accent-[#D4AF37] cursor-pointer">
                                <span>Open in new tab</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    updateLivePreview: function() {
        const previewContainer = document.getElementById('announcement-live-preview-bar');
        const previewMsgContainer = document.getElementById('announcement-preview-msg-wrap');
        const previewIndicators = document.getElementById('announcement-preview-indicators');
        if (!previewContainer) return;

        const data = this.currentData;
        const messages = data.messages || [];

        // Apply theme/background styling
        const bg = data.bgColor || '#0B0F19';
        const textColor = data.textColor || '#FFFFFF';
        const accentColor = data.accentColor || '#D4AF37';
        const fontFamily = data.fontFamily === 'serif' ? "'Playfair Display', Georgia, serif" : 
                           data.fontFamily === 'inter' ? "'Inter', sans-serif" : "'Outfit', sans-serif";
        const fontSize = data.fontSize || '12px';

        previewContainer.style.background = bg;
        previewContainer.style.color = textColor;
        previewContainer.style.fontFamily = fontFamily;
        previewContainer.style.fontSize = fontSize;

        if (messages.length === 0) {
            if (previewMsgContainer) {
                previewMsgContainer.innerHTML = `<span class="italic opacity-60">No announcement messages configured</span>`;
            }
            return;
        }

        const safeIndex = Math.min(this.previewIndex, messages.length - 1);
        const msg = messages[safeIndex] || messages[0];

        const badgeBg = data.badgeBg || accentColor;
        const badgeTextColor = data.badgeTextColor || '#0B0F19';
        const badgeText = data.badgeText || (msg.badge || '');

        const safeText = window.KaghanSafe ? window.KaghanSafe.escapeHTML(msg.text || '') : (msg.text || '');
        const emoji = msg.emoji ? `<span class="mr-1 text-sm">${window.KaghanSafe ? window.KaghanSafe.escapeHTML(msg.emoji) : msg.emoji}</span>` : '';
        const icon = msg.icon ? `<i class="fa-solid ${window.KaghanSafe ? window.KaghanSafe.escapeHTML(msg.icon) : msg.icon} mr-1.5" style="color:${accentColor}"></i>` : '';

        // 1. Primary Highlight Badge
        const badgeHtml = badgeText ? `
            <span class="inline-flex items-center text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full mr-1.5 shadow-xs shrink-0" style="background:${badgeBg}; color:${badgeTextColor}">
                ${window.KaghanSafe ? window.KaghanSafe.escapeHTML(badgeText) : badgeText}
            </span>
        ` : '';

        // 2. Special Perks Badge
        const perkBadgeText = msg.perkBadge || (data.perksEnabled ? data.perkBadge || data.perkText : '');
        const perkIcon = msg.perkIcon || data.perkIcon || 'fa-gift';
        const perkHtml = perkBadgeText ? `
            <span class="inline-flex items-center gap-1 text-[9px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full mr-1.5 shadow-xs shrink-0 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 border border-amber-300">
                <i class="fa-solid ${window.KaghanSafe ? window.KaghanSafe.escapeHTML(perkIcon) : perkIcon} text-[9px]"></i>
                <span>${window.KaghanSafe ? window.KaghanSafe.escapeHTML(perkBadgeText) : perkBadgeText}</span>
            </span>
        ` : '';

        // 3. Countdown Timer Preview
        const cdData = this.getLiveCountdownString();
        const countdownHtml = cdData ? `
            <span id="preview-countdown-pill" class="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full mx-1.5 shadow-xs shrink-0 bg-black/40 border border-white/20" style="color:${accentColor}">
                <i class="fa-solid fa-fire text-amber-400 text-[10px] animate-pulse"></i>
                <span class="text-white/80 font-sans text-[9px] hidden sm:inline uppercase">${window.KaghanSafe ? window.KaghanSafe.escapeHTML(cdData.label) : cdData.label}</span>
                <span id="preview-cd-timer-val" class="font-black tracking-wider">${cdData.timeStr || '02d 14h 30m'}</span>
            </span>
        ` : '';

        // 4. CTA Claim Button Preview
        const promoCode = msg.promoCode || data.promoCode || '';
        let safeLinkText = msg.linkText ? (window.KaghanSafe ? window.KaghanSafe.escapeHTML(msg.linkText) : msg.linkText) : (promoCode ? `Claim ${promoCode}` : '');
        const ctaHtml = safeLinkText ? `
            <span class="inline-flex items-center gap-1 font-bold ml-2 px-3 py-0.5 rounded-full text-[11px] shadow-xs shrink-0 cursor-pointer" style="background:${accentColor}; color:${badgeTextColor}">
                ${promoCode ? '<i class="fa-solid fa-tag text-[9px]"></i>' : ''}
                <span>${safeLinkText}</span>
                <i class="fa-solid fa-arrow-right text-[9px]"></i>
            </span>
        ` : '';

        if (previewMsgContainer) {
            previewMsgContainer.innerHTML = `
                <div class="flex flex-wrap items-center justify-center gap-1.5 leading-tight">
                    ${badgeHtml}
                    ${perkHtml}
                    <span class="truncate">${emoji}${icon}${safeText}</span>
                    ${countdownHtml}
                    ${ctaHtml}
                </div>
            `;
        }

        // Render slide indicators & counter
        if (previewIndicators) {
            if (messages.length > 1) {
                previewIndicators.innerHTML = `
                    <div class="flex items-center gap-1 mr-2">
                        ${messages.map((_, i) => `
                            <button type="button" onclick="AdminAnnouncementModule.setPreviewSlide(${i})" class="w-1.5 h-1.5 rounded-full transition-all ${i === safeIndex ? 'w-4' : 'opacity-40'}" style="background:${i === safeIndex ? accentColor : textColor}"></button>
                        `).join('')}
                    </div>
                    <div class="flex items-center gap-0.5">
                        <button type="button" onclick="AdminAnnouncementModule.prevPreviewSlide()" class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] opacity-70 hover:opacity-100 transition-opacity" style="color:${textColor}">
                            <i class="fa-solid fa-chevron-left"></i>
                        </button>
                        <button type="button" onclick="AdminAnnouncementModule.nextPreviewSlide()" class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] opacity-70 hover:opacity-100 transition-opacity" style="color:${textColor}">
                            <i class="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                `;
            } else {
                previewIndicators.innerHTML = '';
            }
        }
    },

    startPreviewRotation: function() {
        clearInterval(this.previewTimer);
        const messages = this.currentData.messages || [];
        if (messages.length > 1) {
            const intervalSec = Math.max(2, parseInt(this.currentData.rotationInterval) || 5);
            this.previewTimer = setInterval(() => {
                this.nextPreviewSlide();
            }, intervalSec * 1000);
        }
    },

    nextPreviewSlide: function() {
        const messages = this.currentData.messages || [];
        if (messages.length <= 1) return;
        this.previewIndex = (this.previewIndex + 1) % messages.length;
        this.updateLivePreview();
    },

    prevPreviewSlide: function() {
        const messages = this.currentData.messages || [];
        if (messages.length <= 1) return;
        this.previewIndex = (this.previewIndex - 1 + messages.length) % messages.length;
        this.updateLivePreview();
    },

    setPreviewSlide: function(index) {
        this.previewIndex = index;
        this.updateLivePreview();
    },

    applyPreset: function(presetKey) {
        const preset = this.presets[presetKey];
        if (!preset) return;

        this.currentData.theme = presetKey;
        this.currentData.bgColor = preset.bgColor;
        this.currentData.textColor = preset.textColor;
        this.currentData.accentColor = preset.accentColor;
        this.currentData.badgeBg = preset.badgeBg;
        this.currentData.badgeTextColor = preset.badgeTextColor;

        this.syncColorInputs();
        this.updateLivePreview();

        document.querySelectorAll('.announcement-preset-btn').forEach(btn => {
            if (btn.dataset.preset === presetKey) {
                btn.classList.add('ring-2', 'ring-[#D4AF37]', 'ring-offset-2');
            } else {
                btn.classList.remove('ring-2', 'ring-[#D4AF37]', 'ring-offset-2');
            }
        });
    },

    addMessage: function() {
        if (!this.currentData.messages) this.currentData.messages = [];
        this.currentData.messages.push({
            id: `msg-${Date.now()}`,
            emoji: '✨',
            icon: 'fa-sparkles',
            text: 'Special VIP perk available for your next reservation!',
            linkText: 'Explore Perks',
            linkUrl: 'rooms.html',
            linkTarget: '_self',
            promoCode: '',
            perkBadge: 'VIP AMENITY'
        });
        this.renderMessageFeedList();
        this.previewIndex = this.currentData.messages.length - 1;
        this.updateLivePreview();
        this.startPreviewRotation();
    },

    removeMessage: function(index) {
        if (!this.currentData.messages) return;
        this.currentData.messages.splice(index, 1);
        this.previewIndex = 0;
        this.renderMessageFeedList();
        this.updateLivePreview();
        this.startPreviewRotation();
    },

    moveMessage: function(index, direction) {
        const messages = this.currentData.messages;
        if (!messages) return;
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= messages.length) return;
        const temp = messages[index];
        messages[index] = messages[newIndex];
        messages[newIndex] = temp;
        this.previewIndex = newIndex;
        this.renderMessageFeedList();
        this.updateLivePreview();
    },

    updateMessageField: function(index, field, value) {
        if (!this.currentData.messages || !this.currentData.messages[index]) return;
        this.currentData.messages[index][field] = value;
        this.previewIndex = index;
        this.updateLivePreview();
    },

    onFieldChange: function(field, value) {
        this.currentData[field] = value;
        if (field === 'rotationInterval') {
            const lbl = document.getElementById('announcement-interval-val');
            if (lbl) lbl.textContent = `${value}s`;
            this.startPreviewRotation();
        }
        this.updateLivePreview();
    },

    saveAnnouncementSettings: async function() {
        const btn = document.getElementById('save-announcement-btn');
        const originalHtml = btn ? btn.innerHTML : 'Save Settings';
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-1.5"></i> Saving...';
            btn.disabled = true;
        }

        try {
            // Read core toggles
            const toggle = document.getElementById('announcement-active-toggle');
            if (toggle) this.currentData.active = toggle.checked;

            const dismissToggle = document.getElementById('announcement-dismissible-toggle');
            if (dismissToggle) this.currentData.dismissible = dismissToggle.checked;

            const fontSelect = document.getElementById('announcement-font-select');
            if (fontSelect) this.currentData.fontFamily = fontSelect.value;

            const sizeSelect = document.getElementById('announcement-size-select');
            if (sizeSelect) this.currentData.fontSize = sizeSelect.value;

            const badgeInput = document.getElementById('announcement-badge-text');
            if (badgeInput) this.currentData.badgeText = badgeInput.value.trim();

            const intervalInput = document.getElementById('announcement-interval-input');
            if (intervalInput) this.currentData.rotationInterval = parseInt(intervalInput.value) || 5;

            // Special Perks fields
            const perksToggle = document.getElementById('announcement-perks-toggle');
            if (perksToggle) this.currentData.perksEnabled = perksToggle.checked;

            const perkBadgeInput = document.getElementById('announcement-perk-badge');
            if (perkBadgeInput) this.currentData.perkBadge = perkBadgeInput.value.trim();

            const perkTextInput = document.getElementById('announcement-perk-text');
            if (perkTextInput) this.currentData.perkText = perkTextInput.value.trim();

            const perkIconInput = document.getElementById('announcement-perk-icon');
            if (perkIconInput) this.currentData.perkIcon = perkIconInput.value.trim();

            // Limited-Time Countdown Timer fields
            const cdToggle = document.getElementById('announcement-countdown-toggle');
            if (cdToggle) this.currentData.countdownEnabled = cdToggle.checked;

            const cdExpiryInput = document.getElementById('announcement-countdown-expiry');
            if (cdExpiryInput) this.currentData.countdownExpiry = cdExpiryInput.value;

            const cdLabelInput = document.getElementById('announcement-countdown-label');
            if (cdLabelInput) this.currentData.countdownLabel = cdLabelInput.value.trim();

            // Promo Code fields
            const promoInput = document.getElementById('announcement-promo-code');
            if (promoInput) this.currentData.promoCode = promoInput.value.trim().toUpperCase();

            const discInput = document.getElementById('announcement-discount-pct');
            if (discInput) this.currentData.discountPercent = parseInt(discInput.value, 10) || 0;

            const claimActionSelect = document.getElementById('announcement-claim-action');
            if (claimActionSelect) this.currentData.claimAction = claimActionSelect.value;

            // Colors
            const bgInput = document.getElementById('announcement-bg-color');
            const textInput = document.getElementById('announcement-text-color');
            const accentInput = document.getElementById('announcement-accent-color');
            const badgeBgInput = document.getElementById('announcement-badge-bg');
            const badgeTextInput = document.getElementById('announcement-badge-text-color');

            if (bgInput) this.currentData.bgColor = bgInput.value;
            if (textInput) this.currentData.textColor = textInput.value;
            if (accentInput) this.currentData.accentColor = accentInput.value;
            if (badgeBgInput) this.currentData.badgeBg = badgeBgInput.value;
            if (badgeTextInput) this.currentData.badgeTextColor = badgeTextInput.value;

            // Ensure clean messages
            if (!Array.isArray(this.currentData.messages) || this.currentData.messages.length === 0) {
                this.currentData.messages = [
                    {
                        id: 'msg-1',
                        emoji: '✨',
                        icon: 'fa-sparkles',
                        text: 'Welcome to KPH Stay - Luxury Living in Islamabad & Nathia Gali.',
                        linkText: 'Explore',
                        linkUrl: 'rooms.html',
                        linkTarget: '_self',
                        promoCode: this.currentData.promoCode || 'DIRECT15',
                        perkBadge: this.currentData.perkBadge || 'VIP 15% OFF'
                    }
                ];
            }

            // Save to Firestore
            await window.KaghanDB.saveAnnouncement(this.currentData);

            if (window.KaghanUI && window.KaghanUI.showToast) {
                window.KaghanUI.showToast("Announcement Bar perks & limited offers published live!", "success");
            } else {
                alert("Announcement Bar updated successfully!");
            }
        } catch(e) {
            console.error("Failed to save announcement bar:", e);
            if (window.KaghanUI && window.KaghanUI.showToast) {
                window.KaghanUI.showToast("Error saving announcement bar: " + e.message, "error");
            } else {
                alert("Failed to save announcement bar: " + e.message);
            }
        } finally {
            if (btn) {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }
        }
    }
};

// Global helper bindings
window.saveAnnouncementSettings = () => window.AdminAnnouncementModule.saveAnnouncementSettings();
