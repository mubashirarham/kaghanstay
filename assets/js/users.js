// Kaghan Hotel - Users, Session & Auth Module
// Extends KaghanDB with Auth mechanisms, loyalty accounting, and route locks.

(function() {
    if (!window.KaghanDB) {
        window.KaghanDB = {};
    }

    const db = window.KaghanDB;
    const fdb = firebase.firestore();

    // Session cache getter
    db.getCurrentUser = () => JSON.parse(localStorage.getItem('kaghan_hotel_session'));
    
    // Login procedure
    db.login = async (email, password) => {
        const user = await db.getUserByEmail(email);
        if (user && user.password === password) {
            localStorage.setItem('kaghan_hotel_session', JSON.stringify(user));
            return { success: true, user };
        }
        return { success: false, message: 'Invalid email or password.' };
    };

    // Registration procedure
    db.register = async (name, email, password, phone = '') => {
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
            phone
        };
        await fdb.collection('users').doc(userId).set(newUser);
        localStorage.setItem('kaghan_hotel_session', JSON.stringify(newUser));
        return { success: true, user: newUser };
    };

    // Logout and redirect
    db.logout = () => {
        localStorage.removeItem('kaghan_hotel_session');
        const currentPath = window.location.pathname;
        if (currentPath.includes('/admin/') || currentPath.includes('/user/')) {
            window.location.href = '../login.html';
        } else {
            window.location.href = 'login.html';
        }
    };

    // Route Locks & Access controls
    db.guardRoute = (requiredRole) => {
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
    };

    // Profile updates
    db.updateUser = async (id, updatedData) => {
        await fdb.collection('users').doc(id).update(updatedData);
        
        // Sync active user session
        const session = db.getCurrentUser();
        if (session && session.id === id) {
            const snap = await fdb.collection('users').doc(id).get();
            localStorage.setItem('kaghan_hotel_session', JSON.stringify(snap.data()));
        }
        return true;
    };



    // List system guests
    db.getUsers = async () => {
        const snap = await fdb.collection('users').get();
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        return list;
    };

    // Search by email address key
    db.getUserByEmail = async (email) => {
        const snap = await fdb.collection('users').where('email', '==', email.toLowerCase().trim()).get();
        if (snap.empty) return null;
        return snap.docs[0].data();
    };
})();
