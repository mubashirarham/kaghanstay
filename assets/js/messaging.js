// Kaghan Stay - Real-Time Client & Admin Messaging Engine (Firestore onSnapshot)

(function() {
    'use strict';

    window.KaghanMessaging = {
        // Send a message from guest
        sendGuestMessage: async function(text, extraInfo = {}) {
            const user = KaghanDB.getCurrentUser();
            if (!user || (!user.uid && !user.id)) {
                if (window.KaghanUI) KaghanUI.showToast("Please log in to chat with resort management", "warning");
                return { success: false, reason: 'unauthenticated' };
            }

            const guestUid = user.uid || user.id;
            const guestName = user.name || user.displayName || user.email.split('@')[0];
            const guestEmail = user.email || '';
            const nowIso = new Date().toISOString();
            const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

            try {
                const fdb = firebase.firestore();
                const threadRef = fdb.collection('chats').doc(guestUid);

                // Update thread parent doc
                await threadRef.set({
                    guestId: guestUid,
                    guestName: guestName,
                    guestEmail: guestEmail,
                    lastMessage: text,
                    lastMessageAt: nowIso,
                    lastSender: 'guest',
                    unreadByAdmin: true,
                    unreadByGuest: false,
                    updatedAt: nowIso,
                    ...extraInfo
                }, { merge: true });

                // Push message to subcollection
                await threadRef.collection('messages').doc(msgId).set({
                    id: msgId,
                    senderId: guestUid,
                    senderRole: 'guest',
                    senderName: guestName,
                    text: text,
                    createdAt: nowIso
                });

                return { success: true, msgId };
            } catch (err) {
                console.error("Error sending guest message:", err);
                if (window.KaghanUI) KaghanUI.showToast("Could not send message. Please try again.", "error");
                return { success: false, error: err.message };
            }
        },

        // Send a reply from Admin / Host
        sendAdminReply: async function(guestUid, text) {
            const user = KaghanDB.getCurrentUser();
            const adminUid = user ? (user.uid || user.id) : 'admin';
            const adminName = user ? (user.name || 'Resort Host') : 'Resort Host';
            const nowIso = new Date().toISOString();
            const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

            try {
                const fdb = firebase.firestore();
                const threadRef = fdb.collection('chats').doc(guestUid);

                // Update thread parent doc
                await threadRef.set({
                    lastMessage: text,
                    lastMessageAt: nowIso,
                    lastSender: 'admin',
                    unreadByAdmin: false,
                    unreadByGuest: true,
                    updatedAt: nowIso
                }, { merge: true });

                // Push message to subcollection
                await threadRef.collection('messages').doc(msgId).set({
                    id: msgId,
                    senderId: adminUid,
                    senderRole: 'admin',
                    senderName: adminName,
                    text: text,
                    createdAt: nowIso
                });

                return { success: true, msgId };
            } catch (err) {
                console.error("Error sending admin reply:", err);
                if (window.KaghanUI) KaghanUI.showToast("Failed to send reply.", "error");
                return { success: false, error: err.message };
            }
        },

        // Real-time listener for a single guest's message thread
        subscribeToGuestThread: function(guestUid, onMessagesUpdate, onError) {
            if (!guestUid) return () => {};
            try {
                const fdb = firebase.firestore();
                return fdb.collection('chats').doc(guestUid).collection('messages')
                    .orderBy('createdAt', 'asc')
                    .onSnapshot(snapshot => {
                        const messages = [];
                        snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
                        if (typeof onMessagesUpdate === 'function') {
                            onMessagesUpdate(messages);
                        }
                    }, err => {
                        console.warn("Guest thread real-time listener error:", err);
                        if (typeof onError === 'function') onError(err);
                    });
            } catch (e) {
                console.error("Failed to subscribe to guest thread:", e);
                return () => {};
            }
        },

        // Real-time listener for Admin watching all guest chat threads
        subscribeToAllThreads: function(onThreadsUpdate, onError) {
            try {
                const authUser = firebase.auth().currentUser;
                if (!authUser) {
                    // Auth token loading, wait for authStateChanged
                    const unsubscribeAuth = firebase.auth().onAuthStateChanged(user => {
                        if (user) {
                            unsubscribeAuth();
                            this.subscribeToAllThreads(onThreadsUpdate, onError);
                        }
                    });
                    return () => {};
                }

                const fdb = firebase.firestore();
                return fdb.collection('chats')
                    .orderBy('lastMessageAt', 'desc')
                    .onSnapshot(snapshot => {
                        const threads = [];
                        snapshot.forEach(doc => threads.push({ id: doc.id, ...doc.data() }));
                        if (typeof onThreadsUpdate === 'function') {
                            onThreadsUpdate(threads);
                        }
                    }, err => {
                        if (typeof onError === 'function') onError(err);
                    });
            } catch (e) {
                console.error("Failed to subscribe to all threads:", e);
                return () => {};
            }
        },

        // Mark thread as read by role
        markThreadRead: async function(guestUid, role = 'guest') {
            if (!guestUid) return;
            try {
                const fdb = firebase.firestore();
                const update = role === 'admin' ? { unreadByAdmin: false } : { unreadByGuest: false };
                await fdb.collection('chats').doc(guestUid).update(update);
            } catch (err) {
                // Ignore if doc doesn't exist
            }
        }
    };
})();
