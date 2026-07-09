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

// Enable Firestore Offline Persistence
fdb.enablePersistence().catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence deferred: Multiple tabs open.');
    } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence not supported in this browser.');
    }
});

// Default Seeding Data (used if Firestore is empty)
const DEFAULT_CATEGORIES = [
    { id: 'studio', label: 'Studio', icon: 'fa-cube', image: '' },
    { id: '1bed', label: '1 Bed', icon: 'fa-bed', image: '' },
    { id: '2bed', label: '2 Bed', icon: 'fa-door-open', image: '' },
    { id: '3bed', label: '3 Bed', icon: 'fa-house-chimney', image: '' },
    { id: '4bed', label: '4 Bed', icon: 'fa-building', image: '' },
    { id: '5marla', label: '5 Marla', icon: 'fa-house', image: '' },
    { id: '10marla', label: '10 Marla', icon: 'fa-house-user', image: '' },
    { id: '1kanal', label: '1 Kanal', icon: 'fa-hotel', image: '' },
    { id: 'farmhouse', label: 'Farmhouse', icon: 'fa-tree', image: '' }
];

const DEFAULT_LOCATIONS = [
    { id: 'islamabad', label: 'Islamabad' },
    { id: 'murree', label: 'Murree' },
    { id: 'nathia-gali', label: 'Nathia Gali' }
];

const DEFAULT_COUPONS = [
    { id: 'WELCOME10', code: 'WELCOME10', discountPercentage: 10, isActive: true },
    { id: 'SUMMER20', code: 'SUMMER20', discountPercentage: 20, isActive: false }
];
const DEFAULT_ROOMS = [
    {
        id: 'apt-studio-101',
        name: 'Studio Apartment',
        type: 'studio',
        price: 8000,
        priceDaily: 8000,
        priceWeekly: 50000,
        priceMonthly: 180000,
        isApartment: true,
        image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
        images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80'],
        amenities: ['King Bed', '1 Bathroom', 'Balcony', 'Equipped Kitchen', '24-Hour Reception', 'Near to Market', 'High-Speed Wi-Fi', '24/7 Security'],
        status: 'available',
        description: 'Cozy and modern Studio Apartment at Bahria Enclave Islamabad. Features a king-sized bed, fully equipped kitchen, private balcony, and 24-hour reception access. Perfect for single business travelers or couples.',
        maxGuests: 2,
        rating: 4.9,
        reviewsCount: 16,
        location: 'Islamabad'
    },
    {
        id: 'apt-1bed-101',
        name: '1 Bed Apartment',
        type: '1bed',
        price: 12000,
        priceDaily: 12000,
        priceWeekly: 75000,
        priceMonthly: 270000,
        isApartment: true,
        image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
        images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'],
        amenities: ['King Bed', '1 Bedroom', 'Living Room', 'Equipped Kitchen', 'High-Speed Wi-Fi', '24/7 Security', 'Housekeeping'],
        status: 'available',
        description: 'Elegant one-bedroom apartment featuring fully furnished, home-like living spaces. Comes equipped with a kitchen, spacious living room, high-speed Wi-Fi, and round-the-clock security.',
        maxGuests: 2,
        rating: 4.8,
        reviewsCount: 12,
        location: 'Islamabad'
    },
    {
        id: 'apt-2bed-101',
        name: '2 Bed Apartment',
        type: '2bed',
        price: 18000,
        priceDaily: 18000,
        priceWeekly: 110000,
        priceMonthly: 400000,
        isApartment: true,
        image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
        images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'],
        amenities: ['2 Bedrooms', '3 Bathrooms', 'Living Room', 'Kitchen', 'Store Room', 'High-Speed Wi-Fi', '24/7 Security', 'Housekeeping'],
        status: 'available',
        description: 'Spacious two-bedroom apartment overlooking the majestic hills. Ideal for family travel or extended stays. Features two premium bedrooms, three bathrooms, a comfortable living room, equipped kitchen, and store room.',
        maxGuests: 4,
        rating: 4.9,
        reviewsCount: 20,
        location: 'Nathia Gali'
    },
    {
        id: 'apt-3bed-101',
        name: '3 Bed Apartment',
        type: '3bed',
        price: 25000,
        priceDaily: 25000,
        priceWeekly: 150000,
        priceMonthly: 550000,
        isApartment: true,
        image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
        images: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80'],
        amenities: ['3 Bedrooms', '3 Bathrooms', 'Spacious Lounge', 'Kitchen', 'Balcony', 'High-Speed Wi-Fi', '24/7 Security', 'Housekeeping'],
        status: 'available',
        description: 'Luxurious and extremely spacious three-bedroom apartment in the heart of Alpine landscape. Fully furnished with high-end appliances, a spacious living area, and premium home-like comfort.',
        maxGuests: 6,
        rating: 5.0,
        reviewsCount: 8,
        location: 'Nathia Gali'
    },
    {
        id: 'apt-4bed-101',
        name: '4 Bed Apartment',
        type: '4bed',
        price: 35000,
        priceDaily: 35000,
        priceWeekly: 200000,
        priceMonthly: 700000,
        isApartment: true,
        image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
        images: ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80'],
        amenities: ['4 Bedrooms', '4 Bathrooms', 'Huge Lounge', 'Equipped Kitchen', 'Terrace', 'High-Speed Wi-Fi', '24/7 Security', 'Butler Service'],
        status: 'available',
        description: 'Stunning four-bedroom apartment designed for maximum comfort and style. Includes four master bedrooms, four bathrooms, a massive family lounge, equipped kitchen, and a private terrace overlooking Bahria Enclave.',
        maxGuests: 8,
        rating: 4.9,
        reviewsCount: 14,
        location: 'Islamabad'
    },
    {
        id: 'apt-farmhouse-101',
        name: 'Fully Furnished Farmhouse',
        type: 'farmhouse',
        price: 120000,
        priceDaily: 120000,
        priceWeekly: 700000,
        priceMonthly: 2400000,
        isApartment: true,
        image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
        images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80'],
        amenities: ['3 Master Suites', 'Private Pool', '24/7 Personal Butler', 'Private Dining Hall', 'Smart Automation', 'Retreat Gardens'],
        status: 'available',
        description: 'The pinnacle of luxury retreat. Our Fully Furnished Farmhouse features beautiful garden landscapes, a private swimming pool, personal chef, and high-end smart security. Located in the scenic hills of Murree.',
        maxGuests: 16,
        rating: 5.0,
        reviewsCount: 15,
        location: 'Murree'
    }
];

const DEFAULT_USERS = [
    {
        id: 'usr-admin',
        name: 'KPH Admin',
        email: 'tanzilminhas2007@gmail.com',
        password: 'tanzil@minhas2007',
        role: 'admin',
        phone: '+92 334 0091127'
    },
    {
        id: 'usr-guest',
        name: 'Mubashir Arham',
        email: 'guest@kphstay.com',
        password: 'guest123',
        role: 'user',
        phone: '+92 300 1234567'
    }
];

const DEFAULT_BOOKINGS = [
    {
        id: 'BK-7841',
        userId: 'usr-guest',
        roomId: 'apt-2bed-101',
        guestName: 'Mubashir Arham',
        guestEmail: 'guest@kphstay.com',
        guestPhone: '+92 300 1234567',
        checkIn: '2026-07-10',
        checkOut: '2026-07-14',
        totalPrice: 72000,
        status: 'confirmed',
        createdAt: '2026-06-15'
    },
    {
        id: 'BK-1029',
        userId: 'usr-guest',
        roomId: 'apt-studio-101',
        guestName: 'Mubashir Arham',
        guestEmail: 'guest@kphstay.com',
        guestPhone: '+92 300 1234567',
        checkIn: '2026-05-01',
        checkOut: '2026-05-03',
        totalPrice: 16000,
        status: 'completed',
        createdAt: '2026-04-20'
    }
];

// Initialize and Seed Firestore collections
async function initializeFirestore() {
    try {
        // Seed rooms database collection only if empty
        const allDbRooms = await fdb.collection('rooms').limit(1).get();
        if (allDbRooms.empty) {
            for (const r of DEFAULT_ROOMS) {
                await fdb.collection('rooms').doc(r.id).set(r);
            }
            console.log("Firestore rooms collection seeded.");
        }

        // Seed Categories
        const categoriesSnap = await fdb.collection('categories').limit(1).get();
        if (categoriesSnap.empty) {
            for (const cat of DEFAULT_CATEGORIES) {
                await fdb.collection('categories').doc(cat.id).set(cat);
            }
            console.log("Firestore categories seeded.");
        }

        // Seed Locations
        const locationsSnap = await fdb.collection('locations').limit(1).get();
        if (locationsSnap.empty) {
            for (const loc of DEFAULT_LOCATIONS) {
                await fdb.collection('locations').doc(loc.id).set(loc);
            }
            console.log("Firestore locations seeded.");
        }

        // Seed Coupons
        const couponsSnap = await fdb.collection('coupons').limit(1).get();
        if (couponsSnap.empty) {
            for (const cp of DEFAULT_COUPONS) {
                await fdb.collection('coupons').doc(cp.id).set(cp);
            }
            console.log("Firestore coupons seeded.");
        }

        // Seed Users
        const usersSnap = await fdb.collection('users').limit(1).get();
        if (usersSnap.empty) {
            for (const u of DEFAULT_USERS) {
                await fdb.collection('users').doc(u.id).set(u);
            }
            console.log("Firestore users collection seeded.");
        } else {
            // Migrate/Update default admin to tanzilminhas2007@gmail.com and tanzil@minhas2007
            const adminDoc = await fdb.collection('users').doc('usr-admin').get();
            if (!adminDoc.exists || adminDoc.data().email !== 'tanzilminhas2007@gmail.com' || adminDoc.data().password !== 'tanzil@minhas2007') {
                await fdb.collection('users').doc('usr-admin').set({
                    id: 'usr-admin',
                    name: 'KPH Admin',
                    email: 'tanzilminhas2007@gmail.com',
                    password: 'tanzil@minhas2007',
                    role: 'admin',
                    phone: '+92 51 8461975'
                }, { merge: true });
                console.log("Admin credentials updated in database.");
            }
            const guestDoc = await fdb.collection('users').doc('usr-guest').get();
            if (guestDoc.exists && guestDoc.data().email === 'guest@kaghan.com') {
                await fdb.collection('users').doc('usr-guest').update({
                    email: 'guest@kphstay.com',
                    name: 'Mubashir Arham'
                });
                console.log("Migrated default guest email to guest@kphstay.com");
            }
        }

        // Seed Bookings
        const bookingsSnap = await fdb.collection('bookings').limit(1).get();
        if (bookingsSnap.empty) {
            for (const b of DEFAULT_BOOKINGS) {
                await fdb.collection('bookings').doc(b.id).set(b);
            }
            console.log("Firestore bookings collection seeded.");
        }
    } catch (error) {
        console.error("Firestore seeding error:", error);
    }
}

// Trigger Seeding (fails silently on page load, runs async)
initializeFirestore();

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
    coupons: null
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
    coupons: null
};

function startActiveListeners() {
    stopActiveListeners(); // Ensure clean state before starting
    
    // 1. Rooms Listener (Public)
    window.KaghanDB_Listeners.rooms = fdb.collection('rooms').onSnapshot(snap => {
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        window.KaghanDB_Cache.rooms = list;
        window.dispatchEvent(new CustomEvent('kaghan-db-rooms', { detail: list }));
    }, err => console.warn("Rooms listener error:", err));

    // 2. Blogs Listener (Public)
    window.KaghanDB_Listeners.blogs = fdb.collection('blogs').onSnapshot(snap => {
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        const sorted = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        window.KaghanDB_Cache.blogs = sorted;
        window.dispatchEvent(new CustomEvent('kaghan-db-blogs', { detail: sorted }));
    }, err => console.warn("Blogs listener error:", err));

    // 3. Reviews Listener (Public)
    window.KaghanDB_Listeners.reviews = fdb.collection('reviews').onSnapshot(snap => {
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        const sorted = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        window.KaghanDB_Cache.reviews = sorted;
        window.dispatchEvent(new CustomEvent('kaghan-db-reviews', { detail: sorted }));
    }, err => console.warn("Reviews listener error:", err));

    // Settings Listeners (Public)
    window.KaghanDB_Listeners.categories = fdb.collection('categories').onSnapshot(snap => {
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        window.KaghanDB_Cache.categories = list;
        window.dispatchEvent(new CustomEvent('kaghan-db-categories', { detail: list }));
    }, err => console.warn("Categories listener error:", err));

    window.KaghanDB_Listeners.locations = fdb.collection('locations').onSnapshot(snap => {
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        window.KaghanDB_Cache.locations = list;
        window.dispatchEvent(new CustomEvent('kaghan-db-locations', { detail: list }));
    }, err => console.warn("Locations listener error:", err));

    window.KaghanDB_Listeners.coupons = fdb.collection('coupons').onSnapshot(snap => {
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        window.KaghanDB_Cache.coupons = list;
        window.dispatchEvent(new CustomEvent('kaghan-db-coupons', { detail: list }));
    }, err => console.warn("Coupons listener error:", err));

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
            // Subscribe to all bookings (Admin)
            window.KaghanDB_Listeners.bookings = fdb.collection('bookings').onSnapshot(snap => {
                const list = [];
                snap.forEach(doc => list.push(doc.data()));
                const sorted = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                window.KaghanDB_Cache.bookings = sorted;
                window.dispatchEvent(new CustomEvent('kaghan-db-bookings', { detail: sorted }));
            }, err => console.warn("Bookings listener error:", err));

            // Subscribe to all users (Admin)
            window.KaghanDB_Listeners.users = fdb.collection('users').onSnapshot(snap => {
                const list = [];
                snap.forEach(doc => list.push(doc.data()));
                window.KaghanDB_Cache.users = list;
                window.dispatchEvent(new CustomEvent('kaghan-db-users', { detail: list }));
            }, err => console.warn("Users listener error:", err));

            // Subscribe to all newsletter subscribers (Admin)
            window.KaghanDB_Listeners.newsletter = fdb.collection('newsletter').onSnapshot(snap => {
                const list = [];
                snap.forEach(doc => list.push(doc.data()));
                const sorted = list.sort((a, b) => new Date(b.subscribedAt) - new Date(a.subscribedAt));
                window.KaghanDB_Cache.newsletter = sorted;
                window.dispatchEvent(new CustomEvent('kaghan-db-newsletter', { detail: sorted }));
            }, err => console.warn("Newsletter listener error:", err));
        } else {
            // Subscribe to user-specific bookings (Guest)
            window.KaghanDB_Listeners.bookings = fdb.collection('bookings').where('userId', '==', user.id).onSnapshot(snap => {
                const list = [];
                snap.forEach(doc => list.push(doc.data()));
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
        coupons: null
    };
}

// Initialize Active Listeners globally
startActiveListeners();

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

    // Rooms CRUD
    getRooms: async () => {
        if (window.KaghanDB_Cache.rooms) {
            return window.KaghanDB_Cache.rooms;
        }
        const snap = await fdb.collection('rooms').get();
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
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
        return true;
    },
    addRoom: async (room) => {
        await fdb.collection('rooms').doc(room.id).set(room);
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
    addBooking: async (booking, pdfBase64 = null) => {
        await fdb.collection('bookings').doc(booking.id).set(booking);
        
        // Dispatch invoice receipts
        try {
            const room = await db.getRoomById(booking.roomId);
            const bookingWithRoom = { ...booking, roomName: room ? room.name : 'Luxury Accommodation' };

            // 1. Send Email Invoice via Netlify Function
            fetch('/.netlify/functions/booking-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking: bookingWithRoom, pdfAttachment: pdfBase64 })
            }).catch(e => console.warn("Email function dispatch failed:", e));
        } catch (err) {
            console.error("Receipts dispatcher error:", err);
        }

        return true;
    },
    updateBookingStatus: async (id, status) => {
        await fdb.collection('bookings').doc(id).update({ status });
        return true;
    },
    updateBookingDates: async (id, checkIn, checkOut, totalPrice) => {
        await fdb.collection('bookings').doc(id).update({ checkIn, checkOut, totalPrice });
        return true;
    },
    deleteBooking: async (id) => {
        await fdb.collection('bookings').doc(id).delete();
        return true;
    },
    updateBookingDetails: async (id, updatedData) => {
        await fdb.collection('bookings').doc(id).update(updatedData);
        return true;
    },
    deleteRoom: async (id) => {
        await fdb.collection('rooms').doc(id).delete();
        return true;
    },
    deleteUser: async (id) => {
        await fdb.collection('users').doc(id).delete();
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
        const docRef = fdb.collection('reviews').doc();
        review.createdAt = new Date().toISOString();
        await docRef.set(review);

        // Recalculate average rating & reviewsCount for this room
        const room = await db.getRoomById(review.roomId);
        if (room) {
            const roomReviewsSnap = await fdb.collection('reviews').where('roomId', '==', review.roomId).get();
            let totalRating = 0;
            let count = 0;
            roomReviewsSnap.forEach(doc => {
                totalRating += doc.data().rating;
                count++;
            });
            const newRating = count > 0 ? parseFloat((totalRating / count).toFixed(1)) : 5.0;
            await db.updateRoom(review.roomId, {
                rating: newRating,
                reviewsCount: count
            });
        }
        return true;
    },
    deleteReview: async (reviewId) => {
        const reviewDoc = await fdb.collection('reviews').doc(reviewId).get();
        if (!reviewDoc.exists) return false;
        const reviewData = reviewDoc.data();

        await fdb.collection('reviews').doc(reviewId).delete();

        // Recalculate average rating & reviewsCount for this room
        const room = await db.getRoomById(reviewData.roomId);
        if (room) {
            const roomReviewsSnap = await fdb.collection('reviews').where('roomId', '==', reviewData.roomId).get();
            let totalRating = 0;
            let count = 0;
            roomReviewsSnap.forEach(doc => {
                totalRating += doc.data().rating;
                count++;
            });
            const newRating = count > 0 ? parseFloat((totalRating / count).toFixed(1)) : 5.0;
            await db.updateRoom(reviewData.roomId, {
                rating: newRating,
                reviewsCount: count
            });
        }
        return true;
    },

    // Date Overlap checking
    isRoomAvailable: async (roomId, checkInStr, checkOutStr) => {
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
    getUserByEmail: async (email) => {
        if (window.KaghanDB_Cache.users) {
            const match = window.KaghanDB_Cache.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
            if (match) return match;
        }
        const snap = await fdb.collection('users').where('email', '==', email.toLowerCase().trim()).get();
        if (snap.empty) return null;
        return snap.docs[0].data();
    },
    updateUser: async (id, updatedData) => {
        await fdb.collection('users').doc(id).update(updatedData);
        
        // Sync active user session
        const session = db.getCurrentUser();
        if (session && session.id === id) {
            const snap = await fdb.collection('users').doc(id).get();
            localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(snap.data()));
        }
        return true;
    },

    // Authentication / Session
    getCurrentUser: () => JSON.parse(localStorage.getItem(DB_KEYS.SESSION)),
    login: async (email, password) => {
        const user = await db.getUserByEmail(email);
        if (user && user.password === password) {
            localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(user));
            startActiveListeners();
            return { success: true, user };
        }
        return { success: false, message: 'Invalid email or password.' };
    },
    register: async (name, email, password, phone = '') => {
        const existing = await db.getUserByEmail(email);
        if (existing) {
            return { success: false, message: 'An account with this email already exists.' };
        }
        const userId = 'usr-' + Date.now();
        const newUser = {
            id: userId,
            name,
            email: email.toLowerCase().trim(),
            password,
            role: 'user',
            loyaltyPoints: 100, // Signup loyalty bonus
            phone
        };
        await fdb.collection('users').doc(userId).set(newUser);
        localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(newUser));
        startActiveListeners();
        return { success: true, user: newUser };
    },
    logout: () => {
        stopActiveListeners();
        localStorage.removeItem(DB_KEYS.SESSION);
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
        try {
            const docRef = fdb.collection('blogs').doc();
            blog.id = docRef.id;
            blog.createdAt = new Date().toISOString();
            await docRef.set(blog);
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error("Error adding blog:", error);
            throw error;
        }
    },

    deleteBlog: async (id) => {
        try {
            await fdb.collection('blogs').doc(id).delete();
            return true;
        } catch (error) {
            console.error("Error deleting blog:", error);
            return false;
        }
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
    }
};

// Export to window
window.KaghanDB = db;
window.KaghanUI = UI;

// Dynamic Chatbot UI Injection
function injectChatbot() {
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

    document.getElementById('kph-chat-close').addEventListener('click', closeChat);

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

    form.addEventListener('submit', async (e) => {
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
            
            const res = await fetch('/.netlify/functions/chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    messages: history,
                    rooms: liveRooms,
                    bookings: liveBookings
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
        form.dispatchEvent(new Event('submit'));
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
    document.getElementById('kph-cookie-accept').addEventListener('click', () => {
        localStorage.setItem('kph_cookie_consent', 'true');
        dismissBanner();
    });

    document.getElementById('kph-cookie-decline').addEventListener('click', () => {
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

    // Automatically sync header auth state
    window.renderNavbar();

    // Trigger chatbot and cookie consent injections
    setTimeout(() => {
        injectChatbot();
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
(function initScrollAnimations() {
    function setupObserver() {
        const animatedEls = document.querySelectorAll('[data-animate]');
        if (!animatedEls.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        animatedEls.forEach(el => observer.observe(el));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupObserver);
    } else {
        setupObserver();
    }
})();

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

        // Retrieve coupons to obtain the discount percentage
        const coupons = await KaghanDB.getCoupons();
        const coupon = booking.couponUsed ? coupons.find(c => c.id === booking.couponUsed || c.code === booking.couponUsed) : null;
        const discountPercent = coupon ? (coupon.discountPercentage || 0) : 0;

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
