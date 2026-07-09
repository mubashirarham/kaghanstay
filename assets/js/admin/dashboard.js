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
        toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${message}`;
        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(8px)'; toast.style.transition = 'all 0.4s ease'; setTimeout(() => toast.remove(), 400); }, 3500);
    };
}



if (window.KaghanDB) {
    window.KaghanDB.getNewsletterSubscribers = async () => {
        const snap = await firebase.firestore().collection('newsletter').get();
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        return list.sort((a, b) => new Date(b.subscribedAt) - new Date(a.subscribedAt));
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    // Guard route: ensure logged-in user with role 'admin'
    if (!KaghanDB.guardRoute('admin')) {
        return;
    }

    // Set admin name in sidebar
    const user = KaghanDB.getCurrentUser();
    if (user && document.getElementById('sidebar-admin-name')) {
        document.getElementById('sidebar-admin-name').innerText = user.name;
    }

    await initAdminDashboard();
    setupEventListeners();
    setupActiveDatabaseListeners();
});

async function initAdminDashboard() {
    // Register forms in inventory module
    if (window.AdminInventoryModule) {
        window.AdminInventoryModule.initForms();
    }
    if (window.AdminBlogsModule) {
        window.AdminBlogsModule.init();
    }

    await refreshAll();
}

async function refreshAll() {
    await renderMetrics();
    await renderOverviewBookings();
    
    // Core modules
    if (window.AdminBookingsModule) await window.AdminBookingsModule.render();
    if (window.AdminInventoryModule) await window.AdminInventoryModule.render();
    if (window.AdminGuestsModule) await window.AdminGuestsModule.render();
    if (window.AdminReviewsModule) await window.AdminReviewsModule.render();
    if (window.AdminBlogsModule) await window.AdminBlogsModule.render();
    await renderNewsletter();
}

function setupEventListeners() {
    // Bookings Manager tab search & filters
    const bookingSearch = document.getElementById('booking-search-input');
    const bookingStatus = document.getElementById('booking-filter-status');
    if (bookingSearch) bookingSearch.addEventListener('input', () => {
        if (window.AdminBookingsModule) window.AdminBookingsModule.render();
    });
    if (bookingStatus) bookingStatus.addEventListener('change', () => {
        if (window.AdminBookingsModule) window.AdminBookingsModule.render();
    });

    // Guest Registry search
    const guestSearch = document.getElementById('guest-search-input');
    if (guestSearch) guestSearch.addEventListener('input', () => {
        if (window.AdminGuestsModule) window.AdminGuestsModule.render(guestSearch.value);
    });

    // Reviews search
    const reviewSearch = document.getElementById('review-search-input');
    if (reviewSearch) reviewSearch.addEventListener('input', () => {
        if (window.AdminReviewsModule) window.AdminReviewsModule.render();
    });

    // Newsletter search
    const newsletterSearch = document.getElementById('newsletter-search-input');
    if (newsletterSearch) newsletterSearch.addEventListener('input', () => renderNewsletter(newsletterSearch.value));
}

// Switch tabs and load details
window.switchTab = (tabName) => {
    const views = document.querySelectorAll('.tab-view');
    views.forEach(v => v.classList.add('hidden'));

    const activeView = document.getElementById(`view-${tabName}`);
    if (activeView) activeView.classList.remove('hidden');

    const buttons = document.querySelectorAll('#sidebar-nav button');
    buttons.forEach(btn => {
        btn.classList.remove('sidebar-active');
        btn.classList.add('text-slate-400', 'hover:text-white', 'hover:bg-slate-800/20');
    });

    const activeBtn = document.getElementById(`tab-btn-${tabName}`);
    if (activeBtn) {
        activeBtn.classList.add('sidebar-active');
        activeBtn.classList.remove('text-slate-400', 'hover:text-white', 'hover:bg-slate-800/20');
    }

    // Update mobile bottom nav active state
    const bottomBtns = document.querySelectorAll('#admin-bottom-nav button');
    bottomBtns.forEach(btn => {
        const onClickAttr = btn.getAttribute('onclick');
        if (onClickAttr && onClickAttr.includes(`'${tabName}'`)) {
            btn.classList.add('text-[#D4AF37]');
            btn.classList.remove('text-slate-400');
        } else {
            btn.classList.remove('text-[#D4AF37]');
            btn.classList.add('text-slate-400');
        }
    });

    // Auto close sidebar on mobile
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.add('-translate-x-full');
    }

    // Fix for FullCalendar rendering incorrectly in a hidden div
    if (tabName === 'calendar' && window.AdminBookingsModule && window.AdminBookingsModule.renderCalendar) {
        setTimeout(() => {
            window.AdminBookingsModule.renderCalendar();
        }, 50);
    }
};

window.toggleSidebar = () => {
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('-translate-x-full');
    }
};

// Render overview dashboard numbers
async function renderMetrics() {
    const bookings = await KaghanDB.getBookings();
    const rooms = await KaghanDB.getRooms();
    const users = await KaghanDB.getUsers();
    const activeUsers = users.filter(u => u.role === 'user');

    // Revenue = sum of confirmed and completed stays
    const totalRevenue = bookings
        .filter(b => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + b.totalPrice, 0);

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

    renderCharts(bookings);
}

// Global chart variables to allow updates instead of destroying
let revenueChartInstance = null;
let statusChartInstance = null;

function renderCharts(bookings) {
    if (typeof ApexCharts === 'undefined') return;

    // Process data for Revenue Chart (Mocking monthly data for demonstration based on total, normally you group by month)
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

    // Process data for Booking Status Donut Chart
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
}

// Render Overview tab list of stays
async function renderOverviewBookings() {
    const bookings = await KaghanDB.getBookings();
    const rooms = await KaghanDB.getRooms();
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
            statusBadge = '<span class="bg-emerald-50 text-emerald-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-150">Confirmed</span>';
        } else if (booking.status === 'completed') {
            statusBadge = '<span class="bg-blue-50 text-blue-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-blue-150">Completed</span>';
        } else {
            statusBadge = '<span class="bg-rose-50 text-rose-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-rose-150">Cancelled</span>';
        }

        const isWalkin = booking.userId === 'usr-guest-walkin';
        const guestBadge = isWalkin 
            ? `<span class="bg-slate-100 text-slate-700 border border-slate-350 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ml-2">Walk-in</span>`
            : `<span class="bg-indigo-50 text-indigo-700 border border-indigo-150 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ml-2">Member</span>`;

        return `
            <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 text-xs font-bold text-[#D4AF37] uppercase">${booking.id}</td>
                <td class="px-6 py-4">
                    <span class="font-bold text-slate-800 text-xs flex items-center">
                        ${booking.guestName}
                        ${guestBadge}
                    </span>
                </td>
                <td class="px-6 py-4 text-xs text-slate-600 font-medium">${room.name}</td>
                <td class="px-6 py-4 text-[11px] text-slate-500">
                    ${KaghanUI.formatDate(booking.checkIn)} to ${KaghanUI.formatDate(booking.checkOut)}
                </td>
                <td class="px-6 py-4 font-bold text-slate-800 text-xs">${KaghanUI.formatPKR(booking.totalPrice)}</td>
                <td class="px-6 py-4">${statusBadge}</td>
            </tr>
        `;
    }).join('');
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
        return `
            <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 text-sm font-semibold text-slate-800">${sub.email}</td>
                <td class="px-6 py-4 text-xs text-slate-500">${KaghanUI.formatDate(sub.subscribedAt)}</td>
                <td class="px-6 py-4 flex gap-2">
                    <button onclick="removeSubscriber('${sub.email}')" class="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-rose-600 hover:text-white transition-all flex items-center gap-1.5">
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
        const snap = await firebase.firestore().collection('newsletter').where('email', '==', email).get();
        if (!snap.empty) {
            await snap.docs[0].ref.delete();
            KaghanUI.showToast('Subscriber removed successfully.', 'success');
            await renderNewsletter();
        } else {
            KaghanUI.showToast('Subscriber not found.', 'error');
        }
    } catch (err) {
        console.error("Error removing subscriber:", err);
        KaghanUI.showToast('Failed to remove subscriber.', 'error');
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

        const res = await fetch('/.netlify/functions/send-newsletter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject, htmlBody })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to broadcast newsletter.');
        }

        KaghanUI.showToast(data.message || 'Newsletter broadcast completed successfully!', 'success');
        
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
