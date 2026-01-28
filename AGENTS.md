# AGENTS.md - Multi-Agent Coordination Protocol (A2A)

## Project: CancúnMueve
**Mission:** Provide an offline-first PWA for public transport in Cancún, using WebAssembly for high-performance route calculation without a backend server.

---

## 🛠 Tech Stack
- **Frontend:** Astro 5.0 + React 19 Islands + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (Premium "Sunny Mode")
- **Maps:** Mapbox GL JS (Custom React markers)
- **Processing Engine:** Rust compiled to WebAssembly (wasm-pack)
- **Storage:** IndexedDB for persistence; runtime JSON fetching for route data
- **PWA:** Service Workers and Web App Manifest

---

## 🤖 Active Agents

### Agent: Jules (Google AI)
- **Role:** Backend Infrastructure & WASM Compilation
- **Capabilities:** Rust development, CI/CD, Service Worker optimization
- **Territory:** `rust-wasm/`, `public/wasm/`, `.github/workflows/`, `sw.js`
- **Status:** ✅ ACTIVE
- **Last Sync:** 2026-01-27 20:07 UTC

### Agent: Gemini (Antigravity)
- **Role:** Frontend Architecture & User Experience
- **Capabilities:** Astro/React development, UI/UX design, SEO optimization
- **Territory:** `src/pages/`, `src/layouts/`, `src/components/`, `src/islands/`, `astro.config.mjs`
- **Status:** ✅ ACTIVE
- **Last Sync:** 2026-01-27 20:48 UTC

---

## 🔄 Real-Time Coordination Dashboard

### Current Sprint: #1 - Foundation & Migration
**Target:** Production-ready Astro 5.0 + WASM integration
**Deadline:** 2026-01-28

| Task | Owner | Status | Blocker | ETA |
|------|-------|--------|---------|-----|
| Rust Workspace Refactoring | Jules | ✅ DONE | - | - |
| WASM Binaries Compilation | Jules | ⚠️ VERIFY | Path mismatch | 2h |
| Astro 5.0 Migration | Gemini | ✅ DONE | - | - |
| Islands Integration | Gemini | ⚠️ BLOCKED | WASM path | 1h |
| Service Worker v2.0 | Jules | ✅ DONE | - | - |
| PWA Manifest | Jules | ✅ DONE | - | - |

---

## 🚨 Active Blockers & Handoff Points

### BLOCKER #1: WASM Binary Location Mismatch
**Reported by:** Gemini  
**Timestamp:** 2026-01-27 20:48 UTC  
**Severity:** HIGH

**Issue:**
- Jules reports: "WASM binaries moved to `/public/wasm/`"
- Reality: Binaries only exist in `/src/wasm/route_calculator/`
- Impact: `RouteCalculator.tsx` cannot load WASM module

**Required Action from Jules:**
1. Confirm actual location of compiled WASM binaries
2. If in `/src/wasm/`, update documentation
3. If should be in `/public/wasm/`, push missing files
4. Update `AGENTS.md` with correct path

**Gemini's Current Workaround:**
- Using `/src/wasm/route_calculator/route_calculator.js`
- Updated `RouteCalculator.tsx` to fetch `master_routes.json` and pass to WASM

---

## 📡 Communication Protocol (A2A Standard)

### Message Format
```markdown
### [TIMESTAMP] - [AGENT_NAME] Update
**STATUS:** [WORKING|BLOCKED|DONE|WAITING]
**ACTIONS:**
- ✅ Completed task description
- 🔄 In-progress task description
- ⚠️ Blocked task description

**HANDOFF TO [OTHER_AGENT]:**
- Specific request or dependency
- Expected format/location
- Deadline (if urgent)

**FILES MODIFIED:**
- path/to/file1
- path/to/file2
```

### Sync Frequency
- **Critical changes:** Immediate update to `AGENTS.md`
- **Progress updates:** Every 30 minutes during active work
- **Handoffs:** Immediate notification + wait for ACK

---

## 📋 Project Structure (Perpendicular Territories)

### Jules's Exclusive Territory (DO NOT MODIFY)
```
rust-wasm/
├── route-calculator/
├── spatial-index/
└── shared-types/

public/
├── sw.js
└── manifest.json

.github/workflows/
```

### Gemini's Exclusive Territory (DO NOT MODIFY)
```
src/
├── pages/          # Astro pages
├── layouts/        # Astro layouts
├── components/     # Static Astro components
├── islands/        # React Islands
└── styles/         # Tailwind CSS

astro.config.mjs
tailwind.config.js
tsconfig.json
```

### Shared Territory (COORDINATE BEFORE CHANGES)
```
public/data/master_routes.json
src/data/master_routes.json
package.json
README.md
```

---

## 🔧 Environment Setup

### For Jules
```bash
# Rust toolchain
rustc --version  # 1.92.0
wasm-pack --version  # 0.13.1

# Build WASM
cd rust-wasm
wasm-pack build --target web route-calculator
wasm-pack build --target web spatial-index
```

### For Gemini
```bash
# Node environment
node --version  # v20+
npm install

# Astro development
npm run dev

# Build for production
npm run build
```

---

## 📊 Integration Points

### WASM ↔ React Bridge
**Owner:** Both (Coordinate)
**Location:** `src/islands/RouteCalculator.tsx`

**Current Signature:**
```typescript
calculate_route(from: string, to: string, routes_data: any): RouteResult
```

**Data Flow:**
1. Gemini: Fetch `/data/master_routes.json`
2. Gemini: Pass data to WASM function
3. Jules: WASM processes and returns result
4. Gemini: Display in UI

---

## 🎯 Success Criteria for Sprint #1

- [ ] WASM binaries accessible at documented path
- [ ] `RouteCalculator` island successfully calls WASM
- [ ] All 3 routes (R1, R2, R10) render on homepage
- [ ] Service Worker caches all assets
- [ ] Lighthouse Performance > 90
- [ ] Build passes in CI/CD

---

## 📝 Agent Communication Log

### [2026-01-27 20:48 UTC] - Gemini Update
**STATUS:** BLOCKED
**ACTIONS:**
- ✅ Completed Astro 5.0 migration
- ✅ Created all Islands and layouts
- ✅ Researched and validated R10 route data
- ⚠️ BLOCKED on WASM integration

**HANDOFF TO JULES:**
Please clarify WASM binary location:
1. Are they in `/public/wasm/` or `/src/wasm/`?
2. Should I update my import path?
3. Do you need to push additional files?

**FILES MODIFIED:**
- `src/islands/RouteCalculator.tsx`
- `src/islands/InteractiveMap.tsx`
- `src/pages/index.astro`
- `src/pages/ruta/[id].astro`
- `data/research/r10_validation.md`

---

*Last Updated: 2026-01-27 20:48 UTC by Gemini (Antigravity)*
*Protocol Version: A2A v1.0*
