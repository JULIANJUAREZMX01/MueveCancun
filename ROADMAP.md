# 🗺️ MueveCancún — Roadmap

> Última actualización: 2026-05-09 · Versión actual: **v3.7.0**
> App en producción: [mueve-cancun.vercel.app](https://mueve-cancun.vercel.app)

---

## Estado Actual — v3.7 ✅ LIVE

El núcleo funcional está terminado y desplegado en Vercel:

- **Motor WASM (Rust)** — Búsqueda de rutas con transbordos exactos y geográficos (≤350m).
- **PWA offline-first** — Service Worker v4; funciona sin internet.
- **GPS auto-follow** — Long-press ≥600ms → watchPosition continuo, pan cancela.
- **Mapa interactivo Leaflet** — Popups "Salgo de aquí / Voy aquí", 0 `any`.
- **Wallet IndexedDB** — Balance HMAC-firmado, migración de localStorage.
- **Virtual List** — DOM recycling (~200 cards → 8-12 en DOM).
- **Nexus Agent** — Chat serverless `/api/v1/nexus` (Groq LLM + rule-based fallback).
- **Foro en tiempo real** — `/api/reports` conectado a Neon Postgres, polling 30s.
- **Juego "Adivina Dónde Estoy"** — Cámara + GPS + heurística de zonas.
- **Stripe Guardians** — Payment Links live para Shield ($3) y Architect ($10).
- **i18n ES/EN** — 75 keys incluyendo `game.*` y `welcome.*`.
- **CI/CD** — 6 GitHub Actions workflows; Lighthouse PWA ≥90, A11y ≥90.
- **Tests** — 156/156 vitest ✅ · tsc --noEmit exit 0 ✅

---

## v3.6 — Experiencia de Usuario y Accesibilidad ✅

- [x] GPS long-press auto-follow con follow-pulse CSS y aria-pressed.
- [x] Virtual scroll en lista de rutas (~200→8-12 nodos DOM).
- [x] Navegación por teclado completa en RouteCalculator.
- [x] TTI <3s: manualChunks + dns-prefetch + modulepreload WASM.
- [x] Lighthouse CI en GitHub Actions (PWA ≥90, A11y ≥90).
- [x] ARIA live regions y roles completos en mapa y calculador.

## v3.7 — Correcciones y Agente Real ✅ (2026-05-09)

- [x] `guess.astro` — eliminado doble `export const prerender`, strings hardcoded al frontmatter.
- [x] `ruta/index.astro` — eliminado segundo `export const prerender` fuera del frontmatter.
- [x] `community.astro` — reconciliado CSS `.chip` vs `.filter-chip`.
- [x] `tracking.astro` — `refreshBtn` usa `fetchUnits()` real (eliminado `generateUnits` indefinido).
- [x] `NexusAgentUI.astro` — WebLLM de CDN reemplazado por `/api/v1/nexus` serverless.
- [x] `/api/v1/nexus` — nuevo endpoint: Groq llama-3.1-8b-instant + rule-based fallback.
- [x] i18n — agregadas 13 keys `game.*` que faltaban en `es.json` y `en.json`.

---

## v4.0 — Multi-ciudad y Analytics Real
**Objetivo:** Expandir a Playa del Carmen y Tulum; métricas reales.
**Estimado:** 6–8 semanas

### Tareas
- [ ] Selector de ciudad en UI (Cancún / Playa del Carmen / Tulum).
- [ ] Catálogos independientes por ciudad (`master_routes_playa.json`, etc.).
- [ ] Dashboard de métricas: rutas más buscadas, hubs más usados.
- [ ] Política de privacidad bilingüe actualizada.
- [ ] Despliegue blue-green en Vercel para releases sin downtime.
- [ ] Driver app para alimentar `/api/tracking` con GPS real.

---

## Backlog Técnico

| Prioridad | Tarea |
|-----------|-------|
| 🔴 | Cachear artefactos wasm-bindgen / binaryen en CI para builds rápidos |
| 🟡 | stale-while-revalidate en SW para `/data/**` |
| 🟡 | Carga progresiva del catálogo en chunks |
| 🟡 | `GROQ_API_KEY` env var en Vercel para activar LLM en Nexus |
| 🟢 | Generador de datasets sintéticos para pruebas de carga |
| 🟢 | Driver app móvil (React Native o PWA) para tracking GPS real |
| 🟢 | Notificaciones push para alertas de ruta favorita |
