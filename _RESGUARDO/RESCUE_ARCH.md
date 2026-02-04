# Rescue Architecture: Data Flow Analysis

**Date:** 2024-05-24
**Phase:** Recovery & Verification

## Overview
This document outlines the recovered data pipeline that bridges legacy static data with the high-performance Rust WASM engine. The system transforms legacy JSON route definitions into optimized, compile-time embedded assets for the route calculator.

## Data Pipeline

### 1. Source of Truth
*   **File:** `src/data/routes.json`
*   **Format:** Legacy JSON structure containing an array of route objects (`rutas`).
*   **Content:** Contains route IDs, names, transport types, and an ordered list of stops (`paradas`) with coordinates.

### 2. Transformation Layer (Node.js)
*   **Script:** `scripts/process_legacy_routes.cjs`
*   **Role:** ETL (Extract, Transform, Load)
*   **Logic:**
    *   Reads `routes.json`.
    *   **Mapping:** Normalizes transport types (e.g., `Bus_Urbano_Isla` -> `Bus`).
    *   **Extraction:** Flattens stop data into a dedicated `stopsDB` (Name -> [Lat, Lng]).
    *   **Cleaning:** Handles inconsistent field names (`parada` vs `nombre`, `horario` objects vs strings).
    *   **Output Generation:** Constructs a simplified, type-safe JSON structure suitable for Serde deserialization in Rust.

### 3. Build Artifact
*   **File:** `rust-wasm/route-calculator/src/rust_data/embedded_routes.json`
*   **Nature:** Intermediate build artifact (Git-ignored but critical for build).
*   **Structure:**
    ```json
    {
      "routes": [ ... ],
      "stops": { "StopName": [lat, lng], ... }
    }
    ```

### 4. Consumption (Rust/WASM)
*   **Mechanism:** `include_str!` macro.
*   **Process:**
    *   The `route-calculator` crate reads `embedded_routes.json` at **compile time**.
    *   Data is parsed into `Route` and `Stop` structs.
    *   Initializes the `STOPS_DB` and graph nodes in memory upon WASM initialization.

## Critical Verification Points
*   **Consistency:** The `scripts/` directory must contain the `.cjs` extraction logic to ensure the Rust build is reproducible.
*   **Synchronization:** Any update to `src/data/routes.json` requires re-running `process_legacy_routes.cjs` before recompiling the WASM module.
