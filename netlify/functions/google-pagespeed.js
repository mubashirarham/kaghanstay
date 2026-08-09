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
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
            },
            body: ''
        };
    }

    try {
        let payload = {};
        if (event.httpMethod === 'POST') {
            try {
                payload = JSON.parse(event.body || '{}');
            } catch (e) {}
        } else {
            const params = new URLSearchParams(event.queryStringParameters || {});
            payload = {
                url: params.get('url'),
                strategy: params.get('strategy')
            };
        }

        const targetUrl = payload.url || 'https://kphstay.com';
        const strategy = (payload.strategy || 'mobile').toLowerCase();
        const apiKey = payload.apiKey || process.env.PAGESPEED_API_KEY || '';

        let googleApiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=${encodeURIComponent(strategy)}&category=performance&category=accessibility&category=best-practices&category=seo`;

        if (apiKey) {
            googleApiUrl += `&key=${encodeURIComponent(apiKey)}`;
        }

        console.log(`[Google PageSpeed API] Running audit for ${targetUrl} (${strategy})...`);

        const response = await fetch(googleApiUrl);
        if (!response.ok) {
            const errText = await response.text();
            console.error(`[PageSpeed API Error]: HTTP ${response.status}`, errText);
            throw new Error(`Google PageSpeed API returned HTTP ${response.status}`);
        }

        const data = await response.json();
        const lighthouse = data.lighthouseResult || {};
        const categories = lighthouse.categories || {};

        const scores = {
            performance: categories.performance ? Math.round(categories.performance.score * 100) : 0,
            accessibility: categories.accessibility ? Math.round(categories.accessibility.score * 100) : 0,
            bestPractices: categories['best-practices'] ? Math.round(categories['best-practices'].score * 100) : 0,
            seo: categories.seo ? Math.round(categories.seo.score * 100) : 0
        };

        const audits = lighthouse.audits || {};
        const metrics = {
            firstContentfulPaint: audits['first-contentful-paint'] ? audits['first-contentful-paint'].displayValue : 'N/A',
            largestContentfulPaint: audits['largest-contentful-paint'] ? audits['largest-contentful-paint'].displayValue : 'N/A',
            cumulativeLayoutShift: audits['cumulative-layout-shift'] ? audits['cumulative-layout-shift'].displayValue : 'N/A',
            totalBlockingTime: audits['total-blocking-time'] ? audits['total-blocking-time'].displayValue : 'N/A',
            speedIndex: audits['speed-index'] ? audits['speed-index'].displayValue : 'N/A'
        };

        // Extract Top Opportunities
        const opportunities = [];
        const opportunityKeys = ['render-blocking-resources', 'unused-css-rules', 'unused-javascript', 'offscreen-images', 'unminified-javascript', 'uses-optimized-images'];
        
        opportunityKeys.forEach(key => {
            if (audits[key] && audits[key].score !== null && audits[key].score < 0.9) {
                opportunities.push({
                    title: audits[key].title,
                    description: audits[key].description,
                    displayValue: audits[key].displayValue || ''
                });
            }
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': allowedOrigin
            },
            body: JSON.stringify({
                url: targetUrl,
                strategy,
                fetchTime: lighthouse.fetchTime || new Date().toISOString(),
                scores,
                metrics,
                opportunities: opportunities.slice(0, 4)
            })
        };

    } catch (err) {
        console.error("PageSpeed audit error:", err);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': allowedOrigin
            },
            body: JSON.stringify({ error: err.message || 'Failed to execute Google PageSpeed audit.' })
        };
    }
};
