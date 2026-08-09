const { callGroqWithRotation } = require('./_groq-helper');

exports.handler = async (event, context) => {
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

        const { title, category, excerpt, content } = payload;
        if (!title && !content) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Article title or content is required to analyze SEO.' })
            };
        }

        const cleanContent = content ? content.replace(/<[^>]*>?/gm, '').slice(0, 600) : (excerpt || title);

        const prompt = `Perform an in-depth Search Data & Intent Analysis and generate extreme search engine metadata for the following luxury travel blog article at KPH Stay in Pakistan:
- Article Title: ${title || 'Luxury Travel Guide'}
- Category / Topic: ${category || 'Travel Guide'}
- Article Excerpt: ${excerpt || 'Travel tips and resort insights.'}
- Content Preview: ${cleanContent}

Instructions:
Act as an Elite Hospitality SEO Strategist & Search Data Analyst. Output strictly valid JSON object with:
1. "seoTitle": Brand-aligned, high-CTR title string strictly between 50 and 60 characters ending with "| KPH Stay".
2. "seoDescription": Meta description strictly between 140 and 160 characters highlighting key travel takeaways and call to action.
3. "seoKeywords": Comma-separated string of 5-7 focus & LSI search keywords.
4. "slug": Clean, lowercase, hyphenated URL-friendly slug based on title.
5. "searchIntent": Intent classification (e.g. "Informational / Destination Travel Planning").
6. "targetAudience": Target demographic (e.g. "Vacationers, Hikers, Overseas Pakistanis & Families").`;

        const { data: groqData, modelUsed } = await callGroqWithRotation({
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'You are an Elite Technical SEO Strategist and Search Data Analyst specializing in luxury travel, resort journals, and travel search trends in Pakistan. Output strictly valid JSON.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.4,
            max_tokens: 450
        });

        const rawContent = groqData.choices && groqData.choices[0] && groqData.choices[0].message && groqData.choices[0].message.content;
        if (!rawContent) throw new Error("Received empty response from AI engine.");

        const parsed = JSON.parse(rawContent);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            },
            body: JSON.stringify({
                seoTitle: parsed.seoTitle || `${title} | KPH Stay`,
                seoDescription: parsed.seoDescription || (excerpt ? excerpt.slice(0, 160) : `Discover ${title} with KPH Stay luxury travel journal.`),
                seoKeywords: parsed.seoKeywords || `${category ? category.toLowerCase() : 'travel'}, islamabad stay, luxury travel`,
                slug: parsed.slug || (title ? title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '') : 'blog-post'),
                searchIntent: parsed.searchIntent || 'Informational / Destination Planning',
                targetAudience: parsed.targetAudience || 'Travelers & Vacationers',
                modelUsed
            })
        };

    } catch (err) {
        console.error("Error in generate-blog-seo function:", err);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: err.message || 'An error occurred while generating blog SEO metadata.' })
        };
    }
};
