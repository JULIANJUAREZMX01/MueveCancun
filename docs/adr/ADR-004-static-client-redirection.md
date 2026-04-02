# ADR-004: Transition to Strictly Static Architecture and Client-Side Localization Redirection

## Status
Accepted (March 2026)

## Context
The application is deployed on Render as a Static Site to ensure high performance, zero operational cost, and full PWA offline capability. Previously, localized routing (e.g., redirecting `/home` to `/es/home`) was handled by Astro Middleware at request-time. However, on static hosts, Middleware does not execute for every request, causing 404 errors for non-prefixed paths.

## Decision
We will transition to a **strictly static architecture** where:
1.  **Localized URLs by Default:** All internal links and programmatic redirections MUST include the language prefix (e.g., `/es/home` instead of `/home`).
2.  **Centralized URL Utility:** A new utility `getRelativeLocaleUrl(lang, path)` in `src/utils/utils.ts` is the single source of truth for generating internal links.
3.  **Client-Side Root Redirection:** The root path (`/`) uses a combination of `<meta http-equiv="refresh">` and inline JavaScript to detect browser language and tutorial completion, performing an immediate client-side redirect to the appropriate localized home.
4.  **Legacy Path Support:** The 404 page implements client-side logic to catch and redirect legacy patterns (like `/ruta/[id]`) to their new localized equivalents.

## Consequences
- **Pros:** Full compatibility with CDN/Static hosting, no "cold-starts", improved SEO predictability, 100% offline-ready.
- **Cons:** Slightly increased bundle size for redirection logic in 404/Index, user sees language prefix in the URL at all times.
- **Mandate:** Developers must NOT hardcode non-localized URLs.
