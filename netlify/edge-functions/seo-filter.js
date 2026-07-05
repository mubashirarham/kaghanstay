export default async (request, context) => {
  const userAgent = request.headers.get("user-agent") || "";
  
  // Regex of search engine bots and social crawlers for dynamic pre-rendering
  const isBot = /googlebot|bingbot|yandexbot|baiduspider|twitterbot|facebookexternalhit|linkedinbot|embedly|ccbot|slackbot|vkshare|quora link preview|pinterest|rogue-crawler|screaming frog|lighthouse/i.test(userAgent);
  
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Check if it is an HTML request (directory or file)
  const isHtmlRequest = path === "/" || 
                        path.endsWith(".html") || 
                        (!path.includes(".") && !path.startsWith("/assets") && !path.startsWith("/.netlify"));

  if (isBot && isHtmlRequest) {
    console.log(`[SEO Edge Filter] Bot detected: ${userAgent}. Rewriting request for: ${path}`);
    const prerenderUrl = new URL("/.netlify/functions/prerender", request.url);
    prerenderUrl.searchParams.set("page", path);
    return context.rewrite(prerenderUrl.toString());
  }

  return context.next();
};

export const config = {
  path: "/*",
  excludedPath: ["/assets/*", "/.netlify/*"]
};
