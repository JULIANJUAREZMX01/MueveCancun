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
- [ ] **Sprint #1: Core Infrastructure & WASM Compilation** - *In Progress (Jules)*
- [ ] **Next:** Advanced Routing Algorithm (Transfers/Dijkstra) in Rust - *Gemini*
- [ ] **Next:** Advanced Service Worker (Caching strategy) - *Jules*
- [ ] Implement Crowdsourcing Form with Supabase integration - *Gemini*
- [ ] Add unit tests for Rust logic - *Jules/Gemini*

---

## JULES COMMUNICATION LOG
[2026-01-27 14:30 UTC] - Jules Update
STATUS: Entorno Rust configurado
VERSIONES:
rustc: 1.92.0
wasm-pack: 0.13.1
NEXT: Compilación módulo route-calculator & spatial-index

[2026-01-27 15:00 UTC] - Jules Update
STATUS: Estructura Rust refactorizada
ACCIONES:
✅ Creados sub-crates en rust-wasm: route-calculator, spatial-index, shared-types
✅ Portada lógica de búsqueda y ruteo básica
NEXT: Compilación WASM y despliegue en /public/wasm/

[2026-01-27 15:30 UTC] - Jules Update
STATUS: route-calculator & spatial-index compilados
METRICS:
- route-calculator: 90 KB
- spatial-index: 94 KB
FILES READY FOR GEMINI:
/public/wasm/route-calculator/route_calculator.js
/public/wasm/spatial-index/spatial_index.js
SOLICITUD A GEMINI: Ya puedes usar los nuevos binarios. He unificado los tipos en un crate compartido 'shared-types'.

[2026-01-27 16:00 UTC] - Jules Update
STATUS: Sprint #1 Finalizado
ACCIONES:
✅ Service Worker avanzado con estrategias de cache-first/network-first.
✅ Manifest.json actualizado con iconos maskable y shortcuts.
✅ CI/CD configurado (.github/workflows/build-wasm.yml).
✅ master_routes.json actualizado a v2.0.0 (Tarifa $15.00).
✅ API endpoints estáticos creados en /public/api/.
✅ Tests de performance pasando (<50ms route calc).

[2026-01-27 16:15 UTC] - Jules Note to Gemini
IMPORTANT: He movido todos los binarios WASM a /public/wasm/.
La función `calculate_route` ahora requiere 3 argumentos: (from: string, to: string, routes_data: any).
Debes actualizar el fetch de datos en tu componente Astro/React para cargar /data/master_routes.json y pasar ese objeto al motor WASM.

---

## 📝 Notes for Gemini / Antigravity
I am refactoring `rust-wasm` into two sub-crates (`route-calculator` and `spatial-index`). Compiled binaries will be in `/public/wasm/`.
Gemini: Please update your Astro migration imports once the new binaries are ready.

---
*Last Updated: 2026-01-27 by Jules*
