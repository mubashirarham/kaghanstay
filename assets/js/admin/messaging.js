// Kaghan Stay - Admin Messaging Center Controller (Real-Time Host Chat)

(function() {
    'use strict';

    let activeGuestUid = null;
    let threadsListenerUnsub = null;
    let messagesListenerUnsub = null;

    window.AdminMessagingModule = {
        init: function() {
            this.bindThreadListener();
            this.bindReplyForm();
        },

        bindThreadListener: function() {
            if (threadsListenerUnsub) threadsListenerUnsub();

            const container = document.getElementById('admin-threads-list');
            const emptyState = document.getElementById('admin-threads-empty-state');
            const unreadBadge = document.getElementById('admin-unread-messages-count');

            threadsListenerUnsub = KaghanMessaging.subscribeToAllThreads(threads => {
                let unreadCount = 0;
                threads.forEach(t => {
                    if (t.unreadByAdmin) unreadCount++;
                });

                if (unreadBadge) {
                    if (unreadCount > 0) {
                        unreadBadge.textContent = unreadCount;
                        unreadBadge.classList.remove('hidden');
                    } else {
                        unreadBadge.classList.add('hidden');
                    }
                }

                if (!container) return;

                if (!threads || threads.length === 0) {
                    container.innerHTML = '';
                    if (emptyState) emptyState.classList.remove('hidden');
                    return;
                }

                if (emptyState) emptyState.classList.add('hidden');

                container.innerHTML = threads.map(t => {
                    const isSelected = t.guestId === activeGuestUid;
                    const initial = (t.guestName || 'G').charAt(0).toUpperCase();

                    return `
                        <div onclick="AdminMessagingModule.selectThread('${t.guestId}')" class="p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                            isSelected 
                            ? 'bg-[#0B0F19] text-white border-[#C5A059] shadow-md' 
                            : 'bg-white text-slate-800 border-slate-100 hover:border-slate-300'
                        }">
                            <div class="relative shrink-0">
                                <div class="w-10 h-10 rounded-full ${isSelected ? 'bg-[#C5A059] text-white' : 'bg-slate-100 text-slate-700'} flex items-center justify-center font-bold text-sm">
                                    ${KaghanSafe.escapeHTML(initial)}
                                </div>
                                ${t.unreadByAdmin ? '<span class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-white"></span>' : ''}
                            </div>
                            <div class="flex-grow min-w-0">
                                <div class="flex justify-between items-center mb-0.5">
                                    <h4 class="font-bold text-xs truncate ${isSelected ? 'text-white' : 'text-slate-900'}">${KaghanSafe.escapeHTML(t.guestName || 'Guest')}</h4>
                                    <span class="text-[9px] ${isSelected ? 'text-slate-400' : 'text-slate-400'} shrink-0">${KaghanUI.formatDate(t.lastMessageAt || new Date())}</span>
                                </div>
                                <p class="text-[11px] truncate ${t.unreadByAdmin ? 'font-bold text-[#C5A059]' : (isSelected ? 'text-slate-300' : 'text-slate-500')}">
                                    ${t.lastSender === 'admin' ? '<i class="fa-solid fa-reply text-[9px] mr-1"></i>You: ' : ''}${KaghanSafe.escapeHTML(t.lastMessage || 'Started conversation')}
                                </p>
                            </div>
                        </div>
                    `;
                }).join('');

                // Auto select first thread if none selected
                if (!activeGuestUid && threads.length > 0) {
                    this.selectThread(threads[0].guestId);
                }
            }, err => {
                console.warn("Admin threads stream error:", err);
            });
        },

        selectThread: async function(guestUid) {
            activeGuestUid = guestUid;
            KaghanMessaging.markThreadRead(guestUid, 'admin');

            const placeholder = document.getElementById('admin-chat-placeholder');
            const activeView = document.getElementById('admin-chat-active-view');
            if (placeholder) placeholder.classList.add('hidden');
            if (activeView) activeView.classList.remove('hidden');

            // Fetch guest info
            try {
                const userDoc = await firebase.firestore().collection('chats').doc(guestUid).get();
                if (userDoc.exists) {
                    const data = userDoc.data();
                    const nameEl = document.getElementById('admin-active-guest-name');
                    const emailEl = document.getElementById('admin-active-guest-email');
                    if (nameEl) nameEl.textContent = data.guestName || 'Guest Conversation';
                    if (emailEl) emailEl.textContent = data.guestEmail || guestUid;
                }
            } catch (e) {}

            // Bind real-time messages listener
            if (messagesListenerUnsub) messagesListenerUnsub();

            const streamContainer = document.getElementById('admin-messages-stream');
            if (!streamContainer) return;

            messagesListenerUnsub = KaghanMessaging.subscribeToGuestThread(guestUid, messages => {
                if (!messages || messages.length === 0) {
                    streamContainer.innerHTML = `<div class="text-center text-xs text-slate-400 py-10 font-light">No messages in this conversation yet.</div>`;
                    return;
                }

                streamContainer.innerHTML = messages.map(m => {
                    const isAdmin = m.senderRole === 'admin';

                    return `
                        <div class="flex flex-col ${isAdmin ? 'items-end' : 'items-start'} space-y-1">
                            <div class="max-w-[75%] p-3.5 rounded-2xl text-xs ${
                                isAdmin 
                                ? 'bg-[#0B0F19] text-white rounded-br-none shadow-sm' 
                                : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/60'
                            }">
                                <div class="font-bold text-[10px] ${isAdmin ? 'text-[#C5A059]' : 'text-slate-500'} mb-1 flex items-center gap-1.5">
                                    <span>${KaghanSafe.escapeHTML(m.senderName || (isAdmin ? 'Resort Host' : 'Guest'))}</span>
                                </div>
                                <p class="leading-relaxed whitespace-pre-wrap">${KaghanSafe.escapeHTML(m.text)}</p>
                            </div>
                            <span class="text-[9px] text-slate-400 font-medium px-1">${KaghanUI.formatDate(m.createdAt || new Date())}</span>
                        </div>
                    `;
                }).join('');

                // Auto scroll to bottom
                streamContainer.scrollTop = streamContainer.scrollHeight;
            });
        },

        bindReplyForm: function() {
            const form = document.getElementById('admin-chat-reply-form');
            if (!form) return;

            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);

            newForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!activeGuestUid) {
                    if (window.KaghanUI) KaghanUI.showToast("Please select a guest conversation to reply.", "warning");
                    return;
                }

                const input = document.getElementById('admin-chat-input');
                const text = input ? input.value.trim() : '';

                if (!text) return;

                input.value = '';
                await KaghanMessaging.sendAdminReply(activeGuestUid, text);
            });
        }
    };
})();
