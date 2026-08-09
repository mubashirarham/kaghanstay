const { callGroqWithRotation } = require('./_groq-helper');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        let payload = {};
        try {
            payload = JSON.parse(event.body || '{}');
        } catch (e) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Invalid JSON payload' })
            };
        }

        const { name, type, location, description, amenities, price } = payload;
        if (!name) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Listing name is required to generate SEO metadata.' })
            };
        }

        const prompt = `Perform an in-depth Search Data & Intent Analysis and generate search engine optimized metadata for the following luxury listing at KPH Stay in Pakistan:
- Listing Name: ${name}
- Category / Type: ${type || 'Luxury Apartment'}
- Location / City: ${location || 'Islamabad'}
- Nightly Rate (PKR): ${price || 'N/A'}
- Amenities: ${Array.isArray(amenities) ? amenities.join(', ') : (amenities || 'High-Speed Wi-Fi, 24/7 Security')}
- Description Overview: ${description || 'Luxury serviced accommodation with scenic views and premium facilities.'}

Instructions:
Act as an Elite Hospitality SEO Strategist & Search Data Analyst. Analyze the target audience, search intent, and competitiveness for travel in Pakistan (Islamabad, Nathia Gali, Murree). Return strictly a valid JSON object with the following keys:
1. "seoTitle": Brand-aligned, high-CTR title string strictly between 50 and 60 characters ending with "| KPH Stay".
2. "seoDescription": Compelling meta description string strictly between 140 and 160 characters highlighting key features, value props (e.g. 24/7 security, views, Wi-Fi), and a clear booking call-to-action.
3. "seoKeywords": Comma-separated string of 5-7 high-converting focus & LSI search keywords.
4. "slug": Clean, lowercase, hyphenated URL-friendly slug based on the listing name and location.
5. "searchIntent": Classification of search intent ("High Commercial / Transactional Intent - Direct Reservation").
6. "targetAudience": Brief demographic description (e.g., "Diplomats, Overseas Pakistanis, Corporate Executives & Vacationing Families").
7. "primaryKeyword": The single highest-value primary keyword phrase targeted.`;

        const { data: groqData, modelUsed } = await callGroqWithRotation({
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'You are an Elite Technical SEO Strategist, Conversion Copywriter, and Search Data Analyst specializing in luxury real estate, serviced apartments, and travel search trends in Pakistan. Output strictly valid JSON.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.4,
            max_tokens: 500
        });

        const content = groqData.choices && groqData.choices[0] && groqData.choices[0].message && groqData.choices[0].message.content;
        if (!content) {
            throw new Error("Received empty response from AI model.");
        }

        let parsedSeo = {};
        try {
            parsedSeo = JSON.parse(content);
        } catch (err) {
            console.error("Failed to parse JSON output from Groq:", content);
            throw new Error("Invalid format returned by AI engine.");
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            },
            body: JSON.stringify({
                seoTitle: parsedSeo.seoTitle || `${name} in ${location || 'Islamabad'} | KPH Stay`,
                seoDescription: parsedSeo.seoDescription || `Reserve ${name} at KPH Stay in ${location || 'Islamabad'}. Best rates, premium amenities, 24/7 security.`,
                seoKeywords: parsedSeo.seoKeywords || `${name}, luxury apartment, ${location || 'islamabad'} stay`,
                slug: parsedSeo.slug || name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, ''),
                searchIntent: parsedSeo.searchIntent || 'High Commercial / Transactional Intent',
                targetAudience: parsedSeo.targetAudience || 'Corporate Executives & Vacationers',
                primaryKeyword: parsedSeo.primaryKeyword || `${name} ${location || 'Islamabad'}`,
                modelUsed
            })
        };

    } catch (err) {
        console.error("Error in generate-seo serverless function:", err);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: err.message || 'An unexpected error occurred while generating SEO metadata.' })
        };
    }
};
