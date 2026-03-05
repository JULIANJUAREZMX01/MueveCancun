# Mueve Reparto — Roadmap

> "Tu ruta. Tu tiempo. Tu ingreso."

---

## Descartado vs. Implementado

### Descartado (no optimo)

| Artefacto | Razon |
|---|---|
| Scripts PowerShell (`.psm1`) | El entorno es Linux. Reemplazados por `Makefile`. |
| `packages/db/schema.ts` (Drizzle) | El backend es Rust/sqlx. Mezclar ORM de Node con API Rust es incoherente. Se usan migraciones SQL puras en `api/migrations/`. |
| `actix-web-actors` / WebSockets | Prematuro. La app no tiene usuarios ni auth todavia. Se conecta en Fase 4. |
| Push Notifications (VAPID placeholder) | Inutilizable sin infraestructura VAPID real. Diferido a Fase 4. |
| Estructura monorepo `apps/api` + `apps/web` | El proyecto ya funciona flat. Agregar monorepo solo suma complejidad sin beneficio en esta etapa. |
| `numInstances: 3` + `scaling:` en render.yaml | Sintaxis invalida para Render free/starter. Requiere plan pago. Simplificado a `numInstances: 1`. |
| `self.post_message(...)` en router.worker.js | Typo — el metodo correcto es `self.postMessage(...)`. Corregido. |
| `idb.put(STORES.SYNC_QUEUE, { url, method, body })` sin `id` | El store usa `autoIncrement: true`, no `keyPath: 'id'`. Datos sin `id` causan error silencioso. Corregido en `src/lib/sync.ts`. |

---

## Arquitectura Final

```
MueveCancun/
  src/
    lib/
      idb.ts          <- IndexedDB helper (TypeScript, tipos correctos)
      sync.ts         <- Cola offline + retry exponencial
      telemetry.ts    <- GPS tracker + evento local mr:position
    pages/
      home.astro      <- Dashboard del dia
      pedidos.astro   <- Gestion de paradas (IDB en lugar de sessionStorage)
      reparto.astro   <- Mapa + optimizacion (WebWorker WASM)
      enviar.astro    <- WhatsApp / Telegram por parada
      metricas.astro  <- Semana, ROI, meta
  public/
    sw.js             <- SW actualizado: rutas delivery + background sync
    router.worker.js  <- WebWorker para WASM (typo corregido)
    manifest.json     <- Rebrand: Mueve Reparto, theme #00E8A2
    wasm/
      route-calculator/ <- WASM ya compilado (existente)
  api/
    Cargo.toml        <- Actix-web 4 + sqlx + uuid + chrono
    src/
      main.rs         <- Servidor HTTP, CORS, pool, migraciones
      models.rs       <- Delivery, CreateDelivery, UpdateStatus, TrackingPoint
      handlers/
        health.rs     <- GET /health
        deliveries.rs <- GET/POST /api/deliveries, PATCH /api/deliveries/{id}/status
        tracking.rs   <- POST /api/tracking
    migrations/
      0001_init.sql   <- deliveries + tracking (PostgreSQL)
    .env.example
  render.yaml         <- Config correcta (static activo, API comentada hasta tener DB)
  Makefile            <- dev, build, api, api-dev, db-migrate, check, clean
  ROADMAP.md          <- Este archivo
```

---

## Fases de Desarrollo

### Fase 0 — Fundacion `[COMPLETA]`

**Objetivo:** PWA funcional con las 5 pantallas del flujo de entrega.

| Tarea | Estado |
|---|---|
| Splash screen con branding Mueve Reparto | [x] |
| Dashboard (`/home`) con progress ring y metricas | [x] |
| Gestion de paradas (`/pedidos`) — 4 modos de captura | [x] |
| Mapa + optimizador JS (`/reparto`) | [x] |
| Notificaciones WhatsApp/Telegram (`/enviar`) | [x] |
| Metricas semanales con grafica de barras (`/metricas`) | [x] |
| `README.md` actualizado | [x] |

---

### Fase 1 — Persistencia Real `[EN PROGRESO]`

**Objetivo:** Las paradas sobreviven al cierre del navegador. El SW cachea las paginas correctas.

**Entregables:**
- `src/lib/idb.ts` — TypeScript IDB helper con tipos `Stop`, `SyncEntry`, `TrackingPoint`
- `src/lib/sync.ts` — Cola offline con retry exponencial (1s, 2s, 4s...) y listener `window.online`
- `src/lib/telemetry.ts` — GPS tracker tipado con evento `mr:position` para el mapa
- `public/router.worker.js` — WebWorker WASM corregido (typo `post_message` -> `postMessage`)
- `public/sw.js` — Actualizado: rutas delivery en CRITICAL_ASSETS, handler `sync` background
- `public/manifest.json` — Rebrand: nombre, `start_url: /home`, `theme_color: #00E8A2`
- `Makefile` — Comandos dev unificados

**Tareas pendientes (implementar en las paginas):**

- [ ] `pedidos.astro`: reemplazar `sessionStorage` por `idb.put/getAll(STORES.STOPS, ...)`
- [ ] `reparto.astro`: usar `router.worker.js` en lugar del algoritmo inline JS
- [ ] `reparto.astro`: integrar `startTracking()` / `stopTracking()` de `telemetry.ts`
- [ ] `reparto.astro`: escuchar evento `mr:position` para actualizar el marcador del repartidor

---

### Fase 2 — Backend API `[ESQUELETO LISTO]`

**Objetivo:** Persistencia en servidor para metricas historicas y tracking compartible.

**Entregables creados:**
- `api/Cargo.toml` — Actix-web 4.4 + sqlx 0.7 + CORS
- `api/src/main.rs` — Pool de conexiones, migraciones auto, binding `0.0.0.0:PORT`
- `api/src/models.rs` — Structs con `serde` y `sqlx::FromRow`
- `api/src/handlers/health.rs` — `GET /health`
- `api/src/handlers/deliveries.rs` — `GET/POST /api/deliveries`, `PATCH /api/deliveries/{id}/status`
- `api/src/handlers/tracking.rs` — `POST /api/tracking`
- `api/migrations/0001_init.sql` — Schema PostgreSQL
- `api/.env.example`
- `render.yaml` — API comentada, lista para descomentar cuando se provisione la DB

**Tareas pendientes:**

- [ ] Provisionar DB en Render (plan free: `mueve-reparto-db`)
- [ ] Configurar variable `DATABASE_URL` en Render Dashboard
- [ ] Descomentar el servicio API en `render.yaml`
- [ ] Hacer push y verificar build de Rust en Render
- [ ] Probar endpoints con `curl` o Bruno/Postman:
  ```bash
  curl https://mueve-reparto-api.onrender.com/health
  curl https://mueve-reparto-api.onrender.com/api/deliveries
  ```

---

### Fase 3 — Geocodificacion Real `[PENDIENTE]`

**Objetivo:** Texto libre → coordenadas reales via Nominatim (OSM, gratuito).

**Tareas:**
- [ ] `src/lib/geocoder.ts` — wrapper `fetch` a `nominatim.openstreetmap.org/search`
- [ ] Rate limiting: max 1 req/seg (politica de uso de Nominatim)
- [ ] Cache de geocodificacion en IDB para evitar peticiones repetidas
- [ ] Integrar en el modal "Agregar por texto" de `pedidos.astro`
- [ ] Fallback: si Nominatim falla (offline), aceptar lat/lng manual

**Entregable:** Modal de texto convierte "SM 25 MZ 10 Cancun" en coordenadas reales.

---

### Fase 4 — Autenticacion y Monetizacion `[PENDIENTE]`

**Objetivo:** Trial de 7 dias → suscripcion $70 MXN/semana.

**Tareas:**
- [ ] `api`: tabla `users` (phone, plan: trial|active|expired, trial_ends_at)
- [ ] OTP por WhatsApp (Twilio o UltraMsg): `POST /api/auth/otp/send`, `POST /api/auth/otp/verify`
- [ ] JWT firmado con `jsonwebtoken` (Rust) como cookie HttpOnly
- [ ] Middleware de auth en handlers de deliveries y tracking
- [ ] Pantalla de login en `index.astro` (numero de telefono → OTP)
- [ ] `metricas.astro`: mostrar dias restantes de trial
- [ ] Pasarela de pago: MercadoPago o pago manual por WhatsApp (MVP)

**Entregable:** Flujo completo trial → pago → acceso.

---

### Fase 5 — Tracking Compartible `[PENDIENTE]`

**Objetivo:** El destinatario puede ver la ubicacion del repartidor en tiempo real.

**Tareas:**
- [ ] `api`: endpoint `GET /api/track/{token}` — devuelve ultima posicion de la entrega
- [ ] `src/pages/tracking/[token].astro` — pagina publica con mapa Leaflet
- [ ] `enviar.astro`: el link de tracking usa el `tracking_token` del delivery
- [ ] Actualizar el mapa cada 10s via polling (simple antes de WebSocket)
- [ ] WebSocket (`actix-web-actors`) para actualizacion en tiempo real (opcional)

**Entregable:** Link compartible `https://mueve-reparto-web.onrender.com/tracking/abc123` con mapa en vivo.

---

## Metricas de Exito

| Metrica | Objetivo |
|---|---|
| Tiempo de optimizacion (30 paradas) | < 50 ms (WASM) |
| Tamano del bundle JS inicial | < 50 KB |
| Score Lighthouse PWA | >= 90 |
| Funciona 100% offline | Si (Fase 1) |
| ROI para repartidor (15% mejora) | +$182 MXN/semana neto |

---

## Comandos de Desarrollo

```bash
make dev          # Frontend Astro en localhost:4321
make build        # Build de produccion
make api-dev      # API Rust en modo debug (requiere .env en api/)
make db-migrate   # Corre migraciones SQL
make check        # Lint + typecheck + clippy
```
