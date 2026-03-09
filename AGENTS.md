# AGENTS.md — Contexto para Agentes de IA

Este archivo es leído por agentes de IA (Claude Code, Jules, Gemini, Copilot, etc.) al trabajar en este repositorio. Contiene el contexto del proyecto, estado actual, convenciones y reglas de coordinación.

---

## Proyecto: Mueve Reparto

**Misión:** PWA offline-first para repartidores independientes en Cancún. Organiza paradas, optimiza rutas, notifica clientes y mide productividad — sin backend requerido en el MVP.

**Repositorio:** `sistemascancunjefe-ai/MueveRepartoEnCancun-`
**Fork de:** `JULIANJUAREZMX01/MueveCancun` (app de transporte público — propósito completamente distinto)
**Branch principal:** `main`

---

## Estado actual del proyecto

### Completado
- [x] **P1** — Rebrand completo: identidad visual, layout dark, 6 páginas delivery
- [x] **P2** — Limpieza legacy (páginas de transporte eliminadas), documentación completa

### En progreso / Siguiente
- [ ] **P3** — Backend Rust/PostgreSQL en Render
- [ ] **P4** — Geocodificación Nominatim OSM
- [ ] **P5** — Auth OTP + monetización

---

## Arquitectura actual

```
[Usuario móvil]
      │
      ▼
[Astro 5 SSR + Vanilla JS]  ← pages/ + components/ + layouts/
      │
      ▼
[IndexedDB via idb 8]        ← src/lib/idb.ts (offline-first)
      │
      ▼  (futuro P3)
[Backend Rust/PostgreSQL]    ← sync entre dispositivos
```

### Capas de la aplicación

| Capa | Responsabilidad | Archivos clave |
|------|----------------|----------------|
| Presentación | Páginas Astro + Vanilla JS | `src/pages/*.astro` |
| UI System | Componentes reutilizables | `src/components/ui/` |
| Layout | Estructura global, nav | `src/layouts/MainLayout.astro`, `BottomNav.astro` |
| Persistencia | IDB helper tipado | `src/lib/idb.ts` |
| Estilos | Tailwind + CSS custom props | `src/index.css`, `tailwind.config.js` |

---

## Páginas activas

| URL | Función |
|-----|---------|
| `/` | Splash → redirect `/home` |
| `/home` | Dashboard (progress ring, métricas IDB, próxima parada) |
| `/pedidos` | CRUD paradas (4 modos captura, IDB, complete/delete) |
| `/reparto` | Mapa Leaflet + GPS + optimizador nearest-neighbor |
| `/enviar` | Notificaciones WhatsApp/Telegram por parada |
| `/metricas` | Bar chart CSS 7 días + ROI + meta editable |

**Páginas eliminadas (NO recrear):** `/wallet`, `/mapa`, `/community`, `/contribuir`, `/rutas`, `/ruta/[id]`, `/tracking`, `/about`

---

## IDB Schema

Definido en `src/lib/idb.ts`:

```typescript
interface Stop {
  id: string
  label: string
  address?: string
  lat?: number
  lng?: number
  notes?: string
  urgent: boolean
  completed: boolean
  completedAt?: number
  createdAt: number
  order: number
}

interface DailyStats {
  date: string          // YYYY-MM-DD
  totalStops: number
  completedStops: number
  totalEarnings: number
  startTime?: number
  endTime?: number
}
```

Stores: `stops`, `syncQueue`, `trackingLog`, `dailyStats`

---

## Reglas para agentes

### Siempre hacer
- Trabajar en rama `claude/<descripcion>-{id}` o equivalente del agente
- Crear PR hacia `main` (nunca push directo a `main`)
- Commit messages en español o inglés, descriptivos
- Respetar el design system: dark mode, tokens `#00E8A2` / `#FF5A5F` / `#060A0E`
- Usar IDB para persistencia (nunca localStorage para datos de negocio)

### Nunca hacer
- Recrear páginas de transporte público
- Instalar React, Vue, Svelte u otros frameworks JS pesados
- Instalar Mapbox GL JS (Leaflet + OSM es la elección)
- Hacer push directo a `main`
- Modificar `pnpm-lock.yaml` manualmente
- Eliminar `rust-wasm/` (infraestructura futura P3)

---

## Convenciones de código

### Astro
- Scripts en `<script>` con Vanilla JS, no TypeScript inline complejo
- Leaflet siempre cargado dinámico (evitar SSR): `const L = await import('leaflet')`
- Props tipadas con `interface` de TypeScript en el frontmatter

### CSS / Tailwind
- Design tokens como CSS custom properties en `src/index.css`
- Clases Tailwind para utilidades rápidas
- Sin `!important`, sin estilos inline (excepto valores dinámicos JS)
- Mobile-first, dark mode por defecto

### IDB
- Siempre `async/await`
- Todas las operaciones de escritura pasar por los helpers de `src/lib/idb.ts`
- Nunca acceder directamente al objeto `db` desde las páginas

---

## Comandos útiles

```bash
pnpm dev              # Dev local — localhost:4321
pnpm build            # Build producción
pnpm test             # Vitest unit tests
pnpm lint             # ESLint
pnpm preview          # Preview del build

# Git workflow
git checkout -b claude/mi-feature-{id}
git push -u origin claude/mi-feature-{id}
```

---

## Contexto del usuario objetivo

- Repartidor independiente en Cancún
- Android gama media/baja (RAM limitada, pantalla 5.5")
- Usa WhatsApp como herramienta principal de comunicación
- A veces trabaja sin internet (colonias con cobertura limitada)
- Necesita flujos rápidos: máximo 2 toques para acción principal
- No tiene cuenta en plataformas (Rappi, UberEats) — trabaja directo con clientes

---

## Historial de decisiones de diseño

| Decisión | Razón |
|----------|-------|
| Leaflet en lugar de Mapbox | Mapbox requiere token y tiene costos; OSM es gratuito |
| Sin framework JS (Astro puro) | Menor bundle size, mejor rendimiento en gama baja |
| IDB en lugar de localStorage | Capacidad de almacenamiento mayor, estructurado, transaccional |
| Nearest-neighbor en lugar de Dijkstra | Suficiente para 10-30 paradas/día; no requiere grafo completo |
| Dark mode obligatorio | Batería, legibilidad en exteriores (trabajo de calle) |
| SSR en lugar de SSG | Rutas dinámicas futuras, API endpoints, auth OTP en P5 |
| Sin autenticación en MVP | Reduce fricción de adopción; el repartidor quiere usar, no registrarse |

---

## Archivos de referencia importantes

| Archivo | Propósito |
|---------|-----------|
| `CLAUDE.md` | Contexto específico para Claude Code |
| `DEPLOY.md` | Instrucciones de despliegue en Render |
| `SECURITY.md` | Política de seguridad y reporte de vulnerabilidades |
| `docs/ARCHITECTURE.md` | Arquitectura técnica detallada |
| `docs/ROADMAP.md` | Hoja de ruta completa con criterios de aceptación |
| `.env.example` | Variables de entorno requeridas |
