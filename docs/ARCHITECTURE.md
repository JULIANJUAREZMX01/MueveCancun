# Arquitectura — Mueve Reparto

## Visión general

Mueve Reparto es una PWA offline-first construida sobre Astro 5 SSR. El principio guía es **simplicidad operativa**: el repartidor debe poder usar la app con una mano, en movimiento, con internet inestable.

---

## Capas de la arquitectura

```
┌─────────────────────────────────────────┐
│            USUARIO MÓVIL                │
│         (Android gama media)            │
└──────────────────┬──────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────┐
│         ASTRO SSR (Render)              │
│   Node.js Web Service                   │
│                                         │
│  src/pages/       ← rutas y páginas     │
│  src/components/  ← UI reutilizable     │
│  src/layouts/     ← estructura global   │
│  src/lib/idb.ts   ← abstracción IDB     │
└──────────────────┬──────────────────────┘
                   │ IndexedDB API
┌──────────────────▼──────────────────────┐
│         INDEXEDDB (cliente)             │
│  stops · syncQueue · trackingLog        │
│  dailyStats                             │
└─────────────────────────────────────────┘

  (futuro P3)
┌─────────────────────────────────────────┐
│      BACKEND RUST + POSTGRESQL          │
│         (Render Web Service)            │
│   sync de paradas entre dispositivos    │
└─────────────────────────────────────────┘
```

---

## Módulos clave

### `src/lib/idb.ts`
IndexedDB helper tipado. Único punto de acceso a persistencia local.

**Stores:**
- `stops` — paradas del día del repartidor
- `syncQueue` — cola de cambios pendientes de sincronizar con backend (P3)
- `trackingLog` — historial de puntos GPS durante reparto activo
- `dailyStats` — métricas agregadas por día (completadas, ganancias)

**API pública:**
```typescript
getStops(): Promise<Stop[]>
getNextStop(): Promise<Stop | undefined>
getTodayStats(): Promise<DailyStats>
completeStop(id: string): Promise<void>
generateId(): string
put<T>(store, value): Promise<void>
getAll<T>(store): Promise<T[]>
```

### `src/layouts/MainLayout.astro`
Layout global con:
- Header dark con nombre del repartidor (editable, guardado en IDB)
- Indicador GPS (activo/inactivo)
- `<BottomNav>` — navegación inferior de 4 tabs

### `src/components/BottomNav.astro`
Barra de navegación inferior con 4 tabs:
1. Inicio (`/home`)
2. Paradas (`/pedidos`)
3. Ruta (`/reparto`)
4. Métricas (`/metricas`)

### `src/components/InteractiveMap.astro`
Mapa Leaflet con dark tiles de OpenStreetMap. Cargado dinámicamente para evitar errores de SSR.

---

## Decisiones de diseño

| Decisión | Razón |
|----------|-------|
| Astro + Vanilla JS | Sin overhead de framework; < 50KB bundle |
| Leaflet + OSM | Sin costos de token; gratuito a escala |
| Nearest-neighbor (no Dijkstra) | Suficiente para 10-30 paradas/día; O(n²) aceptable |
| SSR (no SSG) | Permite API endpoints y auth futura |
| IndexedDB (no localStorage) | Capacidad mayor, estructurado, preparado para sync |
| Dark mode obligatorio | Batería + legibilidad en exteriores |

---

## Flujo de datos — Parada completada

```
Usuario toca "Completar" en /pedidos
        │
        ▼
completeStop(id)  ←  src/lib/idb.ts
        │
        ├─→ stops: stop.completed = true, completedAt = Date.now()
        ├─→ dailyStats: completedStops++
        └─→ syncQueue: { action: 'COMPLETE', stopId, timestamp }
                                    │
                                    └─ (P3) sync con backend
```

---

## Performance objetivo

| Métrica | Objetivo |
|---------|---------|
| Bundle JS gzipped | < 50KB |
| LCP en 3G | < 1.5s |
| Lighthouse PWA | 100 |
| Tiempo de arranque offline | < 500ms |
