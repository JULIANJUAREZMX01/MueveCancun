# ADR-001: Rust/WASM Routing Engine

**Date:** 2026-01-15
**Status:** Accepted

## Context

MueveCancun targets devices from 2018 in a bandwidth-constrained environment (Cancún).
The route-finding algorithm with transfer detection can reach up to 10,000,000 operations
per search (circuit breaker limit). JavaScript's garbage collector introduces unpredictable
jitter at this scale, causing UI freezes on mid-range devices.

A compiled, memory-safe, GC-free compute layer was required.

## Decision

Use Rust compiled to WebAssembly (via wasm-bindgen) for the routing engine.
The WASM module (`route-calculator`) runs in the browser main thread, loading the full
route catalog into its linear memory. It exposes two functions over the FFI boundary:
- `load_catalog_core(json: string): void`
- `find_route_rs(origin: string, dest: string): string`

A second module (`spatial-index`) provides a grid-based spatial hash for proximity queries.

## Consequences

- Requires Rust toolchain + wasm-pack in CI (build-wasm.yml workflow).
- Routing logic is opaque to developers unfamiliar with Rust.
- WASM binary (~2MB) must be cached by the Service Worker on first load.
- Performance gain: ~40–60% faster than equivalent JavaScript implementation at scale.
- Transfer detection uses exact name matching (Pass 1) then Haversine proximity ≤350m (Pass 2).

## Alternatives Considered

- **Pure JavaScript**: Rejected — GC jitter unacceptable at 10M ops scale.
- **AssemblyScript → WASM**: Rejected — less mature ecosystem, weaker type safety.
- **Web Worker + JS**: Rejected — would solve jitter but not raw performance ceiling.
