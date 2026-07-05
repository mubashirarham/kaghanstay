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
const DEFAULT_ROOMS = [
    {
        id: 'room-deluxe-101',
        name: 'Deluxe Alpine Room',
        type: 'deluxe',
        price: 25000,
        image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
        amenities: ['King Bed', 'Mountain View', 'High-Speed Wi-Fi', 'Smart TV', 'Premium Minibar', '24/7 Butler Service'],
        status: 'available',
        description: 'Immerse yourself in rustic luxury. The Deluxe Alpine Room features warm wooden accents, an expansive view of the Islamabad hills, and premium bedding designed for supreme comfort.',
        maxGuests: 2,
        rating: 4.8,
        reviewsCount: 24,
        location: 'Islamabad'
    },
    {
        id: 'room-deluxe-102',
        name: 'Deluxe Alpine Twin',
        type: 'deluxe',
        price: 28000,
        image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
        amenities: ['Twin Beds', 'Garden View', 'High-Speed Wi-Fi', 'Smart TV', 'Luxury Bath toiletries', 'Coffee Maker'],
        status: 'available',
        description: 'Perfect for business partners or families. Features two premium twin beds, large French windows opening to our manicured pine gardens, and custom workspaces.',
        maxGuests: 2,
        rating: 4.7,
        reviewsCount: 18,
        location: 'Islamabad'
    },
    {
        id: 'room-suite-201',
        name: 'Executive Valley Suite',
        type: 'executive',
        price: 55000,
        image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
        amenities: ['Master Bedroom', 'Separate Lounge', 'Private Balcony', 'Espresso Machine', 'Jacuzzi Bath', 'Executive Lounge Access'],
        status: 'available',
        description: 'A sanctuary of sophistication. The Executive Valley Suite boasts a separate living room, private terrace overlooking the beautiful Nathia Gali hills, walk-in closets, and exclusive access to the sky lounge with complimentary drinks.',
        maxGuests: 3,
        rating: 4.9,
        reviewsCount: 42,
        location: 'Nathia Gali'
    },
    {
        id: 'room-suite-202',
        name: 'Grand Family Suite',
        type: 'executive',
        price: 75000,
        image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
        amenities: ['2 Bedrooms', 'Living Lounge', 'Kitchenette', 'Espresso Machine', 'Kids Play Area Access', 'Personal Laundry'],
        status: 'available',
        description: 'Designed for luxury family retreats. Offering two bedrooms, a central dining lounge, kitchenette, and panoramic mountain vistas. The ultimate home away from home.',
        maxGuests: 5,
        rating: 4.9,
        reviewsCount: 31,
        location: 'Nathia Gali'
    },
    {
        id: 'room-penthouse-301',
        name: 'Presidential Infinity Penthouse',
        type: 'presidential',
        price: 150000,
        image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
        amenities: ['3 Master Suites', 'Private Infinity Pool', '24/7 Personal Chef', 'Private Dining Hall', 'Smart Automation', 'Airport Chauffeur'],
        status: 'available',
        description: 'The pinnacle of luxury. Hovering above the clouds, our Presidential Penthouse offers three master suites, a private heated infinity pool overlooking Margalla Hills, a personal chef, and state-of-the-art automation.',
        maxGuests: 6,
        rating: 5.0,
        reviewsCount: 15,
        location: 'Islamabad'
    },
    {
        id: 'apt-studio-101',
        name: 'Studio Apartment',
        type: 'studio',
        price: 8000,
        priceDaily: 8000,
        priceWeekly: 50000,
        priceMonthly: 180000,
        isApartment: true,
        image: 'assets/images/apartment_studio.jpg',
        amenities: ['King Bed', '1 Bathroom', 'Balcony', 'Equipped Kitchen', '24-Hour Reception', 'Near to Market', 'High-Speed Wi-Fi', '24/7 Security'],
        status: 'available',
        description: 'Cozy and modern Studio Apartment at Cube Apartment, Bahria Enclave Islamabad. Features a king-sized bed, fully equipped kitchen, private balcony, and 24-hour reception access. Perfect for single business travelers or couples.',
        maxGuests: 2,
        rating: 4.9,
        reviewsCount: 16,
        location: 'Islamabad'
    },
    {
        id: 'apt-1bhk-101',
        name: 'One Bedroom Apartment (1BHK)',
        type: '1bhk',
        price: 12000,
        priceDaily: 12000,
        priceWeekly: 75000,
        priceMonthly: 270000,
        isApartment: true,
        image: 'assets/images/apartment_1bhk.jpg',
        amenities: ['King Bed', '1 Bedroom', 'Living Room', 'Equipped Kitchen', 'High-Speed Wi-Fi', '24/7 Security', 'Housekeeping'],
        status: 'available',
        description: 'Elegant one-bedroom apartment (1BHK) featuring fully furnished, home-like living spaces. Comes equipped with a kitchen, spacious living room, high-speed Wi-Fi, and round-the-clock security.',
        maxGuests: 2,
        rating: 4.8,
        reviewsCount: 12,
        location: 'Islamabad'
    },
    {
        id: 'apt-2bhk-101',
        name: 'Two Bedroom Apartment (2BHK)',
        type: '2bhk',
        price: 18000,
        priceDaily: 18000,
        priceWeekly: 110000,
        priceMonthly: 400000,
        isApartment: true,
        image: 'assets/images/apartment_2bhk.jpg',
        amenities: ['2 Bedrooms', '3 Bathrooms', 'Living Room', 'Kitchen', 'Store Room', 'High-Speed Wi-Fi', '24/7 Security', 'Housekeeping'],
        status: 'available',
        description: 'Spacious two-bedroom apartment (2BHK) ideal for family travel or extended stays. Features two premium bedrooms, three bathrooms, a comfortable living room, equipped kitchen, and store room.',
        maxGuests: 4,
        rating: 4.9,
        reviewsCount: 20,
        location: 'Islamabad'
    },
    {
        id: 'apt-3bhk-101',
        name: 'Three Bedroom Apartment (3BHK)',
        type: '3bhk',
        price: 25000,
        priceDaily: 25000,
        priceWeekly: 150000,
        priceMonthly: 550000,
        isApartment: true,
        image: 'assets/images/apartment_3bhk.jpg',
        amenities: ['3 Bedrooms', '3 Bathrooms', 'Spacious Lounge', 'Kitchen', 'Balcony', 'High-Speed Wi-Fi', '24/7 Security', 'Housekeeping'],
        status: 'available',
        description: 'Luxurious and extremely spacious three-bedroom apartment (3BHK) perfect for large groups or families. Fully furnished with high-end appliances, a spacious living area, and premium home-like comfort.',
        maxGuests: 6,
        rating: 5.0,
        reviewsCount: 8,
        location: 'Islamabad'
    }
];

const DEFAULT_USERS = [
    {
        id: 'usr-admin',
        name: 'KPH Admin',
        email: 'admin@kphstay.com',
        password: 'admin123',
        role: 'admin',
        loyaltyPoints: 0,
        phone: '+92 334 0091127'
    },
    {
        id: 'usr-guest',
        name: 'Mubashir Arham',
        email: 'guest@kphstay.com',
        password: 'guest123',
        role: 'user',
        loyaltyPoints: 350,
        phone: '+92 300 1234567'
    }
];

const DEFAULT_BOOKINGS = [
    {
        id: 'BK-7841',
        userId: 'usr-guest',
        roomId: 'room-suite-201',
        guestName: 'Mubashir Arham',
        guestEmail: 'guest@kphstay.com',
        guestPhone: '+92 300 1234567',
        checkIn: '2026-07-10',
        checkOut: '2026-07-14',
        totalPrice: 220000,
        status: 'confirmed',
        createdAt: '2026-06-15'
    },
    {
        id: 'BK-1029',
        userId: 'usr-guest',
        roomId: 'room-deluxe-101',
        guestName: 'Mubashir Arham',
        guestEmail: 'guest@kphstay.com',
        guestPhone: '+92 300 1234567',
        checkIn: '2026-05-01',
        checkOut: '2026-05-03',
        totalPrice: 50000,
        status: 'completed',
        createdAt: '2026-04-20'
    }
];

// Initialize and Seed Firestore collections
async function initializeFirestore() {
    try {
        // Seed Rooms
        const roomsSnap = await fdb.collection('rooms').limit(1).get();
        if (roomsSnap.empty) {
            for (const r of DEFAULT_ROOMS) {
                await fdb.collection('rooms').doc(r.id).set(r);
            }
            console.log("Firestore rooms collection seeded.");
        } else {
            // Seed new apartments if they do not exist
            for (const r of DEFAULT_ROOMS) {
                if (r.isApartment) {
                    const doc = await fdb.collection('rooms').doc(r.id).get();
                    if (!doc.exists) {
                        await fdb.collection('rooms').doc(r.id).set(r);
                        console.log(`Seeded new apartment: ${r.name}`);
                    }
                }
            }
        }

        // Migrate existing database rooms if they lack location attribute
        const allRoomsSnap = await fdb.collection('rooms').get();
        allRoomsSnap.forEach(async doc => {
            const rData = doc.data();
            if (!rData.location) {
                const isNathiaGali = doc.id === 'room-suite-201' || doc.id === 'room-suite-202';
                await fdb.collection('rooms').doc(doc.id).update({
                    location: isNathiaGali ? 'Nathia Gali' : 'Islamabad'
                });
                console.log(`Migrated room ${doc.id} to location: ${isNathiaGali ? 'Nathia Gali' : 'Islamabad'}`);
            }
        });

        // Seed Users
        const usersSnap = await fdb.collection('users').limit(1).get();
        if (usersSnap.empty) {
            for (const u of DEFAULT_USERS) {
                await fdb.collection('users').doc(u.id).set(u);
            }
            console.log("Firestore users collection seeded.");
        } else {
            // Migrate existing default users to new kphstay.com emails
            const adminDoc = await fdb.collection('users').doc('usr-admin').get();
            if (adminDoc.exists && adminDoc.data().email === 'admin@kaghan.com') {
                await fdb.collection('users').doc('usr-admin').update({
                    email: 'admin@kphstay.com',
                    name: 'KPH Admin'
                });
                console.log("Migrated default admin email to admin@kphstay.com");
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
    newsletter: null
};

window.KaghanDB_Listeners = {
    rooms: null,
    bookings: null,
    reviews: null,
    blogs: null,
    users: null,
    newsletter: null,
    currentUser: null
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

    // 4. Authenticated User Listeners
    const user = JSON.parse(localStorage.getItem(DB_KEYS.SESSION));
    if (user) {
        // Sync active user profile details/loyalty points
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
        newsletter: null
    };
}

// Initialize Active Listeners globally
startActiveListeners();

// DB Firestore Implementation
const db = {
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
    addBooking: async (booking) => {
        await fdb.collection('bookings').doc(booking.id).set(booking);
        
        // Update user loyalty points
        const session = db.getCurrentUser();
        if (session && session.role === 'user') {
            const pointsEarned = Math.floor(booking.totalPrice / 1000);
            await db.updateUserPoints(session.id, pointsEarned);
        }

        // Dispatch invoice receipts
        try {
            const room = await db.getRoomById(booking.roomId);
            const bookingWithRoom = { ...booking, roomName: room ? room.name : 'Luxury Accommodation' };

            // 1. Send Email Invoice via Netlify Function
            fetch('/.netlify/functions/booking-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking: bookingWithRoom })
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
    updateUserPoints: async (id, points) => {
        const userRef = fdb.collection('users').doc(id);
        const doc = await userRef.get();
        if (doc.exists) {
            const currentPoints = doc.data().loyaltyPoints || 0;
            const newPoints = Math.max(0, currentPoints + points);
            await userRef.update({ loyaltyPoints: newPoints });

            // Sync active user session
            const session = db.getCurrentUser();
            if (session && session.id === id) {
                const updatedUser = { ...doc.data(), loyaltyPoints: newPoints };
                localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(updatedUser));
            }
        }
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

// Call UI injections on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        injectChatbot();
        injectCookieBanner();
    }, 500);
});

// Register Service Worker for offline PWA capabilities
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((reg) => console.log('[KPH Stay] Service Worker registered successfully:', reg.scope))
            .catch((err) => console.error('[KPH Stay] Service Worker registration failed:', err));
    });
}
