import { getStore } from "@netlify/blobs";

// Configuration: Max 20 requests per 60 seconds per IP
const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 20;

export default async (request, context) => {
  // Retrieve client connection IP (trust only Netlify's x-nf-client-connection-ip to prevent spoofing)
  const clientIp = request.headers.get("x-nf-client-connection-ip") || "unknown-ip";
  const url = new URL(request.url);
  const path = url.pathname;

  const now = Date.now();
  // Sanitize key for Netlify Blobs compatibility
  const key = `ip-${clientIp}-${path}`.replace(/[^a-zA-Z0-9_.-]/g, "_");

  let activeTimestamps = [];

  try {
    const store = getStore("rate-limits");
    const data = await store.get(key, { type: "json" });
    const timestamps = Array.isArray(data) ? data : [];
    
    // Filter out timestamps outside the active rate-limit window
    activeTimestamps = timestamps.filter(t => (now - t) < RATE_LIMIT_WINDOW_MS);
    
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
            "Access-Control-Allow-Origin": "https://kphstay.com",
            "Retry-After": "60"
          }
        }
      );
    }
    
    // Log the current request timestamp
    activeTimestamps.push(now);
    await store.set(key, JSON.stringify(activeTimestamps));
  } catch (err) {
    console.error("[CDN Rate Limiter] Blob store error, falling back to pass-through:", err);
  }
  
  // Proceed with standard execution pipeline
  return await context.next();
};
