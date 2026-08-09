const fetch = require('node-fetch');

// Available Groq LLM models pool for sitewide rotation & automatic failover
const GROQ_MODEL_POOL = [
    'llama-3.3-70b-versatile',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
    'llama-3.1-8b-instant'
];

let currentModelIndex = 0;

/**
 * Execute Groq Chat Completion with automatic model rotation and rate-limit failover.
 * @param {Object} options Options payload (messages, temperature, max_tokens, response_format, tools)
 * @returns {Promise<Object>} Returns parsed Groq JSON response
 */
async function callGroqWithRotation(options) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("GROQ_API_KEY environment variable is unconfigured.");
    }

    const maxAttempts = GROQ_MODEL_POOL.length;
    let lastError = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Select model by rotating index
        const selectedModel = GROQ_MODEL_POOL[(currentModelIndex + attempt) % GROQ_MODEL_POOL.length];
        
        const requestBody = {
            model: selectedModel,
            messages: options.messages || [],
            temperature: options.temperature !== undefined ? options.temperature : 0.5,
            max_tokens: options.max_tokens || 800
        };

        if (options.response_format) {
            requestBody.response_format = options.response_format;
        }

        if (options.tools && options.tools.length) {
            requestBody.tools = options.tools;
        }

        console.log(`[Groq Model Rotation] Attempt ${attempt + 1}/${maxAttempts} using model: ${selectedModel}`);

        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (res.ok) {
                const data = await res.json();
                // Rotate model index for next call to distribute load evenly across models
                currentModelIndex = (currentModelIndex + 1) % GROQ_MODEL_POOL.length;
                return { data, modelUsed: selectedModel };
            }

            const errText = await res.text();
            console.warn(`[Groq Model Rotation] Model ${selectedModel} failed with status ${res.status}: ${errText}`);
            lastError = new Error(`Groq HTTP ${res.status}: ${errText}`);

            // If rate limited (429) or service unavailable (503/500), immediately failover to next model in pool
            if (res.status === 429 || res.status === 503 || res.status === 500) {
                continue;
            } else {
                // Non-transient client error (e.g. 400 bad payload), do not retry
                throw lastError;
            }

        } catch (err) {
            console.warn(`[Groq Model Rotation] Exception calling model ${selectedModel}:`, err.message);
            lastError = err;
        }
    }

    throw new Error(`All Groq AI models in rotation pool failed. Last error: ${lastError ? lastError.message : 'Unknown'}`);
}

module.exports = {
    GROQ_MODEL_POOL,
    callGroqWithRotation
};
