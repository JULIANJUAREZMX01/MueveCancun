# Technical Debt Inventory - MueveCancún PWA

_Last Updated: 2026-02-18_

This document tracks technical debt identified during development. Items marked with ✅ have been resolved.

## ✅ RESOLVED ISSUES

### 1. ✅ Repository Organization (Resolved 2026-02-18)

**Issues:**
- Duplicate WASM binaries in `/src/wasm/` and `/public/wasm/` (400KB waste)
- Untracked development artifacts (snapshots, logs, agent files)
- Test files scattered in root directory
- Obsolete scripts (zig-cc.cmd, lib_dump.rs, etc.)

**Resolution:**
- Removed `/src/wasm/` duplication, kept only `/public/wasm/`
- Updated build-wasm.mjs to single build target
- Enhanced .gitignore with comprehensive patterns
- Organized tests into `/tests/integration/` and `/tests/verification/`
- Removed obsolete scripts and artifacts
- See `docs/CLEANUP_REPORT.md` for full details

---

## ACTIVE TECHNICAL DEBT

### 1. Type Safety

**Priority:** HIGH  
**Impact:** Code maintainability and error prevention

- `src/lib/CoordinatesStore.ts`: Multiple usages of `any` for route data and injected JSON. Needs strict interface definitions for "Nexus Prime" protocol.
- `src/lib/CoordinateFinder.ts`: Search results use generic objects; could benefit from a unified `LocationCandidate` type.

**Recommended Action:**
```typescript
// Define strict interfaces
interface RouteData {
  id: string;
  nombre: string;
  paradas: Stop[];
  tarifa: number;
  // ... complete typing
}

interface LocationCandidate {
  name: string;
  lat: number;
  lng: number;
  score: number;
  type: 'stop' | 'route' | 'landmark';
}
```

---

### 2. Utility Organization

**Priority:** MEDIUM  
**Impact:** Code clarity and potential bugs from duplication

- `src/utils/utils.ts` vs `src/lib/utils.ts`: Duplicate or overlapping utility functions.
- `getDistance` (Haversine): Currently in `utils.ts`, should potentially move to a dedicated `geometry.ts` or `geo.ts` as more spatial features are added.

**Recommended Action:**
1. Audit both files for overlapping functions
2. Create domain-specific utility files:
   - `src/utils/geometry.ts` for spatial calculations
   - `src/utils/format.ts` for formatting functions
   - `src/utils/validation.ts` for validation logic
3. Remove duplicates

---

### 3. i18n Consistency

**Priority:** MEDIUM  
**Impact:** Translation completeness and user experience

- Coordinate store and route names sometimes bypass the i18n system for raw data display.
- Some UI keys are hardcoded in components instead of being centralized in `i18n.ts`.

**Recommended Action:**
1. Audit all components for hardcoded strings
2. Move all translatable text to `src/utils/i18n.ts`
3. Ensure route data displays use i18n wrapper functions
4. Add i18n validation test to catch hardcoded strings

---

### 4. Performance & WASM

**Priority:** MEDIUM  
**Impact:** Race conditions and potential crashes

**Issues:**
- WASM initialization still relies on manual `await module.default()` which can be race-prone if multiple components load the calculator.
- Catalog data (master_routes.json) is growing; may need binary serialization (Protobuf/Bincode) for faster WASM loading.

**Recommended Action:**
```typescript
// Implement singleton WASM loader
class WasmLoader {
  private static instance: WasmLoader;
  private wasmModule: any = null;
  private loading: Promise<any> | null = null;

  static async getModule() {
    if (!WasmLoader.instance) {
      WasmLoader.instance = new WasmLoader();
    }
    return WasmLoader.instance.ensureLoaded();
  }

  private async ensureLoaded() {
    if (this.wasmModule) return this.wasmModule;
    if (this.loading) return this.loading;
    
    this.loading = this.loadWasm();
    this.wasmModule = await this.loading;
    this.loading = null;
    return this.wasmModule;
  }

  private async loadWasm() {
    const module = await import('/wasm/route-calculator/route_calculator.js');
    await module.default();
    return module;
  }
}
```

---

### 5. Data Organization

**Priority:** LOW  
**Impact:** Repository clarity

**Issues:**
- 38 route JSON files in `public/data/routes/`, many with timestamps
- Unclear if timestamped routes (ruta_[timestamp].json) are test data or production
- `src/data/routes.json` appears unused
- Potential overlap with `master_routes.json`

**Recommended Action:**
1. Audit all route JSON files to determine purpose
2. Move test/temporary routes to `tests/fixtures/`
3. Document route file naming convention
4. Remove or document unused `src/data/routes.json`
5. Consider consolidating all routes into `master_routes.json`

---

### 6. Architectural - localStorage Migration

**Priority:** LOW  
**Impact:** Legacy compatibility

The "Triple Balance" system is partially unified but still has legacy keys in `localStorage` for backward compatibility. These should be removed once the migration is confirmed stable.

**Recommended Action:**
1. Add migration completion check (e.g., after 90 days)
2. Remove legacy localStorage compatibility code
3. Update documentation to remove migration references

---

## Tracking

| Issue | Priority | Impact | Estimated Effort | Status |
|-------|----------|--------|------------------|--------|
| Repository Organization | HIGH | 9/10 | 4h | ✅ DONE |
| Type Safety | HIGH | 8/10 | 8h | 🔴 TODO |
| Utility Organization | MEDIUM | 6/10 | 4h | 🔴 TODO |
| i18n Consistency | MEDIUM | 7/10 | 6h | 🔴 TODO |
| WASM Singleton | MEDIUM | 8/10 | 3h | 🔴 TODO |
| Data Organization | LOW | 5/10 | 4h | 🔴 TODO |
| localStorage Cleanup | LOW | 3/10 | 2h | 🔴 TODO |

**Total Estimated Effort Remaining:** ~27 hours

---

## Notes

- This is a first-time Rust/WASM + TypeScript + Astro project
- All identified issues are common for learning projects
- Repository cleanup (2026-02-18) resolved major organizational issues
- Remaining debt is primarily code quality and optimization
- See `docs/CLEANUP_REPORT.md` for detailed cleanup analysis

