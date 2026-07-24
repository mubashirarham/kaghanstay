const { fdb, auth, generateBookingId } = require('./_admin-init');

// Helper to load collection via Admin SDK
async function fetchCollection(collectionName) {
    if (!fdb) return [];
    try {
        const snap = await fdb.collection(collectionName).get();
        const list = [];
        snap.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            list.push(data);
        });
        return list;
    } catch (err) {
        console.error(`Error loading collection ${collectionName}:`, err);
        return [];
    }
}

async function writeDocument(collectionName, docId, obj) {
    if (!fdb) throw new Error("Database service unavailable.");
    await fdb.collection(collectionName).doc(docId).set(obj);
    return true;
}

// Concierge Bot Database Tools
async function listRoomsTool(clientRooms) {
    const rooms = (clientRooms && clientRooms.length > 0) ? clientRooms : await fetchCollection('rooms');
    return rooms.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        price: r.price,
        location: r.location || 'Islamabad',
        amenities: r.amenities,
        maxGuests: r.maxGuests,
        rating: r.rating,
        status: r.status
    }));
}

async function checkAvailabilityTool(roomId, checkIn, checkOut) {
    const bookings = await fetchCollection('bookings');
    const searchIn = new Date(checkIn);
    const searchOut = new Date(checkOut);

    if (isNaN(searchIn.getTime()) || isNaN(searchOut.getTime()) || searchIn >= searchOut) {
        return { available: false, error: 'Invalid check-in/check-out dates.' };
    }

    for (const b of bookings) {
        if (b.roomId === roomId && b.status !== 'cancelled') {
            const bIn = new Date(b.checkIn);
            const bOut = new Date(b.checkOut);
            
            // Date overlap checker: (searchIn < bOut) && (searchOut > bIn)
            if (searchIn < bOut && searchOut > bIn) {
                return { available: false, reason: 'Room is occupied/reserved on these dates.' };
            }
        }
    }
    return { available: true };
}

async function bookRoomTool(roomId, guestName, guestEmail, guestPhone, checkIn, checkOut, host, userId) {
    if (!userId) {
        return { success: false, error: 'Authentication required. Please sign in or register to complete bookings via the AI concierge.' };
    }
    const searchIn = new Date(checkIn);
    const searchOut = new Date(checkOut);
    
    if (isNaN(searchIn.getTime()) || isNaN(searchOut.getTime()) || searchIn >= searchOut) {
        return { success: false, error: 'Invalid check-in or check-out dates.' };
    }

    let bookingId = '';
    let totalPrice = 0;
    let roomName = '';

    try {
        await fdb.runTransaction(async (transaction) => {
            // Allocate unique booking ID with collision check
            let allocatedId = generateBookingId();
            let attempts = 0;
            let existingDoc = await transaction.get(fdb.collection('bookings').doc(allocatedId));
            while (existingDoc.exists && attempts < 5) {
                allocatedId = generateBookingId();
                existingDoc = await transaction.get(fdb.collection('bookings').doc(allocatedId));
                attempts++;
            }
            if (existingDoc.exists) {
                throw new Error('Could not allocate a unique booking ID, please retry.');
            }
            bookingId = allocatedId;

            // 1. Fetch Room detail
            const roomRef = fdb.collection('rooms').doc(roomId);
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists) {
                throw new Error('Room style not found in catalog.');
            }
            const room = roomDoc.data();
            roomName = room.name;

            // Compute stay duration
            const stayNights = Math.max(1, Math.ceil((searchOut - searchIn) / (1000 * 3600 * 24)));
            totalPrice = room.price * stayNights;

            // 2. Overlap check inside transaction (M-04)
            const query = fdb.collection('bookings').where('roomId', '==', roomId);
            const bookingsSnap = await query.get();
            for (const doc of bookingsSnap.docs) {
                const b = doc.data();
                if (b.status !== 'cancelled') {
                    const bIn = new Date(b.checkIn);
                    const bOut = new Date(b.checkOut);
                    if (searchIn < bOut && searchOut > bIn) {
                        throw new Error('Room is occupied or reserved on these dates.');
                    }
                }
            }

            // 3. Create Booking
            const newBooking = {
                id: bookingId,
                userId: userId,
                roomId: roomId,
                guestName,
                guestEmail: guestEmail.toLowerCase().trim(),
                guestPhone,
                checkIn,
                checkOut,
                totalPrice,
                status: 'confirmed',
                createdAt: new Date().toISOString()
            };

            const bookingRef = fdb.collection('bookings').doc(bookingId);
            transaction.set(bookingRef, newBooking);
        });

        // Trigger Email & WhatsApp invoices and await them to prevent container freezing (C-04)
        try {
            const dispatches = [];
            const payload = {
                booking: {
                    id: bookingId,
                    guestName,
                    guestEmail,
                    guestPhone,
                    roomId,
                    roomName,
                    checkIn,
                    checkOut,
                    totalPrice
                },
                internalSecret: process.env.INTERNAL_API_SECRET
            };

            if (host) {
                const scheme = host.includes('localhost') ? 'http' : 'https';
                dispatches.push(
                    fetch(`${scheme}://${host}/.netlify/functions/booking-email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    }).then(res => {
                        if (!res.ok) console.error(`Chatbot email function returned status ${res.status}`);
                    }).catch(e => console.warn("Chatbot failed to dispatch email receipt:", e)),

                    fetch(`${scheme}://${host}/.netlify/functions/admin-notify`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    }).then(res => {
                        if (!res.ok) console.error(`Chatbot admin alert function returned status ${res.status}`);
                    }).catch(e => console.warn("Chatbot failed to dispatch admin alert:", e))
                );
            }

            if (guestPhone && process.env.WHATSAPP_API_URL) {
                dispatches.push(
                    fetch(process.env.WHATSAPP_API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            phone: guestPhone,
                            guestName,
                            bookingId,
                            roomName,
                            checkIn,
                            checkOut,
                            totalPrice
                        })
                    }).then(res => {
                        if (!res.ok) console.error(`Chatbot WhatsApp service returned status ${res.status}`);
                    }).catch(e => console.warn("WhatsApp service unreachable:", e))
                );
            }

            if (dispatches.length > 0) {
                await Promise.all(dispatches);
            }
        } catch (notifierErr) {
            console.error("Chatbot receipts dispatcher error:", notifierErr);
        }

        return {
            success: true,
            bookingId,
            totalPrice,
            nights: Math.max(1, Math.ceil((searchOut - searchIn) / (1000 * 3600 * 24))),
            guestName,
            checkIn,
            checkOut
        };

    } catch (txErr) {
        console.error("Chatbot booking transaction failed:", txErr);
        return { success: false, error: txErr.message || 'Failed to make reservation.' };
    }
}

async function readBlogsTool() {
    const blogs = await fetchCollection('blogs');
    const stayBlogs = blogs.filter(b => b.portal === 'stay');
    return stayBlogs.map(b => ({
        title: b.title,
        slug: b.slug,
        excerpt: b.excerpt,
        category: b.category,
        content: b.content
    }));
}

exports.handler = async (event, context) => {
    const origin = event.headers.origin || event.headers.Origin || '';
    let allowedOrigin = 'https://kphstay.com';
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        allowedOrigin = origin;
    }

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const API_KEY = process.env.GROQ_API_KEY;
    if (!API_KEY) {
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': allowedOrigin },
            body: JSON.stringify({ error: 'Concierge bot key configuration missing.' })
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        let clientMessages = body.messages || [];
        const idToken = body.idToken;

        let userId = null;
        if (idToken && auth) {
            try {
                const decodedToken = await auth.verifyIdToken(idToken);
                userId = decodedToken.uid;
            } catch (authErr) {
                console.warn("Chatbot ID token verification failed:", authErr);
            }
        }

        // Format history for Groq messages array (System instruction + conversation logs)
        const systemMessage = {
            role: 'system',
            content: "You are the KPH Stay luxury AI Concierge. You represent KPH Stay, a premium resort and serviced apartment network in Islamabad and Nathia Gali. Your job is to help guests query rooms, check availability, answer local guide questions based on our blogs, and book reservations.\n\nBe extremely polite, formal, helpful, and use hotel concierge language (e.g. 'My pleasure', 'Certainly, sir/ma'am', 'How may I assist you with your stay today?').\n\nUse the tools provided to query the live database when asked about rooms, pricing, blog posts, availability, or making bookings. Do not make up answers about rooms, prices, or booking confirmations; always use tools to fetch this info or execute the reservation. Always present rates in PKR."
        };

        // Align roles and messages
        let messages = [
            systemMessage,
            ...clientMessages.map(m => ({
                role: m.role === 'assistant' ? 'assistant' : m.role,
                content: m.content || null,
                tool_calls: m.tool_calls || undefined,
                tool_call_id: m.tool_call_id || undefined,
                name: m.name || undefined
            }))
        ];

        let loop = true;
        let finalResponseText = '';
        let loopCounter = 0;
        const maxLoops = 5;

        while (loop && loopCounter < maxLoops) {
            loopCounter++;

            const groqBody = {
                model: 'llama-3.3-70b-versatile',
                messages: messages,
                tools: [
                    {
                        type: 'function',
                        function: {
                            name: 'list_rooms',
                            description: 'Retrieve the live list of all suites, rooms, and serviced apartments at KPH Stay with their rates, location, amenities, rating, capacity, and status.'
                        }
                    },
                    {
                        type: 'function',
                        function: {
                            name: 'check_availability',
                            description: 'Verify if a room style is available for reservation between check-in and check-out dates.',
                            parameters: {
                                type: 'object',
                                properties: {
                                    roomId: { type: 'string', description: 'The unique ID of the room style.' },
                                    checkIn: { type: 'string', description: 'Check-in date in YYYY-MM-DD format.' },
                                    checkOut: { type: 'string', description: 'Check-out date in YYYY-MM-DD format.' }
                                },
                                required: ['roomId', 'checkIn', 'checkOut']
                            }
                        }
                    },
                    {
                        type: 'function',
                        function: {
                            name: 'book_room',
                            description: 'Reserve a specific room style for a guest by writing the booking ledger to Firestore.',
                            parameters: {
                                type: 'object',
                                properties: {
                                    roomId: { type: 'string', description: 'The ID of the room style to reserve.' },
                                    guestName: { type: 'string', description: 'Full name of the reserving guest.' },
                                    guestEmail: { type: 'string', description: 'Email address of the guest.' },
                                    guestPhone: { type: 'string', description: 'Contact phone number of the guest.' },
                                    checkIn: { type: 'string', description: 'Check-in date in YYYY-MM-DD format.' },
                                    checkOut: { type: 'string', description: 'Check-out date in YYYY-MM-DD format.' }
                                },
                                required: ['roomId', 'guestName', 'guestEmail', 'guestPhone', 'checkIn', 'checkOut']
                            }
                        }
                    },
                    {
                        type: 'function',
                        function: {
                            name: 'read_blogs',
                            description: 'Read local travel guides, hiking trail maps, and spa packages adjacent to KPH Stay.'
                        }
                    }
                ]
            };

            const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify(groqBody)
            });

            if (!groqRes.ok) {
                const errText = await groqRes.text();
                throw new Error(`Groq API call failed: ${errText}`);
            }

            const data = await groqRes.json();
            const choice = data.choices && data.choices[0];
            const modelMessage = choice && choice.message;

            if (!modelMessage) {
                throw new Error('Groq API returned an empty output choice.');
            }

            // Append model's response history
            messages.push(modelMessage);

            if (modelMessage.tool_calls && modelMessage.tool_calls.length > 0) {
                const toolCall = modelMessage.tool_calls[0];
                const toolName = toolCall.function.name;
                
                let args = {};
                try {
                    args = JSON.parse(toolCall.function.arguments || '{}');
                } catch (e) {
                    console.warn("Error parsing tool call arguments:", e);
                }

                console.log(`[Groq Concierge Tool Call] Executing: ${toolName}`, args);

                let toolResult = null;
                try {
                    if (toolName === 'list_rooms') {
                        toolResult = await listRoomsTool(body.rooms);
                    } else if (toolName === 'check_availability') {
                        toolResult = await checkAvailabilityTool(args.roomId, args.checkIn, args.checkOut);
                    } else if (toolName === 'book_room') {
                        const requestHost = event.headers.host || 'kphstay.com';
                        toolResult = await bookRoomTool(args.roomId, args.guestName, args.guestEmail, args.guestPhone, args.checkIn, args.checkOut, requestHost, userId);
                    } else if (toolName === 'read_blogs') {
                        toolResult = await readBlogsTool();
                    } else {
                        toolResult = { error: `Tool ${toolName} is not recognized.` };
                    }
                } catch (tErr) {
                    console.error(`Tool execution error for ${toolName}:`, tErr);
                    toolResult = { error: tErr.message };
                }

                // Append tool execution response to conversation logs
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolName,
                    content: JSON.stringify(toolResult)
                });

                // Continue loop to feed function outcome back into Llama 3
            } else {
                finalResponseText = modelMessage.content || 'I apologize, I could not formulate a response at this moment. How may I assist you with your booking?';
                loop = false;
            }
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': allowedOrigin
            },
            body: JSON.stringify({ response: finalResponseText })
        };

    } catch (error) {
        console.error('[Concierge AI Server Error]:', error);
        return {
            statusCode: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': allowedOrigin
            },
            body: JSON.stringify({ error: 'An internal error occurred in the concierge service.' })
        };
    }
};
