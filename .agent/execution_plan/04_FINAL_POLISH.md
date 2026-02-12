# 🟢 SEGMENT 04: FINAL POLISH & PWA CONFORMANCE

**OWNER**: Jules (Lead Full Stack)  
**STATUS**: READY FOR EXECUTION  
**PRIORITY**: P3 (LOW - USER EXPERIENCE REFINEMENTS)  
**FOCUS**: `InteractiveMap.astro`, `RouteCalculator.astro`, Astro Config

---

## 🎯 OBJECTIVE

Transform a functional application into a **premium native-feeling PWA**. This involves subtle UX enhancements, performance audits (Lighthouse), and PWA manifest correctness.

---

## 🚀 EXECUTION STEPS

### 1. USER EXPERIENCE (UX)

**Files**: `src/components/...`

1.  **FAVORITES**: Implement LocalStorage persistence for selected routes (`selectedRoute` state).
    - Add a `<StarIcon />` button next to Route Name.
    - Save array of route IDs to `localStorage.getItem('muevecancun_favorites')`.
    - Show "Saved Favorites" section in `RouteCalculator` when search is empty.
2.  **GPS AUTO-CENTER**:
    - Update `InteractiveMap.astro`: On mount, check `navigator.permissions` for geolocation.
    - If granted: `map.setView([lat, lng], 15)`.
    - If prompted/denied: Respect user choice (do not spam).
3.  **VIEW TRANSITIONS**:
    - Enable `View Transitions` API in `astro.config.mjs` (experimental or stable).
    - Ensure smooth cross-dissolve between `Start` -> `Routes` -> `Map`.

### 2. PERFORMANCE (LIGHTHOUSE)

**Goal**: 95+ score on Mobile.

1.  **LAZY LOADING**:
    - Add `loading="lazy"` to all images in `community.astro` and route thumbnails.
    - Use `decoding="async"` for heavy images.
2.  **SCRIPT DEFER**:
    - Ensure `Leaflet` is loaded efficiently (maybe lazy-load the map script).
    - Minify `index.js`, `route-calculator.js`.

### 3. PWA MANIFEST AUDIT

**File**: `public/manifest.json`

1.  **VERIFY** Icons:
    - 192x192, 512x512, Maskable (Android 12+).
    - Apple Touch Icon (`<link rel="apple-touch-icon">` in `<head>`).
2.  **THEME COLOR**: Match `--color-ocean` (#0ea5e9 or similar) in `theme_color`.
3.  **SCREENSHOTS**: Add `screenshots` array to manifest for rich install UI (Google Play store listing lookalike).

---

## 🧪 METRICS & TESTS

### LIGHTHOUSE AUDIT (Mobile)

- [ ] **Performance**: > 90
- [ ] **Accessibility**: > 95 (contrast ratios, ARIA labels).
- [ ] **Best Practices**: 100
- [ ] **SEO**: 100

### PWA SCORE

- [ ] "Installable": Yes.
- [ ] "Offline Capable": Yes (Service Worker fetches cached shell).

---

## 📸 EVIDENCE REQUIREMENTS

1.  **Screenshot 1**: Lighthouse Report (All Green).
2.  **Screenshot 2**: "Add to Home Screen" prompt (or installed app icon).
3.  **Screenshot 3**: Favorites list populated with saved routes.

---

## ✅ DEFINITION OF DONE for PROJECT

- The application is a PWA (Progressive Web App).
- Performance is excellent.
- User experience is delightful (favorites, auto-location).

**CONGRATULATIONS! YOU ARE READY TO DEPLOY v3.2.**
