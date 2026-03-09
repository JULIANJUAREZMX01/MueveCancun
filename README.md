# 🏛️ MueveCancun / MueveReparto: La Verdad de la Calle (Nexus Prime v3.2)

> "Hecho para el repartidor que trabaja solo, sin flotas ni supervisores."

**Mueve Reparto** es una PWA offline-first diseñada para repartidores independientes en Cancún y zonas similares. Organiza paradas, traza rutas, notifica clientes por WhatsApp/Telegram y mide tu productividad diaria — todo sin depender de internet.

---

## El Problema

Los repartidores independientes no tienen herramientas. Las apps empresariales (Rappi, UberEats) son para flotas controladas. WhatsApp y papel son el estándar real. Mueve Reparto llena ese vacío: una herramienta ligera, sin registro obligatorio, que funciona offline y vive en el teléfono como una app nativa.

📌 **ROADMAP:** Consulta las fases del proyecto en el nuevo [ROADMAP.md](ROADMAP.md).

---

## Funcionalidades principales

| Pantalla | Función |
|----------|---------|
| `/home` | Dashboard: paradas del día, progress ring, próxima entrega |
| `/pedidos` | CRUD de paradas — 4 modos de captura, filtros, complete/delete |
| `/reparto` | Mapa Leaflet + GPS + optimizador nearest-neighbor de ruta |
| `/enviar` | Notificaciones por WhatsApp/Telegram con plantillas de mensaje |
| `/metricas` | Bar chart semanal, ROI por día, meta editable |

---

## Stack técnico

```
Frontend:    Astro 5 (SSR) + Vanilla JS + Tailwind CSS v3
Maps:        Leaflet (dark tiles — OpenStreetMap)
Storage:     IndexedDB (idb 8) — offline-first, sin backend
PWA:         Service Worker + Web App Manifest (installable)
Routing:     Nearest-neighbor greedy (JS puro)
Build:       pnpm + Vite 6
Deploy:      Render (Node.js Web Service)
```

---

## Design tokens

```css
--color-bg:        #060A0E   /* fondo principal dark */
--color-surface:   #0D1117   /* cards / paneles */
--color-primary:   #00E8A2   /* verde Mueve Reparto */
--color-urgent:    #FF5A5F   /* coral urgente */
--color-text:      #E2E8F0
--color-muted:     #64748B
```

---

## Estructura del proyecto

```
src/
├── pages/
│   ├── index.astro       — Splash + redirect /home
│   ├── home.astro        — Dashboard diario
│   ├── pedidos.astro     — CRUD de paradas
│   ├── reparto.astro     — Mapa + GPS + optimizador
│   ├── enviar.astro      — Notificaciones cliente
│   ├── metricas.astro    — Métricas y ROI
│   ├── 404.astro
│   └── offline.astro
├── components/
│   ├── BottomNav.astro   — Navegación inferior (4 tabs)
│   ├── InteractiveMap.astro
│   └── ui/               — Componentes base (Button, Card, Toast…)
├── layouts/
│   └── MainLayout.astro  — Layout con header dark + BottomNav
└── lib/
    └── idb.ts            — IndexedDB helper tipado
public/
├── manifest.json
├── favicon.svg
└── robots.txt
```

---

## Comandos de desarrollo

```bash
pnpm install          # Instalar dependencias
pnpm dev              # Servidor local (localhost:4321)
pnpm build            # Build de producción
pnpm preview          # Preview del build
pnpm lint             # ESLint
pnpm test             # Vitest
```

---

## Variables de entorno

Copia `.env.example` a `.env` y ajusta:

```bash
cp .env.example .env
```

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `NODE_VERSION` | Versión de Node para Render (`20.10.0`) | Sí |

No hay claves de API requeridas para desarrollo local.

---

## Despliegue en Render

Ver [`DEPLOY.md`](./DEPLOY.md) para instrucciones completas.

TL;DR:
1. Crear **Web Service** en Render (NO Static Site)
2. Build command: `pnpm run build`
3. Start command: `node ./dist/server/entry.mjs`
4. `NODE_VERSION=20.10.0`

---

## Hoja de ruta

- [x] **P1** — Rebrand + UI/UX completo (6 páginas delivery)
- [x] **P2** — Limpieza legacy + documentación
- [ ] **P3** — Backend Rust/PostgreSQL en Render (sync de paradas)
- [ ] **P4** — Geocodificación Nominatim OSM (captura por texto)
- [ ] **P5** — Auth OTP + monetización (plan pro)

---

## Autor

**Sistemas Cancún Jefe AI**
Fork productivo de [MueveCancun](https://github.com/JULIANJUAREZMX01/MueveCancun), reorientado a repartidores independientes de Cancún y zona metropolitana.
