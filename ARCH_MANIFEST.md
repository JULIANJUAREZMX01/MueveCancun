# 🏗️ Architecture Manifest — Nexus Transfer Engine v3.3+

## 🛡️ Type-Safety & Strict Boundaries

The project enforces a strict "Zero Any" policy across the codebase to ensure industrial-grade reliability and maintainability.

### 1. TypeScript ↔ WASM FFI (Foreign Function Interface)
The boundary between TypeScript and the Rust/WASM calculation engine is strictly typed. No `any` types are permitted in the loader or the communication layer.

- **WasmLoader.ts**: Uses the `RouteCalculatorModule` interface to represent WASM exports.
- **Data Flow**: All data passed to or received from WASM must be validated and typed.

### 2. Consolidated Data Types
The system uses consolidated interfaces for complex data structures to prevent knowledge degradation.

- **Journey**: The single source of truth for the Nexus Transfer Engine's output.
- **RouteLeg**: Represents a single segment of a journey, including stops, transport type, and operator info.

### 3. Native Web APIs & Zero-External-Deps
Minimal local interfaces are used for 3rd-party libraries (like Leaflet) to maintain a small bundle size and avoid dependency hell.

- **RouteDrawer.ts**: Contains local Leaflet type definitions scoped strictly to its needs.

### 4. Service Worker (Offline-First)
The Service Worker is written in TypeScript (`src/sw.ts`) and uses standard WebWorker types to ensure correct handling of cache strategies and fetch events.

## 📁 Core Directory Structure

- `src/utils/`: Performance-critical utilities and state managers.
- `src/scripts/`: Bundled client-side scripts for UI interactions (theme, animation, etc.).
- `rust-wasm/`: High-performance calculation modules written in Rust.
- `public/data/`: Optimized JSON datasets for offline routing.
