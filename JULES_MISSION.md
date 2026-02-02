# 🎯 JULES: CancúnMueve PWA - Astro + WASM Architecture Review & Deployment

## 📌 CONTEXT & HANDOFF

**From:** Gemini (Antigravity)  
**To:** Jules (Google Gemini Agent)  
**Branch:** `feature/urban-compass-v2-sync`  
**Status:** Architecture migration complete, awaiting comprehensive review and deployment  
**Timestamp:** 2026-01-30 01:25 UTC

---

## 🏗️ CURRENT ARCHITECTURE

**Tech Stack:**
- **Framework:** Astro 5.0 (Static Site Generation)
- **Client-Side:** Vanilla JavaScript + TypeScript
- **Routing Engine:** Rust/WASM (Dijkstra algorithm)
- **Map Rendering:** Mapbox GL JS
- **Data Storage:** IndexedDB + JSON
- **Package Manager:** pnpm (exclusively)

**Key Components:**
- `RouteCalculator.astro` - WASM integration with wallet balance gatekeeper
- `InteractiveMap.astro` - Mapbox GL JS with route/stop rendering
- `DriverWallet.astro` - IndexedDB-powered balance simulator

---

## 🎨 PHASE 0: UI TEMPLATE INTEGRATION (CRITICAL - DO FIRST)

**INSTRUCTION:** The current UI uses custom CSS. You MUST replace it with a beautiful, pre-built Astro template.

### Recommended Templates:
1. **Astro Sphere** (Modern, clean)
   - https://github.com/markhorn-dev/astro-sphere
   - Perfect for PWAs with dark mode support

2. **Astro Paper** (Documentation-focused)
   - https://github.com/satnaing/astro-paper
   - Lightweight, fast, SEO-optimized

3. **Astro Wind** (Landing pages)
   - https://github.com/onwidget/astrowind
   - Beautiful components, no custom CSS needed

### Integration Steps:
```bash
# 1. Clone template into temp directory
git clone https://github.com/markhorn-dev/astro-sphere astro-template-temp

# 2. Copy template structure
cp -r astro-template-temp/src/layouts/* src/layouts/
cp -r astro-template-temp/src/components/* src/components/
cp astro-template-temp/tailwind.config.mjs .
cp astro-template-temp/astro.config.mjs . # Merge with existing config

# 3. Update dependencies
pnpm add @astrojs/tailwind tailwindcss

# 4. Remove custom CSS
rm -rf src/styles/*.css  # Keep only template styles
```

### UI Requirements:
- ✅ **Dark Mode Toggle** (preserve user preference in localStorage)
- ✅ **Responsive Navigation** (mobile hamburger menu)
- ✅ **Card Components** for routes display
- ✅ **Form Components** for RouteCalculator inputs
- ✅ **Modal/Dialog** for warnings (Airport Gatekeeper)
- ✅ **Loading States** for WASM operations

**DO NOT write any custom CSS. Use template utility classes only.**

---

## 📊 PHASE 00: BRANCH MANAGEMENT & CLEANUP (DO SECOND)

### Current Branch Situation:
```bash
# List current branches
git branch -a

# Expected output shows messy branch names like:
# - feature/cancunmueve-base-structure-phase-1-2-3-5-15744161379540395713
# - feature/urban-compass-v2-sync
```

### Your Tasks:

#### 1. Resolve All Merge Conflicts
```bash
# Switch to main/master branch
git checkout master  # or main

# Attempt merge from long branch name
git merge feature/cancunmueve-base-structure-phase-1-2-3-5-15744161379540395713

# If conflicts occur:
# - Manually resolve in VS Code
# - Prefer INCOMING changes (newer code)
# - Test build after each resolution
# - Commit: git commit -m "chore: resolve merge conflicts"

# Merge urban-compass branch
git merge feature/urban-compass-v2-sync
```

#### 2. Rename Branches to Logical Names
```bash
# Rename messy branch to logical name
git branch -m feature/cancunmueve-base-structure-phase-1-2-3-5-15744161379540395713 feature/astro-base

# Rename urban-compass (optional, it's already decent)
git branch -m feature/urban-compass-v2-sync feature/astro-wasm-migration

# Push renamed branches
git push origin :feature/cancunmueve-base-structure-phase-1-2-3-5-15744161379540395713
git push origin feature/astro-base

git push origin :feature/urban-compass-v2-sync
git push origin feature/astro-wasm-migration
```

#### 3. Create Clean Development Branch
```bash
# Create new main development branch from master
git checkout master
git pull origin master
git checkout -b develop

# Push to remote
git push -u origin develop
```

#### 4. Establish Branch Naming Convention
**From now on, use this convention:**

- `feature/[component]-[action]` - New features
  - Example: `feature/wallet-balance-gatekeeper`
  - Example: `feature/map-route-rendering`

- `fix/[issue]-[description]` - Bug fixes
  - Example: `fix/wasm-loading-timeout`
  - Example: `fix/idb-connection-error`

- `refactor/[component]` - Code improvements
  - Example: `refactor/route-calculator`

- `docs/[section]` - Documentation updates
  - Example: `docs/deployment-guide`

**Document this in `.github/BRANCH_NAMING.md`**

---

## 🔌 PHASE 000: COMPONENT WIRING & LOGIC INTEGRATION (DO THIRD)

**CRITICAL:** All UI components must be fully functional. No broken buttons or disconnected logic.

### RouteCalculator.astro - Complete Wiring Checklist

#### HTML Structure Audit:
```html
<!-- REQUIRED ELEMENTS (verify IDs match JavaScript) -->
<input id="origin-input" />
<input id="destination-input" />
<button id="swap-btn">⇆ Swap</button>
<button id="calculate-btn">Trazar Ruta</button>
<input type="number" id="seats-input" value="1" />
<input type="checkbox" id="tourist-checkbox" />
<div id="balance-display">PILOTO: <span id="balance-amount">0</span> MXN</div>
<div id="results-container"></div>
```

#### JavaScript Event Listeners Checklist:
```javascript
// VERIFY ALL OF THESE EXIST AND WORK:

// 1. Swap Button
document.getElementById('swap-btn').addEventListener('click', () => {
  const origin = originInput.value;
  originInput.value = destInput.value;
  destInput.value = origin;
});

// 2. Calculate Button
document.getElementById('calculate-btn').addEventListener('click', async () => {
  // Check balance >= 180
  // Call WASM calculate_route
  // Display results
  // Show airport warning if applicable
});

// 3. Seats Input (update cost on change)
seatsInput.addEventListener('input', () => {
  updateCostEstimate();
});

// 4. Tourist Checkbox (update cost on change)
touristCheckbox.addEventListener('change', () => {
  updateCostEstimate();
});
```

#### WASM Integration Checklist:
```javascript
// VERIFY THIS FLOW WORKS:
const wasmModule = await import(/* @vite-ignore */ '/wasm/route-calculator/route_calculator.js');
await wasmModule.default();

const routeData = await fetch('/data/master_routes.json').then(r => r.json());

const result = wasmModule.calculate_route(
  originLat, originLng,
  destLat, destLng,
  routeData
);

// Display result.instructions
// Show result.airport_warning if exists
// Display result.estimated_cost_mxn
```

### InteractiveMap.astro - Complete Wiring Checklist

#### Mapbox Integration:
```javascript
// VERIFY:
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = mapboxToken;
const map = new mapboxgl.Map({
  container: 'map-container',
  style: 'mapbox://styles/mapbox/dark-v11', // Use dark theme
  center: [-86.8515, 21.1619],
  zoom: 12
});

// Add controls
map.addControl(new mapboxgl.NavigationControl(), 'top-right');
map.addControl(
  new mapboxgl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true
  }),
  'top-right'
);

// Load routes on map load
map.on('load', async () => {
  const routes = await fetch('/data/master_routes.json').then(r => r.json());
  
  routes.rutas.forEach(route => {
    // Add route polyline
    // Add stop markers
    // Add popups with route info
  });
});
```

### DriverWallet.astro - Complete Wiring Checklist

#### Top-Up Buttons:
```javascript
// VERIFY ALL BUTTONS WORK:
document.querySelectorAll('.top-up-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const amount = parseInt(e.target.dataset.amount);
    
    // 1. Get current balance from IDB
    const db = await openDB('cancunmueve-db', 2);
    const current = await db.get('wallet-status', 'driver_current') || 0;
    
    // 2. Add amount
    const newBalance = current + amount;
    
    // 3. Save to IDB
    await db.put('wallet-status', newBalance, 'driver_current');
    
    // 4. Update UI
    document.getElementById('wallet-amount').textContent = `$${newBalance}`;
    
    // 5. Animate
    // ... green flash effect
  });
});
```

### Navigation Menu - Wiring Checklist

#### Verify All Links Work:
```html
<nav>
  <a href="/">Inicio</a>
  <a href="/mapa">Mapa Interactivo</a>
  <a href="/rutas">Todas las Rutas</a>
  <a href="/driver">Panel Conductor</a>
  <a href="/contribuir">Contribuir</a>
</nav>
```

#### Mobile Menu Toggle:
```javascript
// VERIFY:
const menuToggle = document.getElementById('mobile-menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');

menuToggle.addEventListener('click', () => {
  mobileMenu.classList.toggle('hidden');
});
```

### Testing Script for Wiring:
```javascript
// Create: scripts/test-wiring.mjs
console.log('🔌 Testing Component Wiring...\n');

// Test 1: RouteCalculator buttons exist
const calcBtn = document.getElementById('calculate-btn');
const swapBtn = document.getElementById('swap-btn');
console.log('RouteCalculator buttons:', {
  calculate: !!calcBtn,
  swap: !!swapBtn
});

// Test 2: Event listeners attached
console.log('Event listeners:', {
  calculate: calcBtn?._events?.click !== undefined,
  swap: swapBtn?._events?.click !== undefined
});

// Test 3: WASM loaded
console.log('WASM module:', window.wasmModule ? 'LOADED' : 'NOT LOADED');

// Test 4: IndexedDB accessible
const dbTest = await openDB('cancunmueve-db', 2);
console.log('IndexedDB:', dbTest ? 'CONNECTED' : 'FAILED');

console.log('\n✅ Wiring test complete');
```

---

## 🔍 YOUR MISSION (Complete Autonomously)

### Phase 1: Environment Setup & Validation (30 min)
```bash
# 1. Clone and checkout the branch
git fetch origin
git checkout feature/urban-compass-v2-sync

# 2. Install dependencies with pnpm
pnpm install

# 3. Verify WASM binaries exist
ls -la src/wasm/route-calculator/
ls -la public/wasm/route-calculator/

# Expected files:
# - route_calculator.js
# - route_calculator_bg.wasm
# - route_calculator.d.ts
```

**Success Criteria:**
- ✅ All dependencies installed successfully with pnpm
- ✅ WASM binaries present in both `src/wasm/` and `public/wasm/`
- ✅ TypeScript types available for WASM modules

---

### Phase 2: Development Server Testing (45 min)

```bash
pnpm run dev
# Server should start at http://localhost:3000
```

#### Test Case 1: RouteCalculator Component
**URL:** `http://localhost:3000/`

**Actions:**
1. Open DevTools Console (check for errors)
2. Wait for "PILOTO: XXX MXN" to load in the calculator header
3. Verify default values:
   - From: "Walmart"
   - To: "Aeropuerto T2"
4. Click "Trazar Ruta" button

**Expected Results:**
- ✅ WASM module loads successfully (check console for "✅ Map loaded")
- ✅ Route calculation completes
- ✅ **CRITICAL:** Airport Gatekeeper warning appears:
  ```
  🚨 Acceso restringido a ADO/Privado. 
  Punto más cercano: Entrada al Aeropuerto (Carretera).
  ```
- ✅ Cost displays as "Cash Only" payment
- ✅ Instructions show transfer points if applicable

**Screenshot Required:** Save as `verification/test-case-1-route-calculator.png`

#### Test Case 2: Swap Button Functionality
**Actions:**
1. Swap origin/destination using the ⇆ button
2. Click "Trazar Ruta" again

**Expected Results:**
- ✅ Origin and destination are swapped
- ✅ New route calculation succeeds
- ✅ Different route instructions appear

**Screenshot Required:** Save as `verification/test-case-2-swap-button.png`

#### Test Case 3: Pilot Balance Gatekeeper
**Actions:**
1. Open DevTools → Application → IndexedDB → `cancunmueve-db` → `wallet-status`
2. Set `driver_current` to `50` (below 180 MXN threshold)
3. Reload page

**Expected Results:**
- ✅ Balance displays as "PILOTO: 50 MXN" in RED
- ✅ "Trazar Ruta" button is DISABLED
- ✅ Warning message appears:
  ```
  ⚠️ Saldo insuficiente para activar Brújula Urbana ($180 MXN req).
  ```

**Screenshot Required:** Save as `verification/test-case-3-gatekeeper.png`

#### Test Case 4: Interactive Map
**URL:** `http://localhost:3000/mapa`

**Actions:**
1. Wait for map to load (Mapbox GL JS)
2. Verify routes are rendered with different colors
3. Click on a stop marker

**Expected Results:**
- ✅ Map loads without errors
- ✅ Route polylines visible
- ✅ Stop markers show popup with:
  - Stop name
  - Route ID
  - Fare in MXN

**Screenshot Required:** Save as `verification/test-case-4-map.png`

#### Test Case 5: Driver Wallet
**URL:** `http://localhost:3000/driver`

**Actions:**
1. Note current balance
2. Click "+$100" button
3. Check IndexedDB again

**Expected Results:**
- ✅ Balance increases by 100 MXN
- ✅ UI animates (green flash + scale)
- ✅ IndexedDB `driver_current` updates correctly

**Screenshot Required:** Save as `verification/test-case-5-wallet.png`

---

### Phase 3: Production Build Verification (20 min)

```bash
pnpm run build

# Expected output:
# ✅ WASM binaries found.
# ✓ built in X.XXs
# [build] 12 page(s) built in XX.XXs
```

**Verify Generated Files:**
```bash
ls -la dist/

# Must include:
# - index.html
# - mapa/index.html
# - driver/index.html
# - rutas/index.html
# - contribuir/index.html
# - wasm/ directory with binaries
# - _astro/ directory with hashed assets
```

**Critical Check - WASM in Dist:**
```bash
ls -la dist/wasm/route-calculator/
# Should contain:
# - route_calculator.js
# - route_calculator_bg.wasm
```

---

### Phase 4: Data Integrity Audit (15 min)

**Verify `public/data/master_routes.json`:**
```bash
node -e "
const data = require('./public/data/master_routes.json');
console.log('Version:', data.metadata.version);
console.log('Total Routes:', data.rutas.length);
console.log('Schema Check:');
data.rutas.forEach(r => {
  console.log('  Route', r.id, ':', {
    hasParadas: !!r.paradas,
    hasRecorrido: !!r.recorrido,
    hasTipoTransporte: !!r.tipo_transporte,
    hasTipo: !!r.tipo,
    firstStopHasLng: r.paradas?.[0]?.lng !== undefined,
    firstStopHasLon: r.paradas?.[0]?.lon !== undefined
  });
});
"
```

**Expected Output:**
- Version: `2.3.0-normalized`
- All routes should have:
  - `paradas` (not `recorrido`)
  - `tipo_transporte` (not `tipo`)
  - Stops with `lng` (not `lon`)

**If any route fails validation:**
```bash
node scripts/normalize_data.mjs
git add public/data/master_routes.json
git commit -m "fix: re-normalize data schema"
```

---

### Phase 5: Rust/WASM Engine Testing (30 min)

**Run Unit Tests:**
```bash
cd rust-wasm/route-calculator
cargo test

# Expected:
# test tests::test_airport_gatekeeper ... ok
# test tests::test_ado_no_warning ... ok
```

**If tests fail:**
1. Check `src/lib.rs` for changes in airport detection logic
2. Verify `shared-types` crate has correct `TransportType` enum
3. Re-build WASM:
   ```bash
   pnpm run build:wasm
   ```

**Manual WASM Test (in Node):**
```javascript
// test-wasm.mjs
import init, { calculate_route } from './public/wasm/route-calculator/route_calculator.js';
import routesData from './public/data/master_routes.json' assert { type: 'json' };

await init();

// Test 1: ADO to Airport (should have NO warning)
const result1 = calculate_route(21.1605, -86.8260, 21.0412, -86.8725, routesData);
console.log('Test 1 (ADO):', result1.airport_warning ? 'FAIL' : 'PASS');

// Test 2: Bus to Airport (should have warning)
const result2 = calculate_route(21.1472, -86.8234, 21.0450, -86.8700, routesData);
console.log('Test 2 (Bus):', result2.airport_warning ? 'PASS' : 'FAIL');
```

**Run:**
```bash
node test-wasm.mjs
# Should output:
# Test 1 (ADO): PASS
# Test 2 (Bus): PASS
```

---

### Phase 6: PWA & Service Worker Validation (15 min)

**Check Service Worker Registration:**
```bash
# In browser DevTools:
# Application → Service Workers
# Should show: sw.js (Active)
```

**Verify Offline Functionality:**
1. Load `http://localhost:3000` fully
2. Open DevTools → Network
3. Set throttling to "Offline"
4. Reload page

**Expected:**
- ✅ Page loads from Service Worker cache
- ✅ WASM binaries load from cache
- ✅ Route data loads from cache

**Check `public/sw.js` Cache Strategy:**
```javascript
// Should include:
CACHE_URLS = [
  '/wasm/route-calculator/route_calculator.js',
  '/wasm/route-calculator/route_calculator_bg.wasm',
  '/data/master_routes.json',
  // ... other assets
]
```

---

### Phase 7: Performance Benchmarking (15 min)

**Lighthouse Audit:**
```bash
# Install if needed
npm install -g lighthouse

# Build and serve
pnpm run build
npx serve dist

# Run audit
lighthouse http://localhost:3000 --output html --output-path ./verification/lighthouse-report.html
```

**Target Scores:**
- Performance: ≥ 90
- Accessibility: ≥ 90
- Best Practices: ≥ 90
- SEO: ≥ 90
- PWA: ✅ (Installable)

**If scores are low:**
1. Check for unoptimized images
2. Verify WASM lazy loading
3. Check for unused CSS/JS

---

### Phase 8: Cross-Browser Testing (20 min)

**Test in:**
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (if available)
- ✅ Mobile Chrome (DevTools device emulation)

**For each browser, verify:**
1. WASM loads correctly
2. IndexedDB works
3. Mapbox GL JS renders
4. Service Worker registers

**Known Issues to Check:**
- Safari: WASM ES modules may need polyfill
- Firefox: IndexedDB permissions
- Mobile: Touch events on Swap button

---

### Phase 9: Pre-Deployment Checklist

**Environment Variables (Render.com):**
```bash
# Add to Render dashboard:
PUBLIC_MAPBOX_TOKEN=pk.eyJ1Ijoiam9zZWFudG9uaW9tdW5veiIsImEiOiJjbTllZzZ6ZzAwMHBpMnFzYm1zZzZ6ZzAwIn0.[ACTUAL_TOKEN]
```

**Build Command:**
```bash
pnpm install && pnpm run build
```

**Publish Directory:**
```
dist
```

**Verify `astro.config.mjs`:**
```javascript
site: 'https://cancunmueve.com',  // Update to actual domain
output: 'static',
```

---

### Phase 10: Documentation & Handoff

**Create `DEPLOYMENT.md`:**
```markdown
# CancúnMueve PWA - Deployment Guide

## Architecture
- **Framework:** Astro 5.0 (Static Site Generation)
- **Client Logic:** Vanilla JavaScript + TypeScript
- **Routing Engine:** Rust/WASM (Dijkstra algorithm)
- **Data Storage:** IndexedDB + JSON
- **Map Rendering:** Mapbox GL JS
- **Package Manager:** pnpm

## Production Build
\`\`\`bash
pnpm install
pnpm run build:wasm  # If WASM source changed
pnpm run build
\`\`\`

## Environment Variables
- `PUBLIC_MAPBOX_TOKEN`: Required for map rendering

## Known Limitations
- Airport access restricted to ADO routes only
- Pilot balance gatekeeper at 180 MXN
- Cash-only payment system
- Offline mode requires initial load

## Troubleshooting
### WASM fails to load
- Check `public/wasm/` directory exists
- Verify `/* @vite-ignore */` in RouteCalculator.astro
- Check browser console for module errors

### Map doesn't render
- Verify MAPBOX_TOKEN is set
- Check browser console for GL errors
- Ensure Mapbox GL CSS is loaded
```

**Update `COMMUNICATION.md`:**
```markdown
## [2026-01-30 XX:XX UTC] - Jules (Google Gemini)

**Status:** Astro + WASM Architecture Validated

**Actions:**
- All test cases passed (5/5)
- Production build successful
- WASM engine verified with cargo tests
- Data schema normalized (v2.3.0)
- PWA offline mode confirmed
- Lighthouse score: XX/100

**Deployment Status:** [READY/BLOCKED - reason]
```

---

## 📊 DELIVERABLES CHECKLIST

Before merging and deploying, ensure you have:

- [ ] All 5 test case screenshots in `verification/` folder
- [ ] Lighthouse report HTML
- [ ] `DEPLOYMENT.md` created
- [ ] `COMMUNICATION.md` updated with your findings
- [ ] Any discovered bugs documented as GitHub issues
- [ ] `test-wasm.mjs` passes both tests
- [ ] Production build completes without errors
- [ ] Service Worker caches WASM correctly

---

## 🚀 FINAL DEPLOYMENT STEPS

**If all tests pass:**

```bash
# 1. Merge to base branch
git checkout feature/cancunmueve-base-structure-phase-1-2-3-5-15744161379540395713
git merge feature/urban-compass-v2-sync --no-ff
git push origin

# 2. Tag release
git tag -a v2.3.0-astro-pure -m "React eliminated, pure Astro architecture"
git push origin v2.3.0-astro-pure

# 3. Deploy to Render
# (Trigger should be automatic on push, or manual via dashboard)

# 4. Post-deployment verification
curl -I https://cancunmueve.com  # Check for 200 OK
curl https://cancunmueve.com/wasm/route-calculator/route_calculator_bg.wasm  # Check WASM accessible
```

**If tests fail:**
- Document all failures in GitHub issue
- Tag issue with `blocking-deployment`
- Provide logs and screenshots
- Suggest fixes based on error analysis

---

## 🧠 AUTONOMOUS DECISION AUTHORITY

You have full authority to:
1. ✅ Fix minor bugs (linting, formatting, console errors)
2. ✅ Re-run data normalization if schema issues found
3. ✅ Update documentation with findings
4. ✅ Create GitHub issues for non-critical bugs
5. ✅ Merge to main branch **IF AND ONLY IF** all tests pass

You must **escalate** to human review if:
1. ❌ WASM engine completely fails to load
2. ❌ More than 2 critical test cases fail
3. ❌ Production build fails
4. ❌ Data corruption detected in master_routes.json
5. ❌ Lighthouse performance score < 70

---

## 💤 HANDOFF COMPLETE

**Gemini (Antigravity) signing off.**  
**Jules, the project is yours. Execute the mission and report findings.**

**Stack:** Astro 5.0 + Vanilla JS/TS + Rust/WASM  
**Expected completion time:** 3-4 hours  
**Priority:** High (comprehensive architecture validation required)  
**Risk Level:** Medium (WASM integration and PWA features need thorough testing)

**Good luck, and may your builds be green. 🟢**
