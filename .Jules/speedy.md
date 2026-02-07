## 2024-05-23 - SSR for Static Route Catalog
**Learning:** Client-side WASM rendering for static content (like a route catalog) introduces unnecessary layout shifts (CLS) and delays First Contentful Paint (FCP). The browser has to wait for WASM initialization and data fetching before rendering anything.
**Action:** Refactored `src/pages/rutas/index.astro` to perform data transformation and rendering on the server (SSR). This delivers fully populated HTML immediately, eliminating loading states and layout shifts.
