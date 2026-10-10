const fs = require('fs');
const envLines = fs.readFileSync('.env', 'utf8').split('\n');
let key = '';
for (const line of envLines) {
    if (line.startsWith('GROQ_API_KEY=')) {
        key = line.split('=')[1].trim().replace(/^"|"$/g, '');
    }
}

async function testGeneration() {
    const models = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
    for (const model of models) {
        console.log(`\n================ Testing model: ${model} ================`);
        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'user', content: 'Write a 20-word summary of Kaghan Stay luxury apartments in Murree.' }
                    ],
                    max_tokens: 200
                })
            });
            const data = await res.json();
            console.log(`Status:`, res.status);
            console.log(`Full Response:`, JSON.stringify(data, null, 2));
        } catch (e) {
            console.error(`Error:`, e);
        }
    }
}
testGeneration();
