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
        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const firebaseUser = userCredential.user;
            
            // Get user profile from Firestore using uid
            const userDoc = await fdb.collection('users').doc(firebaseUser.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                localStorage.setItem('kaghan_hotel_session', JSON.stringify(userData));
                return { success: true, user: userData };
            }
            return { success: false, message: 'User profile not found in database.' };
        } catch (err) {
            console.error("Login error:", err);
            return { success: false, message: err.message };
        }
    };

    // Registration procedure
    db.register = async (name, email, password, phone = '') => {
        try {
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const firebaseUser = userCredential.user;
            
            const newUser = {
                id: firebaseUser.uid,
                name,
                email: email.toLowerCase().trim(),
                role: 'user',
                phone,
                loyaltyPoints: 100
            };
            
            // Save profile to Firestore under uid
            await fdb.collection('users').doc(firebaseUser.uid).set(newUser);
            localStorage.setItem('kaghan_hotel_session', JSON.stringify(newUser));
            return { success: true, user: newUser };
        } catch (err) {
            console.error("Registration error:", err);
            return { success: false, message: err.message };
        }
    };

    // Logout and redirect
    db.logout = () => {
        localStorage.removeItem('kaghan_hotel_session');
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().catch(console.error);
        }
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
        // Exclude password modifications from client
        delete updatedData.password;
        await fdb.collection('users').doc(id).update(updatedData);
        
        // Sync active user session
        const session = db.getCurrentUser();
        if (session && session.id === id) {
            const snap = await fdb.collection('users').doc(id).get();
            localStorage.setItem('kaghan_hotel_session', JSON.stringify(snap.data()));
        }
        return true;
    };

    // List system guests (restricted to admin)
    db.getUsers = async () => {
        const snap = await fdb.collection('users').get();
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        return list;
    };

    // Fetch user by UID directly instead of querying all
    db.getUserById = async (uid) => {
        const doc = await fdb.collection('users').doc(uid).get();
        return doc.exists ? doc.data() : null;
    };
})();
