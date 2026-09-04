// Kaghan Hotel Management System - Admin Dashboard Orchestrator

// Ensure KaghanUI.showToast exists (fallback in case shared.js version differs)
if (window.KaghanUI && !window.KaghanUI.showToast) {
    window.KaghanUI.showToast = function(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        const colors = { success: 'bg-emerald-500', error: 'bg-rose-500', info: 'bg-slate-700', warning: 'bg-amber-500' };
        const icons = { success: 'fa-check-circle', error: 'fa-circle-xmark', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
        const toast = document.createElement('div');
        toast.className = `${colors[type] || colors.info} text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 pointer-events-auto animate-fade-up`;
        const icon = document.createElement('i');
        icon.className = `fa-solid ${icons[type] || icons.info}`;
        toast.appendChild(icon);
        const text = document.createTextNode(` ${message}`);
        toast.appendChild(text);
        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(8px)'; toast.style.transition = 'all 0.4s ease'; setTimeout(() => toast.remove(), 400); }, 3500);
    };
}



if (window.KaghanDB) {
    window.KaghanDB.getNewsletterSubscribers = async () => {
        if (window.KaghanDB_Cache.newsletter) return window.KaghanDB_Cache.newsletter;
        try {
            const snap = await firebase.firestore().collection('newsletter').get();
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            return list.sort((a, b) => new Date(b.subscribedAt) - new Date(a.subscribedAt));
        } catch(e) {
            console.warn("getNewsletterSubscribers notice:", e.message);
            return window.KaghanDB_Cache.newsletter || [];
        }
    };
}

// Role & Section Permission Mapping for Admin Console
const DEFAULT_ROLE_PERMS = {
    admin: ['manage_bookings', 'manage_rooms', 'manage_reviews', 'manage_guests', 'manage_discounts', 'manage_settings', 'manage_seo'],
    moderator: ['manage_bookings', 'manage_reviews', 'manage_guests', 'manage_seo'],
    editor: ['manage_rooms', 'manage_discounts', 'manage_reviews', 'manage_seo'],
    user: []
};

const TAB_PERMISSIONS = {
    overview: ['manage_settings'],
    bookings: ['manage_bookings'],
    'booking-details': ['manage_bookings'],
    messages: ['manage_bookings'],
    inquiries: ['manage_bookings'],
    calendar: ['manage_bookings'],
    rooms: ['manage_rooms'],
    guests: ['manage_guests'],
    newsletter: ['manage_guests'],
    reviews: ['manage_reviews'],
    blogs: ['manage_rooms'],
    coupons: ['manage_discounts'],
    settings: ['manage_settings'],
    announcement: ['manage_settings'],
    seo: ['manage_settings']
};

const ALL_TABS = ['overview', 'bookings', 'booking-details', 'messages', 'inquiries', 'calendar', 'rooms', 'guests', 'newsletter', 'reviews', 'blogs', 'coupons', 'announcement', 'settings', 'seo'];

function getUserPermissions(user) {
    if (!user) return [];
    if (user.role === 'admin') return DEFAULT_ROLE_PERMS.admin;
    if (Array.isArray(user.permissions) && user.permissions.length > 0) return user.permissions;
    return DEFAULT_ROLE_PERMS[user.role] || [];
}

window.hasPermissionForTab = (user, tabName) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const requiredPerms = TAB_PERMISSIONS[tabName] || [];
    if (requiredPerms.length === 0) return true;
    const userPerms = getUserPermissions(user);
    return requiredPerms.some(p => userPerms.includes(p));
};

function getFirstAllowedTab(user) {
    return ALL_TABS.find(t => window.hasPermissionForTab(user, t)) || 'rooms';
}

function applyRolePermissionsUI() {
    const sessionUser = KaghanDB.getCurrentUser();
    if (!sessionUser) return;

    // Set sidebar name & role badge
    const nameEl = document.getElementById('sidebar-admin-name');
    if (nameEl) nameEl.innerText = sessionUser.name || 'Staff Member';

    const roleBadgeEl = document.querySelector('#admin-sidebar .text-\\[9px\\].text-\\[\\#D4AF37\\].uppercase');
    if (roleBadgeEl) {
        const roleTitles = { admin: 'Resort Manager', moderator: 'Moderator Staff', editor: 'Content Editor' };
        roleBadgeEl.innerText = roleTitles[sessionUser.role] || 'Staff Member';
    }

    // Filter sidebar navigation buttons
    ALL_TABS.forEach(tabName => {
        const btn = document.getElementById(`tab-btn-${tabName}`);
        if (btn) {
            if (window.hasPermissionForTab(sessionUser, tabName)) {
                btn.style.display = 'flex';
            } else {
                btn.style.display = 'none';
            }
        }
    });

    // Filter bottom/mobile nav buttons
    const mobileNavButtons = document.querySelectorAll('footer button[onclick*="switchTab"]');
    mobileNavButtons.forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick') || '';
        const match = onclickAttr.match(/switchTab\('([^']+)'\)/);
        if (match && match[1]) {
            const tName = match[1];
            if (!window.hasPermissionForTab(sessionUser, tName)) {
                btn.style.display = 'none';
            } else {
                btn.style.display = 'flex';
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Quick synchronous localStorage check — redirects immediately if not logged in at all
    const sessionUser = KaghanDB.getCurrentUser();
    if (!sessionUser) {
        window.location.href = '../login.html';
        return;
    }
    const ADMIN_STAFF_ROLES = ['admin', 'moderator', 'editor'];
    if (!ADMIN_STAFF_ROLES.includes(sessionUser.role)) {
        window.location.href = '../user/index.html';
        return;
    }

    applyRolePermissionsUI();

    // ⚡ 0ms SWR Instant Admin Dashboard Load
    initAdminDashboard();
    setupEventListeners();
    setupActiveDatabaseListeners();

    // Background Auth Token Verification & Real-time Sync
    let authChecked = false;
    firebase.auth().onAuthStateChanged(async (firebaseUser) => {
        if (authChecked) return;

        if (!firebaseUser) {
            // Give Firebase Auth SDK a grace period on fresh page loads before redirecting
            setTimeout(() => {
                if (!firebase.auth().currentUser && !KaghanDB.getCurrentUser()) {
                    localStorage.removeItem('kaghan_hotel_session');
                    window.location.href = '../login.html';
                }
            }, 1500);
            return;
        }

        authChecked = true;

        // Verify live user profile in Firestore
        try {
            const userDoc = await firebase.firestore().collection('users').doc(firebaseUser.uid).get();
            if (userDoc.exists) {
                const liveData = userDoc.data();
                if (ADMIN_STAFF_ROLES.includes(liveData.role)) {
                    localStorage.setItem('kaghan_hotel_session', JSON.stringify(liveData));
                } else {
                    localStorage.removeItem('kaghan_hotel_session');
                    window.location.href = '../user/index.html';
                    return;
                }
            } else {
                // Check by email if doc(uid) not found directly
                const cleanEmail = (firebaseUser.email || '').toLowerCase().trim();
                if (cleanEmail) {
                    const snap = await firebase.firestore().collection('users').where('email', '==', cleanEmail).limit(1).get();
                    if (!snap.empty) {
                        const liveData = snap.docs[0].data();
                        await firebase.firestore().collection('users').doc(firebaseUser.uid).set({ ...liveData, uid: firebaseUser.uid }, { merge: true });
                        if (ADMIN_STAFF_ROLES.includes(liveData.role)) {
                            localStorage.setItem('kaghan_hotel_session', JSON.stringify(liveData));
                        } else {
                            window.location.href = '../user/index.html';
                            return;
                        }
                    }
                }
            }
            await firebaseUser.getIdToken(true);
        } catch(e) {
            console.warn("Auth token sync notice:", e.message);
        }
    });
});

async function initAdminDashboard() {
    applyRolePermissionsUI();

    const sessionUser = KaghanDB.getCurrentUser();
    const urlParams = new URLSearchParams(window.location.search);
    let initialTab = urlParams.get('tab');

    // Support direct booking view via query ?booking=BK-XXXX or ?id=BK-XXXX or hash
    const bookingParam = urlParams.get('booking') || urlParams.get('id');
    let hashBookingId = null;
    if (window.location.hash && window.location.hash.includes('booking')) {
        const hashMatch = window.location.hash.match(/[?&]id=([^&]+)/);
        if (hashMatch) hashBookingId = decodeURIComponent(hashMatch[1]);
    }
    const directBookingId = bookingParam || hashBookingId;

    if (directBookingId) {
        initialTab = 'booking-details';
    } else if (!initialTab || !window.hasPermissionForTab(sessionUser, initialTab)) {
        initialTab = getFirstAllowedTab(sessionUser);
    }

    window.switchTab(initialTab);

    // Register forms in inventory module
    if (window.AdminInventoryModule) {
        window.AdminInventoryModule.initForms();
    }
    if (window.AdminBlogsModule) {
        window.AdminBlogsModule.init();
    }
    if (window.AdminMessagingModule) {
        window.AdminMessagingModule.init();
    }

    await refreshAll();

    if (directBookingId && window.openBookingDetails) {
        setTimeout(() => {
            window.openBookingDetails(directBookingId);
        }, 80);
    }
}

async function refreshAll() {
    const sessionUser = KaghanDB.getCurrentUser();
    try {
        if (window.hasPermissionForTab(sessionUser, 'overview')) {
            await renderMetrics();
            await renderOverviewBookings();
        }
        
        if (window.hasPermissionForTab(sessionUser, 'bookings') && window.AdminBookingsModule) {
            await window.AdminBookingsModule.render();
        }
        if (window.hasPermissionForTab(sessionUser, 'rooms') && window.AdminInventoryModule) {
            await window.AdminInventoryModule.render();
        }
        if (window.hasPermissionForTab(sessionUser, 'guests') && window.AdminGuestsModule) {
            await window.AdminGuestsModule.render();
        }
        if (window.hasPermissionForTab(sessionUser, 'reviews') && window.AdminReviewsModule) {
            await window.AdminReviewsModule.render();
        }
        if (window.hasPermissionForTab(sessionUser, 'blogs') && window.AdminBlogsModule) {
            await window.AdminBlogsModule.render();
        }
        if (window.hasPermissionForTab(sessionUser, 'seo') && window.AdminSEOModule) {
            await window.AdminSEOModule.render();
        }
        if (window.hasPermissionForTab(sessionUser, 'announcement') && window.AdminAnnouncementModule) {
            await window.AdminAnnouncementModule.init();
        }
        if (window.hasPermissionForTab(sessionUser, 'newsletter')) {
            await renderNewsletter();
        }
    } catch(e) {
        if (e && e.code !== 'permission-denied' && !String(e).includes('permission')) {
            console.warn("Refresh all admin views notice:", e.message || e);
        }
    }
}

function setupEventListeners() {
    const bookingSearch = document.getElementById('booking-search-input');
    const bookingStatus = document.getElementById('booking-filter-status');
    if (bookingSearch) bookingSearch.addEventListener('input', () => {
        if (window.AdminBookingsModule) window.AdminBookingsModule.render();
    });
    if (bookingStatus) bookingStatus.addEventListener('change', () => {
        if (window.AdminBookingsModule) window.AdminBookingsModule.render();
    });

    const guestSearch = document.getElementById('guest-search-input');
    if (guestSearch) guestSearch.addEventListener('input', () => {
        if (window.AdminGuestsModule) window.AdminGuestsModule.render(guestSearch.value);
    });

    const reviewSearch = document.getElementById('review-search-input');
    if (reviewSearch) reviewSearch.addEventListener('input', () => {
        if (window.AdminReviewsModule) window.AdminReviewsModule.render();
    });

    const newsletterSearch = document.getElementById('newsletter-search-input');
    if (newsletterSearch) newsletterSearch.addEventListener('input', () => renderNewsletter(newsletterSearch.value));
}

// Switch tabs and load details
window.switchTab = (tabName) => {
    const sessionUser = KaghanDB.getCurrentUser();
    if (sessionUser && !window.hasPermissionForTab(sessionUser, tabName)) {
        const allowedTab = getFirstAllowedTab(sessionUser);
        KaghanUI.showToast(`Access Denied: You do not have permission to view '${tabName}'.`, "warning");
        if (allowedTab && allowedTab !== tabName) {
            return window.switchTab(allowedTab);
        }
        return;
    }

    const views = document.querySelectorAll('.tab-view');
    views.forEach(v => v.classList.add('hidden'));

    const activeView = document.getElementById(`view-${tabName}`);
    if (activeView) activeView.classList.remove('hidden');

    if (tabName === 'seo' && window.AdminSEOModule) {
        window.AdminSEOModule.render();
    }
    if (tabName === 'announcement' && window.AdminAnnouncementModule) {
        window.AdminAnnouncementModule.render();
    }
    if (tabName === 'inquiries' && window.KaghanInquiries) {
        window.KaghanInquiries.loadInquiries();
    }
    if (tabName === 'calendar') {
        if (window.AirbnbCalendarSystem) {
            window.AirbnbCalendarSystem.render();
        } else if (window.AdminBookingsModule) {
            window.AdminBookingsModule.renderCalendar();
        }
    }
    if (tabName === 'coupons' && window.AdminCouponsModule) {
        window.AdminCouponsModule.init();
        window.AdminCouponsModule.render();
    }
    if (tabName === 'settings' && window.AdminSettingsPaymentModule) {
        window.AdminSettingsPaymentModule.render();
    }

    const buttons = document.querySelectorAll('#sidebar-nav button');
    buttons.forEach(btn => {
        btn.classList.remove('sidebar-active');
        btn.classList.add('text-slate-400', 'hover:text-white', 'hover:bg-slate-800/20');
    });

    const activeNavTab = tabName === 'booking-details' ? 'bookings' : tabName;
    const activeBtn = document.getElementById(`tab-btn-${activeNavTab}`);
    if (activeBtn) {
        activeBtn.classList.add('sidebar-active');
        activeBtn.classList.remove('text-slate-400', 'hover:text-white', 'hover:bg-slate-800/20');
        const tabLabel = document.getElementById('admin-current-tab-label');
        if (tabLabel) {
            tabLabel.textContent = tabName === 'booking-details' ? 'Booking Details' : activeBtn.textContent.trim();
        }
    }

    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar && window.innerWidth < 768) {
        const isOpen = sidebar.style.transform === 'translateX(0px)' || sidebar.style.transform === 'translateX(0)';
        if (isOpen) window.toggleSidebar();
    }
};

window.toggleSidebar = () => {
    const sidebar = document.getElementById('admin-sidebar');
    const backdrop = document.getElementById('admin-sidebar-backdrop');
    if (!sidebar) return;
    const isOpen = sidebar.style.transform === 'translateX(0px)' || sidebar.style.transform === 'translateX(0)';
    if (isOpen) {
        sidebar.style.transform = 'translateX(-100%)';
        if (backdrop) backdrop.classList.add('hidden');
    } else {
        sidebar.style.transform = 'translateX(0)';
        if (backdrop) backdrop.classList.remove('hidden');
    }
};

// Render overview dashboard numbers
async function renderMetrics() {
    try {
        const bookings = (await KaghanDB.getBookings()) || [];
        const rooms = (await KaghanDB.getRooms()) || [];
        const users = (await KaghanDB.getUsers()) || [];
        const activeUsers = users.filter(u => u.role === 'user');

        // Revenue = sum of confirmed and completed stays
        const totalRevenue = bookings
            .filter(b => b.status === 'confirmed' || b.status === 'completed')
            .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

        // Occupancy Rate = % of rooms currently active ('confirmed')
        const activeStays = bookings.filter(b => b.status === 'confirmed').length;
        const occupancyRate = rooms.length > 0 ? Math.round((activeStays / rooms.length) * 100) : 0;

        const revEl = document.getElementById('metric-revenue');
        const occEl = document.getElementById('metric-occupancy');
        const bkEl = document.getElementById('metric-bookings');
        const usrEl = document.getElementById('metric-users');

        if (revEl) revEl.innerText = KaghanUI.formatPKR(totalRevenue);
        if (occEl) occEl.innerText = `${occupancyRate}%`;
        if (bkEl) bkEl.innerText = bookings.length;
        if (usrEl) usrEl.innerText = activeUsers.length;

        renderCharts(bookings, rooms);
    } catch(e) {
        if (e && e.code !== 'permission-denied' && !String(e).includes('permission')) {
            console.warn("Metrics render notice:", e.message || e);
        }
    }
}

// Global chart variables to allow updates instead of destroying
let revenueChartInstance = null;
let statusChartInstance = null;
let suiteRevenueChartInstance = null;
let occupancyTrendChartInstance = null;

function renderCharts(bookings, rooms) {
    if (typeof ApexCharts === 'undefined') return;

    // 1. REVENUE TREND (AREA CHART)
    const monthlyRevenue = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    bookings.forEach(b => {
        if (b.status === 'confirmed' || b.status === 'completed') {
            const date = new Date(b.createdAt || b.timestamp || Date.now());
            monthlyRevenue[date.getMonth()] += b.totalPrice;
        }
    });

    const revOptions = {
        series: [{ name: 'Revenue', data: monthlyRevenue }],
        chart: { type: 'area', height: 320, toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
        colors: ['#D4AF37'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] },
        yaxis: { labels: { formatter: (val) => "PKR " + (val / 1000).toFixed(0) + "k" } },
        theme: { mode: 'light' }
    };

    if (revenueChartInstance) {
        revenueChartInstance.updateSeries([{ data: monthlyRevenue }]);
    } else {
        const revEl = document.querySelector("#revenue-chart");
        if (revEl) {
            revenueChartInstance = new ApexCharts(revEl, revOptions);
            revenueChartInstance.render();
        }
    }

    // 2. BOOKING STATUS (DONUT CHART)
    let confirmed = 0, pending = 0, cancelled = 0, completed = 0;
    bookings.forEach(b => {
        if (b.status === 'confirmed') confirmed++;
        else if (b.status === 'pending') pending++;
        else if (b.status === 'cancelled') cancelled++;
        else if (b.status === 'completed') completed++;
    });

    const statusOptions = {
        series: [confirmed, pending, cancelled, completed],
        labels: ['Confirmed', 'Pending', 'Cancelled', 'Completed'],
        chart: { type: 'donut', height: 320, fontFamily: 'Inter, sans-serif' },
        colors: ['#10B981', '#F59E0B', '#EF4444', '#3B82F6'],
        plotOptions: { donut: { size: '75%' } },
        dataLabels: { enabled: false },
        legend: { position: 'bottom' }
    };

    if (statusChartInstance) {
        statusChartInstance.updateSeries([confirmed, pending, cancelled, completed]);
    } else {
        const statEl = document.querySelector("#status-chart");
        if (statEl) {
            statusChartInstance = new ApexCharts(statEl, statusOptions);
            statusChartInstance.render();
        }
    }

    // 3. SUITE REVENUE CONTRIBUTION (HORIZONTAL BAR CHART)
    const roomMap = {};
    rooms.forEach(r => { roomMap[r.id] = r.type || 'Standard Suite'; });

    const typeRevenue = {};
    bookings.forEach(b => {
        if (b.status === 'confirmed' || b.status === 'completed') {
            const rType = roomMap[b.roomId] || 'Other Suite';
            typeRevenue[rType] = (typeRevenue[rType] || 0) + b.totalPrice;
        }
    });

    const categories = Object.keys(typeRevenue);
    const revenueValues = Object.values(typeRevenue);

    const suiteRevOptions = {
        series: [{ name: 'Revenue Contribution', data: revenueValues }],
        chart: { type: 'bar', height: 320, toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
        plotOptions: { bar: { horizontal: true, borderRadius: 8, barHeight: '55%' } },
        colors: ['#D4AF37'],
        dataLabels: { enabled: true, formatter: (val) => "PKR " + (val / 1000).toFixed(0) + "k", style: { colors: ['#fff'], fontSize: '10px' } },
        xaxis: { categories: categories, labels: { formatter: (val) => "PKR " + (val / 1000).toFixed(0) + "k" } },
        grid: { borderColor: '#f1f1f1' }
    };

    if (suiteRevenueChartInstance) {
        suiteRevenueChartInstance.updateSeries([{ data: revenueValues }]);
        suiteRevenueChartInstance.updateOptions({ xaxis: { categories: categories } });
    } else {
        const suiteEl = document.querySelector("#room-revenue-chart");
        if (suiteEl) {
            suiteRevenueChartInstance = new ApexCharts(suiteEl, suiteRevOptions);
            suiteRevenueChartInstance.render();
        }
    }

    // 4. OCCUPANCY RATE TIMELINE (AREA CHART)
    const days = [];
    const occupancyRates = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        days.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));

        let occupiedRooms = 0;
        bookings.forEach(b => {
            if (b.status === 'confirmed' && dateStr >= b.checkIn && dateStr <= b.checkOut) {
                occupiedRooms++;
            }
        });
        const rate = rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0;
        occupancyRates.push(rate);
    }

    const occTrendOptions = {
        series: [{ name: 'Occupancy Rate', data: occupancyRates }],
        chart: { type: 'area', height: 320, toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
        colors: ['#3B82F6'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.02, stops: [0, 100] } },
        stroke: { curve: 'smooth', width: 3 },
        xaxis: { categories: days },
        yaxis: { min: 0, max: 100, labels: { formatter: (val) => val + "%" } },
        grid: { borderColor: '#f1f1f1' }
    };

    if (occupancyTrendChartInstance) {
        occupancyTrendChartInstance.updateSeries([{ data: occupancyRates }]);
        occupancyTrendChartInstance.updateOptions({ xaxis: { categories: days } });
    } else {
        const occTrendEl = document.querySelector("#occupancy-trend-chart");
        if (occTrendEl) {
            occupancyTrendChartInstance = new ApexCharts(occTrendEl, occTrendOptions);
            occupancyTrendChartInstance.render();
        }
    }
}

// Render Overview tab list of stays
async function renderOverviewBookings() {
    try {
        const bookings = (await KaghanDB.getBookings()) || [];
        const rooms = (await KaghanDB.getRooms()) || [];
        const tbody = document.getElementById('overview-bookings-tbody');

        if (!tbody) return;

        if (bookings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400 text-xs">No recent bookings.</td></tr>`;
            return;
        }

    const recentBookings = bookings.slice(0, 5);
    tbody.innerHTML = recentBookings.map(booking => {
        const room = rooms.find(r => r.id === booking.roomId) || { name: 'Unknown Suite' };
        
        let statusBadge = '';
        if (booking.status === 'confirmed') {
            statusBadge = '<span class="bg-emerald-50 text-emerald-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-200">Confirmed</span>';
        } else if (booking.status === 'completed') {
            statusBadge = '<span class="bg-blue-50 text-blue-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-blue-200">Completed</span>';
        } else {
            statusBadge = '<span class="bg-rose-50 text-rose-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-rose-200">Cancelled</span>';
        }

        const isWalkin = booking.userId === 'usr-guest-walkin';
        const guestBadge = isWalkin 
            ? `<span class="bg-slate-100 text-slate-700 border border-slate-300 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ml-2">Walk-in</span>`
            : `<span class="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ml-2">Member</span>`;

        return `
            <tr onclick="window.openBookingDetails ? window.openBookingDetails('${booking.id}') : (window.switchTab && window.switchTab('bookings'))" class="border-b border-slate-100 hover:bg-amber-50/40 transition-colors cursor-pointer group">
                <td class="px-6 py-4 text-xs font-bold text-[#D4AF37] uppercase font-mono group-hover:underline">${KaghanSafe.escapeHTML(booking.id)}</td>
                <td class="px-6 py-4">
                    <span class="font-bold text-slate-800 text-xs flex items-center group-hover:text-[#D4AF37] transition-colors">
                        ${KaghanSafe.escapeHTML(booking.guestName)}
                        ${guestBadge}
                    </span>
                </td>
                <td class="px-6 py-4 text-xs text-slate-600 font-medium">${KaghanSafe.escapeHTML(room.name)}</td>
                <td class="px-6 py-4 text-[11px] text-slate-500">
                    ${KaghanUI.formatDate(booking.checkIn)} to ${KaghanUI.formatDate(booking.checkOut)}
                </td>
                <td class="px-6 py-4 font-bold text-slate-800 text-xs font-mono">${KaghanUI.formatPKR(booking.totalPrice)}</td>
                <td class="px-6 py-4">${statusBadge}</td>
            </tr>
        `;
    }).join('');
    } catch(e) {
        console.warn("Overview bookings render notice:", e);
    }
}

// Render newsletter list
async function renderNewsletter(searchKeyword = '') {
    const subscribers = await KaghanDB.getNewsletterSubscribers();
    const tbody = document.getElementById('admin-newsletter-tbody');
    const emptyState = document.getElementById('newsletter-empty-state');

    if (!tbody) return;

    const filtered = subscribers.filter(s => {
        const keyword = searchKeyword.toLowerCase().trim();
        return !keyword || s.email.toLowerCase().includes(keyword);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    tbody.innerHTML = filtered.map(sub => {
        const escapedEmail = KaghanSafe.escapeHTML(sub.email);
        return `
            <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 text-sm font-semibold text-slate-800">${escapedEmail}</td>
                <td class="px-6 py-4 text-xs text-slate-500">${KaghanUI.formatDate(sub.subscribedAt)}</td>
                <td class="px-6 py-4 flex gap-2">
                    <button data-email="${escapedEmail}" onclick="removeSubscriber(this.dataset.email)" class="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-rose-600 hover:text-white transition-all flex items-center gap-1.5">
                        <i class="fa-solid fa-trash-can text-[9px]"></i> Remove
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

window.removeSubscriber = async (email) => {
    if (!confirm(`Are you sure you want to remove "${email}" from the newsletter subscription list?`)) return;

    try {
        await KaghanDB.deleteNewsletterSubscriber(email);
        KaghanUI.showToast('Subscriber removed successfully.', 'success');
        await renderNewsletter();
    } catch (err) {
        console.error("Error removing subscriber:", err);
        KaghanUI.showToast(err.message || 'Failed to remove subscriber.', 'error');
    }
};

window.sendNewsletterBroadcast = async (event) => {
    event.preventDefault();
    
    const subjectInput = document.getElementById('newsletter-subject');
    const bodyInput = document.getElementById('newsletter-body');
    const submitBtn = document.getElementById('broadcast-submit-btn');

    if (!subjectInput || !bodyInput) return;

    const subject = subjectInput.value.trim();
    const htmlBody = bodyInput.value.trim();

    if (!subject || !htmlBody) {
        KaghanUI.showToast('Please fill out both Subject and Content.', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to broadcast this newsletter campaign to all subscribers?`)) {
        return;
    }

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-xs"></i> Broadcasting Campaign...`;
        }

        const fdb = firebase.firestore();
        await fdb.collection('newsletters').add({
            subject,
            content: htmlBody,
            sentAt: new Date().toISOString()
        });

        KaghanUI.showToast('Newsletter broadcast recorded and queued successfully!', 'success');
        
        // Reset form
        subjectInput.value = '';
        bodyInput.value = '';
        
    } catch (err) {
        console.error("Newsletter broadcast error:", err);
        KaghanUI.showToast(err.message || 'Failed to dispatch broadcast campaign.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane text-xs"></i> Send to All Subscribers`;
        }
    }
};

function setupActiveDatabaseListeners() {
    window.addEventListener('kaghan-db-rooms', async () => {
        if (window.AdminInventoryModule) await window.AdminInventoryModule.render();
        await renderMetrics();
        await renderOverviewBookings();
    });

    window.addEventListener('kaghan-db-bookings', async () => {
        if (window.AdminBookingsModule) await window.AdminBookingsModule.render();
        await renderOverviewBookings();
        await renderMetrics();
    });

    window.addEventListener('kaghan-db-reviews', async () => {
        if (window.AdminReviewsModule) await window.AdminReviewsModule.render();
    });

    window.addEventListener('kaghan-db-blogs', async () => {
        if (window.AdminBlogsModule) await window.AdminBlogsModule.render();
    });

    window.addEventListener('kaghan-db-users', async () => {
        if (window.AdminGuestsModule) await window.AdminGuestsModule.render();
        await renderMetrics();
    });

    window.addEventListener('kaghan-db-newsletter', async () => {
        await renderNewsletter();
    });
}

// Export refresh for global use
window.AdminDashboardModule = {
    refreshAll
};

// End of Admin Dashboard Orchestrator
