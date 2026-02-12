# 🔴 SEGMENT 01: WASM DATA DECOUPLING

**OWNER**: Jules (Lead Full Stack)  
**STATUS**: READY FOR EXECUTION  
**PRIORITY**: P0 (CRITICAL - SYSTEM FUNDAMENTAL)  
**FOCUS**: Rust (`lib.rs`) & Astro (`RouteCalculator.astro`)

---

## 🎯 OBJECTIVE

Transform the Route Calculation Engine from a **compiled-in static catalog** to a **dynamic runtime injection** system. This allows `master_routes.json` to be the single source of truth without recompiling Rust.

---

## 🚀 EXECUTION STEPS

### 1. BACKEND (RUST/WASM)

**File**: `rust-wasm/route-calculator/src/lib.rs`

1.  **REMOVE** `lazy_static!` block containing the hardcoded route `vec![]`.
2.  **DEFINE** `AppState` struct:
    ```rust
    struct AppState {
        routes_list: Vec<Route>,           // For sequential scanning
        routes_map: HashMap<String, Route>, // For O(1) lookups
    }
    ```
3.  **IMPLEMENT** `static DB: Lazy<RwLock<AppState>>`.
4.  **HARDEN** data structures using `serde`:
    - Ensure `Route` struct matches `master_routes.json` schema exactly (optional `horario`, `empresa`).
    - Use `#[serde(rename = "...")]` to map JSON keys (Spanish) to Rust fields (English).
5.  **EXPORT** `load_catalog(json_payload: &str)` function:
    - Parse JSON.
    - Populate `DB`.
    - Return `Result<(), JsValue>`.
6.  **UPDATE** `find_route` to query `DB.read()` instead of static vector.

### 2. FRONTEND (ASTRO)

**File**: `src/components/RouteCalculator.astro`

1.  **FETCH** `master_routes.json` on component mount (`onMount` or script execution).
2.  **INJECT** data into WASM:
    ```javascript
    const response = await fetch("/data/master_routes.json");
    const data = await response.json();
    window.wasmModule.load_catalog(JSON.stringify(data));
    ```
3.  **BLOCK** search UI until catalog is loaded (show a loader).

---

## 🧪 METRICS & TESTS

### UNIT TESTS (Rust)

- [ ] `cargo test` passes for `load_catalog` with mock JSON.
- [ ] `find_route` returns correct results using dynamically loaded data.
- [ ] Error handling: Loading malformed JSON returns a clear `Err`.

### INTEGRATION TESTS (Browser)

- [ ] **Data Check**: Edit `master_routes.json` (e.g., change price $15 -> $99). Refresh page. Result card shows **$99**.
- [ ] **Performance**: `dhell` load time < 50ms for 150KB JSON.
- [ ] **Stability**: No 500 errors on reload.

---

## 📸 EVIDENCE REQUIREMENTS

1.  **Screenshot 1**: Rust `cargo test` output (All Passed).
2.  **Screenshot 2**: Browser console showing "Catalog loaded: 54 routes".
3.  **Screenshot 3**: A route calculation result displaying a value modified directly in the JSON file (proving decoupling).

---

## ✅ DEFINITION OF DONE for SEGMENT 01

- `lib.rs` has NO hardcoded routes.
- `master_routes.json` drives the entire application logic.
- All unit tests pass.
- Frontend displays correct data from JSON.

**NEXT STEP**: Proceed to `02_CSS_MIGRATION.md`.
