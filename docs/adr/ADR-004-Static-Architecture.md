# ADR 004: Strictly Static Architecture Stabilization

## Status
Accepted (Mar 2026)

## Context
MueveCancun has transitioned to a strictly static output mode (`output: 'static'`) to maximize performance and compatibility with global CDNs (Render, Cloudflare, etc.).
However, this transition introduced lifecycle issues:
1. Client-side scripts using vanilla JS lost their event listeners during Astro "View Transitions" (DOM swaps).
2. Localized routing (e.g., `/es/home`) required manual redirection from the root `/` path.
3. Third-party libraries like Leaflet rendered incorrectly (as small squares) when initialized before the DOM was fully settled in the new page.

## Decision
1. **Lifecycle Management:** All client-side initialization logic MUST be wrapped in the `astro:page-load` event listener. This ensures that scripts re-run after every client-side navigation.
2. **Strict Redirection:** The root `/` path will serve as a client-side onboarding/gatekeeper. It will check for a `tutorial_completed` cookie/localStorage flag and redirect to the localized home page using `window.location.href`.
3. **Map Dimensional Stability:** Map containers must have explicit CSS heights using dynamic viewport units (`100dvh`). `map.invalidateSize()` must be called during the `astro:page-load` cycle to ensure proper canvas tiling.
4. **404 Catch-all:** The `404.astro` page will act as a client-side router for unlocalized paths (e.g., redirecting `/wallet` to `/es/wallet`).

## Consequences
- No server-side middleware for request-time logic.
- Increased reliance on robust client-side cookie/storage management.
- Seamless, App-like navigation feel using Astro's ClientRouter.
