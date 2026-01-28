# AGENTS.md - Active Coordination Dashboard

**Mission:** High-performance, offline-first public transport guide for Cancún.
**Current Phase:** Phase 2 - Advanced Routing & PWA Resilience.

> [!NOTE]
> All legacy logs and detailed historical steps have been moved to [AGENTS_HISTORY.md](./AGENTS_HISTORY.md) to keep the working environment clean and efficient.

---

## ⚡️ Real-Time Dashbard (Status)

| Task | Status | Owner | Notes |
| :--- | :--- | :--- | :--- |
| **Infrastructure Stabilization** | ✅ Complete | Jules | GAB v5.1 applied. |
| **Code Quality Audit** | ✅ Complete | Gemini | 15+ issues resolved (Astro, SW, WASM). |
| **Advanced Dijkstra** | 🔄 In Progress | Gemini | Implementing multi-route transfers in Rust. |
| **Service Worker v2** | 🔄 In Progress | Jules | Advanced caching & Background Sync. |
| **Crowdsourcing UI** | ⏳ Pending | Gemini | Supabase integration path. |

---

## 📂 Active Architecture

- `rust-wasm/`: Core routing logic (high-performance).
- `src/islands/`: Interactive React components (Map, Calculator).
- `src/pages/`: Astro static/dynamic routes.
- `public/wasm/`: Production-ready binaries.
- `public/data/`: Route definitions (Source of Truth).

---

## 📋 Next Critical Actions

1. **[Gemini]**: Implement Dijkstra algorithm in `rust-wasm/route-calculator` to support R1 ↔ R2 ↔ R10 connections.
2. **[Jules]**: Finalize `public/sw.js` with Background Sync for report submissions.
3. **[Coordination]**: Validate WASM performance on mobile browsers (Target: <100ms per search).

---

## 🤝 Current Sync Points
- **WASM Paths**: `/wasm/route-calculator/route_calculator.js`
- **Data Version**: `master_routes.json` v2.1 (Tarifa $15.00)
- **Token**: `PUBLIC_MAPBOX_TOKEN` (Required in local `.env`)

---
*Last Updated: 2026-01-28 00:15 UTC*
