require('dotenv').config();
const FIRESTORE_BASE_URL = 'https://firestore.googleapis.com/v1/projects/kaghan-properties/databases/(default)/documents';

// Fallback Groq API Key provided by user
const FALLBACK_GROQ_KEY = '';

// Helper to convert Firestore REST values to JSON objects
function parseFirestoreValue(value) {
    if (!value) return null;
    if ('stringValue' in value) return value.stringValue;
    if ('integerValue' in value) return parseInt(value.integerValue, 10);
    if ('doubleValue' in value) return parseFloat(value.doubleValue);
    if ('booleanValue' in value) return value.booleanValue;
    if ('arrayValue' in value) {
        return (value.arrayValue.values || []).map(v => parseFirestoreValue(v));
    }
    if ('mapValue' in value) {
        const obj = {};
        const fields = value.mapValue.fields || {};
        for (const k in fields) {
            obj[k] = parseFirestoreValue(fields[k]);
        }
        return obj;
    }
    return null;
}

function parseFirestoreDoc(doc) {
    const fields = doc.fields || {};
    const obj = {};
    for (const key in fields) {
        obj[key] = parseFirestoreValue(fields[key]);
    }
    const parts = doc.name.split('/');
    obj.id = parts[parts.length - 1];
    return obj;
}

// Convert JSON objects to Firestore REST document values
function convertToFirestoreValue(val) {
    if (typeof val === 'string') return { stringValue: val };
    if (typeof val === 'number') {
        if (Number.isInteger(val)) return { integerValue: val.toString() };
        return { doubleValue: val };
    }
    if (typeof val === 'boolean') return { booleanValue: val };
    if (Array.isArray(val)) {
        return { arrayValue: { values: val.map(convertToFirestoreValue) } };
    }
    if (typeof val === 'object' && val !== null) {
        const fields = {};
        for (const k in val) {
            fields[k] = convertToFirestoreValue(val[k]);
        }
        return { mapValue: { fields } };
    }
    return { nullValue: null };
}

function convertToFirestoreDoc(obj) {
    const fields = {};
    for (const key in obj) {
        fields[key] = convertToFirestoreValue(obj[key]);
    }
    return { fields };
}

// Firestore REST calls
async function fetchCollection(collectionName) {
    try {
        const res = await fetch(`${FIRESTORE_BASE_URL}/${collectionName}`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.documents || []).map(doc => parseFirestoreDoc(doc));
    } catch (err) {
        console.error(`Error loading collection ${collectionName}:`, err);
        return [];
    }
}

async function writeDocument(collectionName, docId, obj) {
    const body = convertToFirestoreDoc(obj);
    const res = await fetch(`${FIRESTORE_BASE_URL}/${collectionName}/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Firestore REST write error: ${err}`);
    }
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

async function bookRoomTool(roomId, guestName, guestEmail, guestPhone, checkIn, checkOut, host) {
    // 1. Double check availability
    const avail = await checkAvailabilityTool(roomId, checkIn, checkOut);
    if (!avail.available) {
        return { success: false, error: avail.reason || 'Room is unavailable.' };
    }

    // 2. Fetch room details to compute total cost
    const rooms = await listRoomsTool();
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
        return { success: false, error: 'Room style not found in catalog.' };
    }

    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const nights = Math.max(1, Math.ceil((outDate - inDate) / (1000 * 3600 * 24)));
    const totalPrice = room.price * nights;

    // 3. Create reservation ledger
    const bookingId = 'BK-' + Math.floor(1000 + Math.random() * 9000);
    const newBooking = {
        id: bookingId,
        userId: 'usr-guest-chatbot',
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

    await writeDocument('bookings', bookingId, newBooking);

    // Trigger Email & WhatsApp invoices asynchronously
    try {
        if (host) {
            const scheme = host.includes('localhost') ? 'http' : 'https';
            fetch(`${scheme}://${host}/.netlify/functions/booking-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking: { ...newBooking, roomName: room.name } })
            }).catch(e => console.warn("Chatbot failed to dispatch email receipt:", e));
        }

        if (guestPhone) {
            fetch('http://localhost:3000/send-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: guestPhone,
                    guestName,
                    bookingId,
                    roomName: room.name,
                    checkIn,
                    checkOut,
                    totalPrice
                })
            }).catch(e => console.warn("WhatsApp service offline or unreachable locally:", e));
        }
    } catch (notifierErr) {
        console.error("Chatbot receipts dispatcher error:", notifierErr);
    }

    return {
        success: true,
        bookingId,
        totalPrice,
        nights,
        guestName,
        checkIn,
        checkOut
    };
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
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Use environment variable or fallback provided key
    const API_KEY = process.env.GROQ_API_KEY || FALLBACK_GROQ_KEY;

    try {
        const body = JSON.parse(event.body || '{}');
        let clientMessages = body.messages || [];

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
                        toolResult = await bookRoomTool(args.roomId, args.guestName, args.guestEmail, args.guestPhone, args.checkIn, args.checkOut, requestHost);
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
                'Access-Control-Allow-Origin': '*' // support local widgets testing
            },
            body: JSON.stringify({ response: finalResponseText })
        };

    } catch (error) {
        console.error('[Concierge AI Server Error]:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: error.message })
        };
    }
};
