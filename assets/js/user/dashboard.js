// Kaghan Hotel Management System - User Dashboard Orchestrator
document.addEventListener('DOMContentLoaded', async () => {
    // Guard route: ensure logged-in user with role 'user'
    if (!KaghanDB.guardRoute('user')) {
        return;
    }

    await initDashboard();
    setupActiveDatabaseListeners();
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

function setupActiveDatabaseListeners() {
    window.addEventListener('kaghan-db-bookings', async () => {
        if (window.UserBookingsModule) await window.UserBookingsModule.render();
    });

    window.addEventListener('kaghan-db-rooms', async () => {
        if (window.UserBookingsModule) await window.UserBookingsModule.render();
    });

    window.addEventListener('kaghan-db-current-user', () => {
        if (window.UserProfileModule) window.UserProfileModule.render();
    });
}
