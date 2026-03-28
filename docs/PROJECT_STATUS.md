# 📊 MueveCancún PWA — Estado del Proyecto
**Fecha:** 2026-03-28 _(actualizado desde 2026-03-10)_
**Versión:** 1.0.0 (Nexus Prime v3.3 + SEO pending)  
**Estado General:** 🟢 ESTABLE — Motor WASM operativo, PWA desplegada en producción

---

## 🎯 Resumen Ejecutivo

MueveCancun es una PWA offline-first de transporte público para Cancún y la Riviera Maya.
El motor de ruteo está compilado a WebAssembly (Rust), la UI es Astro 5 SSG, y toda la
persistencia funciona sobre IndexedDB sin necesidad de backend.

### Logros Acumulados (hasta 28-Mar-2026)

| Área | Estado |
|------|--------|
| Motor WASM (Nexus Transfer Engine) | ✅ Compilado y operativo |
| Detección de transbordos (exacto + geo ≤350 m) | ✅ Funcional |
| Balance unificado IndexedDB | ✅ Resuelto |
| GPS → parada más cercana | ✅ Implementado |
| PWA offline (Service Worker) | ✅ Activo |
| Mapa interactivo Leaflet | ✅ Con popups de parada |
| i18n Español / Inglés | ✅ Middleware Astro |
| CI/CD (6 workflows) | ✅ test, build-wasm, validate-data, autocurative, claude-delegation, codeql |
| Seguridad XSS / DoS / Prototype Pollution | ✅ Implementado |
| SEO (OG image, sitemap, verification tags) | ⏳ PR #367 — pending merge |
| Catálogo de rutas completo | ⚠️ Datos parciales — pendiente v3.4 |

---

## 📁 Estructura del Proyecto

```
MueveCancun/
├── .github/workflows/           # CI/CD (test, build-wasm, validate-data, autocurative, codeql)
├── docs/                        # Documentación del proyecto
├── public/
│   ├── data/
│   │   ├── master_routes.json           # Catálogo principal de rutas
│   │   ├── master_routes.optimized.json # Versión pre-optimizada (~40 % menor)
│   │   ├── routes-index.json            # Índice de búsqueda
│   │   └── routes/                      # 10 archivos de rutas individuales
│   ├── icons/                   # Iconos de la PWA (SVG/PNG)
│   ├── sw.js                    # Service Worker PWA
│   ├── manifest.json            # PWA manifest
│   └── vendor/leaflet/          # Librería de mapas (bundled)
├── rust-wasm/
│   ├── route-calculator/src/lib.rs  # Motor de ruteo WASM (~900 LOC)
│   └── shared-types/src/lib.rs      # Tipos compartidos Rust
├── scripts/                     # 11 scripts de build y validación
├── src/
│   ├── components/
│   │   ├── RouteCalculator.astro    # UI principal de búsqueda (~1 000 LOC)
│   │   ├── InteractiveMap.astro     # Mapa Leaflet con popups
│   │   ├── BottomNav.astro          # Navegación inferior fija
│   │   └── ui/                      # 15 componentes atómicos
│   ├── layouts/MainLayout.astro     # Layout principal (dark mode, nav)
│   ├── pages/                       # 13 páginas Astro (SSG)
│   ├── tests/                       # 11 archivos de test (Vitest)
│   └── utils/                       # 16 módulos TypeScript (~1 400 LOC)
├── astro.config.mjs
├── package.json                 # cancunmueve-pwa v1.0.0
├── render.yaml                  # Deploy config (Render.com)
├── README.md
├── ROADMAP.md
├── DEPLOY.md
├── SECURITY.md
├── CLAUDE.md
└── AGENTS.md
```

---

## 🔧 Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | Astro SSG | 5.16.15 |
| Estilos | Tailwind CSS | 3.4.0 |
| Mapas | Leaflet | vendor |
| Motor | Rust + WebAssembly (wasm-pack) | 0.14.0 |
| Persistencia | IndexedDB (idb) | 8.0.3 |
| Tests | Vitest | 4.0.1 |
| E2E | Playwright | 1.58.1 |
| Runtime | Node.js ≥ 20 | — |
| Package manager | pnpm | 9.15.4 |
| Deploy | Render.com (Node Web Service) | — |

---

## 🧪 Cobertura de Tests

### Archivos de Test (`src/tests/`, 11 archivos, 1 324 LOC)

| Archivo | Módulo testeado |
|---------|----------------|
| `health.test.ts` | Sanidad básica del entorno |
| `utils.test.ts` | `escapeHtml`, `getDistance`, utilidades generales |
| `i18n.test.ts` | Traducciones ES/EN |
| `toast.test.ts` | Sistema de notificaciones |
| `SpatialHash.test.ts` | Índice espacial (O(1) lookup) |
| `CoordinatesStore.test.ts` | Almacén de coordenadas + normalización |
| `CoordinateFinder.test.ts` | GPS → parada más cercana |
| `db.test.ts` | IndexedDB + wallet HMAC |
| `transport.test.ts` | Helpers de datos de transporte |
| `RouteDrawer.test.ts` | Dibujo de rutas en mapa Leaflet |
| `FavoritesStore.test.ts` | Gestión de paradas favoritas |

---

## ⚙️ Algoritmos Clave (Motor WASM)

### Nexus Transfer Engine (`rust-wasm/route-calculator/src/lib.rs`)

**Búsqueda de transbordos** en 2 pasadas:
1. **Pass 1 — Exact match**: nombres normalizados idénticos entre ruta A y ruta B.
2. **Pass 2 — Geo proximity**: paradas a ≤ 350 m via Haversine.

**Hubs preferidos** (`PREFERRED_HUBS`):
El Crucero, Plaza Las Américas, ADO, Zona Hotelera, Muelle Ultramar, Mercado 23/28 y otros 8 puntos de conexión conocidos.

**Protecciones DoS:**
- Máx. 10 000 000 operaciones por búsqueda  
- Máx. 10 MB de payload WASM  
- Máx. 5 000 rutas en catálogo  
- Máx. 500 paradas por ruta  

### Flujo GPS → Parada
```
GPS (lat, lng)
  └─► CoordinatesStore.findNearestWithDistance()
        └─► SpatialHash (O(1) lookup)
              └─► Si distancia < 1 km → nombre de parada
              └─► Si no → toast de error + input manual
```

---

## 🔐 Seguridad Implementada

| Vector | Mitigación |
|--------|-----------|
| XSS | `escapeHtml()` en todo innerHTML dinámico |
| Prototype Pollution | `Map<string, …>` en lugar de objetos planos |
| DoS WASM | Límite de 10 M ops + 10 MB payload |
| Wallet | Firma HMAC en `src/utils/db.ts` |
| Secrets | `.env` en `.gitignore`; nunca en código fuente |
| CodeQL | Workflow de análisis estático en cada push |

---

## 🌐 Producción

| Recurso | URL |
|---------|-----|
| App principal | https://querutamellevacancun.onrender.com |
| Repositorio | https://github.com/JULIANJUAREZMX01/MueveCancun |
| Deploy config | `render.yaml` (Node.js Web Service) |

---

## 🏗️ CI/CD

| Workflow | Trigger | Acción |
|----------|---------|--------|
| `test.yml` | Push / PR | Rust tests + Vitest + validate routes + Astro build |
| `build-wasm.yml` | Push a `rust-wasm/**` | Compila WASM, auto-commit a `public/wasm/` |
| `validate-data.yml` | Push a `public/data/**` | Valida esquema JSON del catálogo |
| `autocurative.yml` | Lunes 06:00 UTC | Health check semanal + auto-fix |
| `codeql.yml` | Push | Análisis estático de seguridad |
| `claude-delegation.yml` | Manual | Tareas de largo plazo vía IA |

---

## 🐛 Deuda Técnica Activa

Ver [`TECH_DEBT.md`](./TECH_DEBT.md) para el inventario completo.

Resumen priorizado:

| Prioridad | Ítem |
|-----------|------|
| 🔴 Alta | Archivos de desarrollo en raíz (`full_script.ts`, `patch*.diff`, `*.bak`) — limpiar o mover a `/tmp` |
| 🔴 Alta | `master_routes.json` usa `"rutas"` con múltiples entradas; aún hay datos/coords placeholder y registros incompletos que no son aptos para producción |
| 🟡 Media | `RouteCalculator.astro.bak` / `.new` — artefactos de edición sin eliminar |
| 🟡 Media | `Analytics.ts` es un stub sin proveedor real |
| 🟢 Baja | Cobertura de tipos TypeScript — algunos `any` restantes |
| 🟢 Baja | i18n incompleto — strings hardcodeados en algunos componentes |

---

## 📈 Próximos Sprints

Ver [`ROADMAP.md`](../ROADMAP.md) para el plan completo.

| Sprint | Foco | Estado |
|--------|------|--------|
| v3.3 (actual) | Nexus Transfer Engine, GPS, mapa interactivo | ✅ Completado |
| v3.4 | Catálogo de rutas completo + validación de datos | 🔲 Planificado |
| v3.5 | Crowdsourcing, formularios offline, background sync | 🔲 Planificado |
| v4.0 | Multi-ciudad (Cancún / Playa / Tulum), analytics real | 🔲 Planificado |

---

**Última actualización:** 2026-03-10
**Próxima revisión:** Al completar sprint v3.4
