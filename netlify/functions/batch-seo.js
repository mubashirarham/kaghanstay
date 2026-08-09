const fetch = require('node-fetch');
const { fdb, auth, initError, resolveIsAdmin } = require('./_admin-init');

function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
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

    if (!fdb || !auth) {
        console.error('[batch-seo] Firebase Admin not ready:', initError && initError.message);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': allowedOrigin },
            body: JSON.stringify({ error: 'Database service unavailable.' })
        };
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        console.error("[batch-seo] GROQ_API_KEY missing.");
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': allowedOrigin },
            body: JSON.stringify({ error: 'AI API Key is unconfigured.' })
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { idToken } = body;
        if (!idToken) {
            return {
                statusCode: 401,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                body: JSON.stringify({ error: 'ID Token required.' })
            };
        }

        // Verify Firebase Admin ID token
        let decodedToken;
        try {
            decodedToken = await auth.verifyIdToken(idToken);
        } catch (e) {
            return {
                statusCode: 401,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                body: JSON.stringify({ error: 'Unauthorized ID Token.' })
            };
        }

        const isAdmin = await resolveIsAdmin(decodedToken, fdb);
        if (!isAdmin) {
            return {
                statusCode: 403,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin },
                body: JSON.stringify({ error: 'Forbidden: Admin access required.' })
            };
        }

        // Fetch all rooms from Firestore
        const snap = await fdb.collection('rooms').get();
        if (snap.empty) {
            return {
                statusCode: 200,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'No rooms found to process.', total: 0, updated: 0 })
            };
        }

        const updatedRooms = [];
        const errors = [];

        for (const doc of snap.docs) {
            const room = doc.data();
            const id = room.id || doc.id;
            const name = room.name;

            if (!name) continue;

            const prompt = `Perform an in-depth Search Data & Intent Analysis and generate search engine optimized metadata for the following luxury listing at KPH Stay in Pakistan:
- Listing Name: ${name}
- Category / Type: ${room.type || 'Luxury Apartment'}
- Location / City: ${room.location || 'Islamabad'}
- Nightly Rate (PKR): ${room.price || 'N/A'}
- Amenities: ${Array.isArray(room.amenities) ? room.amenities.join(', ') : (room.amenities || 'High-Speed Wi-Fi, 24/7 Security')}
- Description Overview: ${room.description ? room.description.replace(/<[^>]*>?/gm, '').slice(0, 300) : 'Luxury serviced accommodation.'}

Instructions:
Act as an Elite Hospitality SEO Strategist & Search Data Analyst. Return strictly a valid JSON object with:
1. "seoTitle": Brand-aligned title string strictly between 50 and 60 characters ending with "| KPH Stay".
2. "seoDescription": Compelling meta description string strictly between 140 and 160 characters.
3. "seoKeywords": Comma-separated string of 5-7 target focus & LSI search keywords.
4. "slug": Clean, lowercase, hyphenated URL-friendly slug based on listing name and location.`;

            try {
                const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        response_format: { type: 'json_object' },
                        messages: [
                            {
                                role: 'system',
                                content: 'You are an Elite Technical SEO Strategist and Search Data Analyst specializing in luxury real estate & travel in Pakistan. Output strictly valid JSON.'
                            },
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        temperature: 0.4,
                        max_tokens: 400
                    })
                });

                if (!groqRes.ok) {
                    throw new Error(`Groq API returned HTTP status ${groqRes.status}`);
                }

                const groqData = await groqRes.json();
                const content = groqData.choices && groqData.choices[0] && groqData.choices[0].message && groqData.choices[0].message.content;
                const parsed = JSON.parse(content || '{}');

                const seoTitle = parsed.seoTitle || `${name} in ${room.location || 'Islamabad'} | KPH Stay`;
                const seoDescription = parsed.seoDescription || `Reserve ${name} at KPH Stay in ${room.location || 'Islamabad'}. Best rates, premium amenities, 24/7 security.`;
                const seoKeywords = parsed.seoKeywords || `${name}, luxury apartment, ${room.location || 'islamabad'} stay`;
                const slug = parsed.slug || slugify(name);

                const seoUpdateData = {
                    seoTitle,
                    seoDescription,
                    seoKeywords,
                    slug,
                    seoIndex: room.seoIndex || 'index, follow'
                };

                await fdb.collection('rooms').doc(id).update(seoUpdateData);

                updatedRooms.push({ id, name, slug, seoTitle });

                // Throttle to respect Groq rate limits
                await new Promise(r => setTimeout(r, 250));

            } catch (err) {
                console.error(`[batch-seo] Error processing room ${id}:`, err);
                errors.push({ id, name, error: err.message });
            }
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Successfully processed ${updatedRooms.length} room listings.`,
                totalCount: snap.docs.length,
                updatedCount: updatedRooms.length,
                updatedRooms,
                errors
            })
        };

    } catch (err) {
        console.error("[batch-seo] Unexpected error:", err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': allowedOrigin },
            body: JSON.stringify({ error: 'Internal Server Error during batch SEO execution.' })
        };
    }
};
