# ADR 003: TypeScript Strict FFI Boundary

## Status
Accepted

## Context
The Nexus Transfer Engine relies on a Rust/WASM module for performance-critical route calculations. Previously, the interface between TypeScript and WASM used `any` types, leading to potential runtime failures and poor developer experience.

## Decision
We will enforce a strict type boundary at the FFI (Foreign Function Interface) layer.

1. All WASM loaders must use a specific interface representing the WASM module exports.
2. The default export for WASM initialization must be typed as `default(): Promise<void>`.
3. All data-carrying types (Journeys, Legs, Stops) must be consolidated into `src/types.ts`.
4. No `any` types are permitted in files interacting directly with WASM.

## Consequences
- **Positive**: Increased reliability, better IDE support, and fewer runtime "undefined" errors.
- **Negative**: Requires manual maintenance of TypeScript interfaces when the Rust exports change.
