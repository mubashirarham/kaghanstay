// Netlify Edge Function - CDN-level Rate Limiter
// Enforces a strict rate-limit on serverless API calls to protect against DOS/spam.

// In-memory request ledger (resets when Edge Container cold-starts/recycles)
const ipRequestLedger = new Map();

// Configuration: Max 20 requests per 60 seconds per IP
const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 20;

export default async (request, context) => {
  // Retrieve client connection IP
  const clientIp = request.headers.get("x-nf-client-connection-ip") || 
                   request.headers.get("x-forwarded-for") || 
                   "unknown-ip";

  const now = Date.now();
  
  // Initialize or fetch ledger for connection IP
  if (!ipRequestLedger.has(clientIp)) {
    ipRequestLedger.set(clientIp, []);
  }
  
  const timestamps = ipRequestLedger.get(clientIp);
  
  // Filter out timestamps outside the active rate-limit window
  const activeTimestamps = timestamps.filter(t => (now - t) < RATE_LIMIT_WINDOW_MS);
  
  if (activeTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    console.warn(`[CDN Rate Limiter] Blocked IP: ${clientIp} - Exceeded limit (${activeTimestamps.length}/${MAX_REQUESTS_PER_WINDOW} req/min)`);
    
    // Return 429 Too Many Requests response at the CDN edge
    return new Response(
      JSON.stringify({ 
        error: "Too many requests. Please slow down. Booking servers are rate-limited to prevent automated spam." 
      }), 
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Retry-After": "60"
        }
      }
    );
  }
  
  // Log the current request timestamp
  activeTimestamps.push(now);
  ipRequestLedger.set(clientIp, activeTimestamps);
  
  // Proceed with standard execution pipeline
  return await context.next();
};
