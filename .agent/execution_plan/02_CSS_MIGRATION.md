# 🟡 SEGMENT 02: FRONTEND CSS MIGRATION

**OWNER**: Jules (Lead Full Stack)  
**STATUS**: READY FOR EXECUTION  
**PRIORITY**: P1 (HIGH - ARCHITECTURAL CONSISTENCY)  
**FOCUS**: `RouteCalculator.astro` & `Input.astro`

---

## 🎯 OBJECTIVE

Remove remaining technical debt (Tailwind CSS) and standardize the UI using custom "Astro + Vanilla CSS" tokens to reduce bundle size and enforce the premium design system.

---

## 🚀 EXECUTION STEPS

### 1. COMPONENT REFACTOR

**Files**: `src/components/RouteCalculator.astro`, `src/components/Input.astro`

1.  **REMOVE** all `class="..."` usages of Tailwind utility classes:
    - `flex`, `flex-col`, `gap-4`, `p-6`, `bg-white/80`, `backdrop-blur-xl`, `border-gray-200`, `shadow-lg`, etc.
2.  **REPLACE** with standard CSS classes:
    - `.calculator-container`, `.input-group`, `.result-card`, `.route-badge`, `.price-tag`.
3.  **IMPLEMENT** styles in `<style>` block:
    - Use `var(--color-turquoise)`, `var(--color-coral)`, `var(--glass-blur)`, `var(--glass-opacity)`, `var(--glass-border)`, `var(--glass-shadow)` from `index.css`.
    - Use standard CSS Grid/Flexbox layouts.
    - Ensure responsive scaling (mobile-first).

### 2. DESIGN SYSTEM ENFORCEMENT

**File**: `src/styles/index.css` (Reference)

1.  **PREMIUM AESTHETICS**:
    - **Glassmorphism**: Ensure consistent `backdrop-filter: blur(20px)` on all panels.
    - **Shadows**: Use soft, deep shadows (`0 8px 32px 0 rgba(31, 38, 135, 0.37)`).
    - **Inputs**: Custom focus states (`ring-2` equivalent using `outline`/`box-shadow`).
    - **Animations**: Add subtle transitions on hover (`transform: translateY(-2px)`).

### 3. CLEANUP

**File**: `package.json`

1.  **UNINSTALL** unnecessary Tailwind dependencies (IF no longer used anywhere else):
    - `npm uninstall tailwindcss postcss autoprefixer astro-tailind` (verify first).
2.  **DELETE** `tailwind.config.mjs` (if fully migrated).

---

## 🧪 METRICS & TESTS

### VISUAL PARITY

- [ ] **Desktop**: Calculator fits properly, no overflow.
- [ ] **Mobile**: Bottom sheet behaves correctly (scrollable results, fixed input area).
- [ ] **Theme**: Dark mode works seamlessly (using `var(--surface-card)` etc.).

### CODE QUALITY

- [ ] **Zero Tailwind**: `grep -r "flex-" src/components/RouteCalculator.astro` returns nothing.
- [ ] **Bundle Size**: Verify reduction in CSS size.

---

## 📸 EVIDENCE REQUIREMENTS

1.  **Screenshot 1**: `RouteCalculator` in Light Mode (showing Glassmorphism).
2.  **Screenshot 2**: `RouteCalculator` in Dark Mode.
3.  **Screenshot 3**: Mobile view with results list open.
4.  **Before/After**: Compare file size of `RouteCalculator.astro` (lines of code vs meaningful styles).

---

## ✅ DEFINITION OF DONE for SEGMENT 02

- `RouteCalculator.astro` uses 100% Vanilla CSS.
- `Input.astro` uses 100% Vanilla CSS.
- Design matches "Tropical Premium" aesthetic.
- Functionality (inputs, clicks) remains intact.

**NEXT STEP**: Proceed to `03_SEO_SOCIAL.md`.
