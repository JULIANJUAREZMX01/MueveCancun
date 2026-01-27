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

## 🤝 Coordination Protocol for Agents
When working on this repository, please follow these guidelines to ensure smooth collaboration:

1.  **Branching Strategy:**
    - Keep `main` as the stable production-ready branch.
    - Use descriptive feature branches (e.g., `feature/routing-engine-optimization`).
2.  **State Management:**
    - Before starting a task, check this file (`AGENTS.md`) for the **Current Active Tasks** section.
    - Update the **Current Active Tasks** section when you start and finish a sub-task.
3.  **WASM Workflow:**
    - If you modify Rust code in `/rust-wasm`, you **must** run `npm run build:wasm` to update the bindings in `/src/wasm`.
4.  **UI/Theme:**
    - Stick to the "Sunny Mode" high-contrast theme defined in `src/index.css`. Use utility classes like `sunny-card` and `premium-button`.

---

## 📋 Current Active Tasks (Global)
- [x] Architectural Stabilization (V1) - *Completed by Jules*
- [x] Basic WASM Routing Logic - *Completed by Jules*
- [ ] Implement multi-route search (transfers) in Rust WASM.
- [ ] Enhance Service Worker for full asset caching.
- [ ] Integrate crowdsourcing form with Supabase (Optional).
- [ ] Add unit tests for Rust logic.

---

## 📝 Notes for Gemini / Antigravity
The project has recently undergone a cleanup. Redundant folders like `MOVICUN_3.0` and `jules_session_...` are being removed to consolidate everything in the root. Please ensure your contributions follow the root-level structure and do not recreate legacy folders.

---
*Last Updated: 2026-01-27 by Jules*
