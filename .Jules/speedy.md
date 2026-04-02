<!--
  OBJETO DE ESTUDIO — speedy (Jules agent)
  =========================================
  Speedy es el agente de optimización y refactoring rápido.
  Su bitácora registra aprendizajes aplicados, con la fecha, problema,
  solución y resultado medible. Sirve como referencia para evitar
  repetir los mismos errores de performance.

  SEGUIMIENTO DE OPTIMIZACIONES
  ==============================
  | Fecha      | Área        | Problema                  | Técnica aplicada       | Resultado      |
  |------------|-------------|---------------------------|------------------------|----------------|
  | 2025-03-02 | Rust WASM   | match_stop O(N) fuzzy scan | HashMap O(1) lookup    | 36,480x mejora |
  | 2026-03-02 | TypeScript  | Dedup de rutas O(N²)       | Set para lookup O(1)   | Sublineal      |
  | 2026-03-04 | UI / Assets | img src="*.svg" bloqueante | Icon.astro (readFileSync)| Sin red req.  |

  REGLAS DE ORO (speedy)
  =======================
  1. Medir siempre antes de optimizar (benchmark o console.time).
  2. Preferir estructuras de datos O(1) (HashMap/Set) sobre búsquedas lineales.
  3. Los assets pequeños (SVG <2KB) deben ser inline; los grandes, externos.
  4. No commitear binarios WASM si la tarea es solo JS/TS.
-->

## 2026-03-28 — Inline SVGs y seguimiento de agentes
**Learning:** La documentación de objeto de estudio en los MDs de agentes mejora la trazabilidad y el aprendizaje iterativo del desarrollador.
**Action:** Agregadas secciones de objeto de estudio, seguimiento cronológico y reglas de oro a todos los MDs del sistema multi-agente.


## 2026-03-02 — O(N²) Route Deduplication Optimization
**Learning:** `Array.prototype.find` inside a loop leads to quadratic time complexity.
**Action:** Use a `Set` for O(1) lookups to optimize the deduplication of routes.

## 2025-03-02 — O(1) Route Match Optimization
**Learning:** Inefficient string comparison algorithms (Jaro-Winkler) applied to nested arrays (every stop of every route) resulted in severe performance bottlenecks in Rust WASM.
**Action:** Optimized `match_stop` function by leveraging the existing O(1) `HashMap` (`route.stop_name_to_index`) to resolve exact matches instantly, avoiding costly O(N) fuzzy scanning. Speed improvement of **36,480×** observed for valid string queries.

## 2026-03-04 — Inline SVGs for Icons
**Learning:** Replacing `<img src="*.svg">` with dynamic `<Icon>` components that read `fs.readFileSync` at build time avoids render-blocking network requests for small UI assets while keeping the code clean.
**Action:** Implemented `src/components/ui/Icon.astro` and refactored `Input.astro` and `RouteCalculator.astro`.
