# 🚀 MUEVECANCUN - EXPANDED MASTER ROADMAP v3.1
## Stack Perfection & Optimization Edition

**Last Updated**: 2026-02-10 14:18  
**Philosophy**: Zero-dependency frontend, Rust-powered core, sub-100ms interactions  
**Team**: 👨‍💻 Jules (WASM/Rust/Backend) | 🎨 Antigravity (Frontend/UX/Integration)

---

## 🎯 VISION: THE PERFECT STACK

### Core Principles

1. **Zero React, Zero Vue, Zero Framework Bloat**
   - Pure Astro components + Vanilla TypeScript islands
   - Current bundle: ~150KB (target: <100KB)
   - No virtual DOM overhead

2. **Rust-First Architecture**
   - Route calculation: 100% WASM (no JS fallback)
   - Fuzzy search: Hybrid (TS preprocessing → WASM matching)
   - Target: <50ms route calculation (currently ~80ms)

3. **CSS5 Native, Zero Tailwind**
   - Native Popover API, Anchor Positioning, Container Queries
   - CSS Variables for theming (no JS theme switching overhead)
   - Target: <20KB CSS (currently ~35KB with Tailwind)

4. **Progressive Enhancement**
   - Works without JS (SSG pages)
   - WASM optional (graceful degradation)
   - Offline-first (Service Worker v3.0.1)

---

## 📊 CURRENT STATE ANALYSIS

### Bundle Size Breakdown

```
Total Bundle: ~150KB (gzipped)
├── Astro Runtime: 45KB
├── WASM Modules: 75KB
│   ├── route_calculator.wasm: 48KB
│   └── spatial_index.wasm: 27KB
├── CSS (Tailwind + Custom): 35KB ⚠️ TARGET: 20KB
├── TypeScript Islands: 25KB
│   ├── RouteCalculator: 15KB
│   ├── InteractiveMap: 8KB
│   └── CoordinateFinder: 2KB
└── Leaflet.js: 150KB (lazy-loaded) ✅
```

**Optimization Targets**:
- 🔴 **CSS**: 35KB → 20KB (-43%) via Tailwind removal
- 🟡 **WASM**: 75KB → 60KB (-20%) via data decoupling
- 🟢 **TypeScript**: 25KB → 20KB (-20%) via tree-shaking

### Performance Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **Route Calculation** | 80ms | <50ms | 🟡 Optimize |
| **Fuzzy Search** | 15ms | <10ms | 🟢 Good |
| **Map Render** | 300ms | <200ms | 🟡 Optimize |
| **TTI (Time to Interactive)** | 1.2s | <1s | 🟡 Optimize |
| **Lighthouse Score** | 85 | >95 | 🔴 Critical |
| **Bundle Size** | 150KB | <100KB | 🟡 Optimize |

---

## 🏗️ TECHNICAL DEBT - DEEP DIVE

### 🔴 P1: WASM Data Decoupling (JULES)

**Current Problem**:
```rust
// lib.rs - HARDCODED CATALOG
static CATALOG: Lazy<Vec<Route>> = Lazy::new(|| {
    vec![
        Route { id: "R1", name: "Combi Roja", ... },
        Route { id: "R2", name: "Playa Express", ... },
        // ... 50+ routes hardcoded
    ]
});
```

**Impact**:
- ❌ Every route update requires Rust recompilation
- ❌ WASM binary grows with route count (currently 48KB)
- ❌ Can't hot-reload route data
- ❌ Deployment friction (rebuild WASM on server)

**Solution Architecture**:

```rust
// NEW: Dynamic catalog loading
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct RouteCatalog {
    routes: Vec<Route>,
    hubs: Vec<TransferHub>,
}

#[wasm_bindgen]
pub fn load_catalog(json_data: &str) -> Result<(), JsValue> {
    let catalog: RouteCatalog = serde_json::from_str(json_data)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    
    // Store in thread-safe global
    CATALOG.write().unwrap().replace(catalog);
    Ok(())
}

#[wasm_bindgen]
pub fn find_route(origin: &str, dest: &str) -> JsValue {
    let catalog = CATALOG.read().unwrap();
    // Use catalog.as_ref().unwrap()
    // ... existing logic
}
```

**JS Integration**:
```typescript
// RouteCalculator.astro
const catalogData = await fetch('/data/master_routes.json');
const json = await catalogData.text();
await wasmModule.load_catalog(json);
```

**Benefits**:
- ✅ WASM binary: 48KB → 15KB (-69%)
- ✅ Hot-reload routes without rebuild
- ✅ Easier A/B testing of route data
- ✅ Faster CI/CD (no Rust compilation)

**Effort**: 2-3 days (Jules)  
**Priority**: 🔴 **CRITICAL**  
**Blocker**: None

---

### 🔴 P1: Tailwind Removal (ANTIGRAVITY)

**Current Problem**:
```astro
<!-- RouteCalculator.astro - TAILWIND HELL -->
<div class="flex flex-col gap-4 p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 shadow-2xl">
  <input class="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 transition-all" />
</div>
```

**Impact**:
- ❌ CSS bundle: 35KB (Tailwind JIT + custom)
- ❌ Class name soup (unreadable)
- ❌ Dark mode requires duplicate classes
- ❌ No semantic meaning

**Solution Architecture**:

```astro
<!-- RouteCalculator.astro - VANILLA CSS -->
<div class="calculator-card">
  <input class="calculator-input" />
</div>

<style>
.calculator-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  padding: var(--spacing-6);
  border-radius: var(--radius-2xl);
  background: var(--surface-card);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-2xl);
}

.calculator-input {
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--radius-xl);
  background: var(--surface-input);
  border: 1px solid var(--border-default);
  transition: all 0.2s var(--ease-out);
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-alpha);
  }
}
</style>
```

**CSS Variables System** (`index.css`):
```css
:root {
  /* Spacing Scale (8px base) */
  --spacing-1: 0.25rem;  /* 4px */
  --spacing-2: 0.5rem;   /* 8px */
  --spacing-3: 0.75rem;  /* 12px */
  --spacing-4: 1rem;     /* 16px */
  --spacing-6: 1.5rem;   /* 24px */
  --spacing-8: 2rem;     /* 32px */
  
  /* Border Radius */
  --radius-sm: 0.375rem;   /* 6px */
  --radius-md: 0.5rem;     /* 8px */
  --radius-lg: 0.75rem;    /* 12px */
  --radius-xl: 1rem;       /* 16px */
  --radius-2xl: 1.5rem;    /* 24px */
  
  /* Colors - Light Mode */
  --color-primary: hsl(200, 85%, 55%);
  --color-primary-alpha: hsla(200, 85%, 55%, 0.15);
  --surface-card: hsla(0, 0%, 100%, 0.85);
  --surface-input: hsla(0, 0%, 100%, 0.5);
  --border-default: hsl(220, 13%, 91%);
  --text-primary: hsl(220, 13%, 18%);
  
  /* Glassmorphism */
  --glass-blur: blur(20px);
  --glass-border: rgba(255, 255, 255, 0.18);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  
  /* Easing */
  --ease-out: cubic-bezier(0.33, 1, 0.68, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}

/* Dark Mode - Automatic via prefers-color-scheme */
@media (prefers-color-scheme: dark) {
  :root {
    --surface-card: hsla(220, 13%, 18%, 0.85);
    --surface-input: hsla(220, 13%, 18%, 0.5);
    --border-default: hsl(220, 13%, 28%);
    --text-primary: hsl(0, 0%, 98%);
  }
}

/* Manual Dark Mode Override */
.dark {
  --surface-card: hsla(220, 13%, 18%, 0.85);
  --surface-input: hsla(220, 13%, 18%, 0.5);
  --border-default: hsl(220, 13%, 28%);
  --text-primary: hsl(0, 0%, 98%);
}
```

**Migration Checklist**:
- [x] `BottomNav.astro` ✅ (5 tabs, grid layout)
- [x] `Header.astro` ✅ (theme toggle)
- [ ] `RouteCalculator.astro` 🔴 **CRITICAL** (15KB component)
- [ ] `Input.astro` 🟡 (reusable form component)
- [ ] `PassengerSelector.astro` 🟢 (minor)
- [ ] Remove Tailwind from `package.json`
- [ ] Remove Tailwind from `astro.config.mjs`

**Benefits**:
- ✅ CSS: 35KB → 20KB (-43%)
- ✅ Semantic class names
- ✅ Automatic dark mode (no JS)
- ✅ Better maintainability

**Effort**: 1-2 days (Antigravity)  
**Priority**: 🔴 **CRITICAL**  
**Blocker**: None

---

### 🟡 P2: TypeScript Incremental Hardening (ANTIGRAVITY)

**Current Problem**:
```json
// tsconfig.app.json - TOO PERMISSIVE
{
  "strict": false,  // ❌ Weak type safety
  "noImplicitAny": false,
  "strictNullChecks": false
}
```

**Why We Can't Enable `strict: true`**:
- Astro's `ClientRouter.astro` uses dynamic type inference
- `strictNullChecks` breaks optional chaining in routing
- Build fails with "No cached compile metadata"

**Incremental Strategy**:

**Week 1**: Safe Options
```json
{
  "forceConsistentCasingInFileNames": true,  // ✅ No breaking changes
  "noFallthroughCasesInSwitch": true         // ✅ Catches bugs
}
```

**Week 2**: Medium Risk
```json
{
  "noImplicitReturns": true,      // ⚠️ May require explicit returns
  "noUnusedLocals": true,         // ⚠️ May flag intentional unused vars
  "noUnusedParameters": true      // ⚠️ May flag callback params
}
```

**Week 3**: High Risk (Test Extensively)
```json
{
  "strictBindCallApply": true,    // ⚠️ Stricter function calls
  "alwaysStrict": true            // ⚠️ Forces "use strict"
}
```

**NEVER Enable** (Astro Incompatible):
```json
{
  "strict": true,              // ❌ Breaks Astro routing
  "strictNullChecks": true,    // ❌ Breaks optional chaining
  "noImplicitAny": true,       // ❌ Breaks dynamic props
  "strictFunctionTypes": true  // ❌ Breaks callbacks
}
```

**Testing Protocol**:
```bash
# After EACH option change:
1. pnpm astro check
2. pnpm run build
3. Navigate to ALL pages:
   - /home, /rutas, /mapa, /tarjeta, /community
4. Calculate a route (verify WASM)
5. Toggle dark mode
6. Test GPS button
7. Check console for errors

# If ANY test fails:
git checkout HEAD -- tsconfig.app.json
# Document failure in typescript_best_practices.md
```

**Effort**: 1 week (testing-heavy)  
**Priority**: 🟡 **HIGH**  
**Blocker**: None

---

### 🟡 P2: Dead Code Audit (EITHER)

**Suspects**:

1. **`saturmex_routes.json` (175KB)**
   ```bash
   # Check if used
   grep -r "saturmex_routes" src/
   # If no results → DELETE
   ```

2. **Unused WASM exports**
   ```rust
   // lib.rs - Check if these are called
   #[wasm_bindgen]
   pub fn get_route_stats() -> JsValue { ... }  // Used?
   
   #[wasm_bindgen]
   pub fn calculate_fare() -> f64 { ... }  // Used?
   ```

3. **Legacy components**
   ```bash
   # Find unused .astro files
   find src/components -name "*.astro" -type f | while read file; do
     basename=$(basename "$file")
     if ! grep -r "$basename" src/pages src/layouts; then
       echo "Unused: $file"
     fi
   done
   ```

**Effort**: 2 hours  
**Priority**: 🟡 **HIGH**  
**Blocker**: None

---

## 🚀 SPRINT 6: SOCIAL INTELLIGENCE & SEO

### 🔵 Feature 1: The Listener (JULES)

**Goal**: Scrape route data from Facebook groups automatically

**Architecture**:

```
Facebook Groups
    ↓
Puppeteer Scraper (Node.js)
    ↓
NLP Parser (Rust/Python)
    ↓
Route Validator (Rust)
    ↓
master_routes.json
    ↓
WASM Catalog (via load_catalog)
```

**Scraper Logic** (Jules):
```typescript
// scripts/the-listener.mjs
import puppeteer from 'puppeteer';

async function scrapeRoutes() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Login to Facebook
  await page.goto('https://facebook.com/groups/transporte-cancun');
  await page.type('#email', process.env.FB_EMAIL);
  await page.type('#pass', process.env.FB_PASSWORD);
  await page.click('button[name="login"]');
  await page.waitForNavigation();
  
  // Scrape posts
  const posts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-ad-preview="message"]'))
      .map(el => el.textContent);
  });
  
  // Parse routes using NLP
  const routes = posts
    .map(parseRouteFromText)
    .filter(r => r !== null);
  
  // Validate and merge
  await mergeRoutes(routes);
  
  await browser.close();
}
```

**NLP Parser** (Jules - Rust or Python):
```rust
// Extract route info from text like:
// "Nueva ruta! Combi Azul de SM 21 a Plaza Las Américas, $15 pesos"

use regex::Regex;

pub fn parse_route(text: &str) -> Option<Route> {
    let re = Regex::new(r"(?i)(combi|ruta|r-\d+)\s+(\w+).*?de\s+(.+?)\s+a\s+(.+?)[,.].*?(\d+)\s*pesos").unwrap();
    
    if let Some(caps) = re.captures(text) {
        Some(Route {
            transport_type: caps[1].to_string(),
            name: caps[2].to_string(),
            origin: caps[3].to_string(),
            destination: caps[4].to_string(),
            fare: caps[5].parse().ok()?,
        })
    } else {
        None
    }
}
```

**Validation** (Jules):
```rust
// Verify route is valid before adding
pub fn validate_route(route: &Route) -> bool {
    // Check origin/dest exist in coordinates
    let coords_exist = COORDINATES.contains_key(&route.origin) 
        && COORDINATES.contains_key(&route.destination);
    
    // Check fare is reasonable
    let fare_valid = route.fare >= 10.0 && route.fare <= 100.0;
    
    // Check not duplicate
    let not_duplicate = !CATALOG.iter().any(|r| r.name == route.name);
    
    coords_exist && fare_valid && not_duplicate
}
```

**Automated Sync Pipeline**:
```bash
# cron job: daily at 2 AM
0 2 * * * cd /app && node scripts/the-listener.mjs && pnpm run build
```

**Effort**: 1-2 weeks (Jules)  
**Priority**: 🔵 **SPRINT 6**  
**Blocker**: WASM data decoupling must be complete

---

### 🎨 Feature 2: Programmatic SEO (ANTIGRAVITY)

**Goal**: Generate 50+ dynamic route pages for SEO

**Architecture**:

```astro
---
// src/pages/rutas/[id].astro
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const routes = await fetch('/data/master_routes.json').then(r => r.json());
  
  return routes.map(route => ({
    params: { id: route.id },
    props: { route }
  }));
}

const { route } = Astro.props;
---

<!DOCTYPE html>
<html lang="es">
<head>
  <title>{route.name} - Ruta de Transporte en Cancún | MueveCancun</title>
  <meta name="description" content={`Información completa sobre la ruta ${route.name}: horarios, paradas, tarifas. Viaja de ${route.origin} a ${route.destination}.`} />
  
  <!-- Open Graph -->
  <meta property="og:title" content={`${route.name} - MueveCancun`} />
  <meta property="og:description" content={`Ruta ${route.name}: ${route.origin} → ${route.destination}`} />
  <meta property="og:image" content={`/og-images/route-${route.id}.png`} />
  
  <!-- JSON-LD Schema -->
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BusRoute",
      "name": route.name,
      "provider": {
        "@type": "Organization",
        "name": "MueveCancun"
      },
      "routeNumber": route.id,
      "offers": {
        "@type": "Offer",
        "price": route.fare,
        "priceCurrency": "MXN"
      }
    })}
  </script>
</head>
<body>
  <h1>{route.name}</h1>
  <p>Ruta de {route.origin} a {route.destination}</p>
  <p>Tarifa: ${route.fare} MXN</p>
  <!-- ... rest of page -->
</body>
</html>
```

**Sitemap Generation**:
```xml
<!-- public/sitemap.xml - Auto-generated -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://cancunmueve.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://cancunmueve.com/rutas/r1-combi-roja</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- ... 50+ route pages -->
</urlset>
```

**OG Image Generation** (Antigravity):
```typescript
// scripts/generate-og-images.mjs
import { createCanvas, loadImage } from 'canvas';

async function generateOGImage(route) {
  const canvas = createCanvas(1200, 630);
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, '#0EA5E9');
  gradient.addColorStop(1, '#06B6D4');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 630);
  
  // Route name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 72px Inter';
  ctx.fillText(route.name, 60, 200);
  
  // Origin → Destination
  ctx.font = '48px Inter';
  ctx.fillText(`${route.origin} → ${route.destination}`, 60, 300);
  
  // Save
  const buffer = canvas.toBuffer('image/png');
  await fs.writeFile(`public/og-images/route-${route.id}.png`, buffer);
}
```

**Effort**: 1 week (Antigravity)  
**Priority**: 🔵 **SPRINT 6**  
**Blocker**: None

---

## 🎨 UX POLISH FEATURES

### 🎨 GPS Auto-Center (ANTIGRAVITY)

**Current**: GPS button gets location but doesn't center map

**Solution**:
```typescript
// RouteCalculator.astro
async function handleGPSClick() {
  const pos = await navigator.geolocation.getCurrentPosition();
  const { latitude, longitude } = pos.coords;
  
  // Find nearest stop
  const nearest = await wasmModule.find_nearest_stop(latitude, longitude);
  
  // Fill origin input
  originInput.value = nearest.name;
  
  // Center map (emit event)
  window.dispatchEvent(new CustomEvent('CENTER_MAP', {
    detail: { lat: latitude, lng: longitude, zoom: 15 }
  }));
}
```

```typescript
// InteractiveMap.astro
window.addEventListener('CENTER_MAP', (e) => {
  map.setView([e.detail.lat, e.detail.lng], e.detail.zoom, {
    animate: true,
    duration: 1
  });
});
```

**Effort**: 2 hours  
**Priority**: 🟢 **LOW**

---

### 🎨 Share Routes (ANTIGRAVITY)

**Goal**: Share calculated routes via Web Share API

```typescript
async function shareRoute(route) {
  if (navigator.share) {
    await navigator.share({
      title: `Ruta: ${route.name}`,
      text: `${route.origin} → ${route.destination} - $${route.fare} MXN`,
      url: `https://cancunmueve.com/rutas/${route.id}`
    });
  } else {
    // Fallback: Copy to clipboard
    await navigator.clipboard.writeText(window.location.href);
    showToast('Enlace copiado', 'success');
  }
}
```

**Effort**: 1 hour  
**Priority**: 🟢 **LOW**

---

## 🔬 OPTIMIZATION DEEP-DIVES

### 🚀 WASM Optimization (JULES)

**Current WASM Size**: 75KB (48KB route_calculator + 27KB spatial_index)

**Optimization 1: Data Decoupling**
- Remove hardcoded catalog: 48KB → 15KB (-69%)

**Optimization 2: Aggressive Stripping**
```toml
# Cargo.toml
[profile.release]
opt-level = "z"        # Optimize for size
lto = true             # Link-time optimization
codegen-units = 1      # Better optimization
strip = true           # Strip symbols
panic = "abort"        # Smaller panic handler
```

**Optimization 3: wasm-opt**
```bash
wasm-opt -Oz -o optimized.wasm route_calculator.wasm
# Typical savings: 10-15%
```

**Target**: 75KB → 50KB (-33%)

---

### ⚡ Route Calculation Optimization (JULES)

**Current**: 80ms average

**Bottleneck Analysis**:
```rust
// Profiling shows:
// 1. String allocation: 30ms (37%)
// 2. Fuzzy matching: 25ms (31%)
// 3. Graph traversal: 20ms (25%)
// 4. Result serialization: 5ms (6%)
```

**Optimization 1: String Interning**
```rust
use string_cache::DefaultAtom as Atom;

// Instead of String
pub struct Route {
    name: Atom,  // Interned string (cheap clone)
    origin: Atom,
    destination: Atom,
}
```
**Savings**: 30ms → 10ms (-67%)

**Optimization 2: Parallel Fuzzy Matching**
```rust
use rayon::prelude::*;

pub fn find_best_match(query: &str, candidates: &[String]) -> Option<String> {
    candidates.par_iter()  // Parallel iterator
        .map(|c| (c, jaro_winkler(query, c)))
        .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap())
        .map(|(c, _)| c.clone())
}
```
**Savings**: 25ms → 15ms (-40%)

**Optimization 3: Precomputed Graph**
```rust
// Build adjacency list once at startup
static GRAPH: Lazy<HashMap<Atom, Vec<Atom>>> = Lazy::new(|| {
    build_route_graph(&CATALOG)
});

pub fn find_route(origin: &str, dest: &str) -> Option<Journey> {
    // Use precomputed graph (no rebuild)
    bfs(&GRAPH, origin, dest)
}
```
**Savings**: 20ms → 10ms (-50%)

**Target**: 80ms → 35ms (-56%)

---

### 🎨 CSS Architecture (ANTIGRAVITY)

**Design System Structure**:

```
src/styles/
├── index.css              # Entry point
├── tokens/
│   ├── colors.css         # Color palette
│   ├── spacing.css        # Spacing scale
│   ├── typography.css     # Font system
│   └── shadows.css        # Shadow tokens
├── base/
│   ├── reset.css          # CSS reset
│   ├── typography.css     # Base typography
│   └── utilities.css      # Utility classes
└── components/
    ├── buttons.css        # Button variants
    ├── inputs.css         # Form inputs
    └── cards.css          # Card components
```

**Token System**:
```css
/* tokens/colors.css */
:root {
  /* Primary - Ocean Blue */
  --color-primary-50: hsl(200, 85%, 95%);
  --color-primary-100: hsl(200, 85%, 90%);
  --color-primary-500: hsl(200, 85%, 55%);  /* Base */
  --color-primary-900: hsl(200, 85%, 20%);
  
  /* Accent - Turquoise */
  --color-accent-500: hsl(174, 72%, 56%);
  
  /* Semantic Colors */
  --color-success: hsl(142, 76%, 36%);
  --color-error: hsl(0, 84%, 60%);
  --color-warning: hsl(38, 92%, 50%);
  
  /* Surface Colors */
  --surface-base: hsl(0, 0%, 100%);
  --surface-card: hsla(0, 0%, 100%, 0.85);
  --surface-input: hsla(0, 0%, 100%, 0.5);
  
  /* Text Colors */
  --text-primary: hsl(220, 13%, 18%);
  --text-secondary: hsl(220, 9%, 46%);
  --text-tertiary: hsl(220, 9%, 66%);
}
```

**Component Pattern**:
```css
/* components/buttons.css */
.btn {
  /* Base styles */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3) var(--spacing-6);
  border-radius: var(--radius-lg);
  font-weight: 600;
  transition: all 0.2s var(--ease-out);
  cursor: pointer;
  
  /* Variants via data attributes */
  &[data-variant="primary"] {
    background: var(--color-primary-500);
    color: white;
    
    &:hover {
      background: var(--color-primary-600);
    }
  }
  
  &[data-variant="ghost"] {
    background: transparent;
    color: var(--color-primary-500);
    
    &:hover {
      background: var(--color-primary-50);
    }
  }
  
  /* Sizes via data attributes */
  &[data-size="sm"] {
    padding: var(--spacing-2) var(--spacing-4);
    font-size: 0.875rem;
  }
  
  &[data-size="lg"] {
    padding: var(--spacing-4) var(--spacing-8);
    font-size: 1.125rem;
  }
}
```

**Usage**:
```astro
<button class="btn" data-variant="primary" data-size="lg">
  Trazar Ruta
</button>
```

---

## 📋 DELEGATION MATRIX

### 👨‍💻 JULES (WASM/Rust/Backend)

| Task | Priority | Effort | Blocker |
|------|----------|--------|---------|
| WASM Data Decoupling | 🔴 P1 | 2-3 days | None |
| Route Calculation Optimization | 🟡 P2 | 1 week | Data decoupling |
| The Listener (Scraper) | 🔵 Sprint 6 | 1-2 weeks | Data decoupling |
| Preferred Hubs Config | 🟡 P2 | 4 hours | None |
| WASM Size Optimization | 🟢 P3 | 2 days | None |
| Dead Code Audit (WASM) | 🟡 P2 | 1 hour | None |

**Total Estimated Effort**: 3-4 weeks

---

### 🎨 ANTIGRAVITY (Frontend/UX/Integration)

| Task | Priority | Effort | Blocker |
|------|----------|--------|---------|
| Tailwind Removal | 🔴 P1 | 1-2 days | None |
| TypeScript Incremental | 🟡 P2 | 1 week | None |
| Programmatic SEO | 🔵 Sprint 6 | 1 week | None |
| GPS Auto-Center | 🟢 P3 | 2 hours | None |
| Share Routes | 🟢 P3 | 1 hour | None |
| PWA Manifest Audit | 🟢 P3 | 1 hour | None |
| Dead Code Audit (Frontend) | 🟡 P2 | 1 hour | None |

**Total Estimated Effort**: 2-3 weeks

---

## 🎯 SUCCESS METRICS (EXPANDED)

### Performance Targets

| Metric | Current | Sprint 6 Target | Dream Target |
|--------|---------|-----------------|--------------|
| **Bundle Size** | 150KB | 100KB | 75KB |
| **CSS Size** | 35KB | 20KB | 15KB |
| **WASM Size** | 75KB | 50KB | 40KB |
| **Route Calc** | 80ms | 50ms | 35ms |
| **TTI** | 1.2s | 1s | 800ms |
| **Lighthouse** | 85 | 95 | 100 |
| **FCP** | 800ms | 600ms | 400ms |
| **LCP** | 1.5s | 1.2s | 1s |

### SEO Targets

- **Indexed Pages**: 18 → 70+ (50+ route pages)
- **Organic Traffic**: Baseline → +200% (3 months)
- **Search Ranking**: Not ranked → Top 3 for "transporte cancún"

### User Engagement

- **PWA Installs**: 0 → 1000+ (3 months)
- **Daily Active Users**: 0 → 500+ (3 months)
- **Route Calculations**: 0 → 2000+/day (3 months)

---

## 🏆 PERFECTION CHECKLIST

### Code Quality
- [ ] Zero `any` types (incremental TypeScript)
- [ ] 100% Vanilla CSS (no Tailwind)
- [ ] Zero dead code (audited and removed)
- [ ] All WASM exports documented
- [ ] All components have JSDoc

### Performance
- [ ] Bundle < 100KB
- [ ] Route calculation < 50ms
- [ ] Lighthouse score > 95
- [ ] TTI < 1s
- [ ] LCP < 1.2s

### Architecture
- [ ] WASM data decoupled
- [ ] CSS design system complete
- [ ] All components use design tokens
- [ ] Zero hardcoded values
- [ ] Semantic HTML throughout

### SEO
- [ ] 50+ route pages generated
- [ ] Sitemap auto-generated
- [ ] All pages have meta tags
- [ ] JSON-LD schema on all routes
- [ ] OG images for all routes

### UX
- [ ] GPS auto-center works
- [ ] Share routes functional
- [ ] Offline mode perfect
- [ ] Dark mode seamless
- [ ] Animations smooth (60fps)

---

**Last Updated**: 2026-02-10 14:18  
**Next Review**: After Sprint 5 cleanup  
**Philosophy**: Perfection through simplicity, speed through Rust, beauty through CSS5
