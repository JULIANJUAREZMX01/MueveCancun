# 🏗️ MASTER EXECUTION PLAN: MUEVECANCUN v3.2

**OWNER**: Jules (Lead Full Stack)
**STATUS**: READY FOR EXECUTION
**START DATE**: 2026-02-11

---

## 🧭 HOW TO USE THIS PLAN

This project is divided into **4 Sequential Segments**. You must complete them in order to ensure stability. Each segment has specific **Success Metrics** and **Evidence Requirements**.

### 🔄 EXECUTION FLOW

1.  **READ** the Segment File (e.g., `01_WASM_DECOUPLING.md`).
2.  **EXECUTE** the tasks in the segment.
3.  **TEST** using the defined metrics.
4.  **CAPTURE EVIDENCE** (Screenshots/Logs).
5.  **COMMIT** with the segment prefix (e.g., `feat(wasm): decoupled catalog`).
6.  **PROCEED** to the next segment.

---

## 📊 SEGMENT OVERVIEW

| ID     | SEGMENT NAME                                    | PRIORITY           | DESCRIPTION                                               | EST. TIME |
| ------ | ----------------------------------------------- | ------------------ | --------------------------------------------------------- | --------- |
| **01** | [WASM Data Decoupling](./01_WASM_DECOUPLING.md) | 🔴 **P0 CRITICAL** | Remove hardcoded Rust catalog. Inject JSON dynamically.   | 2 Days    |
| **02** | [Frontend CSS Migration](./02_CSS_MIGRATION.md) | 🟡 **P1 HIGH**     | Remove Tailwind. Standardize `RouteCalculator` & `Input`. | 1 Day     |
| **03** | [Social Intelligence & SEO](./03_SEO_SOCIAL.md) | 🔵 **P2 MEDIUM**   | "The Listener" scraper integration & Dynamic Routes.      | 3 Days    |
| **04** | [Final Polish & PWA](./04_FINAL_POLISH.md)      | 🟢 **P3 LOW**      | Favorites, GPS Auto-center, Lighthouse 95+.               | 1 Day     |

---

## 🛠️ GLOBAL SUCCESS METRICS

The project is considered **COMPLETE** when:

1.  **Zero 500 Errors**: All pages load via `npm run preview`.
2.  **Dynamic Data**: Changing `master_routes.json` updates the app _without_ recompiling WASM.
3.  **Visual Consistency**: No "Tailwind vs Vanilla" visual glitches. Glassmorphism is uniform.
4.  **Performance**: Route calculation happens in < 100ms.

---

## 📂 ARTIFACTS LOCATION

- **Source of Truth**: `public/data/master_routes.json`
- **WASM Source**: `rust-wasm/route-calculator/src/lib.rs`
- **Frontend Core**: `src/components/RouteCalculator.astro`

---

**READY TO START? OPEN `01_WASM_DECOUPLING.md` AND BEGIN.**
