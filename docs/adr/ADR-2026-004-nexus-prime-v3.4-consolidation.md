# ADR-2026-004: Nexus Prime v3.4 Consolidation & Interconnection

**Date:** 2026-04-02  
**Status:** Accepted  
**Authors:** Jules (Google), JULIANJUAREZMX01

---

## Context

PR #404 ("Nexus Prime v3.4 Consolidation & Interconnection") introduced several feature changes that diverged from `main`. This ADR documents the merge conflict resolution, architecture decisions, and verification checklist.

## Changes Merged from PR #404

### 1. Wallet System — Balance Reset to $0.00 MXN

**Before:** Default wallet balance was initialized to `180.00 MXN`.  
**After:** Default wallet balance is now `0.00 MXN`.

- `src/utils/db.ts`: `defaultAmount` changed from `180.00` to `0.00`.
- `rust-wasm/route-calculator/src/lib.rs`: `validate_operator_funds` now checks `balance >= 0.0` (open to all).
- Migration logic updated: `isDefault` check updated from `180.00` to `0.00`.

### 2. Conductor Registration Flow

New flow for conductors/operators to receive a `$180.00 MXN` bonus via promo codes.  
Implemented in `src/pages/[lang]/wallet.astro`.

### 3. WASM Engine — New Core Functions

Added to `rust-wasm/route-calculator/src/lib.rs`:
- `get_route_by_id_core(id)` — O(1) lookup via `HashMap`
- `get_all_routes_core()` — returns full route list
- `find_route_core_wrapper(origin, dest)` — testable wrapper
- `validate_operator_funds(balance)` — now checks `>= 0.0`

`AppState` struct updated with `routes_map: HashMap<String, Route>` for O(1) route lookup.

### 4. Onboarding Tutorial Updates (index.astro)

- Step 3 now shows "Billetera Digital" (wallet) instead of "Inteligencia Local"
- Step 4 now shows "Señales Sociales" (social signals)
- `finishTutorial` now sets `locale` cookie for better redirect logic
- Retained `checkTutorial()` and `updateTutorialUI()` from main

### 5. Static Architecture Fix — Removed SSR Endpoint

**Removed:** `src/pages/api/report.ts` (had `prerender = false`, breaking static build).  
`ReportWidget` already migrated to Base44 proxy (`fix(ReportWidget): apunta a proxy serverless Base44`).

---

## Conflict Resolution Strategy

| File | Resolution |
|------|-----------|
| `AGENTS.md` | Kept HEAD (more comprehensive) |
| `public/data/master_routes.optimized.json` | Kept HEAD (51 routes vs 50) |
| `public/data/routes-index.json` | Kept HEAD (14 routes vs 10) |
| `rust-wasm/route-calculator/src/lib.rs` | Merged: added feature's new functions, fixed `AppState` to add `routes_map` |
| `src/components/RouteCalculator.astro` | Took feature branch (uses correct `WasmLoader.getModule()` API, adds `updateBalance()`) |
| `src/pages/index.astro` | Merged: kept HEAD's `hideNav`, TypeScript types, `checkTutorial()`; added feature's `locale` cookie |
| `src/utils/db.ts` | Merged: kept HEAD's migration logic, updated `isDefault` check to `0.00` |

---

## Verification Checklist

- [x] `pnpm test` — 122 tests pass (0 failures)
- [x] `cargo test --lib` — 3 Rust tests pass
- [x] `pnpm build` — Astro SSG build completes (124 pages)
- [x] WASM compiled successfully (route-calculator + spatial-index)
- [x] No conflict markers remain in any file
- [x] `wallet_full.txt` and `wallet_temp.astro` temp files removed from repo root
- [x] `src/pages/api/report.ts` removed (SSR endpoint incompatible with static output)
- [x] Default balance = `$0.00 MXN` (confirmed in tests + db.ts)
- [x] `validate_operator_funds` allows `balance >= 0.0` (open access)

---

## Architecture Alignment

This consolidation aligns with:
- **Static-First Mandate (v3.3.1+)**: No SSR endpoints, client-side redirect logic
- **AGENTS.md**: Tailwind CSS retained (no breaking removal)
- **CLAUDE.md Nexus Transfer Engine**: WASM routes_map for O(1) lookup

---

## References

- PR #404: https://github.com/JULIANJUAREZMX01/MueveCancun/pull/404
- ADR-2026-003: CI hardening and test isolation
- AGENTS.md §Mandato Arquitectónico
