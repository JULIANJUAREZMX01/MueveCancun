# 🏛️ MueveCancun: Hardening Report (Nexus Prime v3.3)

## 🕵️ The Vector (Problems)
- **UI Overflow**: CSS fixed units and lack of `box-sizing` caused horizontal scrolling on small devices.
- **Keyboard Overlap**: Static heights caused inputs/buttons to hide behind the mobile keyboard.
- **Fare Drift**: Stale prices ($13/$15) didn't match real street costs ($10/$12).
- **R-10 Confusion**: Users taking R-10 expecting to reach airport terminals.
- **Fuzzy Search**: Short tokens (e.g., "R1") failing due to index minimum length.

## 🛡️ The Shield (Solutions)
- **Hardening CSS**: Global `box-sizing: border-box` and `max-width: 100vw`.
- **Dynamic Viewport**: `100dvh` in `src/index.css` to handle keyboard layout changes.
- **Data Update**: `master_routes.json` updated with correct 2026 fares.
- **R-10 Labeling**: Renamed to "Aeropuerto (TRABAJADORES)" + explicit restricted access alerts.
- **Index Optimization**: `CoordinateFinder` token length reduced to 2 for better short-search matching.

## 🧠 Results
- **Overflow Test**: `document.documentElement.scrollWidth > window.innerWidth` -> **False**
- **WASM Build**: **Success**
- **Tests**: 37 passed in 325ms.
- **PWA**: Version bumped to `v3.3.0` for SW revalidation.
