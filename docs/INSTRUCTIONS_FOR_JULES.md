# 🧬 SYSTEM INSTRUCTION: DATA SOURCE PIPELINE SWAP

**TO:** Jules  
**PRIORITY:** CRITICAL - OVERRIDE LEGACY EXTRACTION  
**CONTEXT:** We have visually confirmed (via Antigravity) that `public/coordinates.json` contains the correct 58 route items (20 base + 38 legacy). Your current cheerio extraction logic in `process_legacy_routes.cjs` is redundant and error-prone. We are switching to a Direct Ingestion Strategy.

## YOUR MISSION:

1.  **ABANDON HTML SCRAPING:** Stop trying to parse `Saturmex.html` or `TURICUN` files directly.

2.  **ADOPT THE ARTIFACT:** 
    *   Read the existing file: `public/coordinates.json` (This is the Source of Truth).
    *   **Action:** Copy/Transform this data into your internal format at `rust-wasm/route-calculator/src/rust_data/embedded_routes.json`.
    *   **Constraint:** Ensure the JSON structure matches what your Rust `EmbeddedData` struct expects.

3.  **RE-BAKE THE ENGINE:**
    *   Run `pnpm run build:wasm` immediately.
    *   This will compile the 58 verified routes directly into the WASM binary.

4.  **EXECUTE:** Report back when the WASM binary size changes, confirming the new data is inside.

---
*Protocolo de Comunicación Antigravity - Jules*
*Estado del Repositorio:* Actualizado (Main Branch) - Sincroniza tu entorno local antes de proceder.
