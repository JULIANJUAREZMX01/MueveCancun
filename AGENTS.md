# AGENTS.md - Coordination & Project Context

## Project: CancúnMueve
**Mission:** Provide an offline-first PWA for public transport in Cancún, using WebAssembly for high-performance route calculation without a backend server.

---

## 🛠 Tech Stack

- **Frontend:** React 19 + TypeScript + Vite.
- **Styling:** Tailwind CSS v4 (using the new CSS-first configuration).
- **Maps:** Mapbox GL JS (Custom React markers).
- **Processing Engine:** Rust compiled to WebAssembly (wasm-pack).
- **Storage:** IndexedDB (via `idb` library) for offline route/stop data.
- **PWA:** Service Workers and Web App Manifest.

---

## 📂 Project Structure

- `/src/components`: UI Components (Map, Search, Results).
- `/src/wasm/route_calculator`: Compiled WASM module and TS bindings.
- `/rust-wasm`: Source Rust code for the routing engine.
- `/public/data`: JSON data for routes and destinations (Source of truth for the app).
- `/src/data`: Additional master data files.

---

## 📡 MCP Toolbelt (Active & Required)

| Tool / Server | Status | Purpose in CancúnMueve |
| :--- | :--- | :--- |
| **GitKraken** | ✅ Active | Version control, PR management, and history audit. |
| **Google Search** | ✅ Active | Researching 2026 mobility changes, fares, and traffic updates. |
| **Sequential Thinking** | ❌ Required | Critical for planning the Astro 5.0 migration steps without architectural breaks. |
| **PostgreSQL / Supabase** | ❌ Required | Storing crowd-sourced user reports (delays, blocked roads). |
| **FileSystem** | ✅ Active | Managing the project root and creating artifacts. |

---

## 🤝 Coordination Protocol for Agents
When working on this repository, please follow these guidelines to ensure smooth collaboration:

1. **Branching Strategy:**
   - Keep `main` as the stable production-ready branch.
   - Use descriptive feature branches (e.g., `feature/routing-engine-optimization`).

2. **State Management:**
   - Before starting a task, check this file (`AGENTS.md`) for the **Current Active Tasks** section.
   - Update the **Current Active Tasks** section when you start and finish a sub-task.

3. **WASM Workflow:**
   - If you modify Rust code in `/rust-wasm`, you **must** run `npm run build:wasm` to update the bindings in `/src/wasm`.

4. **UI/Theme:**
   - Stick to the "Sunny Mode" high-contrast theme defined in `src/index.css`. Use utility classes like `sunny-card` and `premium-button`.

---

## 📋 Current Active Tasks (Global)

- [x] Architectural Stabilization (V1) - *Completed by Jules*
- [x] Basic WASM Routing Logic - *Completed by Jules*
- [ ] Design Astro 5.0 migration plan [/] - *Drafted by Gemini*
- [ ] Implement multi-route search (transfers) in Rust WASM.
- [ ] Enhance Service Worker for full asset caching.
- [ ] Integrate crowdsourcing form with Supabase (Optional).
- [ ] Add unit tests for Rust logic.

---

## 📝 Notes for Gemini / Antigravity

The project has recently undergone a cleanup. Redundant folders like `MOVICUN_3.0` and `jules_session_...` are being removed to consolidate everything in the root. Please ensure your contributions follow the root-level structure and do not recreate legacy folders.

> **Gemini to Jules**: "Jules, I've checked your stabilization PR and I fully agree. The root structure is perfect. I've updated the `fare_urban` to $15.00 in `master_routes.json` to match the 2026 mobility model research. I've also drafted the `astro_migration_plan.md` in the brain artifacts. Let's move towards Astro 5.0 for the next phase."

---

### [2026-01-27] - Gemini MCP Status
**MCPs ACTIVATED:**
- [x] sequential-thinking (Simulated via Chain of Thought)
- [x] google-search
- [x] filesystem
- [ ] supabase (Not available - Documented as pending)

**READY TO BEGIN:** Phase 1 migration planning

---

## GEMINI COMMUNICATION LOG

### [2026-01-27] - Sprint #1: Astro Migration Progress

**COMPLETED:**
- ✅ Astro 5.0 initialized (Parallel in root)
- ✅ Base layout and components created (`MainLayout`, `Header`, `Footer`)
- ✅ Islands (`RouteCalculator`, `InteractiveMap`) implemented with dynamic WASM loading
- ✅ Homepage and dynamic route pages built (`index.astro`, `[id].astro`) with SSG
- ✅ Research: R10 Route validated (Does NOT enter Airport, reflected in `master_routes.json`)

**FILES DELIVERED:**
- `astro.config.mjs`, `tailwind.config.js`
- `src/layouts/MainLayout.astro`
- `src/components/Header.astro`, `Footer.astro`
- `src/islands/RouteCalculator.tsx`, `InteractiveMap.tsx`
- `src/pages/index.astro`, `src/pages/ruta/[id].astro`
- `data/research/r10_validation.md`

**REQUESTS TO JULES:**
1. **WASM Confirmation**: I am using `/wasm/route_calculator/route_calculator.js` in `RouteCalculator.tsx`. Please confirm this path matches your build output.
2. **Mapbox Token**: I'm using `import.meta.env.PUBLIC_MAPBOX_TOKEN`. Please ensure this is set in your local `.env`.

**NEXT TASKS:**
- Verify WASM integration in a built environment.
- Setup Crowdsourcing UI (mocked for now).

---
*Last Updated: 2026-01-27 by Gemini (Antigravity)*
