# CLAUDE.md — MueveCancun AI Agent Instructions

<!--
  OBJETO DE ESTUDIO — claude-code
  ================================
  Este agente es el asistente principal de desarrollo para Julián.
  Su función va más allá de escribir código: también enseña los fundamentos
  de cada decisión técnica para que Julián los comprenda y replique.

  DECISIONES TÉCNICAS DOCUMENTADAS
  =================================
  1. WASM en lugar de backend Node.js
     → Razón: sin costo de servidor, funciona offline, performance nativa en Rust.
     → Aprendizaje: separar lógica de negocio (Rust) de presentación (Astro/TS).

  2. IndexedDB + HMAC para wallet
     → Razón: persistencia offline sin base de datos remota.
     → Aprendizaje: criptografía del lado cliente como deterrente (no banco real).

  3. `escapeHtml()` obligatorio en innerHTML
     → Razón: prevenir XSS en cualquier string que venga del usuario o del catálogo.
     → Aprendizaje: toda interpolación de datos externos en HTML es un vector de ataque.

  4. CustomEvents para comunicación entre componentes
     → Razón: desacoplar mapa, calculador y wallet sin estado global compartido.
     → Aprendizaje: arquitectura orientada a eventos reduce dependencias circulares.

  5. Circuit-breaker en WASM (10M ops, 10MB payload)
     → Razón: prevenir DoS desde el cliente al motor de ruteo.
     → Aprendizaje: los límites de recursos son parte del diseño de seguridad.

  SEGUIMIENTO DE TAREAS (claude-code)
  =====================================
  | Sprint     | Tarea completada                          | Tests añadidos |
  |------------|-------------------------------------------|----------------|
  | Feb 2026   | Análisis y limpieza inicial del proyecto  | —              |
  | Mar 2026   | Nexus Prime v3.3 — producción estable     | ✅ Vitest + Rust|
  | Mar 2026   | Fix GPS: findNearestWithDistance          | ✅             |
  | Mar 2026   | Fix revisiones Copilot PR #366            | ✅             |
  | Mar 2026   | Documentación objetos de estudio          | —              |
-->

## Proyecto

**MueveCancun** es una PWA offline-first para transporte público en Cancún y la Riviera Maya.
Stack: **Astro SSG + Rust/WASM + Leaflet + IndexedDB**
Repositorio: `JULIANJUAREZMX01/MueveCancun`
Branch de desarrollo: siempre `claude/fix-*` o similar; **nunca pushear directo a `main`**.

---

## Arquitectura de 4 Capas (Protocolo Nexus)

```
Capa 1: Datos        → public/data/master_routes.json + public/data/routes/*.json
Capa 2: Procesamiento → rust-wasm/route-calculator/src/lib.rs (compilado a WASM)
Capa 3: Presentación  → src/components/, src/pages/ (Astro SSG)
Capa 4: Persistencia  → src/utils/db.ts (IndexedDB + HMAC wallet)
```

---

## Comandos Esenciales

```bash
# Desarrollo
pnpm install
pnpm run dev                    # Dev server (incluye optimize-json)

# Tests (SIEMPRE correr antes de commit)
pnpm test                       # Vitest (TS)
cd rust-wasm/route-calculator && cargo test --lib  # Tests Rust

# Build completo
node --experimental-strip-types scripts/build-wasm.ts    # Compilar Rust → WASM
node --experimental-strip-types scripts/validate-routes.ts  # Validar datos de rutas
node --experimental-strip-types scripts/optimize-json.ts   # Pre-optimizar JSON para WASM
pnpm build                      # Build Astro SSG completo

# Validación rápida
node scripts/check-wasm.cjs    # Verificar binario WASM existe
node --experimental-strip-types scripts/validate-routes.ts  # Validar JSON de rutas

# SEO / Activos estáticos (scripts agregados en PR #367, migrados a TS en PR #397)
node --experimental-strip-types scripts/generate_og_image.ts  # Regenera public/og-image.png (1200×630px vía Sharp)
node --experimental-strip-types scripts/update-stats.ts       # Actualiza estadísticas en README.md
```

---

## Archivos Críticos — Leer ANTES de Modificar

| Archivo | Propósito | Riesgo |
|---------|-----------|--------|
| `rust-wasm/route-calculator/src/lib.rs` | Motor de ruteo WASM | Alto — cambios requieren recompilación |
| `public/data/master_routes.json` | Catálogo de rutas | Alto — mal JSON rompe el motor |
| `src/components/RouteCalculator.astro` | UI principal (~60KB) | Medio — leer antes de editar |
| `src/components/InteractiveMap.astro` | Mapa Leaflet | Medio |
| `public/sw.js` | Service Worker PWA | Medio — afecta caché offline |
| `src/utils/CoordinatesStore.ts` | Base de datos de coordenadas | Bajo |

---

## Reglas de Datos

1. **Cada parada** en `master_routes.json` DEBE tener `lat`, `lng` con valores reales (no 0,0).
2. **Cada ruta** DEBE tener: `id`, `nombre`, `tarifa` (número), `tipo`, `paradas` (array).
3. **IDs de ruta**: máximo 100 caracteres; usar formato `RUTA_AREA_NNN` (e.g., `R1_ZONA_HOTELERA_001`).
4. **Nombres de paradas**: máximo 100 caracteres; ser descriptivos (incluir colonia o referencia).
5. **Máximos WASM**: 5000 rutas por catálogo, 500 paradas por ruta.
6. Después de editar `master_routes.json`, correr: `node scripts/validate-routes.mjs`.

---

## Lógica de Transbordos (Nexus Transfer Engine)

El motor WASM en `lib.rs` detecta transbordos en 2 pasos:

1. **Pass 1 — Exact match**: busca paradas con el mismo nombre normalizado entre ruta A y ruta B.
2. **Pass 2 — Geo proximity**: si no hay match exacto, busca paradas a ≤350m de distancia (Haversine).

**Hubs preferidos** (definidos en `PREFERRED_HUBS` en `lib.rs`):
- El Crucero, Plaza Las Américas, ADO, Zona Hotelera, Muelle Ultramar, Mercado 23/28, etc.

Para agregar un nuevo hub: añadir el nombre (o substring) a `PREFERRED_HUBS` en `lib.rs` y recompilar.

---

## Flujo GPS → Parada

**Antes (roto)**: GPS devolvía `"lat, lng"` como texto en el input → WASM no encontraba nada.
**Ahora (fixed)**:
1. `CoordinatesStore.findNearestWithDistance(lat, lng)` devuelve `{ name, distanceKm }`.
2. Si `distanceKm < 1.0`: se usa el nombre de la parada más cercana.
3. Si no: toast de error con mensaje de ayuda.

---

## Flujo Mapa → Calculador

El `InteractiveMap.astro` emite `CustomEvent('MAP_SET_STOP', { detail: { type: 'origin'|'dest', name } })`.
El `RouteCalculator.astro` escucha ese evento y actualiza los inputs.

---

## Seguridad (No Romper)

- **XSS**: Siempre usar `escapeHtml()` antes de insertar strings en innerHTML.
- **Prototype Pollution**: Usar `Map` en lugar de objetos planos para datos del catálogo.
- **DoS WASM**: El motor tiene límite de 10M ops y 10MB de payload — no aumentar.
- **HMAC Wallet**: `src/utils/db.ts` — la firma HMAC es un deterrente; no remover.
<!-- También: scripts/update-stats.ts usa traversal puro de Node.js (no shell expansion)
     para evitar inyección de comandos. Mantener ese patrón. -->

---

## SEO y Metadatos (Agregado PR #367, 2026-03-28)

<!-- Contexto: auditoría SEO detectó OG image de 157 bytes (placeholder), sitemap sin
     páginas localizadas/rutas, y sin soporte de verificación de Search Console. -->

- **OG Image**: `public/og-image.png` — 1200×630px, regenerar con `node --experimental-strip-types scripts/generate_og_image.ts`.
- **Sitemap dinámico**: `src/pages/sitemap.xml.ts` — incluye `/es/`, `/en/` y todas las rutas (`/es/ruta/:id`).
- **Verification tags** (condicionales en `MainLayout.astro`):
  - `PUBLIC_GOOGLE_SITE_VERIFICATION` → `<meta name="google-site-verification" />`
  - `PUBLIC_BING_SITE_VERIFICATION` → `<meta name="msvalidate.01" />`
- **Stats README**: `node --experimental-strip-types scripts/update-stats.ts` — actualiza commit count y líneas Rust.

---

## Tests Esperados

Al agregar features o fixes, agregar tests en:
- `src/tests/` (Vitest) para código TypeScript
- `rust-wasm/route-calculator/src/lib.rs` sección `#[cfg(test)]` para Rust

Test mínimo para transfer: `test_find_route_transfer_exact_name` y `test_find_route_transfer_geographic`.

---

## Git Workflow

```bash
# Siempre trabajar en rama claude/*
git checkout -b claude/descripcion-breve-XXXXX

# Commit con mensaje descriptivo
git commit -m "fix(routing): descripción del fix"

# Push
git push -u origin claude/descripcion-breve-XXXXX
```

**Nunca** push a `main` directamente. Siempre crear PR para revisión.

---

## Diagnóstico Rápido de Fallos

| Síntoma | Causa probable | Fix |
|---------|---------------|-----|
| "Catalog not loaded" en consola | WASM no compilado o JSON inválido | `node scripts/build-wasm.mjs && node scripts/validate-routes.mjs` |
| GPS no funciona | `findNearestWithDistance` falla | Verificar que `coordinatesStore.init()` se llamó antes |
| Transbordos no aparecen | Nombres de paradas sin match | Verificar nombres en catálogo; agregar hub alias |
| Mapa no dibuja ruta | Coordenadas faltantes en paradas | Agregar `lat`/`lng` en `master_routes.json` |
| SW muestra contenido antiguo | Cache version no bumpeada | Incrementar `CACHE_VERSION` en `public/sw.js` |

---

## Próximos Pasos Recomendados (v3.4+)

<!-- TRACKING: backlog priorizado para el agente claude-code -->
- [ ] **v3.4** — Completar catálogo `master_routes.json` con rutas reales y coordenadas
- [ ] **v3.4** — Tests de integración para 5+ rutas conocidas de Cancún
- [ ] **v3.5** — Formulario de reporte de incidentes con Background Sync API
- [ ] **v3.6** — Modo contribuidor: interfaz para agregar paradas desde el campo
- [ ] **v4.0** — Mapa 3D / AR para indicar dirección de camioneta en parada

---

## PRs Activas — Contexto para Nuevos Agentes

<!-- TRIAGE 2026-03-28 | Auditor: GitHub Copilot Agent -->
<!-- Última auditoría: docs/PR_TRIAGE_2026-03-28.md -->

Al recibir una tarea, verificar primero si alguna PR pendiente ya aborda el mismo problema.

### PRs listas para mergear (no duplicar trabajo)

| PR | Qué resuelve |
|----|-------------|
| **#366** | 🔒 CVEs en deps de build (picomatch, brace-expansion) |
| **#350** | Event delegation + `e.isTrusted` en botones del mapa |
| **#351** | Optimización de `CoordinateFinder.find` |
| **#352** | Error handling + telemetría en `FavoritesStore` |

### PRs en rebase — no duplicar ni sobrescribir

| PR | Qué modifica |
|----|-------------|
| **#365** | TypeScript FFI strict, elimina `any`, migra SW a `.ts` |
| **#360** | Hardening CI, `.gitignore`, telemetry tests |
| **#357** | `rust-wasm/spatial-index/src/lib.rs` — cache hash |
| **#355** | Elimina `@ts-ignore` en `wallet.astro` e `InteractiveMap.astro` |

### ⛔ Regla crítica — Tailwind CSS

**NO eliminar Tailwind CSS** en ninguna PR sin un plan de migración explícito y aprobado.
Tailwind sigue activo en producción. La PR #342 está bloqueada por este motivo.
La migración a PostCSS/Houdini debe ser **incremental y documentada por componente**.

> Ver análisis completo: [`docs/PR_TRIAGE_2026-03-28.md`](docs/PR_TRIAGE_2026-03-28.md)

## Guías de Enrutamiento Estático
Para garantizar compatibilidad con CDN/Static Hosting:
1.  **Enlaces Internos**: Usa `getRelativeLocaleUrl(lang, path)`.
    - Correcto: `<a href={getRelativeLocaleUrl(lang, 'rutas')}>`
    - Incorrecto: `<a href="/rutas">`
2.  **Redirecciones**: Deben ser del lado del cliente.
    - Usa `window.location.replace()` o `<meta http-equiv="refresh">`.
3.  **Localización**: No dependas de headers de servidor (ej. `Accept-Language`) en Astro components. Usa el script de detección en `index.astro`.
