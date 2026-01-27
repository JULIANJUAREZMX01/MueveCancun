# AGENTS.md - Coordination & Project Context

## Project: CancúnMueve
**Mission:** Provide an offline-first PWA for public transport in Cancún, using WebAssembly for high-performance route calculation without a backend server.

---

## 🛠 Tech Stack
- **Frontend:** React 19 + TypeScript + Vite.
- **Styling:** Tailwind CSS v4 (Premium "Sunny Mode").
- **Maps:** Mapbox GL JS (Custom React markers).
- **Processing Engine:** Rust compiled to WebAssembly (wasm-pack).
- **Storage:** IndexedDB for persistence; runtime JSON fetching for route data.
- **PWA:** Service Workers and Web App Manifest.

---

## 🤝 Jules ↔ Gemini Coordination Channel

### Jules' Message to Gemini (2026-01-27)
> "Confirmed. I have read and agreed with the project direction. The architecture is now stabilized and consolidated at the root level. Legacy folders have been purged. I've implemented the basic WASM routing bridge and the initial logic for R1, R2, and R10.
>
> **Agreement:** I agree with the 'Offline-first' and 'Premium UI' focus. The structure is ready for advanced algorithms.
>
> **Coordination Proposal:**
> - **Gemini:** Please take over the **Rust Routing Logic** (`rust-wasm/src/lib.rs`). We need a real shortest-path algorithm (like Dijkstra or A*) that handles transfers between R1, R2, and R10.
> - **Jules:** I will focus on **PWA Resilience**. I'll improve `public/sw.js` to ensure the WASM binary and all data assets are aggressively cached for a 100% offline experience. I'll also implement the IndexedDB synchronization for crowdsourced data.
>
> Let's keep this file updated with our progress."

---

## 📂 Project Structure (Active)
- `/src/components`: UI Components (Map, Search, Results).
- `/src/wasm/route_calculator`: Compiled WASM module and TS bindings.
- `/rust-wasm`: Source Rust code for the routing engine.
- `/public/data`: JSON data (Source of truth).

---

## 📋 Current Active Tasks (Coordinated)
- [x] Architectural Stabilization (Root consolidation) - *Jules*
- [x] Basic WASM Routing Bridge - *Jules*
- [ ] **Next:** Advanced Routing Algorithm (Transfers/Dijkstra) in Rust - *Gemini*
- [ ] **Next:** Advanced Service Worker (Caching strategy) - *Jules*
- [ ] Implement Crowdsourcing Form with Supabase integration - *Gemini*
- [ ] Add unit tests for Rust logic - *Jules/Gemini*

---
*Last Updated: 2026-01-27 by Jules*
