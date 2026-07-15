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
            if (typeof firebase !== 'undefined' && firebase.auth) {
                await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            }
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
            if (typeof firebase !== 'undefined' && firebase.auth) {
                await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            }
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const firebaseUser = userCredential.user;
            const idToken = await firebaseUser.getIdToken();
            
            const res = await window.safeFetch('/.netlify/functions/register-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, idToken })
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create profile.');
            }
            
            const data = await res.json();
            localStorage.setItem('kaghan_hotel_session', JSON.stringify(data.user));
            return { success: true, user: data.user };
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
            } else {
                alert("Your session has expired. Redirecting to login...");
            }
            setTimeout(() => {
                const currentPath = window.location.pathname;
                if (currentPath.includes('/admin/') || currentPath.includes('/user/')) {
                    window.location.href = '../login.html';
                } else {
                    window.location.href = 'login.html';
                }
            }, 1500);
            throw new Error("Session expired. Please log in again.");
        }
        
        const res = await window.safeFetch('/.netlify/functions/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, updatedData, idToken })
        });
        
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to update profile.');
        }
        
        const data = await res.json();
        // Sync active user session
        localStorage.setItem('kaghan_hotel_session', JSON.stringify(data.user));
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
