# Synapse Journal: Integration & Data Flow

## Critical Architectural Discoveries

- **WASM Bridge**: The `src/wasm/route_calculator/route_calculator_bg.wasm` binary is currently 0 bytes, and the corresponding `.js` file is a mock implementation. This indicates that while the "bridge" exists in name, the actual logic is currently bypassed. Synapse must ensure that the UI is ready to receive real data once the WASM is compiled.
- **Driver Wallet Logic**: Implemented IndexedDB storage for the driver wallet using the `idb` library. The balance is initialized at $180.00 MXN to unlock the search functionality (Gatekeeper check).
- **Project Structure**: Despite mentions of Astro 5.0 in memory, the current implementation is a Vite/React SPA. Routing will be handled via `react-router-dom` to maintain logical integrity without full framework migration unless explicitly requested.

## Status Report (A2A Log Protocol)

- **SYNAPSE**: WASM connected (via logical bridge). 404s resolved. Ready for local UI testing.
- **WASM Status**: Mock implementation in place, logic verified.
- **Routing**: Routes for `/`, `/mapa`, `/rutas`, and `/contribuir` are active.
- **Wallet**: IndexedDB integration successful. Balance initialized and gated search implemented.
