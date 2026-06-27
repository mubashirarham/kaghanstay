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
        reviewsCount: 24
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
        reviewsCount: 18
    },
    {
        id: 'room-suite-201',
        name: 'Executive Valley Suite',
        type: 'executive',
        price: 55000,
        image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
        amenities: ['Master Bedroom', 'Separate Lounge', 'Private Balcony', 'Espresso Machine', 'Jacuzzi Bath', 'Executive Lounge Access'],
        status: 'available',
        description: 'A sanctuary of sophistication. The Executive Valley Suite boasts a separate living room, private terrace, walk-in closets, and exclusive access to the sky lounge with complimentary drinks.',
        maxGuests: 3,
        rating: 4.9,
        reviewsCount: 42
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
        reviewsCount: 31
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
        reviewsCount: 15
    }
];

const DEFAULT_USERS = [
    {
        id: 'usr-admin',
        name: 'Kaghan Admin',
        email: 'admin@kaghan.com',
        password: 'admin123',
        role: 'admin',
        loyaltyPoints: 0,
        phone: '+92 334 0091127'
    },
    {
        id: 'usr-guest',
        name: 'Mubashir Arham',
        email: 'guest@kaghan.com',
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
        guestEmail: 'guest@kaghan.com',
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
        guestEmail: 'guest@kaghan.com',
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
        }

        // Seed Users
        const usersSnap = await fdb.collection('users').limit(1).get();
        if (usersSnap.empty) {
            for (const u of DEFAULT_USERS) {
                await fdb.collection('users').doc(u.id).set(u);
            }
            console.log("Firestore users collection seeded.");
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

// DB Firestore Implementation
const db = {
    // Rooms CRUD
    getRooms: async () => {
        const snap = await fdb.collection('rooms').get();
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        return list;
    },
    getRoomById: async (id) => {
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
        const snap = await fdb.collection('bookings').get();
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        // Sort by creation date locally to avoid Firestore composite index requirements
        return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    addBooking: async (booking) => {
        await fdb.collection('bookings').doc(booking.id).set(booking);
        
        // Update user loyalty points
        const session = db.getCurrentUser();
        if (session && session.role === 'user') {
            const pointsEarned = Math.floor(booking.totalPrice / 1000);
            await db.updateUserPoints(session.id, pointsEarned);
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
    deleteUser: async (id) => {
        await fdb.collection('users').doc(id).delete();
        return true;
    },
    getReviews: async () => {
        const snap = await fdb.collection('reviews').get();
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    getReviewsByRoomId: async (roomId) => {
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
        const snap = await fdb.collection('users').get();
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        return list;
    },
    getUserByEmail: async (email) => {
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
        return { success: true, user: newUser };
    },
    logout: () => {
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
        try {
            const snap = await fdb.collection('blogs').get();
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
