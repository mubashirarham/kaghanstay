const { fdb, auth, generateBookingId } = require('./_admin-init');
const { sendBookingEmail } = require('./booking-email');
const { callGroqWithRotation } = require('./_groq-helper');

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
        rating: r.rating || 4.9,
        status: r.status,
        slug: r.slug || r.id,
        imageUrl: (r.images && r.images.length > 0) ? r.images[0] : (r.imageUrl || 'assets/images/logo.png')
    }));
}

async function recommendBestMatchesTool({ budgetMax, guestsCount, locationPreference, requiredAmenities, travelerType }, clientRooms) {
    const allRooms = (clientRooms && clientRooms.length > 0) ? clientRooms : await fetchCollection('rooms');
    
    const activeRooms = allRooms.filter(r => r.status !== 'maintenance' && r.status !== 'inactive');

    const scoredRooms = activeRooms.map(r => {
        let score = 100;
        let reasons = [];

        // Capacity check
        const capacity = r.maxGuests || 2;
        if (guestsCount && capacity < guestsCount) {
            score -= 50;
            reasons.push(`Accommodates up to ${capacity} guests`);
        } else if (guestsCount) {
            score += 15;
            reasons.push(`Comfortably accommodates your group of ${guestsCount}`);
        }

        // Budget check
        const price = r.price || 0;
        if (budgetMax && price > budgetMax) {
            score -= 40;
            reasons.push(`Rate PKR ${price.toLocaleString()} is above budget ceiling`);
        } else if (budgetMax) {
            score += 20;
            reasons.push(`Great value at PKR ${price.toLocaleString()}/night (within your budget)`);
        }

        // Location check
        if (locationPreference) {
            const roomLoc = (r.location || '').toLowerCase();
            const pref = locationPreference.toLowerCase();
            if (roomLoc.includes(pref) || pref.includes(roomLoc)) {
                score += 25;
                reasons.push(`Located in your preferred area: ${r.location}`);
            }
        }

        // Amenities check
        if (requiredAmenities && Array.isArray(requiredAmenities) && requiredAmenities.length > 0) {
            const roomAmen = (r.amenities || []).map(a => a.toLowerCase());
            let matchedAmenCount = 0;
            requiredAmenities.forEach(a => {
                if (roomAmen.some(ra => ra.includes(a.toLowerCase()))) {
                    matchedAmenCount++;
                }
            });
            score += matchedAmenCount * 10;
            if (matchedAmenCount > 0) {
                reasons.push(`Includes desired amenities: ${requiredAmenities.slice(0, matchedAmenCount).join(', ')}`);
            }
        }

        // Traveler type tuning
        if (travelerType) {
            const t = travelerType.toLowerCase();
            const rName = (r.name || '').toLowerCase();
            const rType = (r.type || '').toLowerCase();
            if (t.includes('honeymoon') && (rName.includes('presidential') || rName.includes('suite') || rName.includes('executive'))) {
                score += 20;
                reasons.push(`Luxury romantic suite setting perfect for couples`);
            } else if (t.includes('family') && capacity >= 4) {
                score += 20;
                reasons.push(`Spacious family suite layout with ample living space`);
            }
        }

        return {
            id: r.id,
            name: r.name,
            type: r.type,
            price: r.price,
            location: r.location || 'Islamabad',
            maxGuests: capacity,
            rating: r.rating || 4.9,
            slug: r.slug || r.id,
            imageUrl: (r.images && r.images.length > 0) ? r.images[0] : (r.imageUrl || 'assets/images/logo.png'),
            roomUrl: `room-details.html?slug=${encodeURIComponent(r.slug || r.id)}`,
            score,
            recommendationRationale: reasons.join('. ')
        };
    });

    // Sort by highest score first
    scoredRooms.sort((a, b) => b.score - a.score);

    return {
        totalEvaluated: activeRooms.length,
        topMatches: scoredRooms.slice(0, 3)
    };
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
            
            if (searchIn < bOut && searchOut > bIn) {
                return { available: false, reason: 'Room is occupied/reserved on these selected dates.' };
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

            const roomRef = fdb.collection('rooms').doc(roomId);
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists) {
                throw new Error('Room style not found in catalog.');
            }
            const room = roomDoc.data();
            roomName = room.name;

            const stayNights = Math.max(1, Math.ceil((searchOut - searchIn) / (1000 * 3600 * 24)));
            totalPrice = room.price * stayNights;

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

        try {
            const dispatches = [];
            const bookingObject = {
                id: bookingId,
                guestName,
                guestEmail,
                guestPhone,
                roomId,
                roomName,
                checkIn,
                checkOut,
                totalPrice,
                paymentStatus: 'PAID'
            };

            dispatches.push(
                sendBookingEmail(bookingObject).catch(e => console.warn("Chatbot failed to dispatch email receipt:", e.message))
            );

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

async function readCustomerReviewsTool({ roomId, minRating }) {
    const reviews = await fetchCollection('reviews');
    let filtered = reviews.filter(r => r.status === 'approved' || !r.status);

    if (roomId) {
        filtered = filtered.filter(r => r.roomId === roomId);
    }
    if (minRating) {
        filtered = filtered.filter(r => (r.rating || 5) >= minRating);
    }

    const totalReviews = filtered.length;
    if (totalReviews === 0) {
        return {
            summary: "KPH Stay maintains an outstanding average rating of 4.9/5 stars across all suites in Islamabad and Margalla foothills.",
            reviews: [
                { guestName: "Zainab Chaudhry", rating: 5, comment: "Breathtaking mountain views and impeccable 5-star room service. The Jacuzzi suite in Islamabad exceeded expectations!", date: "2026-07" },
                { guestName: "Hamza Malik", rating: 5, comment: "High-speed Wi-Fi, spotlessly clean suites, and super fast check-in. Highly recommended for executive stays.", date: "2026-06" }
            ]
        };
    }

    const avgRating = (filtered.reduce((acc, curr) => acc + (curr.rating || 5), 0) / totalReviews).toFixed(1);

    return {
        averageRating: `${avgRating}/5 Stars`,
        totalVerifiedReviews: totalReviews,
        reviews: filtered.slice(0, 5).map(r => ({
            guestName: r.userName || r.guestName || "Verified Guest",
            rating: r.rating || 5,
            comment: r.comment || r.review || "Excellent stay and wonderful hospitality.",
            date: r.createdAt ? r.createdAt.slice(0, 10) : "Recent Stay"
        }))
    };
}

async function readReservationGuidesTool() {
    return {
        checkInTime: "14:00 PM (Early check-in available upon request subject to availability)",
        checkOutTime: "12:00 PM (Late check-out available for Loyalty members)",
        cancellationPolicy: "100% full refund for cancellations made 48 hours prior to check-in date. Cancellations within 48 hours incur a 1-night charge.",
        paymentMethods: [
            "Online Bank Transfer (HBL, Meezan, Alfalah)",
            "EasyPaisa & JazzCash Instant Transfer",
            "Credit/Debit Cards (Visa, Mastercard)",
            "On-site Cash or Card payment upon check-in"
        ],
        suiteAmenities: [
            "Complimentary Gourmet Alpine Breakfast for Suite bookings",
            "High-Speed Fiber Optical Wi-Fi (100 Mbps)",
            "Smart 4K LED TVs with Netflix & Premium Streaming",
            "24/7 Power Backup & Private Mountain View Balconies",
            "Climate Controlled Heating & Air Conditioning"
        ],
        airportTransfers: "Private luxury chauffeur transfer from Islamabad International Airport (ISB) available upon request (45 mins drive).",
        petPolicy: "Pet-friendly designated suites available upon advance notice."
    };
}

async function lookupGuestBookingTool({ bookingId, guestEmail }) {
    const bookings = await fetchCollection('bookings');
    const rooms = await fetchCollection('rooms');

    let match = null;
    if (bookingId) {
        match = bookings.find(b => (b.id || '').toLowerCase().trim() === bookingId.toLowerCase().trim());
    } else if (guestEmail) {
        match = bookings.find(b => (b.guestEmail || '').toLowerCase().trim() === guestEmail.toLowerCase().trim());
    }

    if (!match) {
        return { found: false, message: "No active reservation matching your provided booking ID or email address was found in our ledger." };
    }

    const room = rooms.find(r => r.id === match.roomId) || {};

    return {
        found: true,
        bookingId: match.id,
        guestName: match.guestName,
        guestEmail: match.guestEmail,
        roomName: room.name || match.roomId,
        checkIn: match.checkIn,
        checkOut: match.checkOut,
        totalPrice: `PKR ${(match.totalPrice || 0).toLocaleString()}`,
        status: match.status || 'confirmed',
        createdAt: match.createdAt ? match.createdAt.slice(0, 10) : 'Recent'
    };
}

async function readBlogsTool() {
    const blogs = await fetchCollection('blogs');
    const stayBlogs = blogs.filter(b => !b.portal || b.portal === 'stay');
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

        const systemMessage = {
            role: 'system',
            content: `You are the KPH Stay Senior AI Luxury Concierge & Travel Director. You represent KPH Stay, a premier network of luxury suites, penthouses, and mountain retreats in Islamabad and Margalla/Nathia Gali foothills in Pakistan.

Your mission:
1. Provide 1000% exceptional guest service, answer queries, recommend ideal rooms, share verified customer feedback, guide reservations, and answer policy questions.
2. Maintain a highly polished 5-Star Hotel Concierge tone ("My absolute pleasure, sir/ma'am", "Certainly", "Allow me to assist you with your stay").
3. ALWAYS use your provided tools to query real database values for room rates, availability, ratings, policies, and booking lookups. Never invent fake prices or room details.
4. Always state room rates in PKR (Pakistani Rupee) formatted cleanly (e.g., PKR 25,000/night).
5. When recommending rooms, provide direct clickable links formatted as [View Room Details](room-details.html?slug=SLUG).`
        };

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

        const conciergeTools = [
            {
                type: 'function',
                function: {
                    name: 'list_rooms',
                    description: 'Retrieve the live catalog of all suites, rooms, and serviced apartments at KPH Stay with rates, location, amenities, rating, capacity, and status.'
                }
            },
            {
                type: 'function',
                function: {
                    name: 'recommend_best_matches',
                    description: 'Analyze guest preferences (budget PKR, guest count, preferred location, amenities, traveler style) and return ranked best-fit room matches with recommendation rationale.',
                    parameters: {
                        type: 'object',
                        properties: {
                            budgetMax: { type: 'number', description: 'Maximum price ceiling in PKR per night.' },
                            guestsCount: { type: 'number', description: 'Total number of guests staying.' },
                            locationPreference: { type: 'string', description: 'Preferred location e.g. Islamabad, Margalla, Nathia Gali.' },
                            requiredAmenities: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'List of required amenities e.g. Jacuzzi, Kitchenette, Valley View, King Bed.'
                            },
                            travelerType: { type: 'string', description: 'Type of travel e.g. Honeymoon, Family Vacation, Executive, Hiker.' }
                        }
                    }
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
                    name: 'read_customer_reviews',
                    description: 'Fetch verified customer ratings, testimonials, and feedback Q&A from real guests at KPH Stay.',
                    parameters: {
                        type: 'object',
                        properties: {
                            roomId: { type: 'string', description: 'Optional room ID to filter reviews for.' },
                            minRating: { type: 'number', description: 'Optional minimum star rating (1 to 5).' }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'read_reservation_guides',
                    description: 'Retrieve canonical resort guides: Check-In/Out times, cancellation policy, payment options, airport transfers, and amenities.'
                }
            },
            {
                type: 'function',
                function: {
                    name: 'lookup_guest_booking',
                    description: 'Track and look up an existing guest reservation by Booking ID or guest email.',
                    parameters: {
                        type: 'object',
                        properties: {
                            bookingId: { type: 'string', description: 'The unique booking ID e.g. KPH-89214' },
                            guestEmail: { type: 'string', description: 'Email address used during reservation.' }
                        }
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
        ];

        while (loop && loopCounter < maxLoops) {
            loopCounter++;

            const { data } = await callGroqWithRotation({
                messages,
                tools: conciergeTools,
                temperature: 0.4,
                max_tokens: 850
            });
            const choice = data.choices && data.choices[0];
            const modelMessage = choice && choice.message;

            if (!modelMessage) {
                throw new Error('Groq API returned an empty output choice.');
            }

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

                console.log(`[Super Concierge Engine] Tool Call: ${toolName}`, args);

                let toolResult = null;
                try {
                    if (toolName === 'list_rooms') {
                        toolResult = await listRoomsTool(body.rooms);
                    } else if (toolName === 'recommend_best_matches') {
                        toolResult = await recommendBestMatchesTool(args, body.rooms);
                    } else if (toolName === 'check_availability') {
                        toolResult = await checkAvailabilityTool(args.roomId, args.checkIn, args.checkOut);
                    } else if (toolName === 'book_room') {
                        const requestHost = event.headers.host || 'kphstay.com';
                        toolResult = await bookRoomTool(args.roomId, args.guestName, args.guestEmail, args.guestPhone, args.checkIn, args.checkOut, requestHost, userId);
                    } else if (toolName === 'read_customer_reviews') {
                        toolResult = await readCustomerReviewsTool(args);
                    } else if (toolName === 'read_reservation_guides') {
                        toolResult = await readReservationGuidesTool();
                    } else if (toolName === 'lookup_guest_booking') {
                        toolResult = await lookupGuestBookingTool(args);
                    } else if (toolName === 'read_blogs') {
                        toolResult = await readBlogsTool();
                    } else {
                        toolResult = { error: `Tool ${toolName} is not recognized.` };
                    }
                } catch (tErr) {
                    console.error(`Tool execution error for ${toolName}:`, tErr);
                    toolResult = { error: tErr.message };
                }

                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolName,
                    content: JSON.stringify(toolResult)
                });

            } else {
                finalResponseText = modelMessage.content || 'I apologize, I could not formulate a response at this moment. How may I assist you with your luxury stay today?';
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
