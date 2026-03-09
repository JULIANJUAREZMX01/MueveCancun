# Roadmap — Mueve Reparto

**Última actualización:** 2026-03-09

---

## P1 — Rebrand + UI/UX Completo ✅

**Estado:** Completado (PR #1 mergeado)

### Entregables
- [x] Identidad visual dark: tokens `#00E8A2` / `#FF5A5F` / `#060A0E`
- [x] `favicon.svg`, `manifest.json`, `tailwind.config.js` rebranded
- [x] `MainLayout.astro` — header dark, modal nombre repartidor, indicador GPS
- [x] `BottomNav.astro` — 4 tabs (Inicio / Paradas / Ruta / Métricas)
- [x] `BrandAnimation.astro` — logo SVG Mueve Reparto
- [x] `/` — Splash con loader → redirect `/home`
- [x] `/home` — Dashboard con progress ring SVG + 3 métricas IDB + próxima parada
- [x] `/pedidos` — CRUD paradas con IDB, bottom sheet, 4 modos captura
- [x] `/reparto` — Mapa Leaflet dark + GPS watchPosition + optimizador nearest-neighbor
- [x] `/enviar` — 4 plantillas de mensaje, deep-link WhatsApp/Telegram
- [x] `/metricas` — Bar chart CSS puro 7 días, ROI, meta editable
- [x] `src/lib/idb.ts` — IndexedDB helper tipado completo

---

## P2 — Limpieza Legacy + Documentación ✅

**Estado:** Completado

### Entregables
- [x] Eliminar páginas de transporte: `/wallet`, `/mapa`, `/community`, `/contribuir`, `/rutas`, `/ruta/[id]`, `/tracking`, `/about`
- [x] `README.md` reescrito para Mueve Reparto
- [x] `CLAUDE.md` — contexto para Claude Code sessions
- [x] `AGENTS.md` — contexto para agentes de IA
- [x] `DEPLOY.md` — instrucciones de despliegue actualizadas
- [x] `SECURITY.md` — política de seguridad real
- [x] `.env.example` — limpio, sin referencias a transporte
- [x] `public/robots.txt` — configurado correctamente
- [x] `docs/ARCHITECTURE.md` — arquitectura de delivery
- [x] `docs/ROADMAP.md` — este archivo
- [x] Workflows de GitHub Actions actualizados
- [x] Docs obsoletos de transporte eliminados

---

## P3 — Backend Rust + PostgreSQL ⏳

**Estado:** Pendiente
**Objetivo:** Sincronización de paradas entre dispositivos del mismo repartidor

### Entregables planificados
- [ ] API REST en Rust (Axum framework)
- [ ] PostgreSQL en Render (managed database)
- [ ] Endpoints: `GET /stops`, `POST /stops`, `PATCH /stops/:id/complete`, `GET /stats`
- [ ] Sync desde `syncQueue` de IDB al backend
- [ ] Proceso de sync automático al recuperar conexión (`window.online` event)
- [ ] `docs/BACKEND.md` — documentación de la API

### Criterios de aceptación
- El repartidor puede ver sus paradas en dos dispositivos distintos
- Las paradas completadas en un dispositivo se sincronizan al otro en < 5 segundos con internet
- La app funciona 100% offline si el backend no está disponible (IDB como fuente de verdad)

---

## P4 — Geocodificación Nominatim OSM ⏳

**Estado:** Pendiente
**Objetivo:** Capturar paradas por texto (dirección) y obtener coordenadas automáticamente

### Entregables planificados
- [ ] Integración con API pública de Nominatim (OpenStreetMap)
- [ ] Búsqueda de dirección en `/pedidos` → autocompletar → guardar lat/lng
- [ ] Rate limiting del lado cliente (máx 1 req/segundo, política de Nominatim)
- [ ] Caché de búsquedas recientes en IDB
- [ ] Fallback: captura manual de coordenadas si Nominatim no responde

### Criterios de aceptación
- El repartidor escribe "Av. Tulum 123, Cancún" y obtiene coordenadas en < 2 segundos
- Las búsquedas se cachean para uso offline posterior
- No se excede el rate limit de Nominatim (1 req/s)

---

## P5 — Auth OTP + Monetización ⏳

**Estado:** Pendiente
**Objetivo:** Identificación del repartidor + plan de suscripción

### Entregables planificados
- [ ] Auth OTP por SMS/WhatsApp (sin contraseña)
- [ ] JWT session management (server-side, Astro middleware)
- [ ] Plan gratuito: máx 20 paradas/día
- [ ] Plan pro ($99 MXN/mes): paradas ilimitadas + historial 90 días + exportación
- [ ] Pasarela de pago: Conekta o Stripe (México)
- [ ] Panel de suscripción en app

### Criterios de aceptación
- El repartidor se registra con número de teléfono en < 60 segundos
- El OTP llega en < 30 segundos
- La suscripción pro se activa inmediatamente tras el pago
- Los datos del plan gratuito se conservan al actualizar a pro

---

## Backlog (sin prioridad asignada)

- Notificaciones push (Web Push API) para recordatorio de inicio de jornada
- Modo multi-ruta: dividir paradas del día en 2 tandas (mañana/tarde)
- Historial de rutas completadas con mapa de recorrido
- Widget Android para ver próxima parada desde pantalla de inicio
- Exportar métricas a PDF/Excel para declaración fiscal
- Versión en inglés (i18n) para repartidores angloparlantes en Cancún
