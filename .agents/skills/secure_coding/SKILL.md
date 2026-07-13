---
name: Secure Coding Practices
description: Guidelines on XSS prevention, innerHTML replacement, secure CORS, and CSP headers.
---

# Secure Coding Practices

This skill provides step-by-step guidance on implementing defenses against Cross-Site Scripting (XSS) and other web security threats in the project.

## Cross-Site Scripting (XSS) Prevention

### 1. Replacing innerHTML
* Identify all instances of `element.innerHTML = ...` in the codebase.
* Replace them with `element.textContent = ...` or `element.innerText = ...` when setting text content.
* If dynamic HTML must be rendered, use DOMPurify to sanitize the content before injecting it.

### 2. Output Encoding
* Ensure all dynamic values rendered in HTML (especially in Netlify functions or edge-functions generating sitemaps or pages) are HTML-escaped:
  ```javascript
  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
  }
  ```

## CORS & CSP Configuration

### 1. Tightening CORS
* Never return `Access-Control-Allow-Origin: *` for state-modifying requests, chat utilities, or emailing.
* Explicitly match against standard allowed domains (e.g. `kphstay.com`, Netlify deploy previews).

### 2. Content Security Policy (CSP)
* Define a strong CSP in [netlify.toml](file:///d:/Kaghan%20Stay/netlify.toml).
* Avoid unsafe-inline scripts without nonces or hashes.
* Restrict resource loading to verified CDNs and API endpoints (Firebase, Groq).
