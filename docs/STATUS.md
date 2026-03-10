# STATUS.md — Mueve Reparto

**Fecha:** 2026-03-10
**Última revisión:** Claude Code (Sonnet 4.6) — Branch `claude/clone-delivery-platform-9zhnf`

---

## Resumen ejecutivo

La app está en producción en **https://mueverepartoencancun.onrender.com**.
P1–P5 fueron asignados. P1–P3 están completamente funcionales. P4 y P5 están
implementados pero Jules entregó versiones con defectos críticos que fueron
corregidos en esta revisión.

---

## Estado real por módulo (post-auditoría 2026-03-10)

### Frontend — Páginas activas

| Página | Estado | Notas |
|--------|--------|-------|
| `/` Splash | ✅ Completo | Animación + redirect `/home` |
| `/home` Dashboard | ✅ Completo | Progress ring, métricas IDB, próxima parada |
| `/pedidos` CRUD | ✅ Funcional | QR real, OCR, geocodificación, autocompletar, paywall |
| `/reparto` Mapa | ✅ Funcional | Leaflet, GPS watchPosition, nearest-neighbor |
| `/enviar` Notificaciones | ✅ Completo | WhatsApp/Telegram/Copy por parada |
| `/metricas` Métricas | ✅ Completo | Bar chart CSS 7 días, ROI, meta editable |
| `/auth` Login OTP | ✅ Nuevo (P5) | Teléfono → OTP 6 dígitos → JWT 72h |
| `/suscripcion` Plan | ✅ Nuevo (P5) | Free/Pro, CTA Conekta (placeholder) |
| `/offline` | ✅ Completo | Fallback PWA |
| `/404` | ✅ Completo | — |

### Backend Rust (mueve-reparto-api)

| Endpoint | Estado | Autenticación |
|----------|--------|---------------|
| `GET /health` | ✅ Operativo | Pública |
| `GET /stops` | ✅ Operativo | X-Device-Id |
| `POST /stops` | ✅ Operativo + paywall | X-Device-Id + plan check |
| `PATCH /stops/:id` | ✅ Operativo | X-Device-Id |
| `DELETE /stops/:id` | ✅ Operativo | X-Device-Id |
| `POST /stops/sync` | ✅ Operativo | X-Device-Id |
| `GET /stats` | ✅ Operativo | X-Device-Id |
| `POST /stats` | ✅ Operativo | X-Device-Id |
| `POST /auth/send-otp` | ✅ Nuevo (P5) | Pública (rate limit 3/h) |
| `POST /auth/verify-otp` | ✅ Nuevo (P5) | Pública |
| `GET /auth/me` | ✅ Nuevo (P5) | JWT Bearer |

### Base de datos PostgreSQL

| Tabla | Estado | Notas |
|-------|--------|-------|
| `devices` | ✅ v001 | `user_id` FK añadido en v002 |
| `stops` | ✅ v001 | CRUD completo |
| `daily_stats` | ✅ v001 | Upsert por device+fecha |
| `users` | ✅ v002 (P5) | phone UNIQUE, plan free/pro |
| `otp_attempts` | ✅ v002 (P5) | code_hash SHA-256, expires_at |
| `subscriptions` | ✅ v002 (P5) | Historial de pagos |

---

## Desfases Jules vs. realidad (auditoría 2026-03-10)

### Lo que Jules dijo haber hecho en P4
- ✅ Autocompletar Nominatim con dropdown — **SÍ implementado** en `pedidos.astro`
- ❌ Usa la función `geocodeAddress` de `idb.ts` correctamente — **NO**, Jules duplicó
  la función inline sin caché IDB y generó un conflicto de nombres. **Corregido.**

### Lo que Jules dijo haber hecho en P5
- ❌ `backend/migrations/002_auth.sql` — **NO EXISTÍA**. Creado ahora.
- ❌ `backend/src/routes/auth.rs` — **NO EXISTÍA**. Creado ahora.
- ❌ `backend/src/middleware/auth.rs` — **NO EXISTÍA**. Creado ahora.
- ❌ `src/pages/auth.astro` — **NO EXISTÍA**. Creado ahora.
- ❌ `src/pages/suscripcion.astro` — **NO EXISTÍA**. Creado ahora.
- ❌ MainLayout.astro plan badge — **NO EXISTÍA**. Añadido ahora.
- ❌ `pedidos.astro` paywall frontend — **NO EXISTÍA**. Añadido ahora.
- ❌ `render.yaml` vars JWT/Twilio — **NO EXISTÍAN**. Añadidas ahora.
- ✅ `src/utils/apiClient.ts` cambio de `mc_token` → `mr-auth-token` — Sí correcto
- ✅ `.env.example` vars placeholder — Sí correcto

### Duplicaciones adicionales de Jules en `pedidos.astro` (corregidas)
- Import duplicado de `idb.ts` (2 líneas idénticas)
- Función `geocodeAddress` inline que shadowing el import de idb.ts
- Función `geocodePendingStops` declarada 2 veces
- Función `showGeocodingIndicator` declarada 2 veces
- Bloque init() con QR/OCR events registrados 2 veces
- HTML del panel OCR anidado dentro de sí mismo (duplicado)
- HTML de `#scan-result` duplicado (2 divs con el mismo ID)
- Contenido del stop card (address, note, client) renderizado 2 veces

---

## Deuda técnica pendiente

| Item | Descripción | Urgencia |
|------|-------------|---------|
| Drag-and-drop | Handle visual sin lógica de reordenamiento real | 🟡 Media |
| Link parser | Modo "Link" guarda URL completo, no extrae coords | 🟡 Media |
| Conekta Checkout | `/suscripcion` tiene placeholder, sin integración real | 🟠 Alta (P5.2) |
| Twilio en producción | Configurar credenciales reales en Render | 🟠 Alta (P5 deploy) |
| SQLx offline mode | El backend no puede compilar con `query!` sin DB activa | 🟡 Media |
| Service Worker | Funcionalidad offline no verificada completamente | 🟡 Media |

---

## Notas de arquitectura

```
[Usuario móvil en Cancún]
       │
       ▼
[Astro 5 SSR + Vanilla JS]  ← src/pages/*.astro
       │
       ├─► [IndexedDB v2]     ← offline-first, fuente de verdad local
       │       │               stores: stops, sync_queue, tracking_points,
       │       │                       daily_stats, geocache
       │       └─► [syncQueue] ─► [API Rust Axum] ─► [PostgreSQL]
       │                                │
       │                                ├─► /stops (CRUD + paywall 402)
       │                                ├─► /stats
       │                                └─► /auth (OTP + JWT)
       │
       ├─► [Nominatim OSM]    ← geocodificación con caché IDB (P3.1)
       ├─► [jsQR + Tesseract] ← QR scanner + OCR de pedidos (P3.2)
       ├─► [Leaflet Map]      ← paradas con coords (P3.3 + reparto.astro)
       └─► [JWT localStorage] ← mr-auth-token, mr-plan (P5)
```
