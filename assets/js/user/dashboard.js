// Kaghan Hotel Management System - User Dashboard Orchestrator
document.addEventListener('DOMContentLoaded', async () => {
    // Guard route: ensure logged-in user with role 'user'
    if (!KaghanDB.guardRoute('user')) {
        return;
    }

    await initDashboard();
});

async function initDashboard() {
    // Initialize profile rendering and bindings
    if (window.UserProfileModule) {
        window.UserProfileModule.render();
        window.UserProfileModule.initForm();
    }
    
    // Initialize bookings rendering
    if (window.UserBookingsModule) {
        await window.UserBookingsModule.render();
    }
}
