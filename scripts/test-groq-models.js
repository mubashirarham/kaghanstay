const fs = require('fs');
const path = require('path');

const envLines = fs.readFileSync('.env', 'utf8').split('\n');
let key = '';
for (const line of envLines) {
    if (line.startsWith('GROQ_API_KEY=')) {
        key = line.split('=')[1].trim().replace(/^"|"$/g, '');
    }
}

async function checkModels() {
    try {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { 'Authorization': `Bearer ${key}` }
        });
        const data = await res.json();
        console.log("Status:", res.status);
        if (data.data) {
            console.log("Active Models:", data.data.map(m => m.id));
        } else {
            console.log("Response:", data);
        }
    } catch (e) {
        console.error(e);
    }
}
checkModels();
