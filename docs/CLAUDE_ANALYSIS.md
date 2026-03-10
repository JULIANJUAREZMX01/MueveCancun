# Claude Analysis: Agents, Workflows, and WASM Setup

Based on the exploration of the repository, here is a detailed breakdown of the current architecture, documentation, and agent-based workflows for the MueveCancun PWA project.

## 1. Workflows & CI/CD (`.github/workflows`)

The project uses GitHub Actions to automate several tasks.
- **`claude-delegation.yml`**: This workflow provides an interesting mechanism to delegate "unplanned work" to Claude. It uses `workflow_dispatch` to allow manual execution, accepting an `instructions` input. It then uses the `anthropics/claude-code-base-action` to plan and apply changes via a PR, strictly avoiding direct pushes to protected branches.
- **`build-wasm.yml`**: Automates the compilation of the Rust/WASM engine, ensuring that the critical routing logic is built and ready for the frontend.
- **`codeql.yml`**: Standard CodeQL analysis for security vulnerability scanning.

## 2. Agent Documentation (`AGENTS.md`)

The `AGENTS.md` file serves as a comprehensive communication log and architectural guide for the "AI agents" (Jules, Gemini, Antigravity) working on the project.
- **Logs**: It details completed tasks (e.g., Astro 5.0 migration, WASM infrastructure setup, Dijkstra implementation).
- **Architecture (Nexus Protocol)**: It describes a 4-layer architecture:
  1.  **Data Layer**: `public/data/master_routes.json` containing route info and "social signals" (e.g., traffic alerts).
  2.  **Processing Layer**: Rust/WASM engine (`rust-wasm/route-calculator/src/lib.rs`) handling routing logic using SpatialHash and Dijkstra's algorithm. Compiled to `/wasm/route-calculator/route_calculator.js`.
  3.  **Presentation Layer**: Astro SSG components (Vanilla JS) with offline PWA support.
  4.  **Persistence Layer**: IndexedDB for user wallet balance and route caching.
- **Troubleshooting**: Provides layer-by-layer troubleshooting steps and development commands.

## 3. WASM / Rust / TypeScript Setup

The core routing intelligence is built in Rust and compiled to WebAssembly (WASM) for high-performance, offline-capable execution in the browser.

- **Rust Engine**: Located in `rust-wasm/route-calculator/`. It implements Dijkstra's algorithm with transfer support and dynamic financial logic (2026 model based on zones/tourist status).
- **WASM Bridge**: `docs/BRIDGE_WASM.md` details the API exposed by WASM to the frontend (e.g., `calculate_route`, `calculate_trip_cost`).
- **Compilation**: The WASM binaries are built using `node scripts/build-wasm.mjs`, which utilizes `wasm-pack` and `binaryen` for optimization. The compiled binaries and JS bindings are output directly to `public/wasm/route-calculator/` and `public/wasm/spatial-index/` so they can be served as static assets by Astro.
- **Previous Issues (`docs/ANALISIS_COMPLETO.md`)**: A previous analysis identified and fixed an issue where WASM binaries were duplicated in both `/src/wasm/` and `/public/wasm/`. The `/src/wasm/` directory was removed, and the build script was updated to only output to `/public/wasm/`.
- **Data Ingestion (`docs/INSTRUCTIONS_FOR_JULES.md`)**: A recent instruction mandates using `public/coordinates.json` as the source of truth for legacy routes, directly transforming it into `rust-wasm/route-calculator/src/rust_data/embedded_routes.json` rather than scraping HTML files.

## 4. Specific Issue Addressed: `getTransportLabel` Error

The user reported a UI error: `Error: getTransportLabel is not defined`.
- **Cause**: The `getTransportLabel` utility function was being called within the client-side `<script>` tag of `src/components/RouteCalculator.astro` to format transport types (e.g., "Bus", "Combi"), but it had not been imported into that script scope.
- **Resolution**: An import statement (`import { getTransportLabel } from '../utils/transport';`) will be added to the script tag in `src/components/RouteCalculator.astro` to resolve the reference error.
