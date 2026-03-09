# 🚀 MueveCancún PWA – Bilingual Execution Plan (English / Español)
**Date:** 2026-02-19
**Scope:** Offline-first PWA, WASM routing, Map UX, IndexedDB wallet, crowdsourcing.
**Note:** A parallel agent is already handling language copy via **Languini**; this plan keeps i18n tasks minimal and coordination-focused.

---

## 🎯 Guiding Principles / Principios
- **Lowest disruption first / Mínima disrupción:** prefer configuration and guard-rail fixes before refactors.
- **Offline-first always / Siempre offline-first:** service worker, IndexedDB, and WASM must remain functional without network.
- **Safety gates / Barreras de seguridad:** feature flags and staged rollouts for risky changes.
- **Shared ownership / Propiedad compartida:** each task lists a suggested sub-agent/owner to parallelize delivery.

---

## 👥 Suggested Sub-Agents / Subagentes Sugeridos
- **Gemini (Rust-WASM):** routing engine, spatial index, binary size.
- **Jules (PWA/DevOps):** service worker, caching, CI, deployment.
- **Languini (i18n):** bilingual copy review, translations, locale QA.
- **Antigravity (UX/Islands):** Astro islands, UI polish, accessibility.
- **QA Bot:** scripted regression, Lighthouse/Playwright smoke.
- **Data Curator:** routes/master data validation, legacy ingestion.

---

## 🔥 Urgency-Ordered Task Backlog (50 items) / Lista por urgencia (50 ítems)
1. **[Now] Validate WASM build succeeds without wasm-opt download** — Validar que el build WASM funcione sin descargar wasm-opt (sub-agent: Jules).
2. **[Now] Cache binaryen/wasm-bindgen artifacts in CI** — Cachear binaryen/wasm-bindgen en CI para builds rápidos (DevOps).
3. **[Now] Add wasm-opt=false fallback flag in Cargo metadata** — Agregar fallback wasm-opt=false en Cargo si falla la descarga (Gemini).
4. **[Now] Guard WASM init in RouteCalculator to avoid double-load** — Proteger inicialización WASM en RouteCalculator para evitar doble carga (Antigravity).
5. **[Now] Verify master_routes.json normalization before WASM call** — Verificar normalización de master_routes.json antes del WASM (Data Curator).
6. **[Now] Re-run IndexedDB migration smoke (wallet-status v2)** — Reejecutar smoke de migración IndexedDB (wallet-status v2) (QA Bot).
7. **[Now] Confirm balance gate blocks searches < $180 MXN** — Confirmar que la barrera de balance bloquea búsquedas < $180 MXN (QA Bot).
8. **[Now] Service worker cache warm for /wasm/** — Precalentar caché del SW para /wasm/ (Jules).
9. **[Now] Verify offline fallback page renders without console errors** — Verificar que la página offline cargue sin errores de consola (QA Bot).
10. **[Now] Mapbox token presence check with user-facing warning** — Check de token Mapbox con advertencia visible (Antigravity).
11. **[Now] Security sweep: ensure .env never shipped in dist** — Barrido de seguridad: confirmar que .env no llegue a dist (DevOps).
12. **[Now] Enable Lighthouse PWA audit in CI (informational)** — Habilitar auditoría PWA Lighthouse en CI (informativa) (DevOps).
13. **[Now] Error telemetry queue flush on tab close** — Vaciar cola de telemetría de errores al cerrar pestaña (Antigravity).
14. **[Now] Crash-free metric: add simple counter to Analytics stub** — Métrica crash-free: contador en stub de Analytics (Gemini).
15. **[Now] Languini-led copy review of critical flows (EN/ES)** — Revisión de textos críticos (EN/ES) liderada por Languini (Languini).
16. **[Next] Crowdsourcing form submit validation + offline queue** — Validación de formulario de aportes y cola offline (Antigravity).
17. **[Next] Driver wallet dashboard happy-path E2E smoke** — Smoke E2E del dashboard de piloto/conductor (QA Bot).
18. **[Next] Geolocation permission UX (soft prompt + retry)** — UX de permisos de geolocalización (prompt suave + reintento) (Antigravity).
19. **[Next] Map recenter button long-press to toggle auto-follow** — Botón de recentrar con pulsación larga para auto-seguir (Antigravity).
20. **[Next] Route list virtualized scrolling for large datasets** — Scroll virtualizado en lista de rutas con muchos datos (Antigravity).
21. **[Next] WASM routing benchmark with 3-city dataset** — Benchmark de ruteo WASM con dataset de 3 ciudades (Gemini).
22. **[Next] Spatial index cell size tunable via config** — Tamaño de celda del índice espacial configurable (Gemini).
23. **[Next] Add stale-while-revalidate policy for /data/** — Política stale-while-revalidate para /data/ (Jules).
24. **[Next] Progressive data fetch (chunked route loading)** — Carga progresiva de datos (rutas en chunks) (Gemini).
25. **[Next] IndexedDB quota check & user warning** — Chequeo de cuota IndexedDB y aviso al usuario (Antigravity).
26. **[Next] Background sync for crowdsourced submissions** — Sync en segundo plano para envíos comunitarios (Jules).
27. **[Next] Detect and dedupe duplicate stops in CoordinatesStore** — Detectar y deduplicar paradas duplicadas en CoordinatesStore (Gemini).
28. **[Next] Add unit test coverage for transfer-heavy routes** — Tests unitarios para rutas con muchos transbordos (Gemini).
29. **[Next] Accessibility pass: keyboard navigation in RouteCalculator** — Accesibilidad: navegación por teclado en RouteCalculator (Antigravity).
30. **[Next] ARIA labels for map controls and buttons** — Etiquetas ARIA para controles del mapa y botones (Antigravity).
31. **[Next] Replace any-typed Analytics payload with typed interface** — Reemplazar payload Analytics con interfaz tipada (Gemini).
32. **[Next] Feature flag for crowdsourcing form (env-driven)** — Feature flag para formulario de aportes (controlado por env) (Jules).
33. **[Next] Add Playwright smoke for offline search happy-path** — Playwright smoke del flujo offline de búsqueda (QA Bot).
34. **[Next] Validate manifest icons & maskable sizes** — Validar íconos y tamaños maskable en el manifest (Jules).
35. **[Next] Document WASM data contract in BRIDGE_WASM.md** — Documentar contrato de datos WASM en BRIDGE_WASM.md (Gemini).
36. **[Later] Implement route history persistence (opt-in)** — Implementar historial de rutas (opt-in) (Antigravity).
37. **[Later] Add “recent stops” quick shortcuts in search** — Agregar accesos rápidos a paradas recientes en búsqueda (Antigravity).
38. **[Later] Multi-city selector (Cancún/Playa/Tulum)** — Selector de ciudad múltiple (Cancún/Playa/Tulum) (Gemini).
39. **[Later] Heatmap layer for crowd congestion (mock data)** — Capa de mapa de calor para congestión (datos simulados) (Antigravity).
40. **[Later] Integrate real analytics provider (Plausible/GA4)** — Integrar proveedor real de analytics (Plausible/GA4) (DevOps).
41. **[Later] Privacy policy page bilingual review** — Revisión bilingüe de la política de privacidad (Languini).
42. **[Later] Offline-first documentation update in README** — Actualizar README con enfoque offline-first (Jules).
43. **[Later] Create synthetic dataset generator for tests** — Generador de datasets sintéticos para pruebas (Gemini).
44. **[Later] Performance budget: <3s TTI on mid-tier device** — Presupuesto de performance: <3s TTI en dispositivo medio (Antigravity).
45. **[Later] Mapbox style optimization (sprites, glyphs subset)** — Optimizar estilos Mapbox (sprites, subconjunto de glyphs) (Antigravity).
46. **[Later] Add CI step to diff public/wasm vs src/wasm** — Paso de CI para comparar public/wasm vs src/wasm (Jules).
47. **[Later] Add route deletion/cleanup for stale dynamic routes** — Limpieza/eliminación de rutas dinámicas obsoletas (Data Curator).
48. **[Later] Add healthcheck page exposing build info** — Página de healthcheck con info de build (DevOps).
49. **[Later] Prepare Render/Astro Cloud blue-green deploy script** — Script de despliegue blue-green para Render/Astro (DevOps).
50. **[Later] Post-mortem template for incidents** — Plantilla de post-mortem para incidentes (DevOps).

---

## 🛠 Implementation Waves / Oleadas de Implementación
- **Wave 1 (Now, 0-2 days):** Tasks 1-15 — unblock builds, offline readiness, balance gate, copy review with Languini.
- **Wave 2 (Next, 3-7 days):** Tasks 16-35 — UX polish, feature flags, accessibility, spatial tuning, additional tests.
- **Wave 3 (Later, 1-3 weeks):** Tasks 36-50 — growth features, analytics, deployment hardening, operational maturity.

---

## ✅ Success Criteria / Criterios de Éxito
- **Build stability:** WASM builds succeed even when wasm-opt download is unavailable.
- **Offline reliability:** /offline works, /wasm cached, searches runnable without network.
- **Safety:** Balance gate enforced, .env guarded, feature flags for new surfaces.
- **Quality:** 0 console errors in smoke tests; Playwright/Lighthouse informational checks passing.
- **Bilingual parity:** Critical flows copy reviewed by Languini; EN/ES remain aligned.

---

## 🤝 Coordination Notes / Notas de Coordinación
- Keep Languini as the source of truth for translations; avoid hardcoding copy changes without its review.
- Gemini focuses on Rust/WASM and data contracts; Jules on SW/DevOps; Antigravity on UX; QA Bot schedules smokes post-Wave 1 and Wave 2.
- Data Curator to gate any master_routes.json changes to prevent schema drift before WASM ingestion.
