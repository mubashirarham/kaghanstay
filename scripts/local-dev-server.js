require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const ROOT = path.join(__dirname, '..');

const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf'
};

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;

    // Handle Netlify Functions
    if (pathname.startsWith('/.netlify/functions/')) {
        const funcName = pathname.replace('/.netlify/functions/', '').split('/')[0];
        const funcPath = path.join(ROOT, 'netlify', 'functions', `${funcName}.js`);

        if (fs.existsSync(funcPath)) {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    delete require.cache[require.resolve(funcPath)];
                    const handler = require(funcPath).handler;

                    const event = {
                        httpMethod: req.method,
                        headers: req.headers,
                        path: pathname,
                        queryStringParameters: parsedUrl.query,
                        body: body
                    };

                    const result = await handler(event, {});
                    res.writeHead(result.statusCode || 200, result.headers || { 'Content-Type': 'application/json' });
                    res.end(result.body || '');
                } catch (err) {
                    console.error(`Error in function ${funcName}:`, err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                }
            });
            return;
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Function ${funcName} not found` }));
            return;
        }
    }

    // Rewrite clean paths
    if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
    } else if (!path.extname(pathname)) {
        if (fs.existsSync(path.join(ROOT, `${pathname}.html`))) {
            pathname = `${pathname}.html`;
        }
    }

    const filePath = path.join(ROOT, pathname);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Local Dev Server running at http://localhost:${PORT}`);
});
