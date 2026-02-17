# Technical Debt Inventory - MueveCancún PWA

This document tracks technical debt identified during the Sprint 1 & 2 consolidation phase.

## 1. Type Safety

- `src/lib/CoordinatesStore.ts`: Multiple usages of `any` for route data and injected JSON. Needs strict interface definitions for "Nexus Prime" protocol.
- `src/lib/CoordinateFinder.ts`: Search results use generic objects; could benefit from a unified `LocationCandidate` type.

## 2. Utility Organization

- `src/utils/utils.ts` vs `src/lib/utils.ts`: Duplicate or overlapping utility functions.
- `getDistance` (Haversine): Currently in `utils.ts`, should potentially move to a dedicated `geometry.ts` or `geo.ts` as more spatial features are added.

## 3. i18n Consistency

- Coordinate store and route names sometimes bypass the i18n system for raw data display.
- Some UI keys are hardcoded in components instead of being centralized in `i18n.ts`.

## 4. Performance & WASM

- WASM initialization still relies on a manual `await module.default()` which can be race-prone if multiple components load the calculator.
- Catalog data (master_routes.json) is growing; may need binary serialization (Protobuf/Bincode) for faster WASM loading.

## 5. Architectural

- The "Triple Balance" system is partially unified but still has legacy keys in `localStorage` for backward compatibility. These should be removed once the migration is confirmed stable.
