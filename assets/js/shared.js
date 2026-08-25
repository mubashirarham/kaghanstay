// Kaghan Hotel Management System - Shared JavaScript Module
// Integrates with Firebase Firestore for database and manages session/route guards.

const DB_KEYS = {
    SESSION: 'kaghan_hotel_session'
};

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBbyT7-9j5S3yOC9tFa385RLiZSwCERj7s",
    authDomain: "kaghan-properties.firebaseapp.com",
    projectId: "kaghan-properties",
    storageBucket: "kaghan-properties.firebasestorage.app",
    messagingSenderId: "677611816596",
    appId: "1:677611816596:web:56eb2d2d61ea4156c7d681",
    measurementId: "G-E0P38M56SG"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const fdb = firebase.firestore();

// Google Analytics 4 (GA4) Event Tracker for G-ZDPMHR68PZ
window.trackGA4Event = function(eventName, params = {}) {
    if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, params);
    } else if (window.dataLayer) {
        window.dataLayer.push({ event: eventName, ...params });
    }
};

// ⚡ Force long-polling to eliminate QUIC protocol connection stalls (ERR_QUIC_PROTOCOL_ERROR)
try {
    fdb.settings({ experimentalForceLongPolling: true });
} catch(e) {}

// Global memory cache and active listeners setup
window.KaghanDB_Cache = {
    rooms: null,
    bookings: null,
    reviews: null,
    blogs: null,
    users: null,
    newsletter: null,
    categories: null,
    locations: null,
    coupons: null,
    upgrades: null,
    announcement: null,
    schema: null
};

// ⚡ SWR (Stale-While-Revalidate) Instant 0ms LocalStorage Warmup
try {
    const swrRooms = localStorage.getItem('kaghan_swr_rooms');
    if (swrRooms) window.KaghanDB_Cache.rooms = JSON.parse(swrRooms);
    
    const swrCats = localStorage.getItem('kaghan_swr_categories');
    if (swrCats) window.KaghanDB_Cache.categories = JSON.parse(swrCats);
    
    const swrLocs = localStorage.getItem('kaghan_swr_locations');
    if (swrLocs) window.KaghanDB_Cache.locations = JSON.parse(swrLocs);
    
    const swrBlogs = localStorage.getItem('kaghan_swr_blogs');
    if (swrBlogs) window.KaghanDB_Cache.blogs = JSON.parse(swrBlogs);
    
    const swrReviews = localStorage.getItem('kaghan_swr_reviews');
    if (swrReviews) window.KaghanDB_Cache.reviews = JSON.parse(swrReviews);

    const swrAnnouncement = localStorage.getItem('kaghan_swr_announcement');
    if (swrAnnouncement) window.KaghanDB_Cache.announcement = JSON.parse(swrAnnouncement);

    const swrSchema = localStorage.getItem('kaghan_swr_schema');
    if (swrSchema) window.KaghanDB_Cache.schema = JSON.parse(swrSchema);
} catch (e) {
    console.warn("SWR cache load warning:", e);
}

window.KaghanDB_Listeners = {
    rooms: null,
    bookings: null,
    reviews: null,
    blogs: null,
    users: null,
    newsletter: null,
    currentUser: null,
    categories: null,
    locations: null,
    coupons: null,
    upgrades: null,
    announcement: null,
    schema: null
};

function startActiveListeners() {
    stopActiveListeners(); // Ensure clean state before starting
    
    // 1. Rooms Listener (Public)
    window.KaghanDB_Listeners.rooms = fdb.collection('rooms').onSnapshot(snap => {
        const list = [];
        const seenIds = new Set();
        snap.forEach(doc => {
            const data = doc.data();
            const id = data.id || doc.id;
            if (!seenIds.has(id)) {
                seenIds.add(id);
                list.push({ ...data, id });
            }
        });
        window.KaghanDB_Cache.rooms = list;
        try { localStorage.setItem('kaghan_swr_rooms', JSON.stringify(list)); } catch (e) {}
        window.dispatchEvent(new CustomEvent('kaghan-db-rooms', { detail: list }));
    }, err => console.warn("Rooms listener error:", err));

    // 2. Blogs Listener (Public)
    window.KaghanDB_Listeners.blogs = fdb.collection('blogs').onSnapshot(snap => {
        const list = [];
        const seen = new Set();
        snap.forEach(doc => {
            const data = doc.data();
            const id = data.id || doc.id;
            if (!seen.has(id)) {
                seen.add(id);
                list.push({ ...data, id });
            }
        });
        const sorted = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        window.KaghanDB_Cache.blogs = sorted;
        try { localStorage.setItem('kaghan_swr_blogs', JSON.stringify(sorted)); } catch (e) {}
        window.dispatchEvent(new CustomEvent('kaghan-db-blogs', { detail: sorted }));
    }, err => console.warn("Blogs listener error:", err));

    // 3. Reviews Listener (Public)
    window.KaghanDB_Listeners.reviews = fdb.collection('reviews').onSnapshot(snap => {
        const list = [];
        const seen = new Set();
        snap.forEach(doc => {
            const data = doc.data();
            const id = data.id || doc.id;
            if (!seen.has(id)) {
                seen.add(id);
                list.push({ ...data, id });
            }
        });
        const sorted = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        window.KaghanDB_Cache.reviews = sorted;
        try { localStorage.setItem('kaghan_swr_reviews', JSON.stringify(sorted)); } catch (e) {}
        window.dispatchEvent(new CustomEvent('kaghan-db-reviews', { detail: sorted }));
    }, err => console.warn("Reviews listener error:", err));

    // Settings Listeners (Public)
    window.KaghanDB_Listeners.categories = fdb.collection('categories').onSnapshot(snap => {
        const list = [];
        const seen = new Set();
        snap.forEach(doc => {
            const data = doc.data();
            const id = data.id || doc.id;
            if (!seen.has(id)) {
                seen.add(id);
                list.push({ ...data, id });
            }
        });
        window.KaghanDB_Cache.categories = list;
        try { localStorage.setItem('kaghan_swr_categories', JSON.stringify(list)); } catch (e) {}
        window.dispatchEvent(new CustomEvent('kaghan-db-categories', { detail: list }));
    }, err => console.warn("Categories listener error:", err));

    window.KaghanDB_Listeners.locations = fdb.collection('locations').onSnapshot(snap => {
        const list = [];
        const seen = new Set();
        snap.forEach(doc => {
            const data = doc.data();
            const id = data.id || doc.id;
            if (!seen.has(id)) {
                seen.add(id);
                list.push({ ...data, id });
            }
        });
        window.KaghanDB_Cache.locations = list;
        try { localStorage.setItem('kaghan_swr_locations', JSON.stringify(list)); } catch (e) {}
        window.dispatchEvent(new CustomEvent('kaghan-db-locations', { detail: list }));
    }, err => console.warn("Locations listener error:", err));

    window.KaghanDB_Listeners.upgrades = fdb.collection('upgrades').onSnapshot(snap => {
        const list = [];
        const seen = new Set();
        snap.forEach(doc => {
            const data = doc.data();
            const id = data.id || doc.id;
            if (!seen.has(id)) {
                seen.add(id);
                list.push({ ...data, id });
            }
        });
        window.KaghanDB_Cache.upgrades = list;
        window.dispatchEvent(new CustomEvent('kaghan-db-upgrades', { detail: list }));
    }, err => console.warn("Upgrades listener error:", err));

    // 3.5 Announcement Bar Listener (Public)
    window.KaghanDB_Listeners.announcement = fdb.collection('settings').doc('announcement').onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            window.KaghanDB_Cache.announcement = data;
            try { localStorage.setItem('kaghan_swr_announcement', JSON.stringify(data)); } catch(e) {}
            window.dispatchEvent(new CustomEvent('kaghan-db-announcement', { detail: data }));
            if (window.KaghanAnnouncement && window.KaghanAnnouncement.render) {
                window.KaghanAnnouncement.render(data);
            }
        } else {
            window.KaghanDB_Cache.announcement = null;
            window.dispatchEvent(new CustomEvent('kaghan-db-announcement', { detail: null }));
            if (window.KaghanAnnouncement && window.KaghanAnnouncement.hide) {
                window.KaghanAnnouncement.hide();
            }
        }
    }, err => console.warn("Announcement listener notice:", err));

    // 3.6 Rich Results & JSON-LD Schema Listener (Public)
    window.KaghanDB_Listeners.schema = fdb.collection('settings').doc('schema').onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            window.KaghanDB_Cache.schema = data;
            try { localStorage.setItem('kaghan_swr_schema', JSON.stringify(data)); } catch(e) {}
            window.dispatchEvent(new CustomEvent('kaghan-db-schema', { detail: data }));
            if (window.KaghanSchema && window.KaghanSchema.update) {
                window.KaghanSchema.update(data);
            }
        } else {
            window.KaghanDB_Cache.schema = null;
            window.dispatchEvent(new CustomEvent('kaghan-db-schema', { detail: null }));
        }
    }, err => console.warn("Schema listener notice:", err));

    // 4. Authenticated User Listeners (Subscribed only when Firebase Auth is ready)
    firebase.auth().onAuthStateChanged(authUser => {
        // Stop existing auth listeners on state change
        ['currentUser', 'coupons', 'bookings', 'users', 'newsletter'].forEach(key => {
            if (window.KaghanDB_Listeners[key]) {
                try { window.KaghanDB_Listeners[key](); } catch(e) {}
                window.KaghanDB_Listeners[key] = null;
            }
        });

        if (!authUser) return;

        const currentSession = JSON.parse(localStorage.getItem(DB_KEYS.SESSION) || 'null');
        const isAdminUser = (currentSession && ['admin', 'moderator', 'editor'].includes(currentSession.role)) ||
                            (authUser.email && (authUser.email.includes('admin') || authUser.email === 'info@kphstay.com'));

        // Sync active user profile details
        window.KaghanDB_Listeners.currentUser = fdb.collection('users').doc(authUser.uid).onSnapshot(doc => {
            if (doc.exists) {
                const uData = doc.data();
                if (currentSession && currentSession.role && !uData.role) {
                    uData.role = currentSession.role;
                }
                localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(uData));
                window.dispatchEvent(new CustomEvent('kaghan-db-current-user', { detail: uData }));
            } else {
                const cleanEmail = (authUser.email || '').toLowerCase().trim();
                if (cleanEmail) {
                    fdb.collection('users').where('email', '==', cleanEmail).limit(1).get().then(snap => {
                        if (!snap.empty) {
                            const uData = snap.docs[0].data();
                            fdb.collection('users').doc(authUser.uid).set({ ...uData, uid: authUser.uid }, { merge: true });
                            localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(uData));
                            window.dispatchEvent(new CustomEvent('kaghan-db-current-user', { detail: uData }));
                        }
                    }).catch(() => {});
                }
            }
        }, err => {
            // Suppress auth race condition notice
        });

        if (isAdminUser) {
            // Subscribe to all coupons (Admin)
            window.KaghanDB_Listeners.coupons = fdb.collection('coupons').onSnapshot(snap => {
                const list = [];
                const seen = new Set();
                snap.forEach(doc => {
                    const data = doc.data();
                    const id = data.id || doc.id;
                    if (!seen.has(id)) {
                        seen.add(id);
                        list.push({ ...data, id });
                    }
                });
                window.KaghanDB_Cache.coupons = list;
                window.dispatchEvent(new CustomEvent('kaghan-db-coupons', { detail: list }));
            }, err => {});

            // Subscribe to all bookings (Admin)
            window.KaghanDB_Listeners.bookings = fdb.collection('bookings').onSnapshot(snap => {
                const list = [];
                const seen = new Set();
                snap.forEach(doc => {
                    const data = doc.data();
                    const id = data.id || doc.id;
                    if (!seen.has(id)) {
                        seen.add(id);
                        list.push({ ...data, id });
                    }
                });
                const sorted = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                window.KaghanDB_Cache.bookings = sorted;
                window.dispatchEvent(new CustomEvent('kaghan-db-bookings', { detail: sorted }));
            }, err => {});

            // Subscribe to all users (Admin)
            window.KaghanDB_Listeners.users = fdb.collection('users').onSnapshot(snap => {
                const list = [];
                const seen = new Set();
                snap.forEach(doc => {
                    const data = doc.data();
                    const id = data.id || doc.id;
                    if (!seen.has(id)) {
                        seen.add(id);
                        list.push({ ...data, id });
                    }
                });
                window.KaghanDB_Cache.users = list;
                window.dispatchEvent(new CustomEvent('kaghan-db-users', { detail: list }));
            }, err => {});

            // Subscribe to all newsletter subscribers (Admin)
            window.KaghanDB_Listeners.newsletter = fdb.collection('newsletter').onSnapshot(snap => {
                const list = [];
                const seen = new Set();
                snap.forEach(doc => {
                    const data = doc.data();
                    const id = data.id || doc.id;
                    if (!seen.has(id)) {
                        seen.add(id);
                        list.push({ ...data, id });
                    }
                });
                const sorted = list.sort((a, b) => new Date(b.subscribedAt) - new Date(a.subscribedAt));
                window.KaghanDB_Cache.newsletter = sorted;
                window.dispatchEvent(new CustomEvent('kaghan-db-newsletter', { detail: sorted }));
            }, err => {});
        } else {
            // Subscribe to user-specific bookings (Guest)
            window.KaghanDB_Listeners.bookings = fdb.collection('bookings').where('userId', '==', authUser.uid).onSnapshot(snap => {
                const list = [];
                const seen = new Set();
                snap.forEach(doc => {
                    const data = doc.data();
                    const id = data.id || doc.id;
                    if (!seen.has(id)) {
                        seen.add(id);
                        list.push({ ...data, id });
                    }
                });
                const sorted = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                window.KaghanDB_Cache.bookings = sorted;
                window.dispatchEvent(new CustomEvent('kaghan-db-bookings', { detail: sorted }));
            }, err => {});
        }
    });
}

function stopActiveListeners() {
    for (const key in window.KaghanDB_Listeners) {
        if (window.KaghanDB_Listeners[key]) {
            try {
                window.KaghanDB_Listeners[key]();
            } catch (e) {
                console.error(`Error stopping listener for ${key}:`, e);
            }
            window.KaghanDB_Listeners[key] = null;
        }
    }
    // Clear cache
    window.KaghanDB_Cache = {
        rooms: null,
        bookings: null,
        reviews: null,
        blogs: null,
        users: null,
        newsletter: null,
        categories: null,
        locations: null,
        coupons: null,
        upgrades: null,
        announcement: null
    };
}

// Initialize Active Listeners globally
startActiveListeners();

window.KaghanSafe = {
    escapeHTML: function(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },
    stripTags: function(html) {
        if (html === null || html === undefined) return '';
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        let text = tmp.textContent || tmp.innerText || '';
        return text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    },
    sanitizeHTML: function(html) {
        if (html === null || html === undefined) return '';
        if (typeof DOMPurify !== 'undefined') {
            return DOMPurify.sanitize(html);
        }
        return this.escapeHTML(html);
    }
};

window.getApiUrl = function(path) {
    const loc = window.location;
    if ((loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') && loc.port && loc.port !== '8888') {
        return `http://localhost:8888${path}`;
    }
    return path;
};

window.safeFetch = async function(path, options = {}) {
    const url = window.getApiUrl(path);
    try {
        return await fetch(url, options);
    } catch (err) {
        const loc = window.location;
        if ((loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') && url.startsWith('http://localhost:8888')) {
            console.warn(`Local Netlify Dev server not found on port 8888. Falling back to production API for ${path}...`);
            const fallbackUrl = `https://kphstay.com${path}`;
            return await fetch(fallbackUrl, options);
        }
        throw err;
    }
};

async function callAdminAction(action, data) {
    let idToken = null;
    if (typeof firebase !== 'undefined' && firebase.auth) {
        if (firebase.auth().currentUser) {
            idToken = await firebase.auth().currentUser.getIdToken();
        } else {
            // Wait up to 1 second for Firebase Auth state to initialize
            await new Promise(resolve => {
                const unsubscribe = firebase.auth().onAuthStateChanged(() => {
                    unsubscribe();
                    resolve();
                });
                setTimeout(resolve, 1000);
            });
            if (firebase.auth().currentUser) {
                idToken = await firebase.auth().currentUser.getIdToken();
            }
        }
    }
    
    if (!idToken) {
        if (typeof KaghanUI !== 'undefined') {
            KaghanUI.showToast("Your session has expired. Redirecting to login...", "error");
        }
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1500);
        throw new Error("Session expired. Please log in again.");
    }

    const res = await window.safeFetch('/.netlify/functions/admin-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data, idToken })
    });
    if (!res.ok) {
        let errMsg = `Admin action ${action} failed (Status: ${res.status}).`;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            try {
                const errData = await res.json();
                errMsg = errData.error || errMsg;
            } catch (_) {}
        } else {
            try {
                const text = await res.text();
                if (text) errMsg = text;
            } catch (_) {}
        }
        throw new Error(errMsg);
    }
    const resData = await res.json();
    return resData.result;
}

window.ensureAuthReady = function() {
    return new Promise(resolve => {
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
            resolve(firebase.auth().currentUser);
        } else if (typeof firebase !== 'undefined' && firebase.auth) {
            let unsubscribed = false;
            const unsubscribe = firebase.auth().onAuthStateChanged(user => {
                if (!unsubscribed) {
                    unsubscribed = true;
                    try { unsubscribe(); } catch(e) {}
                    resolve(user);
                }
            });
            setTimeout(() => {
                if (!unsubscribed) {
                    unsubscribed = true;
                    try { unsubscribe(); } catch(e) {}
                    resolve(firebase.auth().currentUser);
                }
            }, 1500);
        } else {
            resolve(null);
        }
    });
};

// DB Firestore Implementation
const db = {
    // Categories CRUD
    getCategories: async () => {
        if (window.KaghanDB_Cache.categories && window.KaghanDB_Cache.categories.length) return window.KaghanDB_Cache.categories;
        try {
            const swr = localStorage.getItem('kaghan_swr_categories');
            if (swr) {
                const list = JSON.parse(swr);
                if (list && list.length) {
                    window.KaghanDB_Cache.categories = list;
                    return list;
                }
            }
        } catch(e) {}
        const snap = await fdb.collection('categories').get();
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        window.KaghanDB_Cache.categories = list;
        try { localStorage.setItem('kaghan_swr_categories', JSON.stringify(list)); } catch(e) {}
        return list;
    },
    saveCategory: async (category) => {
        await fdb.collection('categories').doc(category.id).set(category);
        return true;
    },
    deleteCategory: async (id) => {
        await fdb.collection('categories').doc(id).delete();
        return true;
    },

    // Locations CRUD
    getLocations: async () => {
        if (window.KaghanDB_Cache.locations && window.KaghanDB_Cache.locations.length) return window.KaghanDB_Cache.locations;
        try {
            const swr = localStorage.getItem('kaghan_swr_locations');
            if (swr) {
                const list = JSON.parse(swr);
                if (list && list.length) {
                    window.KaghanDB_Cache.locations = list;
                    return list;
                }
            }
        } catch(e) {}
        const snap = await fdb.collection('locations').get();
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        window.KaghanDB_Cache.locations = list;
        try { localStorage.setItem('kaghan_swr_locations', JSON.stringify(list)); } catch(e) {}
        return list;
    },
    saveLocation: async (location) => {
        await fdb.collection('locations').doc(location.id).set(location);
        return true;
    },
    deleteLocation: async (id) => {
        await fdb.collection('locations').doc(id).delete();
        return true;
    },

    // Upgrades CRUD
    getUpgrades: async () => {
        if (window.KaghanDB_Cache.upgrades && window.KaghanDB_Cache.upgrades.length) return window.KaghanDB_Cache.upgrades;
        try {
            const swr = localStorage.getItem('kaghan_swr_upgrades');
            if (swr) {
                const list = JSON.parse(swr);
                if (list && list.length) {
                    window.KaghanDB_Cache.upgrades = list;
                    return list;
                }
            }
        } catch(e) {}
        try {
            const snap = await fdb.collection('upgrades').get();
            const list = [];
            snap.forEach(doc => {
                const data = doc.data();
                list.push({ ...data, id: data.id || doc.id });
            });
            window.KaghanDB_Cache.upgrades = list;
            try { localStorage.setItem('kaghan_swr_upgrades', JSON.stringify(list)); } catch(e) {}
            return list;
        } catch(err) {
            console.warn("getUpgrades fetch error:", err);
            return window.KaghanDB_Cache.upgrades || [];
        }
    },
    saveUpgrade: async (upgrade) => {
        await fdb.collection('upgrades').doc(upgrade.id).set(upgrade);
        return true;
    },
    deleteUpgrade: async (id) => {
        await fdb.collection('upgrades').doc(id).delete();
        return true;
    },

    // Coupons CRUD
    getCoupons: async () => {
        if (window.KaghanDB_Cache.coupons) return window.KaghanDB_Cache.coupons;
        const snap = await fdb.collection('coupons').get();
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        window.KaghanDB_Cache.coupons = list;
        return list;
    },
    saveCoupon: async (coupon) => {
        await fdb.collection('coupons').doc(coupon.id).set(coupon);
        return true;
    },
    deleteCoupon: async (id) => {
        await fdb.collection('coupons').doc(id).delete();
        return true;
    },

    // Upgrades CRUD
    getUpgrades: async () => {
        if (window.KaghanDB_Cache.upgrades) return window.KaghanDB_Cache.upgrades;
        const snap = await fdb.collection('upgrades').get();
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        window.KaghanDB_Cache.upgrades = list;
        return list;
    },
    saveUpgrade: async (upgrade) => {
        await fdb.collection('upgrades').doc(upgrade.id).set(upgrade);
        return true;
    },
    deleteUpgrade: async (id) => {
        await fdb.collection('upgrades').doc(id).delete();
        return true;
    },

    // Announcement Bar CRUD
    getAnnouncement: async () => {
        if (window.KaghanDB_Cache.announcement) return window.KaghanDB_Cache.announcement;
        try {
            const swr = localStorage.getItem('kaghan_swr_announcement');
            if (swr) {
                const data = JSON.parse(swr);
                if (data) {
                    window.KaghanDB_Cache.announcement = data;
                    return data;
                }
            }
        } catch(e) {}
        try {
            const doc = await fdb.collection('settings').doc('announcement').get();
            if (doc.exists) {
                const data = doc.data();
                window.KaghanDB_Cache.announcement = data;
                try { localStorage.setItem('kaghan_swr_announcement', JSON.stringify(data)); } catch(e) {}
                return data;
            }
        } catch(e) {
            console.warn("getAnnouncement notice:", e.message);
        }
        return window.KaghanDB_Cache.announcement || null;
    },
    saveAnnouncement: async (announcement) => {
        let savedViaAdmin = false;
        try {
            const user = firebase.auth().currentUser;
            if (user) {
                const idToken = await user.getIdToken();
                const res = await fetch('/.netlify/functions/admin-action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'saveAnnouncement',
                        data: { announcement },
                        idToken
                    })
                });
                if (res.ok) {
                    savedViaAdmin = true;
                }
            }
        } catch(e) {
            console.warn("Serverless saveAnnouncement fallback to client SDK:", e);
        }

        if (!savedViaAdmin) {
            await fdb.collection('settings').doc('announcement').set(announcement);
        }

        window.KaghanDB_Cache.announcement = announcement;
        try { localStorage.setItem('kaghan_swr_announcement', JSON.stringify(announcement)); } catch(e) {}
        window.dispatchEvent(new CustomEvent('kaghan-db-announcement', { detail: announcement }));
        return true;
    },

    // Rich Results & JSON-LD Schema CRUD
    getSchemaSettings: async () => {
        if (window.KaghanDB_Cache.schema) return window.KaghanDB_Cache.schema;
        try {
            const swr = localStorage.getItem('kaghan_swr_schema');
            if (swr) {
                const data = JSON.parse(swr);
                if (data) {
                    window.KaghanDB_Cache.schema = data;
                    return data;
                }
            }
        } catch(e) {}
        try {
            const doc = await fdb.collection('settings').doc('schema').get();
            if (doc.exists) {
                const data = doc.data();
                window.KaghanDB_Cache.schema = data;
                try { localStorage.setItem('kaghan_swr_schema', JSON.stringify(data)); } catch(e) {}
                return data;
            }
        } catch(e) {
            console.warn("getSchemaSettings notice:", e.message);
        }
        return window.KaghanDB_Cache.schema || (typeof DEFAULT_SCHEMA_SETTINGS !== 'undefined' ? DEFAULT_SCHEMA_SETTINGS : null);
    },
    saveSchemaSettings: async (schema) => {
        let savedViaAdmin = false;
        try {
            const user = firebase.auth().currentUser;
            if (user) {
                const idToken = await user.getIdToken();
                const res = await fetch('/.netlify/functions/admin-action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'saveSchemaSettings',
                        data: { schema },
                        idToken
                    })
                });
                if (res.ok) {
                    savedViaAdmin = true;
                }
            }
        } catch(e) {
            console.warn("Serverless saveSchemaSettings fallback:", e);
        }

        if (!savedViaAdmin) {
            await fdb.collection('settings').doc('schema').set(schema, { merge: true });
        }

        window.KaghanDB_Cache.schema = schema;
        try { localStorage.setItem('kaghan_swr_schema', JSON.stringify(schema)); } catch(e) {}
        window.dispatchEvent(new CustomEvent('kaghan-db-schema', { detail: schema }));
        if (window.KaghanSchema && window.KaghanSchema.update) {
            window.KaghanSchema.update(schema);
        }
        return true;
    },

    // Coupons CRUD
    getCoupons: async () => {
        if (window.KaghanDB_Cache.coupons && window.KaghanDB_Cache.coupons.length) {
            return window.KaghanDB_Cache.coupons;
        }
        try {
            const snap = await fdb.collection('coupons').get();
            const list = [];
            snap.forEach(doc => {
                const data = doc.data();
                list.push({ id: doc.id, code: data.code || doc.id, ...data });
            });
            window.KaghanDB_Cache.coupons = list;
            window.dispatchEvent(new CustomEvent('kaghan-db-coupons', { detail: list }));
            return list;
        } catch(e) {
            console.warn("getCoupons notice:", e.message);
            return window.KaghanDB_Cache.coupons || [];
        }
    },
    saveCoupon: async (coupon) => {
        let savedViaAdmin = false;
        try {
            const user = firebase.auth().currentUser;
            if (user) {
                const idToken = await user.getIdToken();
                const res = await fetch('/.netlify/functions/admin-action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'saveCoupon',
                        data: { coupon },
                        idToken
                    })
                });
                if (res.ok) savedViaAdmin = true;
            }
        } catch(e) {
            console.warn("Serverless saveCoupon fallback:", e);
        }

        if (!savedViaAdmin) {
            await fdb.collection('coupons').doc(coupon.id || coupon.code).set(coupon);
        }

        if (!window.KaghanDB_Cache.coupons) window.KaghanDB_Cache.coupons = [];
        const idx = window.KaghanDB_Cache.coupons.findIndex(c => c.id === coupon.id || c.code === coupon.code);
        if (idx >= 0) {
            window.KaghanDB_Cache.coupons[idx] = coupon;
        } else {
            window.KaghanDB_Cache.coupons.push(coupon);
        }
        window.dispatchEvent(new CustomEvent('kaghan-db-coupons', { detail: window.KaghanDB_Cache.coupons }));
        return true;
    },
    deleteCoupon: async (id) => {
        let deletedViaAdmin = false;
        try {
            const user = firebase.auth().currentUser;
            if (user) {
                const idToken = await user.getIdToken();
                const res = await fetch('/.netlify/functions/admin-action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'deleteCoupon',
                        data: { id },
                        idToken
                    })
                });
                if (res.ok) deletedViaAdmin = true;
            }
        } catch(e) {
            console.warn("Serverless deleteCoupon fallback:", e);
        }

        if (!deletedViaAdmin) {
            await fdb.collection('coupons').doc(id).delete();
        }

        if (window.KaghanDB_Cache.coupons) {
            window.KaghanDB_Cache.coupons = window.KaghanDB_Cache.coupons.filter(c => c.id !== id && c.code !== id);
            window.dispatchEvent(new CustomEvent('kaghan-db-coupons', { detail: window.KaghanDB_Cache.coupons }));
        }
        return true;
    },

    // Rooms CRUD
    getRooms: async () => {
        if (!window.KaghanDB_Cache.rooms || !window.KaghanDB_Cache.rooms.length) {
            try {
                const swr = localStorage.getItem('kaghan_swr_rooms');
                if (swr) {
                    const list = JSON.parse(swr);
                    if (list && list.length) {
                        window.KaghanDB_Cache.rooms = list;
                    }
                }
            } catch(e) {}
        }
        if (window.KaghanDB_Cache.rooms && window.KaghanDB_Cache.rooms.length) {
            const seen = new Set();
            const deduped = [];
            window.KaghanDB_Cache.rooms.forEach(r => {
                const id = r.id || r._id;
                if (id && !seen.has(id)) {
                    seen.add(id);
                    deduped.push(r);
                }
            });
            window.KaghanDB_Cache.rooms = deduped;
            return deduped;
        }
        try {
            const snap = await fdb.collection('rooms').get();
            const list = [];
            const seen = new Set();
            snap.forEach(doc => {
                const data = doc.data();
                const id = data.id || doc.id;
                if (!seen.has(id)) {
                    seen.add(id);
                    list.push({ ...data, id });
                }
            });
            window.KaghanDB_Cache.rooms = list;
            try { localStorage.setItem('kaghan_swr_rooms', JSON.stringify(list)); } catch(e) {}
            return list;
        } catch (err) {
            console.warn("getRooms Firestore fetch error:", err);
            return window.KaghanDB_Cache.rooms || [];
        }
    },
    generateSlug: (text) => {
        if (!text) return '';
        return text.toString().toLowerCase().trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    },
    getRoomSlug: (room) => {
        if (!room) return '';
        if (room.slug && room.slug.trim()) return room.slug.trim().toLowerCase();
        return db.generateSlug(room.name || room.title || room.id || '');
    },
    isLocalEnv: () => {
        try {
            const host = window.location.hostname || '';
            const proto = window.location.protocol || '';
            if (proto === 'file:') return true;
            if (!host || host === 'localhost' || host === '127.0.0.1') return true;
            if (/^192\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return true;
            if (host.endsWith('.local') || host.endsWith('.test')) return true;
            if (window.location.port && !host.includes('kphstay.com') && !host.includes('netlify.app')) return true;
            return false;
        } catch (e) {
            return false;
        }
    },
    getRoomLink: (room) => {
        if (!room) return '/room-details.html';
        const slug = db.getRoomSlug(room);
        const roomId = room.id ? encodeURIComponent(room.id) : '';
        if (db.isLocalEnv()) {
            return slug ? `/room-details.html?slug=${encodeURIComponent(slug)}${roomId ? `&id=${roomId}` : ''}` : `/room-details.html?id=${roomId}`;
        }
        return slug ? `/room/${encodeURIComponent(slug)}` : `/room-details.html?id=${roomId}`;
    },
    getBlogLink: (blog) => {
        if (!blog) return '/blog.html';
        const slug = blog.slug || blog.id;
        const blogId = blog.id ? encodeURIComponent(blog.id) : '';
        if (db.isLocalEnv()) {
            return slug ? `/blog-details.html?slug=${encodeURIComponent(slug)}${blogId ? `&id=${blogId}` : ''}` : `/blog-details.html?id=${blogId}`;
        }
        return slug ? `/blog/${encodeURIComponent(slug)}` : `/blog-details.html?id=${blogId}`;
    },
    getRoomById: async (idOrSlug, forceRefresh = false) => {
        if (!idOrSlug) return null;
        const targetStr = String(idOrSlug).toLowerCase().trim();

        // 1. Check in-memory cache first by ID, stored slug, or generated slug
        if (!forceRefresh && window.KaghanDB_Cache.rooms && window.KaghanDB_Cache.rooms.length) {
            const cachedMatch = window.KaghanDB_Cache.rooms.find(r => 
                String(r.id).toLowerCase() === targetStr ||
                (r.slug && r.slug.toLowerCase() === targetStr) ||
                db.generateSlug(r.name) === targetStr
            );
            if (cachedMatch) return cachedMatch;
        }

        // 2. Try direct Firestore document lookup by ID
        try {
            const doc = await fdb.collection('rooms').doc(idOrSlug).get();
            if (doc.exists) {
                const data = doc.data();
                const freshRoom = { ...data, id: data.id || doc.id };
                if (window.KaghanDB_Cache.rooms) {
                    const idx = window.KaghanDB_Cache.rooms.findIndex(r => r.id === freshRoom.id);
                    if (idx !== -1) window.KaghanDB_Cache.rooms[idx] = freshRoom;
                    else window.KaghanDB_Cache.rooms.push(freshRoom);
                    try { localStorage.setItem('kaghan_swr_rooms', JSON.stringify(window.KaghanDB_Cache.rooms)); } catch(e) {}
                }
                return freshRoom;
            }
        } catch (e) {
            console.warn("getRoomById doc fetch warning:", e.message);
        }

        // 3. Fetch all rooms and match by ID or slug
        try {
            const rooms = await db.getRooms();
            return rooms.find(r => 
                String(r.id).toLowerCase() === targetStr ||
                (r.slug && r.slug.toLowerCase() === targetStr) ||
                db.generateSlug(r.name) === targetStr
            ) || null;
        } catch (e) {
            return null;
        }
    },
    prefetchRoom: async (id) => {
        if (!id) return;
        if (window.KaghanDB_Cache.rooms && window.KaghanDB_Cache.rooms.some(r => r.id === id)) return;
        try {
            await db.getRoomById(id);
        } catch(e) {}
    },
    updateRoom: async (id, updatedData) => {
        await fdb.collection('rooms').doc(id).update(updatedData);
        if (window.KaghanDB_Cache.rooms) {
            const idx = window.KaghanDB_Cache.rooms.findIndex(r => r.id === id);
            if (idx !== -1) {
                window.KaghanDB_Cache.rooms[idx] = { ...window.KaghanDB_Cache.rooms[idx], ...updatedData };
            }
            try { localStorage.setItem('kaghan_swr_rooms', JSON.stringify(window.KaghanDB_Cache.rooms)); } catch(e) {}
        }
        window.dispatchEvent(new CustomEvent('kaghan-db-rooms', { detail: window.KaghanDB_Cache.rooms }));
        return true;
    },
    addRoom: async (room) => {
        await fdb.collection('rooms').doc(room.id).set(room);
        if (window.KaghanDB_Cache.rooms) {
            const filtered = window.KaghanDB_Cache.rooms.filter(r => r.id !== room.id);
            window.KaghanDB_Cache.rooms = [room, ...filtered];
            try { localStorage.setItem('kaghan_swr_rooms', JSON.stringify(window.KaghanDB_Cache.rooms)); } catch(e) {}
        }
        window.dispatchEvent(new CustomEvent('kaghan-db-rooms', { detail: window.KaghanDB_Cache.rooms }));
        return true;
    },

    // Room Availability & Multi-Channel Locked Dates Calculation
    getRoomAvailability: async (roomId) => {
        if (!roomId) return { unavailableDates: [], isAvailable: true };
        const room = await db.getRoomById(roomId);
        if (!room) return { unavailableDates: [], isAvailable: true };

        const unavailableDatesSet = new Set();

        // 1. Add manual blocked dates and airbnb synced blocked dates
        if (Array.isArray(room.blockedDates)) {
            room.blockedDates.forEach(d => unavailableDatesSet.add(d));
        }
        if (Array.isArray(room.airbnbBlockedDates)) {
            room.airbnbBlockedDates.forEach(d => unavailableDatesSet.add(d));
        }

        // 2. Add confirmed bookings from Firestore
        const bookings = await db.getBookings();
        if (bookings && bookings.length > 0) {
            bookings.forEach(b => {
                if (b.roomId === roomId && b.status !== 'cancelled' && b.paymentStatus !== 'refunded') {
                    const start = new Date(b.checkIn);
                    const end = new Date(b.checkOut);
                    for (let dt = new Date(start); dt < end; dt.setDate(dt.getDate() + 1)) {
                        unavailableDatesSet.add(dt.toISOString().split('T')[0]);
                    }
                }
            });
        }

        return {
            unavailableDates: Array.from(unavailableDatesSet).sort(),
            isAvailable: true
        };
    },

    // Bookings CRUD - 100% Frontend Autonomous Operation
    getBookings: async () => {
        await window.ensureAuthReady();
        let firestoreList = [];
        try {
            const snap = await fdb.collection('bookings').get();
            snap.forEach(doc => firestoreList.push(doc.data()));
        } catch (e) {
            console.warn("Firestore getBookings notice (using local cache fallback):", e.message);
        }

        let localList = [];
        try {
            localList = JSON.parse(localStorage.getItem('kaghan_local_bookings') || '[]');
        } catch (_) {}

        const mergedMap = new Map();
        firestoreList.forEach(b => { if (b && b.id) mergedMap.set(b.id, b); });
        localList.forEach(b => { if (b && b.id && !mergedMap.has(b.id)) mergedMap.set(b.id, b); });

        const sorted = Array.from(mergedMap.values()).sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()));
        window.KaghanDB_Cache.bookings = sorted;
        return sorted;
    },

    getBookingById: async (id) => {
        if (!id) return null;
        if (window.KaghanDB_Cache.bookings) {
            const match = window.KaghanDB_Cache.bookings.find(b => b.id === id);
            if (match) return match;
        }
        try {
            const doc = await fdb.collection('bookings').doc(id).get();
            if (doc.exists) return doc.data();
        } catch (_) {}

        try {
            const localList = JSON.parse(localStorage.getItem('kaghan_local_bookings') || '[]');
            const localMatch = localList.find(b => b.id === id);
            if (localMatch) return localMatch;
        } catch (_) {}

        return null;
    },

    addBooking: async (booking, pdfBase64 = null) => {
        await window.ensureAuthReady();
        const user = db.getCurrentUser ? db.getCurrentUser() : null;
        const userId = user ? user.id : (booking.userId || 'usr-guest-walkin');

        // Generate clean client-side booking ID if not provided
        const bookingId = booking.id || (`KPH-BOOK-${Math.floor(100000 + Math.random() * 900000)}`);
        const checkInStr = booking.checkIn ? (booking.checkIn.includes('T') ? booking.checkIn.split('T')[0] : booking.checkIn) : new Date().toISOString().split('T')[0];
        const checkOutStr = booking.checkOut ? (booking.checkOut.includes('T') ? booking.checkOut.split('T')[0] : booking.checkOut) : new Date(Date.now() + 86400000).toISOString().split('T')[0];

        // Client-side Pricing computation
        const inDate = new Date(checkInStr);
        const outDate = new Date(checkOutStr);
        const nights = (!isNaN(inDate.getTime()) && !isNaN(outDate.getTime())) ? Math.max(1, Math.ceil((outDate - inDate) / (1000 * 3600 * 24))) : 1;

        let roomName = booking.roomName || booking.propertyName || 'Luxury Accommodation';
        let rate = 15000;
        if (booking.roomId) {
            try {
                const rooms = await db.getRooms();
                const matchedRoom = rooms.find(r => r.id === booking.roomId);
                if (matchedRoom) {
                    roomName = matchedRoom.name || matchedRoom.title || roomName;
                    rate = matchedRoom.price || matchedRoom.priceDaily || rate;
                }
            } catch (_) {}
        }

        let totalPrice = Number(booking.totalPrice || booking.price || 0);
        if (!totalPrice || totalPrice <= 0) {
            totalPrice = rate * nights;
        }

        const subtotal = booking.subtotal !== undefined ? Number(booking.subtotal) : totalPrice;
        const tax = booking.tax !== undefined ? Number(booking.tax) : Math.round(subtotal * 0.15);
        const discount = Number(booking.discount || booking.discountAmount || 0);

        const createdBooking = {
            id: bookingId,
            invoiceNo: booking.invoiceNo || `KPH-INV-${bookingId.replace(/^KPH-BOOK-|^BK-/, '')}`,
            userId: userId,
            roomId: booking.roomId || 'suite-standard',
            roomName: roomName,
            propertyName: roomName,
            guestName: booking.guestName || (user ? user.name : 'Valued Guest'),
            guestEmail: (booking.guestEmail || (user ? user.email : 'guest@kphstay.com')).toLowerCase().trim(),
            guestPhone: booking.guestPhone || '',
            guestCnic: booking.guestCnic || booking.cnicPassport || '',
            nationality: booking.nationality || 'Pakistani',
            address: booking.address || '',
            checkIn: checkInStr,
            checkInTime: booking.checkInTime || '2:00 PM',
            checkOut: checkOutStr,
            checkOutTime: booking.checkOutTime || '12:00 PM',
            totalNights: nights,
            nights: nights,
            totalPrice: totalPrice,
            subtotal: subtotal,
            tax: tax,
            discount: discount,
            couponUsed: booking.couponCode || booking.couponUsed || null,
            upgrades: booking.upgrades || [],
            status: booking.status || 'confirmed',
            billingCycle: booking.billingCycle || booking.stayType || 'daily',
            paymentMethod: booking.paymentMethod || 'Credit/Debit Card',
            paymentStatus: booking.paymentStatus || 'PAID',
            createdAt: booking.createdAt || new Date().toISOString()
        };

        // 1. Direct Firestore Write
        try {
            await fdb.collection('bookings').doc(bookingId).set(createdBooking);
        } catch (fsErr) {
            console.warn("Direct Firestore write warning (saved to local storage):", fsErr.message);
        }

        // 2. LocalStorage Persistence
        try {
            const localList = JSON.parse(localStorage.getItem('kaghan_local_bookings') || '[]');
            const idx = localList.findIndex(b => b.id === bookingId);
            if (idx >= 0) localList[idx] = createdBooking;
            else localList.unshift(createdBooking);
            localStorage.setItem('kaghan_local_bookings', JSON.stringify(localList));
        } catch (_) {}

        // 3. Update In-Memory Cache
        if (window.KaghanDB_Cache.bookings) {
            const idx = window.KaghanDB_Cache.bookings.findIndex(b => b.id === bookingId);
            if (idx >= 0) window.KaghanDB_Cache.bookings[idx] = createdBooking;
            else window.KaghanDB_Cache.bookings.unshift(createdBooking);
        } else {
            window.KaghanDB_Cache.bookings = [createdBooking];
        }

        window.dispatchEvent(new CustomEvent('kaghan-db-bookings', { detail: window.KaghanDB_Cache.bookings }));

        // 4. Non-blocking Async Serverless Function Notification Attempt (only if online and non-localhost)
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            try {
                let idToken = null;
                if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
                    idToken = await firebase.auth().currentUser.getIdToken().catch(() => null);
                }
                fetch('/.netlify/functions/booking-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ booking: createdBooking, idToken, pdfBase64 })
                }).catch(() => {});
            } catch (_) {}
        }

        booking.id = bookingId;
        return createdBooking;
    },

    updateBookingStatus: async (id, status) => {
        try {
            await fdb.collection('bookings').doc(id).update({ 
                status,
                updatedAt: new Date().toISOString()
            });
        } catch (e) {
            console.warn("Firestore updateBookingStatus warning:", e.message);
        }

        try {
            const localList = JSON.parse(localStorage.getItem('kaghan_local_bookings') || '[]');
            const b = localList.find(item => item.id === id);
            if (b) {
                b.status = status;
                b.updatedAt = new Date().toISOString();
                localStorage.setItem('kaghan_local_bookings', JSON.stringify(localList));
            }
        } catch (_) {}

        if (window.KaghanDB_Cache.bookings) {
            const b = window.KaghanDB_Cache.bookings.find(item => item.id === id);
            if (b) b.status = status;
        }

        window.dispatchEvent(new CustomEvent('kaghan-db-bookings', { detail: window.KaghanDB_Cache.bookings }));
        return true;
    },

    addReview: async (reviewData) => {
        const docRef = fdb.collection('reviews').doc();
        reviewData.id = docRef.id;
        reviewData.createdAt = reviewData.createdAt || new Date().toISOString();
        await docRef.set(reviewData);
        return reviewData;
    },

    getReviews: async (roomId) => {
        try {
            const snap = await fdb.collection('reviews').where('roomId', '==', roomId).get();
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            return list;
        } catch(e) {
            console.warn('getReviews notice:', e);
            return [];
        }
    },

    updateBookingDates: async (id, checkIn, checkOut) => {
        try {
            await fdb.collection('bookings').doc(id).update({
                checkIn,
                checkOut,
                updatedAt: new Date().toISOString()
            });
        } catch (e) {
            console.warn("Firestore updateBookingDates warning:", e.message);
        }

        try {
            const localList = JSON.parse(localStorage.getItem('kaghan_local_bookings') || '[]');
            const b = localList.find(item => item.id === id);
            if (b) {
                b.checkIn = checkIn;
                b.checkOut = checkOut;
                b.updatedAt = new Date().toISOString();
                localStorage.setItem('kaghan_local_bookings', JSON.stringify(localList));
            }
        } catch (_) {}

        if (window.KaghanDB_Cache.bookings) {
            const b = window.KaghanDB_Cache.bookings.find(item => item.id === id);
            if (b) {
                b.checkIn = checkIn;
                b.checkOut = checkOut;
            }
        }

        window.dispatchEvent(new CustomEvent('kaghan-db-bookings', { detail: window.KaghanDB_Cache.bookings }));
        return true;
    },

    deleteBooking: async (id) => {
        try {
            await fdb.collection('bookings').doc(id).delete();
        } catch (e) {
            console.warn("Firestore deleteBooking warning:", e.message);
        }

        try {
            let localList = JSON.parse(localStorage.getItem('kaghan_local_bookings') || '[]');
            localList = localList.filter(b => b.id !== id);
            localStorage.setItem('kaghan_local_bookings', JSON.stringify(localList));
        } catch (_) {}

        if (window.KaghanDB_Cache.bookings) {
            window.KaghanDB_Cache.bookings = window.KaghanDB_Cache.bookings.filter(b => b.id !== id);
        }

        window.dispatchEvent(new CustomEvent('kaghan-db-bookings', { detail: window.KaghanDB_Cache.bookings }));
        return true;
    },
    updateBookingDetails: async (id, updatedData) => {
        try {
            await fdb.collection('bookings').doc(id).update({
                ...updatedData,
                updatedAt: new Date().toISOString()
            });
        } catch (e) {
            console.warn("Firestore updateBookingDetails warning:", e.message);
        }

        try {
            const localList = JSON.parse(localStorage.getItem('kaghan_local_bookings') || '[]');
            const b = localList.find(item => item.id === id);
            if (b) {
                Object.assign(b, updatedData, { updatedAt: new Date().toISOString() });
                localStorage.setItem('kaghan_local_bookings', JSON.stringify(localList));
            }
        } catch (_) {}

        if (window.KaghanDB_Cache.bookings) {
            const idx = window.KaghanDB_Cache.bookings.findIndex(b => b.id === id);
            if (idx !== -1) {
                window.KaghanDB_Cache.bookings[idx] = { ...window.KaghanDB_Cache.bookings[idx], ...updatedData };
            }
        }
        window.dispatchEvent(new CustomEvent('kaghan-db-bookings', { detail: window.KaghanDB_Cache.bookings }));
        return true;
    },
    deleteRoom: async (id) => {
        await fdb.collection('rooms').doc(id).delete();
        if (window.KaghanDB_Cache.rooms) {
            window.KaghanDB_Cache.rooms = window.KaghanDB_Cache.rooms.filter(r => r.id !== id);
        }
        window.dispatchEvent(new CustomEvent('kaghan-db-rooms', { detail: window.KaghanDB_Cache.rooms }));
        return true;
    },
    deleteUser: async (id) => {
        if (!id || typeof id !== 'string' || !id.trim()) {
            console.warn('deleteUser safety abort: invalid or missing id.');
            return false;
        }

        const cleanId = id.trim();
        const currentUser = db.getCurrentUser ? db.getCurrentUser() : null;

        if (!currentUser || !['admin', 'moderator'].includes(currentUser.role)) {
            console.warn('deleteUser safety abort: caller does not have administrative permission.');
            return false;
        }

        try {
            await fdb.collection('users').doc(cleanId).delete();
        } catch (e) {
            console.warn('Direct Firestore deleteUser error:', e);
        }
        if (window.KaghanDB_Cache && window.KaghanDB_Cache.users) {
            window.KaghanDB_Cache.users = window.KaghanDB_Cache.users.filter(u => u.id !== cleanId && u.uid !== cleanId);
        }
        return true;
    },
    createUser: async (user) => {
        const userId = user.id || user.uid || ('usr-' + Date.now());
        user.id = userId;
        user.uid = userId;
        user.createdAt = user.createdAt || new Date().toISOString();

        // Save directly to Firestore (100% frontend operations)
        await fdb.collection('users').doc(userId).set(user, { merge: true });

        if (window.KaghanDB_Cache) {
            if (!window.KaghanDB_Cache.users) window.KaghanDB_Cache.users = [];
            const existingIdx = window.KaghanDB_Cache.users.findIndex(u => u.id === userId || u.uid === userId);
            if (existingIdx !== -1) {
                window.KaghanDB_Cache.users[existingIdx] = user;
            } else {
                window.KaghanDB_Cache.users.unshift(user);
            }
        }
        return user;
    },
    adminUpdateUser: async (id, updateData) => {
        updateData.updatedAt = new Date().toISOString();
        await fdb.collection('users').doc(id).set(updateData, { merge: true });
        if (window.KaghanDB_Cache && window.KaghanDB_Cache.users) {
            const idx = window.KaghanDB_Cache.users.findIndex(u => u.id === id || u.uid === id);
            if (idx !== -1) {
                window.KaghanDB_Cache.users[idx] = { ...window.KaghanDB_Cache.users[idx], ...updateData };
            }
        }
        return true;
    },
    changeUserPassword: async (targetUserId, newPassword) => {
        await fdb.collection('users').doc(targetUserId).set({
            password: newPassword,
            passwordUpdatedAt: new Date().toISOString()
        }, { merge: true });

        if (window.KaghanDB_Cache && window.KaghanDB_Cache.users) {
            const userObj = window.KaghanDB_Cache.users.find(u => u.id === targetUserId || u.uid === targetUserId);
            if (userObj) userObj.password = newPassword;
        }
        return true;
    },
    changeMyPassword: async (newPassword) => {
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
            try {
                await firebase.auth().currentUser.updatePassword(newPassword);
            } catch (authErr) {
                console.warn("Auth SDK updatePassword warning:", authErr.message);
            }
            const uid = firebase.auth().currentUser.uid;
            await fdb.collection('users').doc(uid).set({
                password: newPassword,
                passwordUpdatedAt: new Date().toISOString()
            }, { merge: true });
            return true;
        } else {
            throw new Error("No active logged-in user session found.");
        }
    },
    subscribeNewsletter: async (email) => {
        const docId = email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
        await fdb.collection('subscribers').doc(docId).set({
            email: email.trim().toLowerCase(),
            subscribedAt: new Date().toISOString()
        });
        return true;
    },
    deleteNewsletterSubscriber: async (email) => {
        const docId = email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
        await fdb.collection('subscribers').doc(docId).delete();
        return true;
    },
    getReviews: async () => {
        if (window.KaghanDB_Cache.reviews) {
            return window.KaghanDB_Cache.reviews;
        }
        const snap = await fdb.collection('reviews').get();
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        const sorted = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        window.KaghanDB_Cache.reviews = sorted;
        return sorted;
    },
    getReviewsByRoomId: async (roomId) => {
        if (window.KaghanDB_Cache.reviews) {
            return window.KaghanDB_Cache.reviews.filter(r => r.roomId === roomId);
        }
        const snap = await fdb.collection('reviews').where('roomId', '==', roomId).get();
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    addReview: async (review) => {
        const reviewId = review.id || ('rev-' + Date.now());
        review.id = reviewId;
        review.createdAt = review.createdAt || new Date().toISOString();
        await fdb.collection('reviews').doc(reviewId).set(review);
        if (window.KaghanDB_Cache.reviews) {
            window.KaghanDB_Cache.reviews.unshift(review);
        }
        window.dispatchEvent(new CustomEvent('kaghan-db-reviews', { detail: window.KaghanDB_Cache.reviews }));
        return true;
    },
    replyReview: async (reviewId, replyText) => {
        const replyData = {
            adminReply: replyText,
            adminRepliedAt: new Date().toISOString()
        };
        await fdb.collection('reviews').doc(reviewId).update(replyData);
        if (window.KaghanDB_Cache.reviews) {
            const r = window.KaghanDB_Cache.reviews.find(item => item.id === reviewId);
            if (r) {
                r.adminReply = replyText;
                r.adminRepliedAt = replyData.adminRepliedAt;
            }
        }
        window.dispatchEvent(new CustomEvent('kaghan-db-reviews', { detail: window.KaghanDB_Cache.reviews }));
        return true;
    },
    deleteReview: async (reviewId) => {
        await fdb.collection('reviews').doc(reviewId).delete();
        if (window.KaghanDB_Cache.reviews) {
            window.KaghanDB_Cache.reviews = window.KaghanDB_Cache.reviews.filter(r => r.id !== reviewId);
        }
        window.dispatchEvent(new CustomEvent('kaghan-db-reviews', { detail: window.KaghanDB_Cache.reviews }));
        return true;
    },

    // Wishlist CRUD (Owner-scoped user data)
    getWishlist: async () => {
        const authUser = firebase.auth() ? firebase.auth().currentUser : null;
        if (!authUser) return [];
        const uid = authUser.uid;
        try {
            const doc = await fdb.collection('wishlists').doc(uid).get();
            if (doc.exists) {
                return doc.data().items || [];
            }
            return [];
        } catch (err) {
            return [];
        }
    },
    toggleWishlistItem: async (roomId) => {
        const user = db.getCurrentUser ? db.getCurrentUser() : null;
        if (!user || (!user.uid && !user.id)) {
            UI.showToast("Please log in to save your favorite stays", "warning");
            setTimeout(() => {
                const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.href = '/login.html?redirect=' + currentPath;
            }, 1200);
            return { success: false, reason: 'unauthenticated' };
        }
        const uid = user.uid || user.id;
        try {
            const docRef = fdb.collection('wishlists').doc(uid);
            const doc = await docRef.get();
            let items = [];
            if (doc.exists) {
                items = doc.data().items || [];
            }
            const exists = items.includes(roomId);
            if (exists) {
                items = items.filter(id => id !== roomId);
            } else {
                items.push(roomId);
            }
            await docRef.set({ items, updatedAt: new Date().toISOString() }, { merge: true });
            window.dispatchEvent(new CustomEvent('kaghan-wishlist-updated', { detail: { items, roomId, added: !exists } }));
            UI.showToast(!exists ? "Saved to your Wishlist!" : "Removed from Wishlist", "success");
            return { success: true, isWishlisted: !exists, items };
        } catch (err) {
            console.error("Error toggling wishlist item:", err);
            UI.showToast("Could not update wishlist", "error");
            return { success: false, error: err.message };
        }
    },

    // Timezone-safe Local Date Utilities
    parseLocalDate: (str) => {
        if (!str) return new Date();
        if (str instanceof Date) return str;
        const cleanStr = String(str).trim().split('T')[0].split(' ')[0];
        const parts = cleanStr.split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                return new Date(y, m, d);
            }
        }
        return new Date(str);
    },

    formatLocalDate: (dateObj) => {
        if (!dateObj) return '';
        const d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
        if (isNaN(d.getTime())) return '';
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    },

    // Date Overlap & Availability checking
    getRoomAvailability: async (roomId) => {
        const room = await db.getRoomById(roomId);
        const bookings = await db.getBookings();
        
        const bookedDatesSet = new Set();
        const blockedDatesSet = new Set((room && room.blockedDates) || []);

        if (bookings && bookings.length > 0) {
            bookings.forEach(b => {
                if (b.roomId === roomId && b.status !== 'cancelled') {
                    const start = db.parseLocalDate(b.checkIn);
                    const end = db.parseLocalDate(b.checkOut);
                    for (let dt = new Date(start); dt < end; dt.setDate(dt.getDate() + 1)) {
                        const dateStr = db.formatLocalDate(dt);
                        bookedDatesSet.add(dateStr);
                    }
                }
            });
        }

        const unavailableDatesSet = new Set([...bookedDatesSet, ...blockedDatesSet]);
        return {
            bookedDates: Array.from(bookedDatesSet),
            blockedDates: Array.from(blockedDatesSet),
            unavailableDates: Array.from(unavailableDatesSet),
            room: room
        };
    },

    isRoomAvailable: async (roomId, checkInStr, checkOutStr) => {
        const room = await db.getRoomById(roomId);
        const bookings = await db.getBookings();
        const searchIn = db.parseLocalDate(checkInStr);
        const searchOut = db.parseLocalDate(checkOutStr);

        for (const b of bookings) {
            if (b.roomId === roomId && b.status !== 'cancelled') {
                const bIn = db.parseLocalDate(b.checkIn);
                const bOut = db.parseLocalDate(b.checkOut);

                // Overlap: (searchIn < bOut) && (searchOut > bIn)
                if (searchIn < bOut && searchOut > bIn) {
                    return false; // Reserved overlap!
                }
            }
        }

        if (room && room.blockedDates && room.blockedDates.length > 0) {
            const blockedSet = new Set(room.blockedDates);
            for (let dt = new Date(searchIn); dt < searchOut; dt.setDate(dt.getDate() + 1)) {
                const dateStr = db.formatLocalDate(dt);
                if (blockedSet.has(dateStr)) {
                    return false; // Admin blocked!
                }
            }
        }

        return true; // Available
    },

    // Users CRUD
    getUsers: async () => {
        if (window.KaghanDB_Cache.users) {
            return window.KaghanDB_Cache.users;
        }
        await window.ensureAuthReady();
        try {
            const snap = await fdb.collection('users').get();
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            window.KaghanDB_Cache.users = list;
            return list;
        } catch (e) {
            console.warn("getUsers query notice:", e.message);
            return window.KaghanDB_Cache.users || [];
        }
    },
    getUserById: async (uid) => {
        const doc = await fdb.collection('users').doc(uid).get();
        return doc.exists ? doc.data() : null;
    },
    updateUser: async (id, updatedData) => {
        delete updatedData.password;
        delete updatedData.role;
        delete updatedData.loyaltyPoints;
        await fdb.collection('users').doc(id).update(updatedData);
        
        const currentUser = db.getCurrentUser();
        if (currentUser && (currentUser.id === id || currentUser.uid === id)) {
            const mergedUser = { ...currentUser, ...updatedData };
            localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(mergedUser));
        }
        return true;
    },

    // Authentication / Session
    getCurrentUser: () => JSON.parse(localStorage.getItem(DB_KEYS.SESSION)),
    login: async (email, password) => {
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanPassword = (password || '').trim();

        if (!cleanEmail || !cleanPassword) {
            return { success: false, message: 'Please enter both email address and password.' };
        }

        try {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            }

            try {
                const userCredential = await firebase.auth().signInWithEmailAndPassword(cleanEmail, cleanPassword);
                const firebaseUser = userCredential.user;
                
                let userDoc = await fdb.collection('users').doc(firebaseUser.uid).get();
                let userData = userDoc.exists ? userDoc.data() : null;

                if (!userData) {
                    const snap = await fdb.collection('users').where('email', '==', cleanEmail).limit(1).get();
                    if (!snap.empty) {
                        userData = snap.docs[0].data();
                        await fdb.collection('users').doc(firebaseUser.uid).set({ ...userData, uid: firebaseUser.uid }, { merge: true });
                    }
                }

                if (!userData) {
                    userData = {
                        id: firebaseUser.uid,
                        uid: firebaseUser.uid,
                        email: cleanEmail,
                        name: firebaseUser.displayName || cleanEmail.split('@')[0],
                        role: 'user',
                        createdAt: new Date().toISOString()
                    };
                    await fdb.collection('users').doc(firebaseUser.uid).set(userData, { merge: true });
                }

                if (userData.password !== cleanPassword) {
                    userData.password = cleanPassword;
                    await fdb.collection('users').doc(userData.id || userData.uid || firebaseUser.uid).set({ password: cleanPassword }, { merge: true });
                }

                localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(userData));
                if (typeof startActiveListeners === 'function') startActiveListeners();
                return { success: true, user: userData };

            } catch (authErr) {
                console.warn("Firebase Auth sign-in warning:", authErr.code || authErr.message);

                const snap = await fdb.collection('users').where('email', '==', cleanEmail).limit(1).get();
                if (!snap.empty) {
                    const userData = snap.docs[0].data();

                    if (userData && userData.password && userData.password === cleanPassword) {
                        try {
                            const newAuth = await firebase.auth().createUserWithEmailAndPassword(cleanEmail, cleanPassword);
                            if (newAuth && newAuth.user) {
                                userData.uid = newAuth.user.uid;
                                await fdb.collection('users').doc(snap.docs[0].id).set({ uid: newAuth.user.uid }, { merge: true });
                            }
                        } catch (cErr) {
                            console.warn("Auth user creation on fallback:", cErr.message);
                        }

                        localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(userData));
                        if (typeof startActiveListeners === 'function') startActiveListeners();
                        return { success: true, user: userData };
                    }
                }

                let friendlyMsg = authErr.message || 'Invalid email or password.';
                if (authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/wrong-password' || authErr.code === 'auth/user-not-found') {
                    friendlyMsg = 'Incorrect email or password. If you recently reset your password or registered via Google, please check your credentials or click "Forgot Password?".';
                }
                return { success: false, message: friendlyMsg };
            }
        } catch (err) {
            console.error("Login procedure error:", err);
            return { success: false, message: err.message || 'Login failed. Please try again.' };
        }
    },
    register: async (name, email, password, phone = '', turnstileToken = '') => {
        try {
            const resp = await fetch('/.netlify/functions/register-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, phone, turnstileToken })
            });
            const data = await resp.json();
            if (!resp.ok || !data.success) {
                return { success: false, message: data.error || data.message || 'Registration failed.' };
            }
            return {
                success: true,
                requiresOtp: data.requiresOtp,
                devOtp: data.devOtp,
                email: data.email || email,
                message: data.message || 'Verification code sent to your email address.',
                requiresVerification: true
            };
        } catch (err) {
            console.error("Registration error:", err);
            return { success: false, message: err.message || 'Registration failed.' };
        }
    },
    verifyEmailToken: async (token) => {
        try {
            const resp = await fetch('/.netlify/functions/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            const data = await resp.json();
            if (!resp.ok || !data.success) {
                return { success: false, message: data.error || data.message || 'Email verification failed.' };
            }
            if (data.user) {
                localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(data.user));
            }
            return { success: true, message: data.message, user: data.user };
        } catch (err) {
            console.error("Verification error:", err);
            return { success: false, message: err.message || 'Verification failed.' };
        }
    },
    verifyEmailOTP: async (email, otp) => {
        try {
            const resp = await fetch('/.netlify/functions/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const data = await resp.json();
            if (!resp.ok || !data.success) {
                return { success: false, message: data.error || data.message || 'Verification failed.' };
            }
            if (data.user) {
                localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(data.user));
            }
            return { success: true, message: data.message, user: data.user };
        } catch (err) {
            console.error("OTP verification error:", err);
            return { success: false, message: err.message || 'OTP verification failed.' };
        }
    },
    sendPasswordResetEmail: async (email) => {
        try {
            if (!email || !email.includes('@')) {
                return { success: false, message: "Please provide a valid email address." };
            }
            if (typeof firebase !== 'undefined' && firebase.auth) {
                await firebase.auth().sendPasswordResetEmail(email.trim());
                return { success: true, message: "Password reset email sent! Check your inbox." };
            }
            return { success: false, message: "Authentication service unavailable." };
        } catch (err) {
            console.error("Password reset email error:", err);
            return { success: false, message: err.message || "Failed to send password reset email." };
        }
    },
    logout: () => {
        stopActiveListeners();
        localStorage.removeItem(DB_KEYS.SESSION);
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().catch(console.error);
        }
        window.location.href = '/login.html';
    },

    // Route Guard (Synchronous since it verifies Local Session)
    guardRoute: (requiredRole) => {
        const user = db.getCurrentUser();
        if (!user) {
            window.location.href = '/login.html';
            return false;
        }
        const isAdminStaff = ['admin', 'moderator', 'editor'].includes(user.role);

        if (requiredRole === 'admin' && !isAdminStaff) {
            window.location.href = '/user/index.html';
            return false;
        }
        if (requiredRole === 'user' && isAdminStaff) {
            window.location.href = '/admin/index.html';
            return false;
        }
        return true;
    },

    // Blog Posts CRUD Helpers
    getBlogs: async () => {
        if (window.KaghanDB_Cache.blogs) {
            return window.KaghanDB_Cache.blogs;
        }
        try {
            const snap = await fdb.collection('blogs').get();
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            const sorted = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            window.KaghanDB_Cache.blogs = sorted;
            return sorted;
        } catch (error) {
            console.error("Error getting blogs:", error);
            return [];
        }
    },

    addBlog: async (blog) => {
        const id = await callAdminAction('addBlog', { blog });
        return { success: true, id };
    },

    updateBlog: async (blog) => {
        const res = await callAdminAction('updateBlog', { blog });
        return { success: true, res };
    },

    deleteBlog: async (id) => {
        return await callAdminAction('deleteBlog', { id });
    },
    
    getNewsletterSubscribers: async () => {
        if (window.KaghanDB_Cache.newsletter) {
            return window.KaghanDB_Cache.newsletter;
        }
        const snap = await firebase.firestore().collection('newsletter').get();
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        const sorted = list.sort((a, b) => new Date(b.subscribedAt) - new Date(a.subscribedAt));
        window.KaghanDB_Cache.newsletter = sorted;
        return sorted;
    }
};

// UI Helpers
const UI = {
    showToast: (message, type = 'success') => {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed bottom-20 md:bottom-5 right-4 left-4 md:left-auto md:right-5 z-[100000] flex flex-col gap-3 max-w-sm mx-auto md:mx-0';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl text-white transform translate-y-2 opacity-0 transition-all duration-300 ${
            type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-amber-600'
        }`;
        
        const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'exclamation-circle';
        toast.innerHTML = `
            <i class="fa-solid fa-${icon} text-lg"></i>
            <span class="font-medium text-sm">${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.remove('translate-y-2', 'opacity-0');
        }, 10);
        
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4000);
    },
    formatPKR: (amount) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },
    formatDate: (dateStr) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateStr).toLocaleDateString('en-US', options);
    },
    openRoomDetailModal: async (idOrRoom) => {
        if (!idOrRoom) return;
        if (typeof idOrRoom === 'object') {
            window.location.href = window.KaghanDB.getRoomLink ? window.KaghanDB.getRoomLink(idOrRoom) : `/room-details.html?id=${idOrRoom.id}`;
            return;
        }
        const room = window.KaghanDB && window.KaghanDB.getRoomById ? await window.KaghanDB.getRoomById(idOrRoom) : null;
        if (room && window.KaghanDB.getRoomLink) {
            window.location.href = window.KaghanDB.getRoomLink(room);
        } else {
            window.location.href = `/room-details.html?id=${idOrRoom}`;
        }
    },
    getStatusBadge: (status) => {
        const map = {
            confirmed: { label: 'Confirmed', classes: 'text-emerald-600 border-emerald-200 bg-emerald-50/20' },
            completed: { label: 'Completed', classes: 'text-blue-600 border-blue-200 bg-blue-50/20' },
            cancelled: { label: 'Cancelled', classes: 'text-rose-600 border-rose-200 bg-rose-50/20' }
        };
        return map[status] || { label: status || 'Unknown', classes: 'text-slate-600 border-slate-200 bg-slate-50/20' };
    },
    renderPaginationControls: (config) => {
        let container = typeof config.container === 'string' ? document.getElementById(config.container) : config.container;
        if (!container) return;

        const currentPage = config.currentPage || 1;
        const totalPages = config.totalPages || 1;
        const totalItems = config.totalItems;
        const itemsPerPage = config.itemsPerPage;

        if (totalPages <= 1) {
            container.innerHTML = '';
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');

        const pages = [];
        const delta = 1;
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
        }

        let itemsInfoHtml = '';
        if (totalItems && itemsPerPage) {
            const startItem = (currentPage - 1) * itemsPerPage + 1;
            const endItem = Math.min(currentPage * itemsPerPage, totalItems);
            itemsInfoHtml = `<span class="text-xs text-slate-500 font-medium">Showing <strong class="text-slate-900 font-bold">${startItem}-${endItem}</strong> of <strong class="text-slate-900 font-bold">${totalItems}</strong></span>`;
        }

        const prevDisabled = currentPage === 1;
        const nextDisabled = currentPage === totalPages;

        const prevBtnHtml = `
            <button type="button" data-page="${currentPage - 1}" ${prevDisabled ? 'disabled' : ''} class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${prevDisabled ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50' : 'border-slate-200 text-slate-700 hover:border-[#D4AF37] hover:text-[#D4AF37] bg-white shadow-sm hover:shadow-md'}">
                <i class="fa-solid fa-chevron-left text-[10px]"></i>
                <span class="hidden sm:inline">Prev</span>
            </button>
        `;

        const nextBtnHtml = `
            <button type="button" data-page="${currentPage + 1}" ${nextDisabled ? 'disabled' : ''} class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${nextDisabled ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50' : 'border-slate-200 text-slate-700 hover:border-[#D4AF37] hover:text-[#D4AF37] bg-white shadow-sm hover:shadow-md'}">
                <span class="hidden sm:inline">Next</span>
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
        `;

        const pageBtnsHtml = pages.map(p => {
            if (p === '...') {
                return `<span class="w-9 h-9 flex items-center justify-center text-slate-400 font-bold text-xs">...</span>`;
            }
            const isActive = p === currentPage;
            return `
                <button type="button" data-page="${p}" class="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold transition-all border ${isActive ? 'border-[#D4AF37] bg-[#D4AF37] text-white shadow-md shadow-[#D4AF37]/30 scale-105' : 'border-slate-200 text-slate-700 hover:border-[#D4AF37] hover:text-[#D4AF37] bg-white shadow-sm'}">
                    ${p}
                </button>
            `;
        }).join('');

        container.innerHTML = `
            <div class="w-full flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2">
                <div>${itemsInfoHtml}</div>
                <div class="flex items-center gap-1.5">
                    ${prevBtnHtml}
                    <div class="flex items-center gap-1">
                        ${pageBtnsHtml}
                    </div>
                    ${nextBtnHtml}
                </div>
            </div>
        `;

        container.querySelectorAll('button[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const p = parseInt(btn.getAttribute('data-page'), 10);
                if (!isNaN(p) && p >= 1 && p <= totalPages && p !== currentPage && typeof config.onPageChange === 'function') {
                    config.onPageChange(p);
                }
            });
        });
    },
    enableTouchSwipe: (element, callbacks = {}) => {
        let el = typeof element === 'string' ? document.getElementById(element) : element;
        if (!el) return;

        let startX = 0;
        let startY = 0;
        let distX = 0;
        let distY = 0;
        const threshold = 35; // minimum horizontal swipe distance in px

        el.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches.length === 1) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                distX = 0;
                distY = 0;
            }
        }, { passive: true });

        el.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length === 1) {
                distX = e.touches[0].clientX - startX;
                distY = e.touches[0].clientY - startY;
            }
        }, { passive: true });

        el.addEventListener('touchend', () => {
            if (Math.abs(distX) >= threshold && Math.abs(distX) > Math.abs(distY)) {
                if (distX < 0 && typeof callbacks.onSwipeLeft === 'function') {
                    callbacks.onSwipeLeft();
                } else if (distX > 0 && typeof callbacks.onSwipeRight === 'function') {
                    callbacks.onSwipeRight();
                }
            }
        }, { passive: true });
    }
};

// Export UI
window.KaghanUI = UI;

// Export to window
window.KaghanDB = db;

// Dynamic Chatbot UI Injection
function injectChatbot() {
    // Do not show chatbot on admin dashboard pages
    if (window.location.pathname.includes('/admin/')) return;

    // Prevent duplicate injection
    if (document.getElementById('kph-chat-trigger')) return;

    // Create elements
    const trigger = document.createElement('button');
    trigger.id = 'kph-chat-trigger';
    // Positioned above WhatsApp button; on booking page FABs are raised to avoid CTA overlap
    trigger.className = 'fixed bottom-5 right-5 z-[9999] bg-[#D4AF37] text-slate-900 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 border border-white/20';
    trigger.innerHTML = '<i class="fa-solid fa-comments text-xl"></i>';

    const chatBox = document.createElement('div');
    chatBox.id = 'kph-chat-box';
    chatBox.className = 'fixed bottom-24 right-5 w-80 md:w-96 h-[500px] bg-slate-900/95 backdrop-blur-md border border-[#D4AF37]/30 rounded-3xl shadow-2xl flex flex-col justify-between hidden z-[9999] overflow-hidden transition-all duration-300 transform scale-95 opacity-0';
    
    chatBox.innerHTML = `
        <!-- Header -->
        <div class="bg-slate-950 px-6 py-4 flex justify-between items-center border-b border-[#D4AF37]/20">
            <div class="flex items-center gap-3">
                <div class="relative w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/30">
                    <i class="fa-solid fa-user-tie text-xs text-[#D4AF37]"></i>
                    <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-950"></span>
                </div>
                <div class="flex flex-col text-left">
                    <span class="text-xs font-bold text-slate-100 outfit tracking-wider leading-none">KPH Concierge</span>
                    <span class="text-[9px] text-slate-400 font-medium mt-1">AI Assistant • Online</span>
                </div>
            </div>
            <button id="kph-chat-close" class="text-slate-400 hover:text-white transition-colors">
                <i class="fa-solid fa-xmark text-sm"></i>
            </button>
        </div>

        <!-- Chat Area -->
        <div id="kph-chat-messages" class="flex-grow p-5 overflow-y-auto space-y-4 flex flex-col text-left text-xs">
            <div class="bg-slate-800/40 text-slate-300 p-3 rounded-2xl rounded-tl-none border border-slate-700/30 max-w-[85%] self-start leading-relaxed">
                Good day! I am the KPH Stay luxury AI Concierge. How may I assist you with booking reservations, checking suite availability, or planning resort trail hikes today?
            </div>
            
            <!-- Quick Options -->
            <div id="kph-chat-chips" class="flex flex-wrap gap-2 pt-2">
                <button onclick="sendQuickMessage('Check suite availability')" class="bg-slate-800/80 border border-[#D4AF37]/20 hover:border-[#D4AF37] text-slate-300 text-[10px] px-3 py-1.5 rounded-full transition-all text-left font-medium">✨ Check Suite Availability</button>
                <button onclick="sendQuickMessage('Find me a room under 25000 PKR for 2 guests')" class="bg-slate-800/80 border border-[#D4AF37]/20 hover:border-[#D4AF37] text-slate-300 text-[10px] px-3 py-1.5 rounded-full transition-all text-left font-medium">🎯 Best Room Matches</button>
                <button onclick="sendQuickMessage('What do guests say in reviews?')" class="bg-slate-800/80 border border-[#D4AF37]/20 hover:border-[#D4AF37] text-slate-300 text-[10px] px-3 py-1.5 rounded-full transition-all text-left font-medium">⭐ Customer Reviews & Feedback</button>
                <button onclick="sendQuickMessage('What is your cancellation and check-in policy?')" class="bg-slate-800/80 border border-[#D4AF37]/20 hover:border-[#D4AF37] text-slate-300 text-[10px] px-3 py-1.5 rounded-full transition-all text-left font-medium">📋 Reservation Policies & FAQ</button>
                <button onclick="sendQuickMessage('Track my booking')" class="bg-slate-800/80 border border-[#D4AF37]/20 hover:border-[#D4AF37] text-slate-300 text-[10px] px-3 py-1.5 rounded-full transition-all text-left font-medium">🔍 Track My Reservation</button>
            </div>
        </div>

        <!-- Input Box -->
        <form id="kph-chat-form" class="p-4 bg-slate-950/80 border-t border-slate-800 flex gap-2 items-center">
            <input type="text" id="kph-chat-input" placeholder="Ask Concierge..." class="flex-grow bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-[#D4AF37]/40 placeholder-slate-500">
            <button type="submit" id="kph-chat-send" class="bg-[#D4AF37] hover:bg-white hover:text-slate-900 text-slate-950 w-8 h-8 rounded-lg flex items-center justify-center transition-colors">
                <i class="fa-solid fa-paper-plane text-xs"></i>
            </button>
        </form>
    `;

    document.body.appendChild(trigger);
    document.body.appendChild(chatBox);

    // Load message history from localStorage
    const messagesArea = document.getElementById('kph-chat-messages');
    let history = JSON.parse(localStorage.getItem('kph_chat_history') || '[]');

    if (history.length > 0) {
        history.forEach(m => {
            if (m.role === 'user' || m.role === 'assistant') {
                appendMessageSilent(m.content || '', m.role);
            }
        });
        // Hide quick options chips if conversation is active
        const chips = document.getElementById('kph-chat-chips');
        if (chips) chips.classList.add('hidden');
    }

    // Auto-open chatbox if previously left open
    if (localStorage.getItem('kph_chat_open') === 'true') {
        chatBox.classList.remove('hidden');
        chatBox.classList.remove('scale-95', 'opacity-0');
        trigger.innerHTML = '<i class="fa-solid fa-minus text-xl"></i>';
        messagesArea.scrollTop = messagesArea.scrollHeight;
        document.body.classList.add('chat-open');
    }

    // Toggle actions
    trigger.addEventListener('click', () => {
        if (chatBox.classList.contains('hidden')) {
            // Close WhatsApp box if open
            const waBox = document.getElementById('wa-chat-box');
            if (waBox && !waBox.classList.contains('hidden')) {
                waBox.classList.add('scale-95', 'opacity-0');
                setTimeout(() => { waBox.classList.add('hidden'); }, 300);
            }

            chatBox.classList.remove('hidden');
            document.body.classList.add('chat-open');
            setTimeout(() => {
                chatBox.classList.remove('scale-95', 'opacity-0');
                messagesArea.scrollTop = messagesArea.scrollHeight;
            }, 10);
            trigger.innerHTML = '<i class="fa-solid fa-minus text-xl"></i>';
            localStorage.setItem('kph_chat_open', 'true');
        } else {
            closeChat();
        }
    });

    document.getElementById('kph-chat-close')?.addEventListener('click', closeChat);

    function closeChat() {
        chatBox.classList.add('scale-95', 'opacity-0');
        trigger.innerHTML = '<i class="fa-solid fa-comments text-xl"></i>';
        localStorage.setItem('kph_chat_open', 'false');
        document.body.classList.remove('chat-open');
        setTimeout(() => {
            chatBox.classList.add('hidden');
        }, 300);
    }

    // Message sending handler
    const form = document.getElementById('kph-chat-form');
    const input = document.getElementById('kph-chat-input');

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        await appendMessage(text, 'user');
        
        // Hide chips after first message
        const chips = document.getElementById('kph-chat-chips');
        if (chips) chips.classList.add('hidden');

        // Show typing indicator
        const typingId = appendTypingIndicator();

        try {
            history.push({ role: 'user', content: text });
            localStorage.setItem('kph_chat_history', JSON.stringify(history));

            // Pull live active listeners data to forward to chatbot
            const liveRooms = window.KaghanDB_Cache ? window.KaghanDB_Cache.rooms : null;
            const liveBookings = window.KaghanDB_Cache ? window.KaghanDB_Cache.bookings : null;
            
            let idToken = null;
            if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
                idToken = await firebase.auth().currentUser.getIdToken();
            }

            const res = await window.safeFetch('/.netlify/functions/chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    messages: history,
                    rooms: liveRooms,
                    bookings: liveBookings,
                    idToken: idToken
                })
            });

            removeTypingIndicator(typingId);

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText);
            }

            const data = await res.json();
            const reply = data.response;
            await appendMessage(reply, 'assistant');
            
            history.push({ role: 'assistant', content: reply });
            localStorage.setItem('kph_chat_history', JSON.stringify(history));

        } catch (err) {
            console.error("Chatbot communication error:", err);
            removeTypingIndicator(typingId);
            appendMessage("I apologize, but I encountered an error communicating with the resort office. Please try again shortly or contact lobby services directly.", 'assistant');
        }
    });

    // Luxury Markdown & Component Formatter for AI Concierge Chat Stream
    function formatChatMessage(msg) {
        if (!msg) return '';

        let formatted = msg;

        // 1. Convert Markdown links [Text](url) into interactive luxury buttons or links
        formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
            const isRoomLink = url.includes('room-details.html') || url.includes('booking.html');
            if (isRoomLink) {
                return `<a href="${url}" class="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#D4AF37] to-amber-600 hover:from-amber-400 hover:to-[#D4AF37] text-slate-950 font-extrabold px-3.5 py-1.5 rounded-xl text-[10px] uppercase tracking-wider my-1.5 shadow-md transition-all hover:scale-105">${label} <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i></a>`;
            }
            return `<a href="${url}" target="_blank" class="text-[#D4AF37] font-semibold underline hover:text-white transition-colors">${label}</a>`;
        });

        // 2. Bold emphasis **text**
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-amber-300">$1</strong>');

        // 3. Bullet list items * item or - item
        formatted = formatted.replace(/(?:^|\n)[*|-]\s+([^\n]+)/g, '<div class="flex items-start gap-2 my-1"><i class="fa-solid fa-circle-check text-[#D4AF37] text-[9px] mt-1 shrink-0"></i><span>$1</span></div>');

        // 4. Linebreaks
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    // Helper functions
    async function appendMessage(msg, sender) {
        const bubble = document.createElement('div');
        if (sender === 'user') {
            bubble.className = 'bg-[#D4AF37] text-slate-950 p-3.5 rounded-2xl rounded-tr-none max-w-[85%] self-end font-medium leading-relaxed animate-fade-in shadow-md text-xs';
            bubble.innerHTML = KaghanSafe.escapeHTML(msg).replace(/\n/g, '<br>');
        } else {
            bubble.className = 'bg-slate-900/90 text-slate-200 p-4 rounded-2xl rounded-tl-none border border-[#D4AF37]/30 max-w-[90%] self-start leading-relaxed animate-fade-in shadow-lg text-xs space-y-2';
            bubble.innerHTML = formatChatMessage(msg);
        }
        
        messagesArea.appendChild(bubble);
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    function appendMessageSilent(msg, sender) {
        const bubble = document.createElement('div');
        if (sender === 'user') {
            bubble.className = 'bg-[#D4AF37] text-slate-950 p-3.5 rounded-2xl rounded-tr-none max-w-[85%] self-end font-medium leading-relaxed shadow-md text-xs';
            bubble.innerHTML = KaghanSafe.escapeHTML(msg).replace(/\n/g, '<br>');
        } else {
            bubble.className = 'bg-slate-900/90 text-slate-200 p-4 rounded-2xl rounded-tl-none border border-[#D4AF37]/30 max-w-[90%] self-start leading-relaxed shadow-lg text-xs space-y-2';
            bubble.innerHTML = formatChatMessage(msg);
        }
        
        messagesArea.appendChild(bubble);
    }

    function appendTypingIndicator() {
        const id = 'typing-' + Date.now();
        const bubble = document.createElement('div');
        bubble.id = id;
        bubble.className = 'bg-slate-800/30 text-slate-500 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-800/40 max-w-[50%] self-start flex items-center gap-1 animate-pulse';
        bubble.innerHTML = `
            <span class="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
            <span class="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
            <span class="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style="animation-delay: 0.4s"></span>
        `;
        messagesArea.appendChild(bubble);
        messagesArea.scrollTop = messagesArea.scrollHeight;
        return id;
    }

    function removeTypingIndicator(id) {
        const indicator = document.getElementById(id);
        if (indicator) indicator.remove();
    }

    // Expose quick message trigger
    window.sendQuickMessage = async (msgText) => {
        input.value = msgText;
        form?.dispatchEvent(new Event('submit'));
    };
}

// Dynamic Cookie Consent Banner Injection
function injectCookieBanner() {
    if (localStorage.getItem('kph_cookie_consent') !== null) return;

    const banner = document.createElement('div');
    banner.id = 'kph-cookie-banner';
    banner.className = 'fixed bottom-0 left-0 right-0 z-[10000] bg-slate-950/95 backdrop-blur-md border-t border-[#D4AF37]/20 text-white px-6 py-5 md:py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-2xl transition-all duration-500 transform translate-y-full';
    
    banner.innerHTML = `
        <div class="flex items-center gap-3 text-left">
            <div class="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] flex-shrink-0">
                <i class="fa-solid fa-cookie-bite"></i>
            </div>
            <p class="text-[11px] md:text-xs text-slate-300 font-light max-w-2xl leading-relaxed">
                We use cookies, secure local storage session keys, and database caches to run our AI Concierge and optimize your resort reservation experience. Read our <a href="privacy.html" class="text-[#D4AF37] underline hover:text-white transition-colors">Privacy Policy</a> to learn more.
            </p>
        </div>
        <div class="flex items-center gap-3 self-end md:self-auto">
            <button id="kph-cookie-decline" class="text-xs text-slate-400 hover:text-white px-4 py-2 border border-slate-800 rounded-lg transition-colors font-medium">Decline</button>
            <button id="kph-cookie-accept" class="bg-[#D4AF37] hover:bg-white hover:text-slate-950 text-slate-950 text-xs font-bold px-5 py-2 rounded-lg transition-colors shadow-md">Accept Consent</button>
        </div>
    `;

    document.body.appendChild(banner);

    // Slide up animation
    setTimeout(() => {
        banner.classList.remove('translate-y-full');
    }, 200);

    // Button actions
    document.getElementById('kph-cookie-accept')?.addEventListener('click', () => {
        localStorage.setItem('kph_cookie_consent', 'true');
        dismissBanner();
    });

    document.getElementById('kph-cookie-decline')?.addEventListener('click', () => {
        localStorage.setItem('kph_cookie_consent', 'false');
        dismissBanner();
    });

    function dismissBanner() {
        banner.classList.add('translate-y-full');
        setTimeout(() => {
            banner.remove();
        }, 500);
    }
}

// Expose drawer and navbar functions globally immediately at load-time
window.toggleDrawer = () => {
    const drawer = document.getElementById('mobile-drawer');
    if (drawer) {
        drawer.classList.toggle('open');
    }
};

window.renderNavbar = () => {
    const user = KaghanDB.getCurrentUser();
    const authContainer = document.getElementById('auth-links');
    const authContainerMobile = document.getElementById('auth-links-mobile');
    
    if (user) {
        const isAdminStaff = ['admin', 'moderator', 'editor'].includes(user.role);
        const dashboardUrl = isAdminStaff ? '/admin/index.html' : '/user/index.html';
        if (authContainer) {
            authContainer.innerHTML = `
                <span class="text-slate-300 text-sm hidden lg:inline">Welcome, <strong>${user.name}</strong></span>
                <a href="${dashboardUrl}" class="bg-[#D4AF37] text-white px-5 py-2 rounded-full hover:bg-white hover:text-slate-900 transition-all text-sm font-semibold shadow-md">Dashboard</a>
                <button onclick="KaghanDB.logout()" class="border border-white/20 text-white px-4 py-2 rounded-full hover:bg-rose-600 hover:border-rose-600 transition-all text-sm font-semibold">Logout</button>
            `;
        }
        if (authContainerMobile) {
            authContainerMobile.innerHTML = `
                <span class="text-slate-300 text-sm">Logged in as <strong>${user.name}</strong></span>
                <a href="${dashboardUrl}" class="bg-[#D4AF37] text-white py-3 rounded-full text-center">Dashboard</a>
                <button onclick="KaghanDB.logout()" class="border border-rose-500 text-rose-500 py-3 rounded-full text-center">Logout</button>
            `;
        }
    } else {
        if (authContainer) {
            authContainer.innerHTML = `
                <a href="/login.html" class="border border-[#D4AF37] text-white px-5 py-2 rounded-full hover:bg-[#D4AF37] hover:text-white transition-all text-sm font-semibold">Login</a>
                <a href="/login.html?register=true" class="bg-[#D4AF37] text-white px-5 py-2 rounded-full hover:bg-white hover:text-slate-900 transition-all text-sm font-semibold luxury-shadow">Register</a>
            `;
        }
        if (authContainerMobile) {
            authContainerMobile.innerHTML = `
                <a href="/login.html" class="border border-[#D4AF37] text-white py-3 rounded-full hover:bg-[#D4AF37] transition-all text-base" onclick="toggleDrawer()">Login</a>
                <a href="/login.html?register=true" class="bg-[#D4AF37] text-white py-3 rounded-full hover:bg-white hover:text-slate-900 transition-all text-base shadow-lg" onclick="toggleDrawer()">Register</a>
            `;
        }
    }
};

window.renderMobileTabBar = () => {
    const isUserPanel = window.location.pathname.includes('/user/');
    const user = (typeof KaghanDB !== 'undefined' && KaghanDB.getCurrentUser) ? KaghanDB.getCurrentUser() : null;
    const existingBar = document.getElementById('kph-mobile-tab-bar');
    const existingDock = document.querySelector('.app-bottom-dock');

    // Rule: User panel lower bar must ONLY appear when user is logged in AND ONLY in the user panel
    if (!isUserPanel || !user) {
        if (existingBar) {
            existingBar.remove();
        }
        if (existingDock) {
            existingDock.style.display = 'none';
        }
        document.body.classList.remove('has-mobile-tab-bar');
        return;
    }

    // Inside user panel and user IS logged in:
    if (existingDock) {
        existingDock.style.display = '';
        return;
    }

    if (existingBar) return;

    const currentPath = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');

    const tabBar = document.createElement('nav');
    tabBar.id = 'kph-mobile-tab-bar';
    tabBar.className = 'mobile-tab-bar';
    tabBar.setAttribute('aria-label', 'Mobile Bottom Navigation');

    const overviewActive = (!tabParam || tabParam === 'overview') ? 'active' : '';
    const wishlistActive = tabParam === 'wishlists' ? 'active' : '';
    const tripsActive = tabParam === 'trips' ? 'active' : '';
    const notifActive = tabParam === 'notifications' ? 'active' : '';
    const accountActive = tabParam === 'account' ? 'active' : '';

    tabBar.innerHTML = `
        <a href="index.html" class="mobile-tab-item ${overviewActive}">
            <i class="fa-solid fa-hotel"></i>
            <span>Overview</span>
        </a>
        <a href="index.html?tab=wishlists" class="mobile-tab-item ${wishlistActive}">
            <i class="fa-solid fa-heart"></i>
            <span>Wishlists</span>
        </a>
        <a href="index.html?tab=trips" class="mobile-tab-item ${tripsActive}">
            <i class="fa-solid fa-suitcase"></i>
            <span>Trips</span>
        </a>
        <a href="index.html?tab=notifications" class="mobile-tab-item ${notifActive}">
            <i class="fa-solid fa-bell"></i>
            <span>Alerts</span>
        </a>
        <a href="index.html?tab=account" class="mobile-tab-item ${accountActive}">
            <i class="fa-solid fa-user"></i>
            <span>Account</span>
        </a>
    `;

    document.body.appendChild(tabBar);
    document.body.classList.add('has-mobile-tab-bar');
};

// Centralized dynamic UI listener setup & script injections
function initializeSharedUI() {
    const drawer = document.getElementById('mobile-drawer');
    const menuToggle = document.getElementById('menu-toggle');
    const menuClose = document.getElementById('menu-close');

    if (menuToggle && drawer) {
        menuToggle.removeEventListener('click', window.toggleDrawer);
        menuToggle.addEventListener('click', window.toggleDrawer);
    }
    if (menuClose && drawer) {
        const closeDrawer = () => {
            if (drawer) drawer.classList.remove('open');
        };
        menuClose.removeEventListener('click', closeDrawer);
        menuClose.addEventListener('click', closeDrawer);
    }

    // Automatically sync header auth state & mobile tab bar
    window.renderNavbar();
    window.renderMobileTabBar();

    // Trigger chatbot, WhatsApp widget, and cookie consent injections
    setTimeout(() => {
        injectChatbot();
        injectWhatsApp();
        injectCookieBanner();
    }, 500);

    // Register Service Worker for PWA Offline Resilience
    if ('serviceWorker' in navigator && !window.location.pathname.includes('/admin/')) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(err => {
                console.warn('SW registration notice:', err);
            });
        });
    }
}

// Call UI initialization immediately if DOM is ready, otherwise defer until DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSharedUI);
} else {
    initializeSharedUI();
}

// ============================================================
// GLOBAL SCROLL ANIMATION SYSTEM
// Uses IntersectionObserver to trigger [data-animate] elements
// ============================================================
window.setupScrollAnimations = function() {
    const animatedEls = document.querySelectorAll('[data-animate]:not(.animated)');
    if (!animatedEls.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });

    animatedEls.forEach(el => observer.observe(el));
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.setupScrollAnimations);
} else {
    window.setupScrollAnimations();
}

// ============================================================
// ROOMS FILTER SIDEBAR TOGGLE (mobile)
// ============================================================
window.openFilterSidebar = function() {
    const sidebar = document.getElementById('rooms-filter-sidebar');
    if (sidebar) sidebar.classList.add('open');
    document.body.style.overflow = 'hidden';
};

window.closeFilterSidebar = function() {
    const sidebar = document.getElementById('rooms-filter-sidebar');
    if (sidebar) sidebar.classList.remove('open');
    document.body.style.overflow = '';
};

// Close filter sidebar when clicking overlay backdrop
document.addEventListener('click', function(e) {
    const sidebar = document.getElementById('rooms-filter-sidebar');
    const panel = document.getElementById('rooms-filter-panel');
    if (sidebar && sidebar.classList.contains('open') && panel && !panel.contains(e.target)) {
        const toggleBtn = document.getElementById('filter-toggle-btn');
        if (toggleBtn && toggleBtn.contains(e.target)) return;
        window.closeFilterSidebar();
    }
});



// --- PDF INVOICE GENERATOR ---
window.downloadPDFInvoice = async function(bookingId) {
    try {
        let booking = null;
        if (window.KaghanDB && typeof KaghanDB.getBookings === 'function') {
            const bookings = await KaghanDB.getBookings();
            booking = bookings.find(b => b.id === bookingId);
        }
        
        if (!booking && window.allHistoryBookings) {
            booking = window.allHistoryBookings.find(b => b.id === bookingId);
        }

        if (!booking) {
            if (window.KaghanUI) KaghanUI.showToast('Booking ledger record not found', 'error');
            else if (window.KaghanUI) KaghanUI.showToast('Booking ledger record not found', 'error');
            return;
        }

        let roomName = 'Luxury Accommodation';
        if (window.KaghanDB && typeof KaghanDB.getRooms === 'function') {
            const rooms = await KaghanDB.getRooms();
            const room = rooms.find(r => r.id === booking.roomId);
            if (room) roomName = room.name || room.title || roomName;
        } else if (window.roomsMap && window.roomsMap[booking.roomId]) {
            roomName = window.roomsMap[booking.roomId].name || roomName;
        }

        // Dynamic html2pdf library check
        if (typeof html2pdf === 'undefined') {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                script.onload = resolve;
                script.onerror = () => reject(new Error('Failed to load html2pdf library'));
                document.head.appendChild(script);
            });
        }

        // Calculate nights
        const inDate = new Date(booking.checkIn);
        const outDate = new Date(booking.checkOut);
        let nights = 1;
        if (!isNaN(inDate.getTime()) && !isNaN(outDate.getTime())) {
            nights = Math.max(1, Math.ceil((outDate - inDate) / (1000 * 3600 * 24)));
        }

        const formatPKR = (num) => Number(num || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

        const invoiceNo = booking.invoiceNo || `KPH-INV-${(booking.id || '').replace(/^KPH-BOOK-|^BK-/, '')}`;
        const invoiceDate = booking.invoiceDate || (booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));
        const bookingSource = booking.bookingSource || 'KPHStay.com';

        const guestName = booking.guestName || 'Valued Guest';
        const guestPhone = booking.guestPhone || 'N/A';
        const guestEmail = booking.guestEmail || 'N/A';
        const cnicPassport = booking.cnicPassport || booking.cnic || booking.passport || 'Verified at Check-in';
        const nationality = booking.nationality || 'Pakistani';
        const address = booking.address || 'N/A';

        const propertyName = booking.propertyName || roomName;
        const unitNo = booking.unitNo || booking.apartmentNo || booking.roomId || 'Suite A';
        const roomType = booking.roomType || '1 Bedroom';
        const checkIn = booking.checkIn || 'N/A';
        const checkInTime = booking.checkInTime || '2:00 PM';
        const checkOut = booking.checkOut || 'N/A';
        const checkOutTime = booking.checkOutTime || '12:00 PM';
        const adults = booking.adults || 2;
        const children = booking.children || 0;

        const grandTotal = Number(booking.grandTotal || booking.totalPrice || 0);
        const accomCharges = booking.accomCharges !== undefined ? Number(booking.accomCharges) : (booking.subtotal ? Number(booking.subtotal) : grandTotal);
        const cleaningFee = Number(booking.cleaningFee || 0);
        const extraGuestCharges = Number(booking.extraGuestCharges || 0);
        const extraMattress = Number(booking.extraMattress || 0);
        const kitchenUsageCharges = Number(booking.kitchenUsageCharges || 0);
        const securityDeposit = Number(booking.securityDeposit || 0);
        const laundryService = Number(booking.laundryService || 0);
        const otherCharges = Number(booking.otherCharges || (booking.upgradesTotal || 0));

        const subtotal = booking.subtotal !== undefined ? Number(booking.subtotal) : (accomCharges + cleaningFee + extraGuestCharges + extraMattress + kitchenUsageCharges + laundryService + otherCharges);
        const discount = Number(booking.discount || booking.discountAmount || 0);
        const tax = booking.tax !== undefined ? Number(booking.tax) : 0;
        const advancePaid = booking.advancePaid !== undefined ? Number(booking.advancePaid) : (booking.paymentStatus === 'PAID' ? grandTotal : Number(booking.advanceAmount || 0));
        const balanceDue = booking.balanceDue !== undefined ? Number(booking.balanceDue) : Math.max(0, grandTotal - advancePaid);

        const paymentMethod = booking.paymentMethod || 'Credit/Debit Card';
        const transactionNo = booking.transactionNo || booking.paymentRef || booking.id || 'N/A';
        const paymentStatus = (booking.paymentStatus || (balanceDue === 0 ? 'PAID' : (advancePaid > 0 ? 'PARTIALLY PAID' : 'UNPAID'))).toUpperCase();

        const renderSourceBox = (name) => {
            const isChecked = bookingSource.toLowerCase().includes(name.toLowerCase());
            return `<span style="display: inline-block; margin-right: 10px; font-size: 11px; color: ${isChecked ? '#0F172A' : '#64748B'};">${isChecked ? '&#9745;' : '&#9633;'} <strong>${name}</strong></span>`;
        };

        const renderRoomTypeBox = (name) => {
            const isChecked = roomType.toLowerCase().includes(name.toLowerCase());
            return `<span style="display: inline-block; margin-right: 10px; font-size: 11px; color: ${isChecked ? '#0F172A' : '#64748B'};">${isChecked ? '&#9745;' : '&#9633;'} ${name}</span>`;
        };

        const renderPaymentMethodBox = (name) => {
            const isChecked = paymentMethod.toLowerCase().includes(name.toLowerCase());
            return `<span style="display: inline-block; margin-right: 10px; font-size: 11px; color: ${isChecked ? '#0F172A' : '#64748B'};">${isChecked ? '&#9745;' : '&#9633;'} ${name}</span>`;
        };

        const renderStatusBox = (name) => {
            const isChecked = paymentStatus === name;
            const color = name === 'PAID' ? '#10B981' : (name === 'PARTIALLY PAID' ? '#F59E0B' : '#EF4444');
            return `<span style="display: inline-block; margin-right: 10px; font-size: 11px; font-weight: bold; color: ${isChecked ? color : '#94A3B8'};">${isChecked ? '&#9745;' : '&#9633;'} ${name}</span>`;
        };

        // Generate Short & Simplified Printable Invoice HTML
        const invoiceHtml = `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0F172A; width: 720px; background: #ffffff; margin: 0 auto; box-sizing: border-box; border-radius: 12px;">
            <!-- Sleek Compact Header -->
            <div style="display: flex; justify-content: space-between; items-center; border-bottom: 2px solid #D4AF37; padding-bottom: 14px; margin-bottom: 16px;">
                <div>
                    <h1 style="font-size: 22px; font-weight: 900; letter-spacing: 2px; margin: 0; color: #0F172A; text-transform: uppercase;">KPH STAY</h1>
                    <div style="color: #D4AF37; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-top: 2px;">Luxury Resort &amp; Executive Suites</div>
                </div>
                <div style="text-align: right;">
                    <div style="background: #0F172A; color: #D4AF37; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 6px; display: inline-block; text-transform: uppercase;">INVOICE</div>
                    <div style="font-size: 11px; font-weight: 700; color: #475569; margin-top: 4px;">#${invoiceNo}</div>
                    <div style="font-size: 10px; color: #64748B;">Date: ${invoiceDate}</div>
                </div>
            </div>

            <!-- 2-Column Guest & Reservation Info -->
            <div style="display: flex; gap: 20px; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 8px; margin-bottom: 16px; font-size: 11px;">
                <div style="flex: 1;">
                    <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94A3B8; letter-spacing: 1px; margin-bottom: 4px;">GUEST DETAILS</div>
                    <div style="font-weight: 800; font-size: 13px; color: #0F172A;">${guestName}</div>
                    <div style="color: #475569; margin-top: 2px;">Phone: <strong>${guestPhone}</strong></div>
                    <div style="color: #475569;">Email: ${guestEmail}</div>
                    ${cnicPassport !== 'N/A' ? `<div style="color: #64748B; font-size: 10px;">ID/CNIC: ${cnicPassport}</div>` : ''}
                </div>
                <div style="flex: 1; border-left: 1px solid #CBD5E1; padding-left: 16px;">
                    <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94A3B8; letter-spacing: 1px; margin-bottom: 4px;">RESERVATION DETAILS</div>
                    <div style="font-weight: 800; font-size: 12px; color: #0F172A;">${propertyName}</div>
                    <div style="color: #475569; margin-top: 2px;">Check-in: <strong>${checkIn}</strong> (${checkInTime})</div>
                    <div style="color: #475569;">Check-out: <strong>${checkOut}</strong> (${checkOutTime})</div>
                    <div style="color: #64748B; font-size: 10px;">Duration: ${nights} Night${nights > 1 ? 's' : ''} &bull; Guests: ${adults} Adult${adults > 1 ? 's' : ''}${children > 0 ? `, ${children} Child` : ''}</div>
                </div>
            </div>

            <!-- Line Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">
                <thead>
                    <tr style="background: #0F172A; color: #ffffff; text-align: left;">
                        <th style="padding: 8px 10px; border-radius: 4px 0 0 4px; font-size: 10px; text-transform: uppercase;">Description</th>
                        <th style="padding: 8px; text-align: center; font-size: 10px; text-transform: uppercase;">Nights</th>
                        <th style="padding: 8px; text-align: right; font-size: 10px; text-transform: uppercase;">Rate / Night</th>
                        <th style="padding: 8px 10px; text-align: right; border-radius: 0 4px 4px 0; font-size: 10px; text-transform: uppercase;">Amount (PKR)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #E2E8F0;">
                        <td style="padding: 10px;">
                            <strong style="color: #0F172A; font-size: 12px;">${propertyName}</strong>
                            <div style="color: #64748B; font-size: 10px; margin-top: 2px;">Stay from ${checkIn} to ${checkOut}</div>
                        </td>
                        <td style="padding: 10px; text-align: center; font-weight: 700;">${nights}</td>
                        <td style="padding: 10px; text-align: right; color: #475569;">${formatPKR(nights > 0 ? accomCharges / nights : accomCharges)}</td>
                        <td style="padding: 10px; text-align: right; font-weight: 800; color: #0F172A;">${formatPKR(accomCharges)}</td>
                    </tr>
                    ${cleaningFee > 0 ? `
                    <tr style="border-bottom: 1px solid #F1F5F9;">
                        <td style="padding: 6px 10px; color: #475569;">Cleaning &amp; Housekeeping Service</td>
                        <td style="padding: 6px; text-align: center;">1</td>
                        <td style="padding: 6px; text-align: right;">${formatPKR(cleaningFee)}</td>
                        <td style="padding: 6px 10px; text-align: right; font-weight: 700;">${formatPKR(cleaningFee)}</td>
                    </tr>` : ''}
                    ${extraGuestCharges > 0 ? `
                    <tr style="border-bottom: 1px solid #F1F5F9;">
                        <td style="padding: 6px 10px; color: #475569;">Extra Guest Charges</td>
                        <td style="padding: 6px; text-align: center;">1</td>
                        <td style="padding: 6px; text-align: right;">${formatPKR(extraGuestCharges)}</td>
                        <td style="padding: 6px 10px; text-align: right; font-weight: 700;">${formatPKR(extraGuestCharges)}</td>
                    </tr>` : ''}
                    ${otherCharges > 0 ? `
                    <tr style="border-bottom: 1px solid #F1F5F9;">
                        <td style="padding: 6px 10px; color: #475569;">Additional Amenities / Upgrades</td>
                        <td style="padding: 6px; text-align: center;">1</td>
                        <td style="padding: 6px; text-align: right;">${formatPKR(otherCharges)}</td>
                        <td style="padding: 6px 10px; text-align: right; font-weight: 700;">${formatPKR(otherCharges)}</td>
                    </tr>` : ''}
                </tbody>
            </table>

            <!-- Summary & Payment Info Grid -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 16px;">
                <div style="flex: 1; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px; border-radius: 8px; font-size: 11px;">
                    <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94A3B8; letter-spacing: 1px; margin-bottom: 4px;">PAYMENT STATUS</div>
                    <div>Method: <strong>${paymentMethod}</strong></div>
                    <div>Status: <strong style="color: ${paymentStatus === 'PAID' ? '#059669' : '#D97706'};">${paymentStatus}</strong></div>
                    ${transactionNo ? `<div style="color: #64748B; font-size: 10px; margin-top: 2px;">Ref: ${transactionNo}</div>` : ''}
                </div>

                <div style="width: 260px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; font-size: 11px;">
                    ${discount > 0 ? `
                    <div style="display: flex; justify-content: space-between; padding: 2px 0; color: #475569;">
                        <span>Subtotal:</span>
                        <span>PKR ${formatPKR(subtotal)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 2px 0; color: #059669; font-weight: 700;">
                        <span>Discount:</span>
                        <span>- PKR ${formatPKR(discount)}</span>
                    </div>` : ''}
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px solid #CBD5E1; font-weight: 900; font-size: 14px; color: #0F172A;">
                        <span>Total Amount:</span>
                        <span style="color: #D4AF37;">PKR ${formatPKR(grandTotal)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 2px 0; color: #475569;">
                        <span>Advance Paid:</span>
                        <span>PKR ${formatPKR(advancePaid)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0; font-weight: 800; font-size: 12px; color: ${balanceDue > 0 ? '#DC2626' : '#059669'}; border-top: 1px dashed #CBD5E1; margin-top: 4px;">
                        <span>Balance Due:</span>
                        <span>PKR ${formatPKR(balanceDue)}</span>
                    </div>
                </div>
            </div>

            <!-- Compact 2-Line Footer -->
            <div style="background: #0F172A; color: #94A3B8; text-align: center; padding: 12px 14px; font-size: 10px; border-radius: 6px;">
                <div style="color: #D4AF37; font-weight: 800; font-size: 11px; letter-spacing: 1px;">KPH STAY &bull; LUXURY APARTMENTS</div>
                <div style="color: #CBD5E1; margin-top: 2px;">Check-in: 2:00 PM | Check-out: 12:00 PM &bull; Valid CNIC/Passport required at check-in.</div>
            </div>
        </div>
        `;

        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        tempDiv.innerHTML = invoiceHtml;
        document.body.appendChild(tempDiv);

        const opt = {
            margin:       [0.2, 0.2, 0.2, 0.2],
            filename:     `KPH-Stay-Invoice-${booking.id}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        if (window.KaghanUI) KaghanUI.showToast('Generating Official PDF Invoice...', 'success');
        await html2pdf().set(opt).from(tempDiv).save();
        document.body.removeChild(tempDiv);

    } catch (e) {
        console.error("PDF generation failed:", e);
        if (window.KaghanUI) KaghanUI.showToast('Failed to generate PDF invoice', 'error');
        else if (window.KaghanUI) KaghanUI.showToast('Failed to generate PDF invoice.', 'error');
    }
};

// Register Service Worker for offline PWA capabilities
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(() => { /* Service Worker registered */ })
            .catch(() => { /* Service Worker registration failed - running without offline support */ });
    });
}

// Dynamic WhatsApp Widget Injection
function injectWhatsApp() {
    // Do not show WhatsApp on admin dashboard pages
    if (window.location.pathname.includes('/admin/')) return;

    // Prevent duplicate injection
    if (document.getElementById('wa-chat-trigger')) return;

    // Create elements
    const trigger = document.createElement('button');
    trigger.id = 'wa-chat-trigger';
    // Raised to bottom-36 to avoid overlapping the AI chatbot trigger below it
    trigger.className = 'fixed bottom-36 right-5 z-[9999] bg-[#25D366] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 border border-white/20';
    trigger.innerHTML = '<i class="fa-brands fa-whatsapp text-2xl"></i>';

    const chatBox = document.createElement('div');
    chatBox.id = 'wa-chat-box';
    chatBox.className = 'fixed bottom-24 right-5 w-80 h-[260px] bg-white border border-slate-100 rounded-3xl shadow-2xl flex flex-col justify-between hidden z-[9999] overflow-hidden transition-all duration-300 transform scale-95 opacity-0';

    chatBox.innerHTML = `
        <!-- Header -->
        <div class="bg-[#075E54] px-5 py-4 flex justify-between items-center text-white">
            <div class="flex items-center gap-3">
                <div class="relative w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/25">
                    <i class="fa-solid fa-headset text-sm text-white"></i>
                    <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#075E54]"></span>
                </div>
                <div class="flex flex-col text-left">
                    <span class="text-xs font-bold outfit tracking-wider leading-none text-white">KPH Support</span>
                    <span class="text-[9px] text-white/70 font-medium mt-1">Usually replies in minutes</span>
                </div>
            </div>
            <button id="wa-chat-close" class="text-white/70 hover:text-white transition-colors">
                <i class="fa-solid fa-xmark text-sm"></i>
            </button>
        </div>

        <!-- Chat Area -->
        <div class="flex-grow p-5 bg-[#E5DDD5] flex flex-col justify-between text-left text-xs">
            <div class="bg-white text-slate-800 p-3.5 rounded-2xl rounded-tl-none shadow-sm max-w-[90%] relative leading-relaxed">
                Hi there! 👋 How can we help you plan your luxury getaway today? Click below to chat with our concierge team on WhatsApp.
            </div>
            
            <a href="https://wa.me/923340091127?text=Hi%2C%20I'm%20interested%20in%20booking%20a%20stay%20at%20Kaghan%20Stay." target="_blank" id="wa-chat-btn" class="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-bold py-2.5 rounded-xl text-center transition-all text-xs flex items-center justify-center gap-2 shadow-md">
                <i class="fa-brands fa-whatsapp text-sm"></i> Start Chat
            </a>
        </div>
    `;

    document.body.appendChild(trigger);
    document.body.appendChild(chatBox);

    // Toggle actions
    trigger.addEventListener('click', () => {
        const isHidden = chatBox.classList.contains('hidden');
        if (isHidden) {
            // Close AI Chatbot box if open
            const cbBox = document.getElementById('kph-chat-box');
            const cbTrigger = document.getElementById('kph-chat-trigger');
            if (cbBox && !cbBox.classList.contains('hidden')) {
                cbBox.classList.add('scale-95', 'opacity-0');
                if (cbTrigger) cbTrigger.innerHTML = '<i class="fa-solid fa-comments text-xl"></i>';
                localStorage.setItem('kph_chat_open', 'false');
                setTimeout(() => { cbBox.classList.add('hidden'); }, 300);
            }

            chatBox.classList.remove('hidden');
            document.body.classList.add('chat-open');
            setTimeout(() => {
                chatBox.classList.remove('scale-95', 'opacity-0');
            }, 10);
        } else {
            chatBox.classList.add('scale-95', 'opacity-0');
            document.body.classList.remove('chat-open');
            setTimeout(() => {
                chatBox.classList.add('hidden');
            }, 300);
        }
    });

    const closeBtn = chatBox.querySelector('#wa-chat-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            chatBox.classList.add('scale-95', 'opacity-0');
            document.body.classList.remove('chat-open');
            setTimeout(() => {
                chatBox.classList.add('hidden');
            }, 300);
        });
    }

    const waBtn = chatBox.querySelector('#wa-chat-btn');
    if (waBtn) {
        waBtn.addEventListener('click', () => {
            chatBox.classList.add('scale-95', 'opacity-0');
            document.body.classList.remove('chat-open');
            setTimeout(() => {
                chatBox.classList.add('hidden');
            }, 300);
        });
    }
}

// === Service Worker Registration (PWA) ===
// Uses service-worker.js as the single canonical SW (sw.js is redundant and will be removed).
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => {
                console.log('[KPH Stay] Service worker registered, scope:', reg.scope);
            })
            .catch(err => {
                console.warn('[KPH Stay] Service worker registration failed:', err);
            });
    });
}

// === Automatic Header & Footer Journal Nav Link Injector ===
function ensureJournalNavLinks() {
    try {
        const navbar = document.getElementById('hotel-navbar');
        if (navbar) {
            const navContainer = navbar.querySelector('.hidden.md\\:flex') || navbar.querySelector('div.gap-8');
            if (navContainer) {
                const links = Array.from(navContainer.querySelectorAll('a'));
                const hasBlogLink = links.some(a => {
                    const href = a.getAttribute('href') || '';
                    const text = (a.innerText || '').trim().toLowerCase();
                    return href.includes('blog') || text === 'journal' || text === 'blog';
                });

                if (!hasBlogLink) {
                    const isCurrentBlog = window.location.pathname.includes('blog');
                    const blogLink = document.createElement('a');
                    blogLink.href = '/blog.html';
                    blogLink.className = (isCurrentBlog ? 'text-[#D4AF37]' : 'hover:text-[#D4AF37]') + ' transition-colors';
                    blogLink.innerText = 'Journal';

                    const roomsLink = links.find(a => (a.getAttribute('href') || '').includes('rooms'));
                    if (roomsLink && roomsLink.parentNode === navContainer) {
                        roomsLink.insertAdjacentElement('afterend', blogLink);
                    } else {
                        const authDiv = navContainer.querySelector('#auth-links');
                        if (authDiv) {
                            navContainer.insertBefore(blogLink, authDiv);
                        } else {
                            navContainer.appendChild(blogLink);
                        }
                    }
                }
            }
        }

        // Footer links check
        const footers = document.querySelectorAll('footer');
        footers.forEach(footer => {
            const uls = footer.querySelectorAll('ul');
            uls.forEach(ul => {
                const links = Array.from(ul.querySelectorAll('a'));
                const hasBlogLink = links.some(a => {
                    const href = a.getAttribute('href') || '';
                    const text = (a.innerText || '').trim().toLowerCase();
                    return href.includes('blog') || text.includes('journal') || text.includes('blog');
                });

                if (!hasBlogLink && links.length >= 2) {
                    const firstLi = ul.querySelector('li');
                    if (firstLi) {
                        const blogLi = document.createElement('li');
                        blogLi.innerHTML = `<a href="/blog.html" class="hover:text-[#D4AF37] transition-colors">Resort Journal</a>`;
                        firstLi.insertAdjacentElement('afterend', blogLi);
                    }
                }
            });
        });
    } catch (e) {
        console.warn("Error ensuring journal nav links:", e);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureJournalNavLinks);
} else {
    ensureJournalNavLinks();
}
window.addEventListener('load', ensureJournalNavLinks);

// ============================================================
// === Dynamic Promotional Popups & VIP Offer Engine (Public) ===
// ============================================================
window.KaghanPromotions = {
    timer: null,
    countdownTimer: null,
    triggerTimeout: null,
    data: null,
    hasTriggered: false,
    isOpen: false,

    init: async function() {
        // Skip public popups inside admin console
        if (window.location.pathname.includes('/admin')) return;

        try {
            const promoData = await window.KaghanDB.getAnnouncement();
            if (promoData) {
                this.setup(promoData);
            }
        } catch (e) {
            console.warn("Promotions init notice:", e);
        }
    },

    setup: function(promoData) {
        if (!promoData) {
            this.hide();
            return;
        }

        // Unconditional Rule: Always disable promotional popups on /room* and /booking* pages
        const currentPath = window.location.pathname.toLowerCase();
        if (
            currentPath.includes('/room') || 
            currentPath.includes('/booking') || 
            currentPath === '/rooms' || 
            currentPath === '/rooms.html' || 
            currentPath === '/booking' || 
            currentPath === '/booking.html' || 
            currentPath === '/room-details' || 
            currentPath === '/room-details.html'
        ) {
            this.hide();
            return;
        }

        // Support multi-popup campaigns list or single root object
        let popups = [];
        if (Array.isArray(promoData.popups) && promoData.popups.length > 0) {
            popups = promoData.popups;
        } else if (promoData.active !== false) {
            popups = [promoData];
        }

        // Find the first matching active popup for current page
        let matchedPopup = null;

        for (const p of popups) {
            if (p.active === false) continue;
            if (this.matchesPageRules(p, currentPath)) {
                // Check snooze for this specific popup or global
                const snoozeKey = `kaghan_promo_snoozed_${p.id || 'default'}`;
                const snoozedUntil = localStorage.getItem(snoozeKey) || localStorage.getItem('kaghan_promo_snoozed_until');
                if (snoozedUntil && Date.now() < parseInt(snoozedUntil, 10)) {
                    continue;
                }
                const sessionDismissKey = `kaghan_promo_session_dismissed_${p.id || 'default'}`;
                if (p.snoozeDuration === 'session' && (sessionStorage.getItem(sessionDismissKey) || sessionStorage.getItem('kaghan_promo_session_dismissed'))) {
                    continue;
                }

                matchedPopup = p;
                break;
            }
        }

        if (!matchedPopup) {
            this.hide();
            return;
        }

        this.data = matchedPopup;
        this.attachTriggers();
    },

    matchesPageRules: function(p, path) {
        const mode = p.targetingMode || 'all'; // 'all' | 'specific_include' | 'specific_exclude'
        const targetPages = Array.isArray(p.targetPages) ? p.targetPages : (typeof p.targetPages === 'string' ? [p.targetPages] : ['all']);
        const excludedPages = Array.isArray(p.excludedPages) ? p.excludedPages : [];
        const customUrls = (p.customUrls || '').split(/[\n,]+/).map(u => u.trim().toLowerCase()).filter(Boolean);

        const isHome = (path === '/' || path === '/index.html' || path === '');
        const isRooms = (path === '/rooms' || path === '/rooms.html');
        const isRoomDetails = (path.includes('/room-details') || path.includes('room-details.html') || (path.includes('/rooms/') && path !== '/rooms' && path !== '/rooms.html'));
        const isBooking = (path.includes('/booking') || path.includes('booking.html'));
        const isBlog = (path.includes('/blog') || path.includes('blog.html'));
        const isContact = (path.includes('/contact') || path.includes('contact.html'));
        const isTrack = (path.includes('/track') || path.includes('track.html'));

        // Helper to test custom wildcards
        const matchesCustom = (urlPattern) => {
            if (!urlPattern) return false;
            if (urlPattern.endsWith('*')) {
                const prefix = urlPattern.slice(0, -1);
                return path.startsWith(prefix);
            }
            return path === urlPattern || path === `${urlPattern}.html`;
        };

        const pageMatchesCategory = (cat) => {
            if (cat === 'all') return true;
            if (cat === 'home' || cat === 'home-only') return isHome;
            if (cat === 'rooms') return isRooms;
            if (cat === 'room-details') return isRoomDetails;
            if (cat === 'rooms-only') return isRooms || isRoomDetails || isBooking;
            if (cat === 'booking') return isBooking;
            if (cat === 'blog') return isBlog;
            if (cat === 'contact') return isContact;
            if (cat === 'track') return isTrack;
            return matchesCustom(cat);
        };

        // Check explicit exclusions first
        for (const ex of excludedPages) {
            if (pageMatchesCategory(ex)) return false;
        }
        for (const exUrl of customUrls) {
            if (exUrl.startsWith('!') && matchesCustom(exUrl.slice(1))) return false;
        }

        if (mode === 'all') {
            return true;
        }

        if (mode === 'specific_include') {
            const hasTargetMatch = targetPages.some(tp => pageMatchesCategory(tp));
            const hasCustomMatch = customUrls.some(cu => !cu.startsWith('!') && matchesCustom(cu));
            return hasTargetMatch || hasCustomMatch;
        }

        if (mode === 'specific_exclude') {
            return true;
        }

        return true;
    },

    attachTriggers: function() {
        if (this.hasTriggered) return;
        const triggerType = this.data.triggerType || 'delay';
        const delaySeconds = Math.max(1, parseInt(this.data.delaySeconds, 10) || 3);

        if (triggerType === 'delay') {
            this.triggerTimeout = setTimeout(() => {
                this.show();
            }, delaySeconds * 1000);
        } else if (triggerType === 'scroll') {
            const scrollThreshold = Math.max(10, parseInt(this.data.scrollThreshold, 10) || 30);
            const onScroll = () => {
                const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
                if (scrolled >= scrollThreshold) {
                    window.removeEventListener('scroll', onScroll);
                    this.show();
                }
            };
            window.addEventListener('scroll', onScroll, { passive: true });
        } else if (triggerType === 'exit-intent') {
            const onMouseLeave = (e) => {
                if (e.clientY <= 10 && !this.hasTriggered) {
                    document.removeEventListener('mouseleave', onMouseLeave);
                    this.show();
                }
            };
            document.addEventListener('mouseleave', onMouseLeave);
            // Fallback timer so mobile/tablet users still see the promotion
            this.triggerTimeout = setTimeout(() => {
                if (!this.hasTriggered) this.show();
            }, 8000);
        } else {
            // Default delay
            this.triggerTimeout = setTimeout(() => {
                this.show();
            }, delaySeconds * 1000);
        }
    },

    show: function(forcePreview = false) {
        if (this.isOpen && !forcePreview) return;
        this.hasTriggered = true;
        this.isOpen = true;
        clearTimeout(this.triggerTimeout);

        const promo = this.data || {};
        const layout = promo.layout || 'center-modal'; // 'center-modal' | 'corner-floater' | 'slide-drawer'

        // Clean up any existing popup element
        const existing = document.getElementById('kaghan-promotional-popup');
        if (existing) existing.remove();

        const popupEl = document.createElement('div');
        popupEl.id = 'kaghan-promotional-popup';

        // Render according to selected layout
        if (layout === 'corner-floater') {
            this.renderCornerFloater(popupEl, promo);
        } else if (layout === 'slide-drawer') {
            this.renderSlideDrawer(popupEl, promo);
        } else {
            this.renderCenterModal(popupEl, promo);
        }

        document.body.appendChild(popupEl);
        this.startCountdownTicking();

        // Animate in with smooth requestAnimationFrame
        requestAnimationFrame(() => {
            const inner = popupEl.querySelector('.kaghan-popup-anim-target');
            const backdrop = popupEl.querySelector('.kaghan-popup-backdrop');
            if (inner) {
                inner.style.opacity = '1';
                inner.style.transform = 'translateY(0) scale(1)';
            }
            if (backdrop) {
                backdrop.style.opacity = '1';
            }
        });
    },

    getCountdownData: function() {
        if (!this.data || !this.data.countdownEnabled || !this.data.countdownExpiry) return null;
        const diff = new Date(this.data.countdownExpiry).getTime() - Date.now();
        if (diff <= 0) return { expired: true, text: '00:00:00' };

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        return {
            expired: false,
            days,
            hours,
            minutes,
            seconds,
            label: this.data.countdownLabel || '⚡ Flash Offer Ends In:'
        };
    },

    startCountdownTicking: function() {
        clearInterval(this.countdownTimer);
        this.countdownTimer = setInterval(() => {
            const cd = this.getCountdownData();
            const cdContainer = document.getElementById('kaghan-promo-countdown-container');
            if (!cdContainer) return;

            if (!cd || cd.expired) {
                cdContainer.innerHTML = `<span class="text-xs font-semibold text-amber-300 opacity-90"><i class="fa-solid fa-clock mr-1"></i> Offer Expired</span>`;
                clearInterval(this.countdownTimer);
            } else {
                const daysEl = cdContainer.querySelector('.cd-days');
                const hoursEl = cdContainer.querySelector('.cd-hours');
                const minsEl = cdContainer.querySelector('.cd-mins');
                const secsEl = cdContainer.querySelector('.cd-secs');

                if (daysEl) daysEl.textContent = String(cd.days).padStart(2, '0');
                if (hoursEl) hoursEl.textContent = String(cd.hours).padStart(2, '0');
                if (minsEl) minsEl.textContent = String(cd.minutes).padStart(2, '0');
                if (secsEl) secsEl.textContent = String(cd.seconds).padStart(2, '0');
            }
        }, 1000);
    },

    renderCenterModal: function(wrapper, promo) {
        const bg = promo.bgColor || '#0B0F19';
        const textColor = promo.textColor || '#FFFFFF';
        const accentColor = promo.accentColor || '#D4AF37';
        const badgeBg = promo.badgeBg || accentColor;
        const badgeTextColor = promo.badgeTextColor || '#0B0F19';
        const badgeText = promo.badgeText || '✨ SPECIAL PRIVILEGE';
        const title = promo.title || (promo.messages && promo.messages[0] && promo.messages[0].text) || 'Unlock Exclusive Direct Booking Privilege';
        const subtitle = promo.subtitle || 'Book directly on our official portal to enjoy guaranteed lowest rates, VIP amenities, and signature hospitality.';
        const promoCode = promo.promoCode || (promo.messages && promo.messages[0] && promo.messages[0].promoCode) || 'DIRECT15';
        const discountPct = promo.discountPercent || 15;
        const primaryCtaText = promo.primaryCtaText || (promoCode ? `Claim ${promoCode} & Book` : 'Explore Luxury Suites');
        let primaryCtaUrl = promo.primaryCtaUrl || 'booking.html';
        if (promoCode) {
            primaryCtaUrl = primaryCtaUrl.includes('?') ? `${primaryCtaUrl}&coupon=${encodeURIComponent(promoCode)}` : `${primaryCtaUrl}?coupon=${encodeURIComponent(promoCode)}`;
        }
        const secondaryCtaText = promo.secondaryCtaText || 'No thanks, I will pay full price';

        // Render Perks Grid
        const perks = Array.isArray(promo.perks) && promo.perks.length > 0 ? promo.perks : [
            { icon: 'fa-gift', title: `${discountPct}% Direct Discount`, desc: 'Instant price reduction' },
            { icon: 'fa-mug-saucer', title: 'Complimentary Breakfast', desc: 'Fresh daily breakfast' },
            { icon: 'fa-car', title: 'Free Airport Shuttle', desc: 'On selected suites' },
            { icon: 'fa-clock', title: 'Early Check-In', desc: 'Subject to availability' }
        ];

        const perksHtml = (promo.perksEnabled !== false && perks.length > 0) ? `
            <div class="grid grid-cols-2 gap-2.5 my-5 text-left">
                ${perks.map(p => {
                    const tagHtml = p.tag ? `<span class="inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 ml-1 shrink-0">${window.KaghanSafe ? window.KaghanSafe.escapeHTML(p.tag) : p.tag}</span>` : '';
                    return `
                    <div class="flex items-start gap-2.5 p-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-amber-400/30 transition-all">
                        <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs">
                            <i class="fa-solid ${window.KaghanSafe ? window.KaghanSafe.escapeHTML(p.icon || 'fa-gift') : p.icon}"></i>
                        </div>
                        <div class="min-w-0 flex-grow">
                            <div class="text-xs font-bold text-white truncate leading-tight flex items-center justify-between">
                                <span class="truncate">${window.KaghanSafe ? window.KaghanSafe.escapeHTML(p.title || '') : p.title}</span>
                                ${tagHtml}
                            </div>
                            <div class="text-[10px] text-slate-400 truncate font-light mt-0.5">${window.KaghanSafe ? window.KaghanSafe.escapeHTML(p.desc || '') : p.desc}</div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        ` : '';

        // Render Countdown Timer
        const cd = this.getCountdownData();
        const countdownHtml = (promo.countdownEnabled && cd && !cd.expired) ? `
            <div class="my-4 p-3 rounded-2xl bg-black/40 border border-amber-400/20 flex flex-col items-center gap-2">
                <span class="text-[10px] uppercase font-bold tracking-wider text-amber-300/90 flex items-center gap-1.5">
                    <i class="fa-solid fa-fire text-amber-400 animate-pulse"></i> ${window.KaghanSafe ? window.KaghanSafe.escapeHTML(cd.label) : cd.label}
                </span>
                <div id="kaghan-promo-countdown-container" class="flex items-center gap-2 font-mono">
                    <div class="flex flex-col items-center bg-white/10 px-2 py-1 rounded-lg min-w-[36px]">
                        <span class="cd-days text-sm font-black text-white">${String(cd.days).padStart(2, '0')}</span>
                        <span class="text-[8px] uppercase tracking-tighter text-slate-400">Days</span>
                    </div>
                    <span class="text-amber-400 font-bold">:</span>
                    <div class="flex flex-col items-center bg-white/10 px-2 py-1 rounded-lg min-w-[36px]">
                        <span class="cd-hours text-sm font-black text-white">${String(cd.hours).padStart(2, '0')}</span>
                        <span class="text-[8px] uppercase tracking-tighter text-slate-400">Hours</span>
                    </div>
                    <span class="text-amber-400 font-bold">:</span>
                    <div class="flex flex-col items-center bg-white/10 px-2 py-1 rounded-lg min-w-[36px]">
                        <span class="cd-mins text-sm font-black text-white">${String(cd.minutes).padStart(2, '0')}</span>
                        <span class="text-[8px] uppercase tracking-tighter text-slate-400">Mins</span>
                    </div>
                    <span class="text-amber-400 font-bold">:</span>
                    <div class="flex flex-col items-center bg-white/10 px-2 py-1 rounded-lg min-w-[36px]">
                        <span class="cd-secs text-sm font-black text-amber-400">${String(cd.seconds).padStart(2, '0')}</span>
                        <span class="text-[8px] uppercase tracking-tighter text-slate-400">Secs</span>
                    </div>
                </div>
            </div>
        ` : '';

        // Render 1-Click Promo Box
        const couponBoxHtml = promoCode ? `
            <div class="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-amber-400/10 border border-dashed border-amber-400/40 my-3">
                <div class="flex items-center gap-2 min-w-0 pl-1">
                    <i class="fa-solid fa-tag text-amber-400 text-xs shrink-0"></i>
                    <div class="text-left min-w-0">
                        <span class="text-[9px] uppercase font-bold text-amber-300/80 block leading-tight">Discount Code</span>
                        <span class="font-mono text-xs font-black text-white tracking-widest truncate block">${window.KaghanSafe ? window.KaghanSafe.escapeHTML(promoCode) : promoCode}</span>
                    </div>
                </div>
                <button type="button" onclick="KaghanPromotions.copyPromoCode('${window.KaghanSafe ? window.KaghanSafe.escapeHTML(promoCode) : promoCode}')" class="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-wider transition-transform active:scale-95 shadow-sm shrink-0 flex items-center gap-1">
                    <i class="fa-solid fa-copy text-[10px]"></i> Copy
                </button>
            </div>
        ` : '';

        wrapper.innerHTML = `
            <div class="fixed inset-0 z-[99999] flex items-center justify-center p-4 overflow-y-auto">
                <!-- Backdrop Blur -->
                <div class="kaghan-popup-backdrop fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300 opacity-0" onclick="KaghanPromotions.dismiss()"></div>

                <!-- Modal Dialog Container -->
                <div class="kaghan-popup-anim-target relative w-full max-w-lg rounded-3xl p-6 sm:p-8 text-center overflow-hidden shadow-2xl border border-white/10 transition-all duration-300 opacity-0 transform scale-95" style="background: ${bg}; color: ${textColor};">
                    
                    <!-- Decorative Golden Ambient Glow -->
                    <div class="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none" style="background: ${accentColor};"></div>
                    <div class="absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none" style="background: ${accentColor};"></div>

                    <!-- Close Button -->
                    <button type="button" onclick="KaghanPromotions.dismiss()" class="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all text-sm z-10" aria-label="Close promotion">
                        <i class="fa-solid fa-xmark"></i>
                    </button>

                    <!-- Top Highlight Badge -->
                    <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md mb-3" style="background: ${badgeBg}; color: ${badgeTextColor};">
                        <i class="fa-solid fa-crown text-[9px]"></i>
                        <span>${window.KaghanSafe ? window.KaghanSafe.escapeHTML(badgeText) : badgeText}</span>
                    </div>

                    <!-- Headline & Subtitle -->
                    <h3 class="text-xl sm:text-2xl font-black outfit tracking-tight leading-snug mb-2 text-white">
                        ${window.KaghanSafe ? window.KaghanSafe.escapeHTML(title) : title}
                    </h3>
                    <p class="text-xs sm:text-sm text-slate-300 font-light leading-relaxed max-w-md mx-auto">
                        ${window.KaghanSafe ? window.KaghanSafe.escapeHTML(subtitle) : subtitle}
                    </p>

                    <!-- Perks Grid -->
                    ${perksHtml}

                    <!-- Countdown Timer -->
                    ${countdownHtml}

                    <!-- Promo Code Box -->
                    ${couponBoxHtml}

                    <!-- CTA Buttons -->
                    <div class="mt-5 space-y-2.5">
                        <a href="${window.KaghanSafe ? window.KaghanSafe.escapeHTML(primaryCtaUrl) : primaryCtaUrl}" class="w-full py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider text-slate-950 transition-all duration-200 hover:brightness-110 active:scale-[0.98] shadow-lg flex items-center justify-center gap-2" style="background: linear-gradient(135deg, ${accentColor} 0%, #F59E0B 100%);">
                            <span>${window.KaghanSafe ? window.KaghanSafe.escapeHTML(primaryCtaText) : primaryCtaText}</span>
                            <i class="fa-solid fa-arrow-right text-xs"></i>
                        </a>

                        <button type="button" onclick="KaghanPromotions.dismiss()" class="w-full text-center text-[11px] text-slate-400 hover:text-slate-200 transition-colors py-1">
                            ${window.KaghanSafe ? window.KaghanSafe.escapeHTML(secondaryCtaText) : secondaryCtaText}
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderCornerFloater: function(wrapper, promo) {
        const bg = promo.bgColor || '#0B0F19';
        const textColor = promo.textColor || '#FFFFFF';
        const accentColor = promo.accentColor || '#D4AF37';
        const badgeBg = promo.badgeBg || accentColor;
        const badgeTextColor = promo.badgeTextColor || '#0B0F19';
        const badgeText = promo.badgeText || '⚡ VIP EXCLUSIVE';
        const title = promo.title || 'Special Direct Booking Deal';
        const promoCode = promo.promoCode || 'DIRECT15';
        const primaryCtaText = promo.primaryCtaText || 'Claim Offer';
        let primaryCtaUrl = promo.primaryCtaUrl || 'booking.html';
        if (promoCode) {
            primaryCtaUrl = primaryCtaUrl.includes('?') ? `${primaryCtaUrl}&coupon=${encodeURIComponent(promoCode)}` : `${primaryCtaUrl}?coupon=${encodeURIComponent(promoCode)}`;
        }

        wrapper.innerHTML = `
            <div class="fixed bottom-6 right-6 z-[99999] max-w-sm w-full p-2">
                <div class="kaghan-popup-anim-target relative rounded-3xl p-5 shadow-2xl border border-white/10 transition-all duration-300 opacity-0 transform translate-y-8" style="background: ${bg}; color: ${textColor};">
                    
                    <!-- Close button -->
                    <button type="button" onclick="KaghanPromotions.dismiss()" class="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all text-xs" aria-label="Close">
                        <i class="fa-solid fa-xmark"></i>
                    </button>

                    <!-- Top Badge -->
                    <div class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider mb-2" style="background: ${badgeBg}; color: ${badgeTextColor};">
                        <i class="fa-solid fa-gift text-[8px]"></i>
                        <span>${window.KaghanSafe ? window.KaghanSafe.escapeHTML(badgeText) : badgeText}</span>
                    </div>

                    <h4 class="text-base font-bold outfit text-white mb-1.5 pr-6">${window.KaghanSafe ? window.KaghanSafe.escapeHTML(title) : title}</h4>
                    <p class="text-xs text-slate-300 font-light mb-3">Save 15% & receive complimentary gourmet breakfast on all direct reservations.</p>

                    <div class="flex items-center gap-2">
                        <a href="${window.KaghanSafe ? window.KaghanSafe.escapeHTML(primaryCtaUrl) : primaryCtaUrl}" class="flex-grow py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-950 text-center transition-all hover:brightness-110" style="background: ${accentColor};">
                            ${window.KaghanSafe ? window.KaghanSafe.escapeHTML(primaryCtaText) : primaryCtaText}
                        </a>
                        ${promoCode ? `
                            <button type="button" onclick="KaghanPromotions.copyPromoCode('${window.KaghanSafe ? window.KaghanSafe.escapeHTML(promoCode) : promoCode}')" class="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold transition-all" title="Copy ${promoCode}">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    renderSlideDrawer: function(wrapper, promo) {
        const bg = promo.bgColor || '#0B0F19';
        const textColor = promo.textColor || '#FFFFFF';
        const accentColor = promo.accentColor || '#D4AF37';
        const title = promo.title || 'Direct Booking Perks Active';
        const promoCode = promo.promoCode || 'DIRECT15';
        let primaryCtaUrl = promo.primaryCtaUrl || 'booking.html';
        if (promoCode) {
            primaryCtaUrl = primaryCtaUrl.includes('?') ? `${primaryCtaUrl}&coupon=${encodeURIComponent(promoCode)}` : `${primaryCtaUrl}?coupon=${encodeURIComponent(promoCode)}`;
        }

        wrapper.innerHTML = `
            <div class="fixed inset-x-0 bottom-0 z-[99999] p-3 sm:p-4">
                <div class="kaghan-popup-backdrop fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity opacity-0" onclick="KaghanPromotions.dismiss()"></div>
                <div class="kaghan-popup-anim-target relative max-w-2xl mx-auto rounded-3xl p-4 sm:p-5 shadow-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300 opacity-0 transform translate-y-8" style="background: ${bg}; color: ${textColor};">
                    
                    <button type="button" onclick="KaghanPromotions.dismiss()" class="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white text-xs">
                        <i class="fa-solid fa-xmark"></i>
                    </button>

                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-amber-400/20 text-amber-400 text-lg border border-amber-400/30">
                            <i class="fa-solid fa-crown"></i>
                        </div>
                        <div>
                            <h4 class="text-sm font-bold outfit text-white leading-tight">${window.KaghanSafe ? window.KaghanSafe.escapeHTML(title) : title}</h4>
                            <span class="text-xs text-slate-300 font-light">Includes 15% VIP discount & complimentary breakfast</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <a href="${window.KaghanSafe ? window.KaghanSafe.escapeHTML(primaryCtaUrl) : primaryCtaUrl}" class="flex-grow sm:flex-grow-0 py-2.5 px-5 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-950 transition-all hover:brightness-110 text-center" style="background: ${accentColor};">
                            Claim 15% Off
                        </a>
                    </div>
                </div>
            </div>
        `;
    },

    copyPromoCode: function(code) {
        if (!code) return;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(code).then(() => {
                if (window.KaghanUI && window.KaghanUI.showToast) {
                    window.KaghanUI.showToast(`✨ Promo Code "${code}" copied! Paste at checkout to save.`, "success");
                } else {
                    alert(`Promo Code "${code}" copied!`);
                }
            }).catch(() => {});
        }
    },

    dismiss: function() {
        const popupEl = document.getElementById('kaghan-promotional-popup');
        if (popupEl) {
            const inner = popupEl.querySelector('.kaghan-popup-anim-target');
            const backdrop = popupEl.querySelector('.kaghan-popup-backdrop');
            if (inner) {
                inner.style.opacity = '0';
                inner.style.transform = 'translateY(12px) scale(0.95)';
            }
            if (backdrop) {
                backdrop.style.opacity = '0';
            }
            setTimeout(() => {
                popupEl.remove();
                this.isOpen = false;
            }, 300);
        }

        // Set snooze duration in storage
        const snoozeHours = (this.data && this.data.snoozeDuration === 'session') ? 0 : 24;
        if (snoozeHours > 0) {
            const expireTime = Date.now() + (snoozeHours * 60 * 60 * 1000);
            localStorage.setItem('kaghan_promo_snoozed_until', String(expireTime));
        } else {
            sessionStorage.setItem('kaghan_promo_session_dismissed', 'true');
        }

        clearInterval(this.countdownTimer);
    },

    hide: function() {
        this.dismiss();
    }
};

// Backward-compatible alias for existing database event listeners
window.KaghanAnnouncement = {
    init: () => window.KaghanPromotions.init(),
    render: (data) => window.KaghanPromotions.setup(data),
    hide: () => window.KaghanPromotions.hide(),
    dismiss: () => window.KaghanPromotions.dismiss()
};

// Auto-run promotional popups on public pages
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.KaghanPromotions.init());
} else {
    window.KaghanPromotions.init();
}

// =========================================================================
// Kaghan Stay - Dynamic Rich Results & JSON-LD Structured Data Engine
// Supports Hotel, LodgingBusiness, Review, AggregateRating, Product,
// Accommodation, FAQPage, Organization, WebSite SearchAction, Breadcrumbs
// =========================================================================
const DEFAULT_SCHEMA_SETTINGS = {
    enabledTypes: {
        hotelLodging: true,
        reviews: true,
        products: true,
        faq: true,
        organization: true,
        website: true,
        breadcrumbs: true
    },
    businessEntity: {
        name: "KPH Stay - Luxury Furnished Apartments",
        legalName: "Kaghan Hotel & Resorts",
        alternateNames: [
            "Kaghan Properties Hospitality",
            "KPH Stay Islamabad",
            "KPH Stay Murree",
            "KPH Stay Nathia Gali"
        ],
        description: "KPH Stay offers premium furnished apartments in Islamabad, Murree, and Nathia Gali. Book 1BHK to 4BHK fully furnished luxury suites with equipped kitchens, 24/7 concierge, fast Wi-Fi, and world-class hospitality.",
        url: "https://kphstay.com",
        logo: "https://kphstay.com/assets/images/logo.png",
        image: "https://kphstay.com/assets/images/og-share.jpg",
        telephone: "+923340091127",
        email: "info@kphstay.com",
        priceRange: "PKR 8,000 - PKR 50,000",
        currenciesAccepted: "PKR, USD",
        paymentAccepted: "Cash, Credit Card, Bank Transfer, JazzCash, EasyPaisa",
        checkinTime: "14:00",
        checkoutTime: "12:00",
        numberOfRooms: 25,
        address: {
            streetAddress: "Pine Valley, Margalla Foothills",
            addressLocality: "Islamabad",
            addressRegion: "Islamabad Capital Territory",
            postalCode: "44000",
            addressCountry: "PK"
        },
        geo: {
            latitude: 33.7294,
            longitude: 73.0931
        },
        socialProfiles: [
            "https://www.facebook.com/kphstay",
            "https://www.instagram.com/kphstay",
            "https://www.linkedin.com/company/kphstay",
            "https://twitter.com/kphstay"
        ]
    },
    amenities: [
        "Free High-Speed Wi-Fi (100 Mbps Optical Fiber)",
        "24/7 Security & CCTV Surveillance",
        "Fully Equipped Modern Kitchen (Microwave, Stove, Refrigerator)",
        "Uninterrupted Generator Power Backup",
        "24/7 Dedicated Concierge & Room Service",
        "Executive Housekeeping & Daily Fresh Linen",
        "Secure Dedicated Underground Parking",
        "Inverter Heating & Cooling Climate Control"
    ],
    areaServed: [
        "Islamabad",
        "Rawalpindi",
        "Murree",
        "Nathia Gali",
        "Bhurban",
        "Bahria Enclave"
    ],
    reviewsConfig: {
        syncMode: "live",
        overrideRating: 4.9,
        overrideReviewCount: 128,
        topReviewsLimit: 6,
        showRatingInLodging: true,
        showRatingInProducts: true
    },
    productConfig: {
        defaultBrand: "KPH Stay",
        defaultCurrency: "PKR",
        itemCondition: "https://schema.org/NewCondition",
        availability: "https://schema.org/InStock"
    },
    faqConfig: {
        items: [
            {
                id: "faq-1",
                question: "Where can I book luxury furnished apartments in Islamabad?",
                answer: "KPH Stay provides luxury 1BHK, 2BHK, 3BHK, and 4BHK furnished apartments in prime locations of Islamabad, including Bahria Enclave and Margalla Foothills. Each apartment features a fully equipped kitchen, high-speed Wi-Fi, 24/7 power backup, and regular housekeeping.",
                page: "all",
                active: true,
                order: 1
            },
            {
                id: "faq-2",
                question: "Are furnished apartments available in Murree and Nathia Gali?",
                answer: "Yes! KPH Stay offers premium mountain-view furnished apartments in Murree and pine-valley chalets in Nathia Gali near Ayubia National Park. Available in 1 Bed to 4 Bed configurations with heating, kitchens, and 24/7 concierge support.",
                page: "all",
                active: true,
                order: 2
            },
            {
                id: "faq-3",
                question: "What amenities are included in KPH Stay furnished apartments?",
                answer: "All KPH Stay furnished apartments include fully equipped kitchens (microwave, stove, cookware, refrigerator), optical fiber Wi-Fi, inverter air conditioning and heating, Smart HD TVs with streaming apps, 24/7 security, uninterrupted generator power backup, and free dedicated parking.",
                page: "home",
                active: true,
                order: 3
            },
            {
                id: "faq-4",
                question: "Can I rent furnished apartments in Islamabad on a daily, weekly, or monthly basis?",
                answer: "Yes, KPH Stay offers flexible booking plans for furnished apartments in Islamabad, Murree, and Nathia Gali with discounted rates for weekly and monthly corporate or family stays.",
                page: "home",
                active: true,
                order: 4
            },
            {
                id: "faq-5",
                question: "What are the check-in and check-out times at KPH Stay?",
                answer: "Standard check-in time is 2:00 PM and check-out time is 12:00 PM (noon). Early check-in or late check-out can be arranged upon request subject to availability.",
                page: "all",
                active: true,
                order: 5
            },
            {
                id: "faq-6",
                question: "How do I confirm and track my reservation?",
                answer: "You can book directly online on kphstay.com or via WhatsApp concierge. Once booked, you receive an instant booking ID and can track real-time status on the Track Stay page.",
                page: "rooms",
                active: true,
                order: 6
            }
        ]
    }
};

window.KaghanSchema = {
    data: null,
    isInitialized: false,

    init: async function() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        // Listen for live Firestore updates
        window.addEventListener('kaghan-db-schema', (e) => {
            this.update(e.detail);
        });

        window.addEventListener('kaghan-db-reviews', () => {
            this.generateAndInject();
        });

        window.addEventListener('kaghan-db-rooms', () => {
            this.generateAndInject();
        });

        // Load data from cache or defaults
        this.data = window.KaghanDB_Cache && window.KaghanDB_Cache.schema 
            ? window.KaghanDB_Cache.schema 
            : DEFAULT_SCHEMA_SETTINGS;

        // Perform initial injection
        this.generateAndInject();

        // If not in cache, fetch from Firestore
        if (window.KaghanDB && window.KaghanDB.getSchemaSettings) {
            const fetched = await window.KaghanDB.getSchemaSettings().catch(() => null);
            if (fetched) {
                this.update(fetched);
            }
        }
    },

    update: function(newData) {
        if (newData) {
            this.data = { ...DEFAULT_SCHEMA_SETTINGS, ...newData };
        } else {
            this.data = DEFAULT_SCHEMA_SETTINGS;
        }
        this.generateAndInject();
    },

    getCurrentPageContext: function() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('room-details') || path.includes('/room/')) return 'room-details';
        if (path.includes('rooms')) return 'rooms';
        if (path.includes('blog-details') || path.includes('/blog/')) return 'blog-details';
        if (path.includes('blog')) return 'blog';
        if (path.includes('contact')) return 'contact';
        if (path.includes('pricing')) return 'pricing';
        if (path.includes('track')) return 'track';
        if (path.includes('booking')) return 'booking';
        if (path.includes('admin')) return 'admin';
        return 'home';
    },

    buildGraph: function() {
        const config = this.data || DEFAULT_SCHEMA_SETTINGS;
        const enabled = config.enabledTypes || DEFAULT_SCHEMA_SETTINGS.enabledTypes;
        const entity = config.businessEntity || DEFAULT_SCHEMA_SETTINGS.businessEntity;
        const reviewsCfg = config.reviewsConfig || DEFAULT_SCHEMA_SETTINGS.reviewsConfig;
        const page = this.getCurrentPageContext();
        const graph = [];

        // 1. WebSite Schema (with SearchAction)
        if (enabled.website) {
            graph.push({
                "@type": "WebSite",
                "@id": `${entity.url || 'https://kphstay.com'}/#website`,
                "url": `${entity.url || 'https://kphstay.com'}/`,
                "name": entity.name || "KPH Stay",
                "alternateName": entity.alternateNames || ["Kaghan Properties Hospitality"],
                "potentialAction": {
                    "@type": "SearchAction",
                    "target": {
                        "@type": "EntryPoint",
                        "urlTemplate": `${entity.url || 'https://kphstay.com'}/rooms?search={search_term_string}`
                    },
                    "query-input": "required name=search_term_string"
                }
            });
        }

        // 2. Organization Schema (Knowledge Graph Entity)
        if (enabled.organization) {
            graph.push({
                "@type": "Organization",
                "@id": `${entity.url || 'https://kphstay.com'}/#organization`,
                "name": entity.name || "KPH Stay",
                "legalName": entity.legalName || "Kaghan Hotel & Resorts",
                "url": entity.url || "https://kphstay.com",
                "logo": {
                    "@type": "ImageObject",
                    "url": entity.logo || "https://kphstay.com/assets/images/logo.png"
                },
                "image": entity.image || "https://kphstay.com/assets/images/og-share.jpg",
                "sameAs": entity.socialProfiles || [],
                "contactPoint": {
                    "@type": "ContactPoint",
                    "telephone": entity.telephone || "+923340091127",
                    "email": entity.email || "info@kphstay.com",
                    "contactType": "customer service",
                    "areaServed": "PK",
                    "availableLanguage": ["English", "Urdu"]
                }
            });
        }

        // 3. AggregateRating & Reviews computation
        let aggregateRatingObj = null;
        const reviewItems = [];

        if (enabled.reviews) {
            const allReviews = window.KaghanDB_Cache && window.KaghanDB_Cache.reviews ? window.KaghanDB_Cache.reviews : [];
            let avgRating = 4.9;
            let totalCount = 128;

            if (reviewsCfg.syncMode === 'live' && allReviews.length > 0) {
                const validRatings = allReviews.map(r => Number(r.rating) || 5);
                const sum = validRatings.reduce((a, b) => a + b, 0);
                avgRating = parseFloat((sum / validRatings.length).toFixed(1));
                totalCount = validRatings.length;
            } else {
                avgRating = Number(reviewsCfg.overrideRating) || 4.9;
                totalCount = Number(reviewsCfg.overrideReviewCount) || 128;
            }

            aggregateRatingObj = {
                "@type": "AggregateRating",
                "ratingValue": String(avgRating),
                "reviewCount": totalCount,
                "bestRating": "5",
                "worstRating": "1"
            };

            // Build top review items
            const limit = reviewsCfg.topReviewsLimit || 6;
            const topReviews = allReviews.slice(0, limit);

            if (topReviews.length > 0) {
                topReviews.forEach(r => {
                    reviewItems.push({
                        "@type": "Review",
                        "author": {
                            "@type": "Person",
                            "name": r.userName || r.author || r.guestName || "Verified Guest"
                        },
                        "datePublished": (r.date || r.createdAt || new Date().toISOString()).split('T')[0],
                        "reviewRating": {
                            "@type": "Rating",
                            "ratingValue": String(r.rating || 5),
                            "bestRating": "5",
                            "worstRating": "1"
                        },
                        "reviewBody": r.comment || r.reviewText || r.text || "Exceptional stay experience with luxurious interior and panoramic mountain views."
                    });
                });
            } else {
                // Curated fallback reviews
                reviewItems.push({
                    "@type": "Review",
                    "author": { "@type": "Person", "name": "Kamran S." },
                    "datePublished": "2025-06-15",
                    "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
                    "reviewBody": "Best furnished luxury apartments in Islamabad. Modern kitchen, generator backup, and high-speed Wi-Fi."
                }, {
                    "@type": "Review",
                    "author": { "@type": "Person", "name": "Dr. Ayesha Malik" },
                    "datePublished": "2025-07-20",
                    "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
                    "reviewBody": "The mountain view chalet in Nathia Gali was breathtaking. Exceptional concierge and cozy heating."
                });
            }
        }

        // 4. Hotel & LodgingBusiness Schema
        if (enabled.hotelLodging) {
            const hotelObj = {
                "@type": ["Hotel", "LodgingBusiness"],
                "@id": `${entity.url || 'https://kphstay.com'}/#hotel`,
                "name": entity.name || "KPH Stay - Luxury Furnished Apartments",
                "alternateName": entity.alternateNames || [],
                "description": entity.description || "Luxury furnished service apartments in Islamabad, Murree, and Nathia Gali.",
                "url": entity.url || "https://kphstay.com",
                "image": entity.image || "https://kphstay.com/assets/images/og-share.jpg",
                "telephone": entity.telephone || "+923340091127",
                "email": entity.email || "info@kphstay.com",
                "priceRange": entity.priceRange || "PKR 8,000 - PKR 50,000",
                "currenciesAccepted": entity.currenciesAccepted || "PKR, USD",
                "paymentAccepted": entity.paymentAccepted || "Cash, Credit Card, Bank Transfer, JazzCash, EasyPaisa",
                "checkinTime": entity.checkinTime || "14:00",
                "checkoutTime": entity.checkoutTime || "12:00",
                "numberOfRooms": entity.numberOfRooms || 25,
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": (entity.address && entity.address.streetAddress) || "Pine Valley, Margalla Foothills",
                    "addressLocality": (entity.address && entity.address.addressLocality) || "Islamabad",
                    "addressRegion": (entity.address && entity.address.addressRegion) || "Islamabad Capital Territory",
                    "postalCode": (entity.address && entity.address.postalCode) || "44000",
                    "addressCountry": (entity.address && entity.address.addressCountry) || "PK"
                },
                "geo": {
                    "@type": "GeoCoordinates",
                    "latitude": String((entity.geo && entity.geo.latitude) || 33.7294),
                    "longitude": String((entity.geo && entity.geo.longitude) || 73.0931)
                },
                "amenityFeature": (config.amenities || []).map(a => ({
                    "@type": "LocationFeatureSpecification",
                    "name": a,
                    "value": true
                })),
                "areaServed": (config.areaServed || []).map(area => ({
                    "@type": "Place",
                    "name": area
                }))
            };

            if (aggregateRatingObj && reviewsCfg.showRatingInLodging !== false) {
                hotelObj.aggregateRating = aggregateRatingObj;
                hotelObj.starRating = {
                    "@type": "Rating",
                    "ratingValue": "5"
                };
            }

            if (reviewItems.length > 0) {
                hotelObj.review = reviewItems;
            }

            graph.push(hotelObj);
        }

        // 5. Product / Accommodation Schemas (Rooms & Suites)
        if (enabled.products) {
            const rooms = window.KaghanDB_Cache && window.KaghanDB_Cache.rooms ? window.KaghanDB_Cache.rooms : [];
            const prodCfg = config.productConfig || DEFAULT_SCHEMA_SETTINGS.productConfig;

            if (page === 'room-details') {
                // Room Details specific single Product & HotelRoom
                const urlParams = new URLSearchParams(window.location.search || '');
                const roomId = urlParams.get('id') || urlParams.get('room') || urlParams.get('slug');
                const room = rooms.find(r => r.id === roomId || r.slug === roomId) || (window.currentRoomData || (rooms.length > 0 ? rooms[0] : null));

                if (room) {
                    const price = Number(room.priceDaily || room.price || 15000);
                    const roomImg = room.images && room.images.length ? room.images[0] : (room.coverImage || entity.image);
                    const productObj = {
                        "@type": ["Product", "Accommodation", "HotelRoom"],
                        "@id": `${window.location.origin || 'https://kphstay.com'}/room-details?id=${room.id}`,
                        "name": `${room.name} | KPH Stay`,
                        "description": room.description || room.seoDescription || `${room.name} fully furnished luxury apartment with equipped kitchen and mountain view.`,
                        "image": room.images && room.images.length ? room.images : [roomImg],
                        "sku": `KPH-${room.id}`,
                        "mpn": `KPH-ROOM-${room.id}`,
                        "brand": {
                            "@type": "Brand",
                            "name": prodCfg.defaultBrand || "KPH Stay"
                        },
                        "occupancy": {
                            "@type": "QuantitativeValue",
                            "value": room.maxGuests || 4,
                            "unitText": "guests"
                        },
                        "numberOfRooms": room.bedrooms || 1,
                        "numberOfBathroomsTotal": room.bathrooms || 1,
                        "floorSize": {
                            "@type": "QuantitativeValue",
                            "value": room.area || "1500 sq ft"
                        },
                        "amenityFeature": (room.amenities || config.amenities || []).map(a => ({
                            "@type": "LocationFeatureSpecification",
                            "name": a,
                            "value": true
                        })),
                        "offers": {
                            "@type": "Offer",
                            "url": window.location.href,
                            "priceCurrency": prodCfg.defaultCurrency || "PKR",
                            "price": price,
                            "priceValidUntil": `${new Date().getFullYear() + 1}-12-31`,
                            "itemCondition": prodCfg.itemCondition || "https://schema.org/NewCondition",
                            "availability": room.status === 'maintenance' ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"
                        }
                    };

                    if (aggregateRatingObj && reviewsCfg.showRatingInProducts !== false) {
                        productObj.aggregateRating = {
                            "@type": "AggregateRating",
                            "ratingValue": String(room.rating || aggregateRatingObj.ratingValue || "5.0"),
                            "reviewCount": Number(room.reviewsCount || aggregateRatingObj.reviewCount || 10),
                            "bestRating": "5"
                        };
                    }

                    graph.push(productObj);
                }
            } else {
                // Top Featured Products on Home / Rooms catalog
                const activeRooms = rooms.length > 0 ? rooms.slice(0, 4) : [
                    { id: "1bhk-luxury", name: "1BHK Luxury Furnished Apartment", price: 12000, location: "Islamabad" },
                    { id: "2bhk-executive", name: "2BHK Executive Family Suite", price: 18000, location: "Islamabad" },
                    { id: "3bhk-mountain", name: "3BHK Mountain View Chalet", price: 28000, location: "Murree" }
                ];
                activeRooms.forEach(room => {
                    const price = Number(room.priceDaily || room.price || 15000);
                    const roomImg = room.images && room.images.length ? room.images[0] : (room.coverImage || entity.image);
                    const productObj = {
                        "@type": ["Product", "Accommodation"],
                        "name": room.name,
                        "description": room.description || `${room.name} luxury apartment stay in ${room.location || 'Islamabad'}.`,
                        "image": roomImg,
                        "sku": `KPH-${room.id}`,
                        "brand": {
                            "@type": "Brand",
                            "name": prodCfg.defaultBrand || "KPH Stay"
                        },
                        "offers": {
                            "@type": "Offer",
                            "url": `${entity.url || 'https://kphstay.com'}/room-details?id=${room.id}`,
                            "priceCurrency": prodCfg.defaultCurrency || "PKR",
                            "price": price,
                            "priceValidUntil": `${new Date().getFullYear() + 1}-12-31`,
                            "itemCondition": prodCfg.itemCondition || "https://schema.org/NewCondition",
                            "availability": room.status === 'maintenance' ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"
                        }
                    };

                    if (aggregateRatingObj && reviewsCfg.showRatingInProducts !== false) {
                        productObj.aggregateRating = {
                            "@type": "AggregateRating",
                            "ratingValue": String(room.rating || aggregateRatingObj.ratingValue || "5.0"),
                            "reviewCount": Number(room.reviewsCount || 12),
                            "bestRating": "5"
                        };
                    }

                    graph.push(productObj);
                });
            }
        }

        // 6. FAQPage Schema (Filter by target page)
        if (enabled.faq && config.faqConfig && config.faqConfig.items) {
            const allFaqs = config.faqConfig.items.filter(item => item.active !== false);
            const pageFaqs = allFaqs.filter(item => {
                if (item.page === 'all') return true;
                if (page === 'home' && (item.page === 'home' || item.page === 'all')) return true;
                if (page === 'rooms' && (item.page === 'rooms' || item.page === 'all')) return true;
                if (page === 'room-details' && (item.page === 'rooms' || item.page === 'all')) return true;
                if (page === 'contact' && (item.page === 'contact' || item.page === 'all')) return true;
                if (page === 'pricing' && (item.page === 'pricing' || item.page === 'all')) return true;
                return false;
            });

            const activeFaqs = pageFaqs.length > 0 ? pageFaqs : allFaqs;

            if (activeFaqs.length > 0) {
                graph.push({
                    "@type": "FAQPage",
                    "@id": `${window.location.href}#faq`,
                    "mainEntity": activeFaqs.map(faq => ({
                        "@type": "Question",
                        "name": faq.question,
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": faq.answer
                        }
                    }))
                });
            }
        }

        // 7. BreadcrumbList Schema
        if (enabled.breadcrumbs) {
            const siteUrl = entity.url || 'https://kphstay.com';
            const items = [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": `${siteUrl}/` }
            ];

            if (page === 'rooms') {
                items.push({ "@type": "ListItem", "position": 2, "name": "Luxury Rooms & Suites", "item": `${siteUrl}/rooms` });
            } else if (page === 'room-details') {
                items.push({ "@type": "ListItem", "position": 2, "name": "Rooms", "item": `${siteUrl}/rooms` });
                items.push({ "@type": "ListItem", "position": 3, "name": "Suite Details", "item": window.location.href });
            } else if (page === 'blog') {
                items.push({ "@type": "ListItem", "position": 2, "name": "Resort Journal", "item": `${siteUrl}/blog` });
            } else if (page === 'blog-details') {
                items.push({ "@type": "ListItem", "position": 2, "name": "Journal", "item": `${siteUrl}/blog` });
                items.push({ "@type": "ListItem", "position": 3, "name": "Article", "item": window.location.href });
            } else if (page === 'contact') {
                items.push({ "@type": "ListItem", "position": 2, "name": "Contact & Concierge", "item": `${siteUrl}/contact` });
            } else if (page === 'pricing') {
                items.push({ "@type": "ListItem", "position": 2, "name": "Pricing & Packages", "item": `${siteUrl}/pricing` });
            } else if (page === 'track') {
                items.push({ "@type": "ListItem", "position": 2, "name": "Track Stay", "item": `${siteUrl}/track` });
            } else if (page === 'booking') {
                items.push({ "@type": "ListItem", "position": 2, "name": "Direct Booking", "item": `${siteUrl}/booking` });
            }

            graph.push({
                "@type": "BreadcrumbList",
                "@id": `${window.location.href}#breadcrumb`,
                "itemListElement": items
            });
        }

        return {
            "@context": "https://schema.org",
            "@graph": graph
        };
    },

    generateAndInject: function() {
        if (typeof document === 'undefined') return;

        // Clean up any legacy static schema tags to avoid duplicate conflicting graphs
        const existingStaticScripts = document.querySelectorAll('script[type="application/ld+json"]:not(#kaghan-dynamic-schema)');
        existingStaticScripts.forEach(el => el.remove());

        const payload = this.buildGraph();
        let script = document.getElementById('kaghan-dynamic-schema');

        if (!script) {
            script = document.createElement('script');
            script.id = 'kaghan-dynamic-schema';
            script.type = 'application/ld+json';
            document.head.appendChild(script);
        }

        script.textContent = JSON.stringify(payload, null, 2);
    }
};

// Auto-run schema engine on public pages
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.KaghanSchema.init());
} else {
    window.KaghanSchema.init();
}


