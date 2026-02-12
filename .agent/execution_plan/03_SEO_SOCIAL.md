# 🔵 SEGMENT 03: SPRINT 6 - SOCIAL INTELLIGENCE & SEO

**OWNER**: Jules (Lead Full Stack)  
**STATUS**: READY FOR EXECUTION  
**PRIORITY**: P2 (MEDIUM - PRODUCT DIFFERENTIATION)  
**FOCUS**: "The Listener" (Data) & Next.js/SSR-style SEO in Astro (PAGES)

---

## 🎯 OBJECTIVE

Implement the core differentiators of MueveCancun v3.x: **Real-time freshness** via social scraping and **Discoverability** via programmatic route pages.

---

## 🚀 EXECUTION STEPS

### 1. THE LISTENER (SOCIAL SCRAPER)

**File**: `scripts/sync-routes.mjs` / Backend Logic

1.  **INTEGRATE** logic to scrape or ingest data from reliable social sources (FB Groups: "Rutas Cancún", "Transporte QROO").
    - _Constraint_: Use authorized APIs or manual curation if scraping is blocked. Ideally, script parses raw text updates.
2.  **UPDATE** `master_routes.json`:
    - Inject `last_updated: "2026-02-11T12:00:00Z"`.
    - Add `social_alerts: ["Ruta R-1 desviada por obras en Kukulcán"]`.
3.  **UI DISPLAY**:
    - Update `RouteCalculator` result cards to show a **"Live Alert"** badge if present.

### 2. PROGRAMMATIC SEO PAGES

**File**: `src/pages/rutas/[id].astro`

1.  **CREATE** dynamic route file:
    ```astro
    ---
    export async function getStaticPaths() {
      const data = await fetch('.../master_routes.json').then(r => r.json());
      return data.rutas.map(route => ({
        params: { id: route.id },
        props: { route },
      }));
    }
    const { route } = Astro.props;
    ---
    <MainLayout title={`Ruta ${route.nombre} - MueveCancun`}>
      <h1>{route.nombre}</h1>
      <p>Precio: ${route.tarifa}</p>
      <!-- InteractiveMap focused on this route -->
    </MainLayout>
    ```
2.  **METADATA**:
    - Use `title`, `description` (e.g., "Horarios, paradas y mapa de la Ruta R-1 en Cancún").
    - OpenGraph image generation (optional).

### 3. SITEMAP GENERATION

**File**: `astro.config.mjs`

1.  **CONFIGURE** `@astrojs/sitemap`:
    - Ensure it crawls `[id].astro` pages.
    - Set `changefreq: daily`, `priority: 0.8` for route pages.
2.  **VERIFY** `dist/sitemap-index.xml` contains all ~50 routes.

---

## 🧪 METRICS & TESTS

### DATA FRESHNESS

- [ ] Script runs successfully and updates `master_routes.json`.
- [ ] UI shows "Last Updated: Just now" on relevant routes.

### SEO AUDIT

- [ ] `curl http://localhost:4321/rutas/R1_ZONA_HOTELERA_001` returns 200 OK.
- [ ] Page source contains `<title>Ruta R-1 ...</title>`.
- [ ] `sitemap.xml` lists `https://muevecancun.mx/rutas/R1_ZONA_HOTELERA_001`.

---

## 📸 EVIDENCE REQUIREMENTS

1.  **Screenshot 1**: A route card with a red "Live Alert" badge.
2.  **Screenshot 2**: The generated `sitemap.xml` file content.
3.  **Screenshot 3**: A specific route page (`/rutas/R1...`) loaded in browser with unique metadata.

---

## ✅ DEFINITION OF DONE for SEGMENT 03

- Social data pipeline updates `master_routes.json`.
- Dynamic route pages exist for all routes.
- Sitemap is auto-generated.
- SEO metadata is correct.

**NEXT STEP**: Proceed to `04_FINAL_POLISH.md`.
