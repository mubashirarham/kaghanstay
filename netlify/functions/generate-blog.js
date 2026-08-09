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

        const { topic, category, author } = payload;
        if (!topic) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Article topic or keyword is required.' })
            };
        }

        const prompt = `Write a comprehensive, engaging, luxury travel blog article and search engine metadata for KPH Stay (Kaghan Properties Hospitality Stay), Pakistan.

Article Topic / Focus: ${topic}
Category: ${category || 'Travel Guide'}
Author Name: ${author || 'Resort Travel Specialist'}

Instructions:
Act as a Senior Travel Journalist & SEO Specialist for Northern Pakistan & Islamabad luxury tourism. Output strictly a valid JSON object with the following keys:
1. "title": A catchy, high-CTR article headline (50-65 chars).
2. "excerpt": A compelling 2-sentence summary (120-150 chars).
3. "content": Complete, richly formatted HTML article (at least 4-5 sections using <h2>, <h3>, <p>, <ul>, <li>, <blockquote>, and highlight tip callouts in <div class="p-4 bg-slate-50 border-l-4 border-[#C5A059] rounded-xl my-4">...</div>). Do NOT include <html> or <body> tags.
4. "seoTitle": Brand-aligned SEO title (50-60 chars) ending in "| KPH Stay".
5. "seoDescription": Meta description (140-160 chars) with high-converting call to action.
6. "seoKeywords": Comma-separated list of 5-7 LSI keywords.
7. "slug": Clean, lowercase, hyphenated URL slug.`;

        const { data: groqData, modelUsed } = await callGroqWithRotation({
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'You are an Elite Travel Journalist, Conversion Copywriter, and SEO Specialist for luxury hospitality in Pakistan (Islamabad, Nathia Gali, Murree, Kaghan Valley). Output strictly valid JSON.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.6,
            max_tokens: 1800
        });

        const content = groqData.choices && groqData.choices[0] && groqData.choices[0].message && groqData.choices[0].message.content;
        if (!content) {
            throw new Error("Received empty content from AI writer engine.");
        }

        let parsedBlog = {};
        try {
            parsedBlog = JSON.parse(content);
        } catch (err) {
            console.error("Failed to parse JSON blog output from Groq:", content);
            throw new Error("Invalid format returned by AI writer engine.");
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            },
            body: JSON.stringify({
                title: parsedBlog.title || topic,
                excerpt: parsedBlog.excerpt || `Explore ${topic} with KPH Stay luxury travel guides.`,
                content: parsedBlog.content || `<p>Discover ${topic} with KPH Stay...</p>`,
                seoTitle: parsedBlog.seoTitle || `${parsedBlog.title || topic} | KPH Stay`,
                seoDescription: parsedSeoDescription(parsedBlog.seoDescription, parsedBlog.excerpt, topic),
                seoKeywords: parsedBlog.seoKeywords || `${topic}, luxury stay islamabad, nathia gali travel`,
                slug: parsedBlog.slug || topic.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, ''),
                modelUsed
            })
        };

    } catch (err) {
        console.error("Error in generate-blog function:", err);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: err.message || 'An unexpected error occurred while writing article with AI.' })
        };
    }
};

function parsedSeoDescription(seoDesc, excerpt, topic) {
    if (seoDesc && seoDesc.length >= 100) return seoDesc;
    if (excerpt && excerpt.length >= 100) return excerpt.slice(0, 160);
    return `Discover top travel tips, dining guides, and luxury stays for ${topic} at KPH Stay in Islamabad & Nathia Gali. Reserve your stay today!`;
}
