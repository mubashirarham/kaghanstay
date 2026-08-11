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
    
    // Robust Login procedure with Auth & Firestore Sync Fallback
    db.login = async (email, password) => {
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanPassword = (password || '').trim();

        if (!cleanEmail || !cleanPassword) {
            return { success: false, message: 'Please enter both email address and password.' };
        }

        try {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            }

            // Try standard Firebase Auth sign in
            try {
                const userCredential = await firebase.auth().signInWithEmailAndPassword(cleanEmail, cleanPassword);
                const firebaseUser = userCredential.user;
                
                // Get user profile from Firestore using uid or email
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

                // Sync password field in Firestore document
                if (userData.password !== cleanPassword) {
                    userData.password = cleanPassword;
                    await fdb.collection('users').doc(userData.id || userData.uid || firebaseUser.uid).set({ password: cleanPassword }, { merge: true });
                }

                localStorage.setItem('kaghan_hotel_session', JSON.stringify(userData));
                return { success: true, user: userData };

            } catch (authErr) {
                console.warn("Firebase Auth sign-in warning:", authErr.code || authErr.message);

                // Fallback check against Firestore users database if password was updated by Admin
                const snap = await fdb.collection('users').where('email', '==', cleanEmail).limit(1).get();
                if (!snap.empty) {
                    const userData = snap.docs[0].data();

                    if (userData && userData.password && userData.password === cleanPassword) {
                        // Password matches Firestore! Auto-sync Firebase Auth credential if possible
                        try {
                            const newAuth = await firebase.auth().createUserWithEmailAndPassword(cleanEmail, cleanPassword);
                            if (newAuth && newAuth.user) {
                                userData.uid = newAuth.user.uid;
                                await fdb.collection('users').doc(snap.docs[0].id).set({ uid: newAuth.user.uid }, { merge: true });
                            }
                        } catch (cErr) {
                            console.warn("Auth user creation on fallback:", cErr.message);
                        }

                        localStorage.setItem('kaghan_hotel_session', JSON.stringify(userData));
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
    };

    // Registration procedure via Netlify Serverless API (Turnstile CAPTCHA & Email Verification guarded)
    db.register = async (name, email, password, phone = '', turnstileToken = '') => {
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
                message: data.message || 'Account created! Please check your email inbox to verify your account.',
                requiresVerification: true
            };
        } catch (err) {
            console.error("Registration API error:", err);
            return { success: false, message: err.message || 'Registration failed. Please check your network connection.' };
        }
    };

    // Email Token Verification procedure
    db.verifyEmailToken = async (token) => {
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
                localStorage.setItem('kaghan_hotel_session', JSON.stringify(data.user));
            }
            return { success: true, message: data.message, user: data.user };
        } catch (err) {
            console.error("Verification error:", err);
            return { success: false, message: err.message || 'Verification failed.' };
        }
    };

    // Email OTP Verification procedure (2-Step In-Form Verification)
    db.verifyEmailOTP = async (email, otp) => {
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
                localStorage.setItem('kaghan_hotel_session', JSON.stringify(data.user));
            }
            return { success: true, message: data.message, user: data.user };
        } catch (err) {
            console.error("OTP verification error:", err);
            return { success: false, message: err.message || 'OTP verification failed.' };
        }
    };

    // Password reset email request directly via Firebase Auth
    db.sendPasswordResetEmail = async (email) => {
        try {
            if (!email || !email.includes('@')) {
                return { success: false, message: "Please provide a valid email address." };
            }
            if (typeof firebase !== 'undefined' && firebase.auth) {
                await firebase.auth().sendPasswordResetEmail(email.trim());
                return { success: true, message: "Password reset email sent! Please check your inbox." };
            }
            return { success: false, message: "Authentication service unavailable." };
        } catch (err) {
            console.error("Password reset email error:", err);
            return { success: false, message: err.message || "Failed to send password reset email." };
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
        const isAdminStaff = ['admin', 'moderator', 'editor'].includes(user.role);

        if (requiredRole === 'admin' && !isAdminStaff) {
            window.location.href = '../user/index.html';
            return false;
        }
        if (requiredRole === 'user' && isAdminStaff) {
            window.location.href = '../admin/index.html';
            return false;
        }
        return true;
    };

    // Profile updates
    db.updateUser = async (id, updatedData) => {
        delete updatedData.password;
        delete updatedData.role;
        delete updatedData.loyaltyPoints;
        await fdb.collection('users').doc(id).update(updatedData);
        
        const currentUser = db.getCurrentUser();
        if (currentUser && (currentUser.id === id || currentUser.uid === id)) {
            const mergedUser = { ...currentUser, ...updatedData };
            localStorage.setItem('kaghan_hotel_session', JSON.stringify(mergedUser));
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

    // Admin updates user role, profile details, and assigned permissions
    db.adminUpdateUser = async (id, data) => {
        delete data.password;
        await fdb.collection('users').doc(id).set(data, { merge: true });
        
        const currentUser = db.getCurrentUser();
        if (currentUser && (currentUser.id === id || currentUser.uid === id)) {
            const mergedUser = { ...currentUser, ...data };
            localStorage.setItem('kaghan_hotel_session', JSON.stringify(mergedUser));
        }
        return true;
    };

    // Permanently delete user profile from database (Strict Manual Admin Action Only)
    db.deleteUser = async (userId) => {
        if (!userId || typeof userId !== 'string' || !userId.trim()) {
            console.warn("deleteUser safety abort: invalid or missing userId.");
            return false;
        }

        const cleanId = userId.trim();
        const currentUser = db.getCurrentUser();

        // Safety Guard: Require logged in admin/staff session with manage_guests permission
        if (!currentUser || !['admin', 'moderator'].includes(currentUser.role)) {
            console.warn("deleteUser safety abort: caller does not have administrative permission.");
            return false;
        }

        try {
            await fdb.collection('users').doc(cleanId).delete();
            if (window.KaghanDB_Cache && window.KaghanDB_Cache.users) {
                window.KaghanDB_Cache.users = window.KaghanDB_Cache.users.filter(u => u.id !== cleanId && u.uid !== cleanId);
            }
            return true;
        } catch (err) {
            console.error("deleteUser error:", err);
            return false;
        }
    };
})();
