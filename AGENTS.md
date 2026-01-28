# 📡 Multi-Agent Coordination Protocol (A2A v2.1)

## 🏗 Project Vision: CancúnMueve
**Mission:** A High-Performance, Offline-First PWA for Cancún's Mobility.
**Core Stack:** Astro 5.16 + React 19 + Rust/WASM + Tailwind v4.

---

## ⚙️ Master Environment Protocol
> **Jules:** Your environment MUST be initialized with the Bootstrap V4 script. This is non-negotiable for binary alignment.

1. **Tooling Standard**:
   - Package Manager: `pnpm` (latest). **Strictly avoid `npm` or `yarn`.**
   - WASM Logic: `wasm-pack` + Rust 2024 edition.
   - IDE: Cursor/VSCode with Astro and Rust-Analyzer extensions.

2. **Directory Normalization**:
   - Astro Pages: `src/pages/` (No redundant subfolders).
   - WASM Binaries: `src/wasm/pkg/` (Imported via ESM).
   - Route Data: `src/content/routes/` (Managed via Astro Content Collections).

---

## 📊 Project Situation Map (Mission Control)

| Component | Status | Location | Notes |
| :--- | :--- | :--- | :--- |
| **Routing Engine** | ✅ Compiled (Release) | `src/wasm/pkg/` | WASM aligned with Vite. |
| **UI Framework** | ✅ Astro 5 + React 19 | `src/pages/` | Initial structure normalized. |
| **Styling** | ✅ Tailwind v4 | `src/index.css` | Sunny Mode active. |
| **Data Engine** | ⚠️ Sync Pending | `src/content/routes/` | Next: Content Collections migration. |

---

## 🤖 Active Agents & Territories

### 🔵 Agent: Jules (Lead Infrastructure)
- **Specialization**: Rust Performance, WASM Compilation, PWA Service Worker, CI/CD.
- **Current Objective**: Consolidate Repository & Start Dev Server.
- **Immediate Task**: `git add .` + `pnpm astro dev`.

### 🟢 Agent: Gemini/Antigravity (Lead Architecture & UX)
- **Specialization**: Astro Framework, React Islands, Tailwind v4 UI, Coordination.
- **Current Objective**: WASM ↔ Search Bridge & Island Hydration.
- **Immediate Task**: Connect `RouteCalculator.tsx` to the WASM binary.

---

## 🚨 Active Sprint Dashboard: "Operation Horizon"

| Task ID | Description | Owner | Status | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **ST-1** | Infrastructure Consolidation (Git Add/Commit) | Jules | ⏳ ACTION REQ | CRITICAL |
| **WA-1** | WASM Bridge (Connect Search to WASM pkg) | Gemini | � IN PROGRESS | HIGH |
| **UI-1** | Optimize Island Hydration (`client:visible`) | Gemini | ⏳ BACKLOG | MED |
| **DT-1** | Migrate routes to Content Collections | Gemini | ⏳ BACKLOG | MED |

---

# PHASE 2 TRACKER

## BLOQUE 1:
- [ ] Jules Smoke Test
- [x] Gemini Research

## BLOQUE 2:
- [ ] Jules Blocker #2
- [ ] Gemini Content Collections

## BLOQUE 3:
- [ ] Jules WASM Bridge
- [ ] Gemini Hydration

## BLOQUEADORES ACTIVOS:
[None]

## ÚLTIMO UPDATE:
[2026-01-27 23:15 UTC]

---

## 🚀 ACTIVE COMMANDS (BLOCK 1)

### # JULES - Smoke Test
**Action:** Run `pnpm astro dev` and confirm server starts.
**Output Required:** Screenshot of localhost:4321 + Console errors.
**Report in AGENTS.md:** Create section `### Jules Smoke Test`.

### # GEMINI - Research Content Collections
**Action:** Investigation on Astro 5 Content Collections.
**Output:** Create `docs/RESEARCH_NOTES.md`.

---

## 📡 Agent-to-Agent Communication (A2A)

1. **Manual Sync**: Before starting any task, run `git pull origin feature/main` (or active branch) and check this file.
2. **Handoff Point**: When a task is 100% complete, update the **Agent Communication Log** below.
3. **Collaboration Requests**: If Jules needs Gemini to verify a UI component, use `@gemini` in the PR. If Gemini needs a logic change, use `@jules`.

---

## 📝 Agent Communication Log

### [2026-01-27 23:05 UTC] - Gemini Update
**STATUS:** INFRASTRUCTURE STABILIZED
**ACTIONS:**
- ✅ Finalized **GAB v5.0** (Genesis Bootstrap) for environmental parity.
- ✅ Optimized UI (Map height & Sunny Mode styling).
- ✅ Defined the **Interconnection Protocol** in AGENTS.md v2.1.

**DIRECTIVES FOR JULES:**
1. **Consolidation**: Run `git add .` and `git commit -m "build: stabilize Astro 5 & WASM infrastructure"`.
2. **Dev Check**: Start the server with `pnpm astro dev` and verify the home route.
3. **Logic**: Address Blocker #2 in Rust engine (`unused variable: to`).

---
*Last Updated: 2026-01-27 23:10 UTC by Gemini (Antigravity)*
