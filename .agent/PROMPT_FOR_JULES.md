# 🧬 SYSTEM INSTRUCTION: ADVANCED BACKEND REFACTOR (DEEP ARCHITECTURE)

**TO**: Jules (Senior Rust Engineer)  
**FROM**: The Orchestrator + Antigravity (Frontend Lead)  
**DATE**: 2026-02-10 15:27  
**SEVERITY**: 🔴 P0 (Critical Infrastructure)  
**SCOPE**: Full Data Decoupling + API Expansion + Future-Proofing (Sprint 6 Prep)

---

## 📊 EXECUTIVE CONTEXT

### Project Status
- **Application**: 100% functional (post-Sprint 5 recovery)
- **Your WASM Engine**: 100% intact and trusted (never compromised)
- **Frontend Prep**: Complete and waiting for you
- **Overall Progress**: 75% (Sprint 1-5 complete)

### What Just Happened (Sprint 5 Recovery)
We attempted TypeScript strict mode → broke Astro routing → reverted everything → app restored to 100% functionality. **Your WASM code was never touched and remains perfect.**

### Why This Matters
We're transforming MueveCancun from a **static prototype** to a **dynamic B2B platform**. The hardcoded catalog in `lib.rs` is blocking:
- Hot-reload route updates
- Sprint 6 (Social Intelligence scraper)
- Multi-tenant support
- Scalability

**Full context**: See `jules_context_brief.md` in artifacts directory

---

## 🎯 MISSION OBJECTIVES (EXPANDED)

### 1. ARCHITECTURAL LOBOTOMY
- **DELETE** the hardcoded `lazy_static` catalog from `lib.rs`
- **IMPLEMENT** dual-structure storage:
  - `Vec<Route>` for sequential scanning/fuzzy search
  - `HashMap<String, Route>` for O(1) lookups by ID (critical for SEO pages)
- **WRAP** in `RwLock` for thread-safety

### 2. DATA SCHEMA HARDENING (Serde Magic)
- **ALIGN** Route struct with Frontend's `master_routes.json` (152KB, 5414 lines)
- **USE** `#[serde(rename = "...")]` to bridge English code ↔ Spanish JSON
- **FUTURE-PROOF** with optional fields for Sprint 6

### 3. API EXPANSION (WASM Exports)
Implement **4 functions** (not just 1):
1. `load_catalog(json: &str) -> Result<(), JsValue>` - Data injection
2. `get_route_by_id(id: &str) -> Result<JsValue, JsValue>` - SEO pages
3. `get_all_routes() -> Result<JsValue, JsValue>` - UI catalog
4. `find_route(origin: &str, dest: &str) -> Result<JsValue, JsValue>` - Core logic

---

## 📋 CRITICAL: JSON SCHEMA STRUCTURE

**Frontend JSON** (`public/data/master_routes.json`):

```json
{
  "version": "2.3.0",
  "rutas": [
    {
      "id": "R1_ZONA_HOTELERA_001",
      "nombre": "R-1 Centro → Zona Hotelera",
      "tarifa": 15,
      "tipo": "Bus_Urban",
      "empresa": "Controladora SEA",
      "frecuencia_minutos": 10,
      "horario": {
        "inicio": "06:00",
        "fin": "22:30"
      },
      "paradas": [
        {
          "id": "R1_001",
          "nombre": "La Rehoyada / Villas Otoch",
          "lat": 21.1619,
          "lng": -86.8515,
          "orden": 1,
          "landmarks": "Base Operativa"
        }
      ]
    }
  ]
}
```

**Key Points**:
- ✅ Wrapper object: `{version, rutas: []}`
- ✅ `paradas` are **objects**, not strings
- ✅ Many fields are **optional** (empresa, frecuencia_minutos, horario)
- ✅ 152KB file with 50+ routes ready to test

---

## 🛠️ TECHNICAL SPECIFICATIONS (Rust Implementation)

### Required Structs

```rust
use std::collections::HashMap;
use std::sync::RwLock;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

// 1. WRAPPER STRUCT (Matches JSON root)
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RouteCatalog {
    pub version: String,
    pub rutas: Vec<Route>,
}

// 2. ROUTE STRUCT (Matches JSON route object)
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Route {
    pub id: String,
    #[serde(rename = "nombre")]
    pub name: String,
    #[serde(rename = "tarifa")]
    pub price: f64,
    #[serde(rename = "tipo")]
    pub transport_type: String,
    
    // Optional fields (not all routes have them)
    #[serde(default)]
    pub empresa: Option<String>,
    #[serde(default)]
    pub frecuencia_minutos: Option<u32>,
    #[serde(default)]
    pub horario: Option<Schedule>,
    
    #[serde(rename = "paradas")]
    pub stops: Vec<Stop>,
    
    // Sprint 6 prep (future-proofing)
    #[serde(default)]
    pub social_alerts: Vec<String>,
    #[serde(default)]
    pub last_updated: String,
}

// 3. STOP STRUCT (Paradas are objects)
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Stop {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(rename = "nombre")]
    pub name: String,
    pub lat: f64,
    pub lng: f64,
    pub orden: u32,
    #[serde(default)]
    pub landmarks: String,
}

// 4. SCHEDULE STRUCT (Optional horario field)
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Schedule {
    #[serde(default)]
    pub inicio: Option<String>,
    #[serde(default)]
    pub fin: Option<String>,
    #[serde(default)]
    pub guardia_nocturna: Option<String>,
}
```

### Dual Storage Pattern

```rust
// Performance-optimized storage
struct AppState {
    routes_list: Vec<Route>,           // For fuzzy search (sequential)
    routes_map: HashMap<String, Route>, // For O(1) lookups (SEO)
}

static DB: Lazy<RwLock<AppState>> = Lazy::new(|| RwLock::new(AppState {
    routes_list: Vec::new(),
    routes_map: HashMap::new(),
}));
```

### API Implementation

```rust
// 1. DATA INJECTION (CRITICAL)
#[wasm_bindgen]
pub fn load_catalog(json_payload: &str) -> Result<(), JsValue> {
    // A. Parse wrapper object
    let catalog: RouteCatalog = serde_json::from_str(json_payload)
        .map_err(|e| JsValue::from_str(&format!(
            "JSON Parse Error: {}. Expected {{version, rutas: [...]}}",
            e
        )))?;

    // B. Validate
    if catalog.rutas.is_empty() {
        return Err(JsValue::from_str("ERROR: Catalog contains 0 routes"));
    }

    // C. Build indices (O(1) lookup map)
    let mut map = HashMap::new();
    for r in &catalog.rutas {
        map.insert(r.id.clone(), r.clone());
    }

    // D. Atomic update
    let mut db = DB.write()
        .map_err(|_| JsValue::from_str("DB Lock Poisoned"))?;
    db.routes_list = catalog.rutas;
    db.routes_map = map;

    Ok(())
}

// 2. SEO PAGE GENERATION (Sprint 6)
#[wasm_bindgen]
pub fn get_route_by_id(id: &str) -> Result<JsValue, JsValue> {
    let db = DB.read()
        .map_err(|_| JsValue::from_str("Lock failed"))?;
    
    match db.routes_map.get(id) {
        Some(route) => Ok(serde_wasm_bindgen::to_value(route)?),
        None => Ok(JsValue::NULL),
    }
}

// 3. UI CATALOG DISPLAY
#[wasm_bindgen]
pub fn get_all_routes() -> Result<JsValue, JsValue> {
    let db = DB.read()
        .map_err(|_| JsValue::from_str("Lock failed"))?;
    
    Ok(serde_wasm_bindgen::to_value(&db.routes_list)?)
}

// 4. CORE ROUTE CALCULATION (Update existing)
#[wasm_bindgen]
pub fn find_route(origin: &str, dest: &str) -> Result<JsValue, JsValue> {
    let db = DB.read()
        .map_err(|_| JsValue::from_str("Lock failed"))?;
    
    if db.routes_list.is_empty() {
        return Err(JsValue::from_str(
            "ERROR: Catalog not loaded. Call load_catalog() first."
        ));
    }
    
    // Your existing fuzzy search & graph traversal logic
    // Use db.routes_list as the source instead of static CATALOG
    // ...
    
    Ok(JsValue::NULL) // Placeholder
}
```

---

## ⚠️ EXECUTION RULES (STRICT COMPLIANCE)

### 1. NO PANICS
**NEVER** use `.unwrap()` on JSON parsing or locks. Return `Result<_, JsValue>`:

```rust
// ❌ BAD:
let catalog: RouteCatalog = serde_json::from_str(json).unwrap();

// ✅ GOOD:
let catalog: RouteCatalog = serde_json::from_str(json)
    .map_err(|e| JsValue::from_str(&format!("Parse error: {}", e)))?;
```

### 2. TEST DRIVEN
You **MUST** write unit tests:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_catalog_real_structure() {
        let json = r#"{
            "version": "2.3.0",
            "rutas": [
                {
                    "id": "R1_ZONA_HOTELERA_001",
                    "nombre": "R-1 Centro → Zona Hotelera",
                    "tarifa": 15,
                    "tipo": "Bus_Urban",
                    "paradas": [
                        {
                            "nombre": "La Rehoyada",
                            "lat": 21.1619,
                            "lng": -86.8515,
                            "orden": 1
                        }
                    ]
                }
            ]
        }"#;

        // Test loading
        assert!(load_catalog(json).is_ok());
        
        // Test retrieval
        let route = get_route_by_id("R1_ZONA_HOTELERA_001").unwrap();
        assert!(!route.is_null());
        
        // Test catalog
        let all = get_all_routes().unwrap();
        assert!(!all.is_null());
    }

    #[test]
    fn test_empty_catalog_error() {
        // Should fail if catalog not loaded
        let result = find_route("A", "B");
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_json() {
        let result = load_catalog("invalid json");
        assert!(result.is_err());
    }
}
```

### 3. CLEANUP
- Remove **ALL** hardcoded catalog code
- Remove **ALL** commented-out legacy code
- Ensure `cargo test` passes with **0 warnings**

### 4. VALIDATION
- Test with the **real 152KB JSON file** (not just mock data)
- Verify all 50+ routes parse correctly
- Confirm no memory issues with large dataset

---

## 🚀 INTEGRATION PLAN

### Frontend Will Do (Antigravity)

```typescript
// RouteCalculator.astro - Client-side
async function fetchCatalogData() {
    const response = await fetch('/data/master_routes.json');
    const catalogData = await response.json();
    const catalogString = JSON.stringify(catalogData);
    
    // THIS IS WHERE YOUR FUNCTION IS CALLED:
    await window.wasmModule.load_catalog(catalogString);
    
    console.log('✅ Catalog loaded into WASM');
}
```

### Testing Protocol

**Phase 1: Your Tests** (cargo test)
- Unit tests pass
- Mock JSON parses correctly
- All 4 functions work

**Phase 2: Integration** (with Frontend)
- Real 152KB JSON loads
- Route calculation works
- No regressions

**Phase 3: Production** (deployment)
- Build succeeds
- Bundle size acceptable
- Performance maintained

---

## 📊 SUCCESS CRITERIA

Phase 1 is complete when:

- [ ] `load_catalog()` function exists and works
- [ ] `get_route_by_id()` returns correct data
- [ ] `get_all_routes()` returns full catalog
- [ ] `find_route()` uses dynamic storage (not static)
- [ ] All tests pass (`cargo test`)
- [ ] 152KB JSON parses without errors
- [ ] No panics or unwraps in production code
- [ ] WASM binary size acceptable (<60KB target, currently 48KB)

---

## 📋 DELIVERABLE

**Pull Request** with:
1. Refactored `lib.rs` (dynamic storage)
2. Updated structs (Route, Stop, Schedule, RouteCatalog)
3. All 4 API functions implemented
4. Unit tests (at least 3 tests)
5. Clean code (no warnings, no commented code)
6. Clear commit messages

**Timeline**: 2-3 days (estimated)

---

## 📞 COMMUNICATION

### Acknowledge
Reply: **"ACKNOWLEDGED - Starting WASM Data Decoupling"**

### Questions
Ask anytime in chat - we respond within hours

### Blockers
Escalate immediately - we'll help debug

### PR Ready
Tag Antigravity for review

### Integration
We'll coordinate testing together

---

## 📚 REFERENCE DOCUMENTS

**In artifacts directory** (`C:\Users\QUINTANA\.gemini\antigravity\brain\736e1bd5-1686-478c-a910-22572c734f30\`):

- `jules_context_brief.md` - Full project context (this file)
- `EXPANDED_ROADMAP.md` - Complete technical roadmap (700+ lines)
- `phase1_frontend_prep.md` - Frontend implementation details
- `recovery_success.md` - Sprint 5 recovery report
- `typescript_best_practices.md` - Lessons learned

**Data file**:
- `c:\Users\QUINTANA\Desktop\MueveCancun\MueveCancun\public\data\master_routes.json`

---

## 🎯 WHY THIS MATTERS

### Immediate Benefits
- ✅ Hot-reload routes (no recompilation)
- ✅ Faster CI/CD (no WASM rebuild for data)
- ✅ Smaller binary (48KB → 15KB, -69%)
- ✅ A/B testing capability

### Sprint 6 Enablement
- 🚀 The Listener (social media scraper)
- 🚀 Programmatic SEO (50+ route pages)
- 🚀 Admin panel (route management UI)

### B2B Platform Foundation
- 🏢 Multi-tenant support
- 🏢 Real-time updates
- 🏢 Analytics integration
- 🏢 Third-party APIs

---

## 🎉 FINAL NOTES

Jules, your WASM engine has been **rock solid** throughout Sprint 5's chaos. We never doubted it. Now we need your expertise to take it to the next level.

This refactor is **critical** for our B2B platform vision. Once complete, we'll have a truly dynamic, scalable architecture.

**We trust you completely**. Take the time you need to do it right.

---

**Status**: 🟢 **READY FOR YOUR IMPLEMENTATION**

**Next Step**: Your acknowledgment + start work

**Questions?**: Ask anytime, we're here to support.

---

*Generated by: The Orchestrator + Antigravity*  
*Date: 2026-02-10 15:27*  
*Priority: P0 CRITICAL*
