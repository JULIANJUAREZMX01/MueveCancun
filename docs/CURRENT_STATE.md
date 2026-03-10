# Current State & Resolved Technical Debt - MueveCancún PWA

_Date: 2026-02-18_

## Completed Tasks
In the recent development cycle, several critical pieces of technical debt were addressed:

1. **Type Safety (HIGH Priority)**
   - Replaced multiple instances of `any` with strong interfaces (`RouteData`, `Stop`, `RoutesCatalog`) in `src/utils/CoordinatesStore.ts` and `src/components/RouteCalculator.astro`.
   - Updated `src/types.ts` to expose core interfaces.

2. **Utility Organization (MEDIUM Priority)**
   - Created `src/utils/geometry.ts` to house spatial calculations like `getDistance`.
   - Cleaned up duplicated and overlapping utility functions in `src/utils/utils.ts`.

3. **WASM Singleton Pattern (MEDIUM Priority)**
   - Implemented `WasmLoader.ts` to ensure the WASM binary is loaded securely and consistently across components.
   - Updated `RouteCalculator.astro` to use this singleton pattern, eliminating potential race conditions from multiple `import()` calls.

4. **Data Organization (LOW Priority)**
   - Cleaned up the `/public/data/routes/` directory by moving 31 outdated `ruta_[timestamp].json` files and testing routes to `/tests/fixtures/routes/`. This keeps production assets lean and organized.

5. **localStorage Cleanup (LOW Priority)**
   - Removed legacy fallback code mapping localStorage balances to IndexedDB in `src/utils/db.ts`. The migration is now complete, streamlining the data fetching paths.

All associated tests were run and passed perfectly after these refactors. The codebase is now significantly more structured and typed.

## Next Steps

1. **i18n Consistency**
   - Continue searching for hardcoded Spanish text within components and extract them to `src/utils/i18n.ts`.

2. **Route Normalization & Optimization**
   - Begin refactoring `RouteCalculator.astro`'s frontend logic to separate presentation and route calculation state. The component is still quite large and could be split.
