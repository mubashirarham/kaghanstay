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

// Firestore offline persistence is enabled by default in Firebase compat SDK v10.x.
// The deprecated fdb.enablePersistence() call has been removed to suppress the
// console warning: "enableIndexedDbPersistence() will be deprecated in the future".

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
    upgrades: null
};

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
    upgrades: null
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

    // 4. Authenticated User Listeners
    const user = JSON.parse(localStorage.getItem(DB_KEYS.SESSION));
    if (user) {
        // Sync active user profile details
        window.KaghanDB_Listeners.currentUser = fdb.collection('users').doc(user.id).onSnapshot(doc => {
            if (doc.exists) {
                const uData = doc.data();
                localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(uData));
                window.dispatchEvent(new CustomEvent('kaghan-db-current-user', { detail: uData }));
            }
        }, err => console.warn("Current user listener error:", err));

        if (user.role === 'admin') {
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
            }, err => console.warn("Coupons listener error:", err));

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
            }, err => console.warn("Bookings listener error:", err));

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
            }, err => console.warn("Users listener error:", err));

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
            }, err => console.warn("Newsletter listener error:", err));
        } else {
            // Subscribe to user-specific bookings (Guest)
            window.KaghanDB_Listeners.bookings = fdb.collection('bookings').where('userId', '==', user.id).onSnapshot(snap => {
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
            }, err => console.warn("User Bookings listener error:", err));
        }
    }
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
        upgrades: null
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
            window.location.href = '../login.html';
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

// DB Firestore Implementation
const db = {
    // Categories CRUD
    getCategories: async () => {
        if (window.KaghanDB_Cache.categories) return window.KaghanDB_Cache.categories;
        const snap = await fdb.collection('categories').get();
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        window.KaghanDB_Cache.categories = list;
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
        if (window.KaghanDB_Cache.locations) return window.KaghanDB_Cache.locations;
        const snap = await fdb.collection('locations').get();
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        window.KaghanDB_Cache.locations = list;
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

    // Rooms CRUD
    getRooms: async () => {
        if (window.KaghanDB_Cache.rooms) {
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
        return list;
    },
    getRoomById: async (id) => {
        if (window.KaghanDB_Cache.rooms) {
            const match = window.KaghanDB_Cache.rooms.find(r => r.id === id);
            if (match) return match;
        }
        const doc = await fdb.collection('rooms').doc(id).get();
        return doc.exists ? doc.data() : null;
    },
    updateRoom: async (id, updatedData) => {
        await fdb.collection('rooms').doc(id).update(updatedData);
        if (window.KaghanDB_Cache.rooms) {
            const idx = window.KaghanDB_Cache.rooms.findIndex(r => r.id === id);
            if (idx !== -1) {
                window.KaghanDB_Cache.rooms[idx] = { ...window.KaghanDB_Cache.rooms[idx], ...updatedData };
            }
        }
        window.dispatchEvent(new CustomEvent('kaghan-db-rooms', { detail: window.KaghanDB_Cache.rooms }));
        return true;
    },
    addRoom: async (room) => {
        await fdb.collection('rooms').doc(room.id).set(room);
        if (window.KaghanDB_Cache.rooms) {
            const filtered = window.KaghanDB_Cache.rooms.filter(r => r.id !== room.id);
            window.KaghanDB_Cache.rooms = [room, ...filtered];
        }
        window.dispatchEvent(new CustomEvent('kaghan-db-rooms', { detail: window.KaghanDB_Cache.rooms }));
        return true;
    },

    // Bookings CRUD
    getBookings: async () => {
        if (window.KaghanDB_Cache.bookings) {
            return window.KaghanDB_Cache.bookings;
        }
        const snap = await fdb.collection('bookings').get();
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        const sorted = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        window.KaghanDB_Cache.bookings = sorted;
        return sorted;
    },
    getBookingById: async (id) => {
        if (window.KaghanDB_Cache.bookings) {
            const match = window.KaghanDB_Cache.bookings.find(b => b.id === id);
            if (match) return match;
        }
        const doc = await fdb.collection('bookings').doc(id).get();
        return doc.exists ? doc.data() : null;
    },
    addBooking: async (booking, pdfBase64 = null) => {
        const bookingId = booking.id || ('BK-' + Math.floor(1000 + Math.random() * 9000));
        booking.id = bookingId;
        booking.createdAt = booking.createdAt || new Date().toISOString();
        booking.updatedAt = new Date().toISOString();
        booking.status = booking.status || 'confirmed';

        await fdb.collection('bookings').doc(bookingId).set(booking);

        if (window.KaghanDB_Cache.bookings) {
            window.KaghanDB_Cache.bookings.unshift(booking);
        }
        window.dispatchEvent(new CustomEvent('kaghan-db-bookings', { detail: window.KaghanDB_Cache.bookings }));

        return true;
    },
    updateBookingStatus: async (id, status) => {
        await fdb.collection('bookings').doc(id).update({ 
            status,
            updatedAt: new Date().toISOString()
        });
        if (window.KaghanDB_Cache.bookings) {
            const b = window.KaghanDB_Cache.bookings.find(item => item.id === id);
            if (b) b.status = status;
        }
        window.dispatchEvent(new CustomEvent('kaghan-db-bookings', { detail: window.KaghanDB_Cache.bookings }));
        return true;
    },
    updateBookingDates: async (id, checkIn, checkOut) => {
        await fdb.collection('bookings').doc(id).update({
            checkIn,
            checkOut,
            updatedAt: new Date().toISOString()
        });
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
        await fdb.collection('bookings').doc(id).delete();
        if (window.KaghanDB_Cache.bookings) {
            window.KaghanDB_Cache.bookings = window.KaghanDB_Cache.bookings.filter(b => b.id !== id);
        }
        window.dispatchEvent(new CustomEvent('kaghan-db-bookings', { detail: window.KaghanDB_Cache.bookings }));
        return true;
    },
    updateBookingDetails: async (id, updatedData) => {
        await fdb.collection('bookings').doc(id).update({
            ...updatedData,
            updatedAt: new Date().toISOString()
        });
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
        await fdb.collection('users').doc(id).delete();
        if (window.KaghanDB_Cache.users) {
            window.KaghanDB_Cache.users = window.KaghanDB_Cache.users.filter(u => u.id !== id && u.uid !== id);
        }
        return true;
    },
    createUser: async (user) => {
        const userId = user.id || user.uid || ('usr-' + Date.now());
        user.id = userId;
        user.createdAt = user.createdAt || new Date().toISOString();
        await fdb.collection('users').doc(userId).set(user);
        if (window.KaghanDB_Cache.users) {
            window.KaghanDB_Cache.users.unshift(user);
        }
        return true;
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
        const user = db.getCurrentUser ? db.getCurrentUser() : null;
        if (!user || (!user.uid && !user.id)) return [];
        const uid = user.uid || user.id;
        try {
            const doc = await fdb.collection('wishlists').doc(uid).get();
            if (doc.exists) {
                return doc.data().items || [];
            }
            return [];
        } catch (err) {
            console.warn("Error getting wishlist:", err);
            return [];
        }
    },
    toggleWishlistItem: async (roomId) => {
        const user = db.getCurrentUser ? db.getCurrentUser() : null;
        if (!user || (!user.uid && !user.id)) {
            UI.showToast("Please log in to save your favorite stays", "warning");
            setTimeout(() => {
                const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
                const isDashboard = window.location.pathname.includes('/user/');
                window.location.href = isDashboard ? '../login.html?redirect=' + currentPath : 'login.html?redirect=' + currentPath;
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

    // Date Overlap & Availability checking
    getRoomAvailability: async (roomId) => {
        const room = await db.getRoomById(roomId);
        const bookings = await db.getBookings();
        
        const bookedDatesSet = new Set();
        const blockedDatesSet = new Set((room && room.blockedDates) || []);

        if (bookings && bookings.length > 0) {
            bookings.forEach(b => {
                if (b.roomId === roomId && b.status !== 'cancelled') {
                    const start = new Date(b.checkIn);
                    const end = new Date(b.checkOut);
                    for (let dt = new Date(start); dt < end; dt.setDate(dt.getDate() + 1)) {
                        const dateStr = dt.toISOString().split('T')[0];
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
        const searchIn = new Date(checkInStr);
        const searchOut = new Date(checkOutStr);

        for (const b of bookings) {
            if (b.roomId === roomId && b.status !== 'cancelled') {
                const bIn = new Date(b.checkIn);
                const bOut = new Date(b.checkOut);

                // Overlap: (searchIn < bOut) && (searchOut > bIn)
                if (searchIn < bOut && searchOut > bIn) {
                    return false; // Reserved overlap!
                }
            }
        }

        if (room && room.blockedDates && room.blockedDates.length > 0) {
            const blockedSet = new Set(room.blockedDates);
            for (let dt = new Date(searchIn); dt < searchOut; dt.setDate(dt.getDate() + 1)) {
                const dateStr = dt.toISOString().split('T')[0];
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
        const snap = await fdb.collection('users').get();
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        window.KaghanDB_Cache.users = list;
        return list;
    },
    getUserById: async (uid) => {
        const doc = await fdb.collection('users').doc(uid).get();
        return doc.exists ? doc.data() : null;
    },
    updateUser: async (id, updatedData) => {
        delete updatedData.password;
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
        try {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            }
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const firebaseUser = userCredential.user;
            
            const userDoc = await fdb.collection('users').doc(firebaseUser.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(userData));
                startActiveListeners();
                return { success: true, user: userData };
            }
            const defaultUser = {
                id: firebaseUser.uid,
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: firebaseUser.displayName || email.split('@')[0],
                role: 'user',
                createdAt: new Date().toISOString()
            };
            await fdb.collection('users').doc(firebaseUser.uid).set(defaultUser);
            localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(defaultUser));
            startActiveListeners();
            return { success: true, user: defaultUser };
        } catch (err) {
            console.error("Login error:", err);
            return { success: false, message: err.message };
        }
    },
    register: async (name, email, password, phone = '') => {
        try {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            }
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const firebaseUser = userCredential.user;
            
            await firebaseUser.updateProfile({ displayName: name }).catch(() => {});

            const userData = {
                id: firebaseUser.uid,
                uid: firebaseUser.uid,
                name: name,
                email: email,
                phone: phone || '',
                role: 'user',
                createdAt: new Date().toISOString()
            };

            await fdb.collection('users').doc(firebaseUser.uid).set(userData);
            localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(userData));
            startActiveListeners();
            return { success: true, user: userData };
        } catch (err) {
            console.error("Registration error:", err);
            return { success: false, message: err.message };
        }
    },
    logout: () => {
        stopActiveListeners();
        localStorage.removeItem(DB_KEYS.SESSION);
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().catch(console.error);
        }
        const currentPath = window.location.pathname;
        if (currentPath.includes('/admin/') || currentPath.includes('/user/')) {
            window.location.href = '../login.html';
        } else {
            window.location.href = 'login.html';
        }
    },

    // Route Guard (Synchronous since it verifies Local Session)
    guardRoute: (requiredRole) => {
        const user = db.getCurrentUser();
        if (!user) {
            const currentPath = window.location.pathname;
            if (currentPath.includes('/admin/') || currentPath.includes('/user/')) {
                window.location.href = '../login.html';
            } else {
                window.location.href = 'login.html';
            }
            return false;
        }
        if (requiredRole && user.role !== requiredRole) {
            if (user.role === 'admin') {
                window.location.href = '../admin/index.html';
            } else {
                window.location.href = '../user/index.html';
            }
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
            container.className = 'fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm';
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
    openRoomDetailModal: (roomId) => {
        if (roomId) {
            window.location.href = `room-details.html?id=${roomId}`;
        }
    }
};

// Export to window
window.KaghanDB = db;
window.KaghanUI = UI;

// Dynamic Chatbot UI Injection
function injectChatbot() {
    // Do not show chatbot on admin dashboard pages
    if (window.location.pathname.includes('/admin/')) return;

    // Prevent duplicate injection
    if (document.getElementById('kph-chat-trigger')) return;

    // Create elements
    const trigger = document.createElement('button');
    trigger.id = 'kph-chat-trigger';
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
                <button onclick="sendQuickMessage('What suites are available?')" class="bg-slate-800/80 border border-[#D4AF37]/20 hover:border-[#D4AF37] text-slate-300 text-[10px] px-3 py-1.5 rounded-full transition-all text-left font-medium">✨ Check Suite Availability</button>
                <button onclick="sendQuickMessage('Tell me about resort hiking trails')" class="bg-slate-800/80 border border-[#D4AF37]/20 hover:border-[#D4AF37] text-slate-300 text-[10px] px-3 py-1.5 rounded-full transition-all text-left font-medium">🥾 Explore Hiking Guides</button>
                <button onclick="sendQuickMessage('Help me book a room')" class="bg-slate-800/80 border border-[#D4AF37]/20 hover:border-[#D4AF37] text-slate-300 text-[10px] px-3 py-1.5 rounded-full transition-all text-left font-medium">🛎️ Reserve a Room Style</button>
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

    // Helper functions
    async function appendMessage(msg, sender) {
        const bubble = document.createElement('div');
        if (sender === 'user') {
            bubble.className = 'bg-[#D4AF37] text-slate-950 p-3 rounded-2xl rounded-tr-none max-w-[85%] self-end font-medium leading-relaxed animate-fade-in shadow-md';
        } else {
            bubble.className = 'bg-slate-800/60 text-slate-300 p-3 rounded-2xl rounded-tl-none border border-slate-700/40 max-w-[85%] self-start leading-relaxed animate-fade-in shadow-sm';
        }
        
        bubble.innerHTML = msg.replace(/\n/g, '<br>');
        messagesArea.appendChild(bubble);
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    function appendMessageSilent(msg, sender) {
        const bubble = document.createElement('div');
        if (sender === 'user') {
            bubble.className = 'bg-[#D4AF37] text-slate-950 p-3 rounded-2xl rounded-tr-none max-w-[85%] self-end font-medium leading-relaxed shadow-md';
        } else {
            bubble.className = 'bg-slate-800/60 text-slate-300 p-3 rounded-2xl rounded-tl-none border border-slate-700/40 max-w-[85%] self-start leading-relaxed shadow-sm';
        }
        
        bubble.innerHTML = msg.replace(/\n/g, '<br>');
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
    
    const isDashboard = window.location.pathname.includes('/user/') || window.location.pathname.includes('/admin/');
    const prefix = isDashboard ? '../' : '';
    const loginPrefix = isDashboard ? '../' : '';
    
    if (user) {
        const dashboardUrl = user.role === 'admin' ? `${prefix}admin/index.html` : `${prefix}user/index.html`;
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
                <a href="${loginPrefix}login.html" class="border border-[#D4AF37] text-white px-5 py-2 rounded-full hover:bg-[#D4AF37] hover:text-white transition-all text-sm font-semibold">Login</a>
                <a href="${loginPrefix}login.html?register=true" class="bg-[#D4AF37] text-white px-5 py-2 rounded-full hover:bg-white hover:text-slate-900 transition-all text-sm font-semibold luxury-shadow">Register</a>
            `;
        }
        if (authContainerMobile) {
            authContainerMobile.innerHTML = `
                <a href="${loginPrefix}login.html" class="border border-[#D4AF37] text-white py-3 rounded-full hover:bg-[#D4AF37] transition-all text-base" onclick="toggleDrawer()">Login</a>
                <a href="${loginPrefix}login.html?register=true" class="bg-[#D4AF37] text-white py-3 rounded-full hover:bg-white hover:text-slate-900 transition-all text-base shadow-lg" onclick="toggleDrawer()">Register</a>
            `;
        }
    }
};

window.renderMobileTabBar = () => {
    if (window.location.pathname.includes('/admin/')) return;
    if (document.getElementById('kph-mobile-tab-bar')) return;

    const user = KaghanDB.getCurrentUser();
    const isDashboard = window.location.pathname.includes('/user/');
    const pathPrefix = isDashboard ? '../' : '';
    const currentPath = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');

    const tabBar = document.createElement('nav');
    tabBar.id = 'kph-mobile-tab-bar';
    tabBar.className = 'mobile-tab-bar';
    tabBar.setAttribute('aria-label', 'Mobile Bottom Navigation');

    const exploreActive = (!tabParam && (currentPath.includes('index.html') || currentPath.includes('rooms.html') || currentPath.endsWith('/'))) ? 'active' : '';
    const wishlistActive = tabParam === 'wishlists' ? 'active' : '';
    const tripsActive = tabParam === 'trips' ? 'active' : '';
    const notifActive = tabParam === 'notifications' ? 'active' : '';
    const accountActive = tabParam === 'account' ? 'active' : '';

    const wishlistUrl = user ? `${pathPrefix}user/index.html?tab=wishlists` : `${pathPrefix}login.html`;
    const tripsUrl = user ? `${pathPrefix}user/index.html?tab=trips` : `${pathPrefix}track.html`;
    const notifUrl = user ? `${pathPrefix}user/index.html?tab=notifications` : `${pathPrefix}login.html`;
    const accountUrl = user ? `${pathPrefix}user/index.html?tab=account` : `${pathPrefix}login.html`;

    tabBar.innerHTML = `
        <a href="${pathPrefix}index.html" class="mobile-tab-item ${exploreActive}">
            <i class="fa-solid fa-compass"></i>
            <span>Explore</span>
        </a>
        <a href="${wishlistUrl}" class="mobile-tab-item ${wishlistActive}">
            <i class="fa-solid fa-heart"></i>
            <span>Wishlists</span>
        </a>
        <a href="${tripsUrl}" class="mobile-tab-item ${tripsActive}">
            <i class="fa-solid fa-suitcase"></i>
            <span>Trips</span>
        </a>
        <a href="${notifUrl}" class="mobile-tab-item ${notifActive}">
            <i class="fa-solid fa-bell"></i>
            <span>Alerts</span>
        </a>
        <a href="${accountUrl}" class="mobile-tab-item ${accountActive}">
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
        const bookings = await KaghanDB.getBookings();
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) {
            KaghanUI.showToast('Booking not found', 'error');
            return;
        }

        const rooms = await KaghanDB.getRooms();
        const room = rooms.find(r => r.id === booking.roomId);

        // Calculate nights
        const inDate = new Date(booking.checkIn);
        const outDate = new Date(booking.checkOut);
        const nights = Math.max(1, Math.ceil((outDate - inDate) / (1000 * 3600 * 24)));

        // Retrieve coupon details to obtain the discount percentage dynamically
        let discountPercent = 0;
        if (booking.couponUsed) {
            try {
                const couponDoc = await fdb.collection('coupons').doc(booking.couponUsed.toUpperCase()).get();
                if (couponDoc.exists) {
                    const couponData = couponDoc.data();
                    discountPercent = couponData ? (couponData.discountPercentage || 0) : 0;
                }
            } catch (err) {
                console.warn("Failed to retrieve coupon for PDF generation:", err);
            }
        }

        const subtotal = Math.round(booking.totalPrice / (1.15 - (discountPercent / 100)));
        const tax = Math.round(subtotal * 0.15);
        const discount = Math.round(subtotal * (discountPercent / 100));

        // Generate Invoice HTML
        const html = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #0F172A; width: 800px;">
            <div style="border-bottom: 2px solid #D4AF37; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #0F172A;">Kaghan Stay</h1>
                    <p style="margin: 5px 0 0; font-size: 11px; color: #D4AF37; letter-spacing: 2px; text-transform: uppercase; font-weight: bold;">Premium Resort & Spa</p>
                </div>
                <div style="text-align: right;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: 700;">INVOICE</h2>
                    <p style="margin: 5px 0 0; font-size: 12px; color: #64748B;">Date: ${new Date().toLocaleDateString()}</p>
                    <p style="margin: 2px 0 0; font-size: 12px; color: #64748B;">Booking Ref: <strong>${booking.id}</strong></p>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 40px; font-size: 13px;">
                <div>
                    <p style="margin: 0; font-weight: bold; color: #64748B; text-transform: uppercase; font-size: 10px;">Billed To</p>
                    <p style="margin: 5px 0 0; font-weight: bold; font-size: 15px;">${booking.guestName}</p>
                    <p style="margin: 3px 0 0; color: #475569;">${booking.guestEmail}</p>
                    <p style="margin: 3px 0 0; color: #475569;">${booking.guestPhone}</p>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 0; font-weight: bold; color: #64748B; text-transform: uppercase; font-size: 10px;">Stay Details</p>
                    <p style="margin: 5px 0 0; font-weight: bold; font-size: 13px;">Check-in: ${booking.checkIn}</p>
                    <p style="margin: 3px 0 0; font-weight: bold; font-size: 13px;">Check-out: ${booking.checkOut}</p>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <thead>
                    <tr style="background-color: #F8FAFC; border-bottom: 2px solid #E2E8F0;">
                        <th style="padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748B;">Description</th>
                        <th style="padding: 12px; text-align: center; font-size: 11px; text-transform: uppercase; color: #64748B;">Nights</th>
                        <th style="padding: 12px; text-align: right; font-size: 11px; text-transform: uppercase; color: #64748B;">Total Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #E2E8F0;">
                        <td style="padding: 16px 12px; font-weight: bold;">
                            ${room ? room.name : 'Luxury Accommodation'}
                            <span style="display: block; font-weight: normal; font-size: 11px; color: #64748B; margin-top: 4px;">Accommodation</span>
                        </td>
                        <td style="padding: 16px 12px; text-align: center;">${nights}</td>
                        <td style="padding: 16px 12px; text-align: right; font-weight: bold;">${KaghanUI.formatPKR(subtotal)}</td>
                    </tr>
                </tbody>
            </table>

            <div style="width: 300px; margin-left: auto;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; color: #64748B;">
                    <span>Subtotal:</span>
                    <span>${KaghanUI.formatPKR(subtotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; color: #64748B;">
                    <span>Taxes (15%):</span>
                    <span>${KaghanUI.formatPKR(tax)}</span>
                </div>
                ${booking.couponUsed ? `
                <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; color: #10B981; font-weight: bold;">
                    <span>Discount (${booking.couponUsed}):</span>
                    <span>-${KaghanUI.formatPKR(discount)}</span>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: 900; color: #D4AF37; border-top: 2px solid #E2E8F0; margin-top: 5px;">
                    <span>TOTAL:</span>
                    <span>${KaghanUI.formatPKR(booking.totalPrice)}</span>
                </div>
            </div>

            <div style="margin-top: 60px; border-top: 1px solid #E2E8F0; padding-top: 20px; font-size: 10px; color: #94A3B8; text-align: center;">
                <p>Thank you for choosing Kaghan Stay! If you have any questions concerning this invoice, please contact support@kaghanstay.com.</p>
            </div>
        </div>
        `;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        document.body.appendChild(tempDiv);
        
        const opt = {
            margin:       0,
            filename:     `Kaghan-Stay-Invoice-${booking.id}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        KaghanUI.showToast('Generating PDF Invoice...', 'success');
        await html2pdf().set(opt).from(tempDiv).save();
        document.body.removeChild(tempDiv);

    } catch (e) {
        console.error("PDF generation failed:", e);
        KaghanUI.showToast('Failed to generate PDF', 'error');
    }
};

// Register Service Worker for offline PWA capabilities
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((reg) => console.log('[KPH Stay] Service Worker registered successfully:', reg.scope))
            .catch((err) => console.error('[KPH Stay] Service Worker registration failed:', err));
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
    trigger.className = 'fixed bottom-24 right-5 z-[9999] bg-[#25D366] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 border border-white/20';
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
            setTimeout(() => {
                chatBox.classList.remove('scale-95', 'opacity-0');
            }, 10);
        } else {
            chatBox.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                chatBox.classList.add('hidden');
            }, 300);
        }
    });

    const closeBtn = chatBox.querySelector('#wa-chat-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            chatBox.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                chatBox.classList.add('hidden');
            }, 300);
        });
    }

    const waBtn = chatBox.querySelector('#wa-chat-btn');
    if (waBtn) {
        waBtn.addEventListener('click', () => {
            chatBox.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                chatBox.classList.add('hidden');
            }, 300);
        });
    }
}
