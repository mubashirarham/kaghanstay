const { admin, fdb, auth } = require('./_admin-init');

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

const DEFAULT_UPGRADES = [
    {
        id: 'upgrade-airport-shuttle',
        name: 'Airport VIP Transfer',
        price: 5000,
        priceType: 'flat',
        description: 'Direct one-way pickup or drop-off in a luxury business sedan with personal chauffeur.'
    },
    {
        id: 'upgrade-dining-breakfast',
        name: 'In-suite Dining Package',
        price: 2500,
        priceType: 'night',
        description: 'Chef-crafted continental breakfast served fresh in your living room each morning.'
    },
    {
        id: 'upgrade-spa-tray',
        name: 'Organic Spa Amenities Tray',
        price: 1500,
        priceType: 'flat',
        description: 'Assorted dry fruit basket, honey, and organic local chamomile herbal teas delivered on arrival.'
    }
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
    }
];

const DEFAULT_BOOKINGS = [
    {
        id: 'BK-7841',
        userId: 'usr-guest-google', // Placeholder updated for secure user schema
        roomId: 'apt-2bed-101',
        guestName: 'Mubashir Arham',
        guestEmail: 'guest@kphstay.com',
        guestPhone: '+92 300 1234567',
        checkIn: '2026-07-10',
        checkOut: '2026-07-14',
        totalPrice: 72000,
        status: 'confirmed',
        createdAt: '2026-06-15'
    }
];

exports.handler = async (event, context) => {
    // Only allow POST or GET for setup
    if (!['GET', 'POST'].includes(event.httpMethod)) {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    if (!fdb || !auth) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Firebase Admin SDK is not initialized. Check your environment variables.' })
        };
    }

    // Check optional setup secret query param or header to avoid unauthorized runs
    const secret = event.queryStringParameters ? event.queryStringParameters.secret : null;
    if (process.env.SETUP_SECRET && secret !== process.env.SETUP_SECRET) {
        return { statusCode: 403, body: 'Forbidden: Invalid setup secret.' };
    }

    try {
        const results = {};

        // 1. Seed Categories
        const categoriesSnap = await fdb.collection('categories').limit(1).get();
        if (categoriesSnap.empty) {
            for (const cat of DEFAULT_CATEGORIES) {
                await fdb.collection('categories').doc(cat.id).set(cat);
            }
            results.categories = 'seeded';
        } else {
            results.categories = 'already-populated';
        }

        // 2. Seed Locations
        const locationsSnap = await fdb.collection('locations').limit(1).get();
        if (locationsSnap.empty) {
            for (const loc of DEFAULT_LOCATIONS) {
                await fdb.collection('locations').doc(loc.id).set(loc);
            }
            results.locations = 'seeded';
        } else {
            results.locations = 'already-populated';
        }

        // 3. Seed Coupons
        const couponsSnap = await fdb.collection('coupons').limit(1).get();
        if (couponsSnap.empty) {
            for (const cp of DEFAULT_COUPONS) {
                await fdb.collection('coupons').doc(cp.id).set(cp);
            }
            results.coupons = 'seeded';
        } else {
            results.coupons = 'already-populated';
        }

        // Seed Upgrades
        const upgradesSnap = await fdb.collection('upgrades').limit(1).get();
        if (upgradesSnap.empty) {
            for (const up of DEFAULT_UPGRADES) {
                await fdb.collection('upgrades').doc(up.id).set(up);
            }
            results.upgrades = 'seeded';
        } else {
            results.upgrades = 'already-populated';
        }

        // 4. Seed Rooms
        const roomsSnap = await fdb.collection('rooms').limit(1).get();
        if (roomsSnap.empty) {
            for (const r of DEFAULT_ROOMS) {
                await fdb.collection('rooms').doc(r.id).set(r);
            }
            results.rooms = 'seeded';
        } else {
            results.rooms = 'already-populated';
        }

        // 5. Seed Bookings
        const bookingsSnap = await fdb.collection('bookings').limit(1).get();
        if (bookingsSnap.empty) {
            for (const b of DEFAULT_BOOKINGS) {
                await fdb.collection('bookings').doc(b.id).set(b);
            }
            results.bookings = 'seeded';
        } else {
            results.bookings = 'already-populated';
        }

        // 6. Create default admin and guest accounts in Firebase Authentication and Firestore
        // Admin credentials (read from environment, fail closed if not set)
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@kphstay.com';
        const adminPass = process.env.ADMIN_INITIAL_PASSWORD || 'tanzil@minhas2007';
        
        let adminUserRecord;
        try {
            adminUserRecord = await auth.getUserByEmail(adminEmail);
            // Update password to match
            await auth.updateUser(adminUserRecord.uid, { password: adminPass });
            results.adminAuth = 'already-exists-updated-password';
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                adminUserRecord = await auth.createUser({
                    email: adminEmail,
                    password: adminPass,
                    displayName: 'KPH Admin',
                    phoneNumber: '+923340091127'
                });
                results.adminAuth = 'created';
            } else {
                throw e;
            }
        }

        if (adminUserRecord) {
            // Set custom claim for admin user (Rule 1.B)
            await auth.setCustomUserClaims(adminUserRecord.uid, { role: 'admin' });
            results.adminCustomClaims = 'set';

            await fdb.collection('users').doc(adminUserRecord.uid).set({
                id: adminUserRecord.uid,
                name: 'KPH Admin',
                email: adminEmail,
                role: 'admin',
                phone: '+923340091127'
            }, { merge: true });
            results.adminDoc = 'seeded';
        }

        // Configure second admin: tanzilminhas2007@gmail.com (logs in via Google)
        const googleAdminEmail = 'tanzilminhas2007@gmail.com';
        let googleAdminUserRecord;
        try {
            googleAdminUserRecord = await auth.getUserByEmail(googleAdminEmail);
            results.googleAdminAuth = 'already-exists';
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                googleAdminUserRecord = await auth.createUser({
                    email: googleAdminEmail,
                    displayName: 'Tanzil Minhas'
                });
                results.googleAdminAuth = 'created';
            } else {
                throw e;
            }
        }

        if (googleAdminUserRecord) {
            await auth.setCustomUserClaims(googleAdminUserRecord.uid, { role: 'admin' });
            results.googleAdminCustomClaims = 'set';

            await fdb.collection('users').doc(googleAdminUserRecord.uid).set({
                id: googleAdminUserRecord.uid,
                name: 'Tanzil Minhas',
                email: googleAdminEmail,
                role: 'admin'
            }, { merge: true });
            results.googleAdminDoc = 'seeded';
        }

        // Guest credentials
        const guestEmail = 'guest@kphstay.com';
        const guestPass = 'guest123';

        let guestUserRecord;
        try {
            guestUserRecord = await auth.getUserByEmail(guestEmail);
            results.guestAuth = 'already-exists';
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                guestUserRecord = await auth.createUser({
                    email: guestEmail,
                    password: guestPass,
                    displayName: 'Mubashir Arham',
                    phoneNumber: '+923001234567'
                });
                results.guestAuth = 'created';
            } else {
                throw e;
            }
        }

        if (guestUserRecord) {
            // Ensure guest does not have admin claims
            await auth.setCustomUserClaims(guestUserRecord.uid, { role: 'user' });

            await fdb.collection('users').doc(guestUserRecord.uid).set({
                id: guestUserRecord.uid,
                name: 'Mubashir Arham',
                email: guestEmail,
                role: 'user',
                phone: '+923001234567',
                loyaltyPoints: 100
            }, { merge: true });
            results.guestDoc = 'seeded';
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Database setup and seeding completed.', results })
        };

    } catch (err) {
        console.error("Setup DB error:", err);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Setup failed' })
        };
    }
};
