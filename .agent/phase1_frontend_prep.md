# Phase 1: WASM Data Decoupling - Frontend Implementation Plan

**Date**: 2026-02-10 15:17
**Status**: 🔴 P0 CRITICAL - Ready for Implementation
**Owner**: Antigravity (Frontend) → Jules (WASM Binary)

---

## ✅ COMPLETED: Data Layer Genesis

### master_routes.json Verification

**Location**: `public/data/master_routes.json`

**Stats**:
- **Size**: 152KB
- **Lines**: 5414
- **Routes**: 50+ comprehensive routes
- **Schema**: Validated ✅

**Sample Routes Confirmed**:
- R-1 Zona Hotelera (Centro → Playa Delfines)
- Playa Express (Cancún → Playa del Carmen)
- Combi Roja Puerto Juárez
- Saturmex routes (R-2-94, R-28, R-19)
- ADO Aeropuerto routes
- RUTA 30, 31, 81 (detailed stop data)

**Schema Structure**:
```json
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
      "id": "R1_ZONA_HOTELERA_001_001",
      "nombre": "La Rehoyada / Villas Otoch",
      "lat": 21.1619,
      "lng": -86.8515,
      "orden": 1
    }
    // ... more stops
  ]
}
```

---

## 🔄 IN PROGRESS: Frontend Logic Preparation

### RouteCalculator.astro Refactor Plan

**Current State**:
- **File**: `src/components/RouteCalculator.astro`
- **Size**: 1009 lines
- **Status**: Tailwind-heavy, needs CSS migration + data loading logic

### Implementation: fetchData() Function

**Location**: Add to `<script>` section of RouteCalculator.astro

```typescript
// RouteCalculator.astro - Client-side script
<script>
  // ============================================
  // PHASE 1: WASM DATA DECOUPLING - FRONTEND
  // ============================================

  let catalogLoaded = false;
  let catalogData: any = null;
  let loadingError: string | null = null;

  /**
   * Fetch master_routes.json and pass to WASM engine
   * Runs on component mount
   */
  async function fetchCatalogData() {
    try {
      // Show loading state
      updateLoadingState(true, 'Cargando catálogo de rutas...');

      // Fetch JSON from public directory
      const response = await fetch('/data/master_routes.json');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Parse JSON
      catalogData = await response.json();

      // Convert to string for WASM (Jules' load_catalog expects string)
      const catalogString = JSON.stringify(catalogData);

      // CRITICAL: Wait for WASM module to be ready
      if (typeof window.wasmModule === 'undefined') {
        console.warn('WASM module not ready, waiting...');
        await waitForWASM();
      }

      // Pass to WASM engine (Jules will implement this)
      if (typeof window.wasmModule.load_catalog === 'function') {
        await window.wasmModule.load_catalog(catalogString);
        console.log('✅ Catalog loaded into WASM:', catalogData.rutas?.length || 0, 'routes');
      } else {
        console.warn('⚠️ WASM load_catalog() not available yet. Using fallback.');
        // Fallback: Store in window for now
        window.__CATALOG_DATA__ = catalogData;
      }

      catalogLoaded = true;
      updateLoadingState(false);

    } catch (error) {
      console.error('❌ Failed to load catalog:', error);
      loadingError = error.message;
      updateLoadingState(false);
      showErrorToast('Error al cargar el catálogo de rutas');
    }
  }

  /**
   * Wait for WASM module to initialize
   */
  function waitForWASM(timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkWASM = setInterval(() => {
        if (typeof window.wasmModule !== 'undefined') {
          clearInterval(checkWASM);
          resolve();
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkWASM);
          reject(new Error('WASM module timeout'));
        }
      }, 100);
    });
  }

  /**
   * Update UI loading state
   */
  function updateLoadingState(isLoading: boolean, message?: string) {
    const traceButton = document.getElementById('trace-route-btn');
    const loadingIndicator = document.getElementById('catalog-loading');

    if (isLoading) {
      // Disable trace button
      if (traceButton) {
        traceButton.setAttribute('disabled', 'true');
        traceButton.classList.add('opacity-50', 'cursor-not-allowed');
      }

      // Show loading indicator
      if (loadingIndicator) {
        loadingIndicator.textContent = message || 'Cargando...';
        loadingIndicator.classList.remove('hidden');
      }
    } else {
      // Enable trace button
      if (traceButton) {
        traceButton.removeAttribute('disabled');
        traceButton.classList.remove('opacity-50', 'cursor-not-allowed');
      }

      // Hide loading indicator
      if (loadingIndicator) {
        loadingIndicator.classList.add('hidden');
      }
    }
  }

  /**
   * Show error toast
   */
  function showErrorToast(message: string) {
    // Use existing toast system
    const event = new CustomEvent('SHOW_TOAST', {
      detail: {
        message,
        type: 'error',
        duration: 5000
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Enhanced route calculation with catalog check
   */
  async function calculateRoute(origin: string, destination: string) {
    // Check if catalog is loaded
    if (!catalogLoaded) {
      showErrorToast('El catálogo aún no está listo. Por favor espera...');
      return;
    }

    // Existing route calculation logic...
    // (keep current implementation)
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  // Run on component mount
  document.addEventListener('DOMContentLoaded', () => {
    fetchCatalogData();
  });

  // Also run if DOMContentLoaded already fired
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    fetchCatalogData();
  }
</script>
```

### UI Changes Required

**Add Loading Indicator** (in HTML section):

```astro
<!-- Add after search-card div -->
<div id="catalog-loading" class="hidden text-center py-2 text-xs text-slate-500 dark:text-slate-400">
  <span class="inline-flex items-center gap-2">
    <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Cargando catálogo de rutas...
  </span>
</div>
```

**Update Trace Button** (add disabled state):

```astro
<button
  id="trace-route-btn"
  class="btn-primary w-full"
  data-i18n="calc.trace"
>
  TRAZAR RUTA
</button>
```

---

## 🧪 Integration Testing Checklist

### Pre-Integration (Before Jules' WASM Update)

- [ ] Verify `fetchCatalogData()` runs on mount
- [ ] Confirm JSON loads successfully (check console)
- [ ] Validate loading state UI appears/disappears
- [ ] Test error handling (simulate fetch failure)
- [ ] Verify fallback behavior (WASM not ready)

### Post-Integration (After Jules' WASM Update)

- [ ] Confirm `load_catalog()` function exists in WASM
- [ ] Verify catalog data passes to WASM successfully
- [ ] Test route calculation with dynamic data
- [ ] Validate no regressions:
  - [ ] Fuzzy search still works
  - [ ] Route results display correctly
  - [ ] Map integration functional
  - [ ] Dark mode toggle works
  - [ ] GPS button functional

### Performance Testing

- [ ] Measure JSON load time (target: <200ms)
- [ ] Verify no blocking on main thread
- [ ] Check memory usage (catalog size)
- [ ] Test on slow 3G connection

---

## 📋 Tailwind Migration Status (RouteCalculator.astro)

**Current**: 1009 lines, Tailwind-heavy

**Classes to Migrate**:
```
- glass-card
- space-y-6, space-y-4, space-y-5
- p-4, p-5, p-6
- rounded-2xl, rounded-xl, rounded-lg
- bg-white/80, dark:bg-slate-900/80
- backdrop-blur-xl
- border, border-white/20
- shadow-2xl
- flex, items-center, justify-between
- text-xs, text-sm, text-lg
- font-bold, font-black
- transition-all, duration-300
```

**Recommendation**:
- **DEFER** Tailwind migration until after WASM integration complete
- **Reason**: Minimize conflicts, focus on data layer first
- **Timeline**: Sprint 5 Cleanup phase (after Phase 1 complete)

---

## 🚀 Deployment Checklist

### Before Deploying to Production

- [ ] All tests pass (pre + post integration)
- [ ] No console errors
- [ ] Lighthouse score maintained (>85)
- [ ] Bundle size acceptable (<160KB total)
- [ ] Error handling robust
- [ ] Loading states smooth
- [ ] Fallback behavior tested

### Rollback Plan

If integration fails:
1. Revert RouteCalculator.astro changes
2. Keep master_routes.json (no harm)
3. Document failure in `bugfix_report.md`
4. Coordinate with Jules for fixes

---

## 📞 Coordination with Jules

### What Jules Needs to Implement

**WASM Binary Update** (`lib.rs`):

```rust
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::sync::RwLock;
use once_cell::sync::Lazy;

#[derive(Deserialize, Serialize)]
struct RouteCatalog {
    version: String,
    rutas: Vec<Route>,
}

static CATALOG: Lazy<RwLock<Option<RouteCatalog>>> = Lazy::new(|| RwLock::new(None));

#[wasm_bindgen]
pub fn load_catalog(json_data: &str) -> Result<(), JsValue> {
    let catalog: RouteCatalog = serde_json::from_str(json_data)
        .map_err(|e| JsValue::from_str(&format!("Parse error: {}", e)))?;

    *CATALOG.write().unwrap() = Some(catalog);

    Ok(())
}

#[wasm_bindgen]
pub fn find_route(origin: &str, dest: &str) -> JsValue {
    let catalog = CATALOG.read().unwrap();

    if let Some(cat) = catalog.as_ref() {
        // Use cat.rutas for route calculation
        // ... existing logic
    } else {
        return JsValue::from_str("Error: Catalog not loaded");
    }

    // ... rest of implementation
}
```

### Communication Protocol

1. **Jules completes WASM update** → Notifies in chat
2. **Antigravity tests integration** → Reports results
3. **If issues** → Jules debugs, Antigravity provides logs
4. **If success** → Mark Phase 1 complete, proceed to Sprint 6

---

## ✅ SUCCESS CRITERIA

Phase 1 is complete when:

- [x] `master_routes.json` exists and validated
- [ ] `fetchCatalogData()` implemented in RouteCalculator
- [ ] Loading state UI functional
- [ ] Error handling robust
- [ ] Jules' WASM binary updated with `load_catalog()`
- [ ] Integration tested successfully
- [ ] No regressions in existing features
- [ ] Documentation updated

---

**Status**: 🟢 **READY FOR JULES' WASM UPDATE**

**Next Steps**:
1. Implement `fetchCatalogData()` in RouteCalculator.astro
2. Test loading logic (pre-integration)
3. Wait for Jules' WASM binary
4. Integration testing
5. Mark Phase 1 complete

**Estimated Timeline**:
- Frontend implementation: 2-3 hours
- Jules' WASM update: 2-3 days
- Integration testing: 1 day
- **Total**: 3-4 days
