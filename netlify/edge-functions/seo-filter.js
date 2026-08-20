export default async (request, context) => {
  const userAgent = request.headers.get("user-agent") || "";
  
  // Regex of search engine bots, social crawlers, and AI agents for dynamic pre-rendering
  const isBot = /googlebot|bingbot|yandexbot|baiduspider|duckduckbot|applebot|petalbot|sogou|twitterbot|facebookexternalhit|linkedinbot|embedly|ccbot|slackbot|vkshare|quora link preview|pinterest|rogue-crawler|screaming frog|lighthouse|gptbot|oai-searchbot|chatgpt-user|claudebot|claude-web|anthropic-ai|perplexitybot|perplexity-user|google-extended|applebot-extended|bytespider|amazonbot|meta-externalagent|meta-externalfetcher|diffbot|youbot|cohere-ai/i.test(userAgent);
  
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Check if it is an HTML request (directory or file)
  const isHtmlRequest = path === "/" || 
                        path.endsWith(".html") || 
                        (!path.includes(".") && !path.startsWith("/assets") && !path.startsWith("/.netlify"));

  if (isBot && isHtmlRequest) {
    console.log(`[SEO Edge Filter] Bot detected: ${userAgent}. Rewriting request for: ${path}${url.search}`);
    const prerenderUrl = new URL("/.netlify/functions/prerender", request.url);
    prerenderUrl.searchParams.set("page", path + url.search);
    return context.rewrite(prerenderUrl.toString());
  }

  return context.next();
};

export const config = {
  path: "/*",
  excludedPath: ["/assets/*", "/.netlify/*"]
};
