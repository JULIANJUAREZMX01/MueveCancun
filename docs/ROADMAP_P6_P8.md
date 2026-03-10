# Roadmap P6–P8 — Mueve Reparto

**Fecha:** 2026-03-10
**Estado base:** P1–P5 completos (con correcciones Claude)

---

## Resumen de lo completado

| Stage | Descripción | Estado |
|-------|------------|--------|
| P1 | Rebrand UI/UX dark | ✅ Completo |
| P2 | Limpieza legacy + docs | ✅ Completo |
| P2.5 | Deploy Render (0.0.0.0) | ✅ Completo |
| P3.1 | Geocodificación Nominatim + caché IDB | ✅ Completo |
| P3.2 | QR Scanner (jsQR) + OCR (Tesseract.js) | ✅ Completo |
| P3.3 | Backend Rust/Axum/PostgreSQL | ✅ Completo |
| P4 | Autocompletar de direcciones (Nominatim dropdown) | ✅ Completo (bug corregido) |
| P5 | Auth OTP + JWT + Plan Free/Pro | ✅ Completo (implementación real) |

---

## P5.2 — Pagos Conekta 🔴 PENDIENTE INMEDIATO

**Objetivo:** Activar el flujo de pago real para upgrade Free → Pro.

**Estado actual:** `/suscripcion` tiene placeholder "Próximamente con Conekta".

### Tareas

1. **Crear cuenta comercial en Conekta** (https://conekta.com)
   - Plan recomendado: Starter (sin mensualidad)
   - Activar: tarjeta, OXXO Pay

2. **Backend: endpoint `POST /subscriptions/checkout`**
   - Crear orden en Conekta API
   - Redirigir a Conekta Checkout hosted o JS embed
   - Webhook `POST /subscriptions/webhook` para confirmar pago
   - Al confirmar: `UPDATE users SET plan = 'pro'` + emitir nuevo JWT

3. **Frontend: actualizar `/suscripcion.astro`**
   - Botón "Pagar con tarjeta" → Conekta Checkout
   - Botón "Pagar en OXXO" → generar referencia OXXO
   - Mostrar confirmación y actualizar `mr-plan` en localStorage

4. **Variables de entorno adicionales:**
   ```
   CONEKTA_PRIVATE_KEY=key_xxxx
   CONEKTA_WEBHOOK_SECRET=whsec_xxxx
   PUBLIC_CONEKTA_PUBLIC_KEY=key_pub_xxxx
   ```

### Prompt para Jules/Claude (P5.2)

```
Implementa el flujo de pago Conekta en Mueve Reparto.

Backend (Rust/Axum):
- POST /subscriptions/checkout
  - Recibe: { user_id, plan: "pro" }
  - Crea orden en Conekta API REST v2
  - Devuelve: { checkout_url } para redirect
- POST /subscriptions/webhook
  - Verifica firma HMAC del webhook de Conekta
  - Si payment_status = "paid": actualizar users.plan = 'pro', crear subscription record
  - Devolver 200 OK

Frontend (Astro):
- src/pages/suscripcion.astro: botón "Actualizar a Pro" llama /subscriptions/checkout
- Redirigir a checkout_url de Conekta
- Página de retorno: /suscripcion?success=1 → actualiza mr-plan en localStorage
- Renovar JWT llamando GET /auth/me con nuevo token

Dependencias Rust a agregar en Cargo.toml:
- hmac = "0.12"
- base64 = "0.22"

Referencia: https://developers.conekta.com/docs/pagos-con-hosted-checkout
```

---

## P6 — Múltiples repartidores / Modo Empresa 🟡

**Objetivo:** Permitir que un negocio tenga varios repartidores bajo una cuenta empresa.

**Contexto de negocio:**
- Target secundario: pequeños negocios de Cancún (ferreterías, farmacias, tiendas de abarrotes)
  que tienen 2–5 repartidores propios y quieren coordinarlos sin software caro.

### Funcionalidades clave

1. **Rol "Jefe de reparto"** — cuenta empresa que puede:
   - Ver paradas de todos sus repartidores en tiempo real (mapa)
   - Asignar paradas a repartidores específicos
   - Ver métricas consolidadas del equipo
   - Exportar reportes por repartidor

2. **Rol "Repartidor"** — empleado vinculado a empresa:
   - Ve solo sus paradas
   - El jefe puede crearle paradas desde el panel

3. **Schema DB nuevo (P6):**
   ```sql
   CREATE TABLE teams (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     owner_id UUID REFERENCES users(id),
     name TEXT NOT NULL,
     plan TEXT DEFAULT 'pro',
     repartidor_slots INTEGER DEFAULT 5
   );
   ALTER TABLE users ADD COLUMN team_id UUID REFERENCES teams(id);
   ALTER TABLE stops ADD COLUMN assigned_to UUID REFERENCES users(id);
   ```

4. **Nuevas páginas frontend:**
   - `/equipo` — panel del jefe: mapa en tiempo real, asignaciones
   - Modificar `/pedidos` para que jefe pueda asignar paradas

5. **Plan de precios nuevo:**
   - Free: 1 repartidor, 20 paradas/día
   - Pro Individual: 1 repartidor, ilimitadas — $99/mes
   - Pro Equipo (3): 3 repartidores, ilimitadas — $199/mes
   - Pro Equipo (10): 10 repartidores, ilimitadas — $399/mes

### Criterios de aceptación P6
- [ ] Jefe puede crear equipo y invitar repartidores por link/código
- [ ] Mapa del jefe muestra posición GPS en tiempo real de cada repartidor activo
- [ ] Asignación de paradas funciona offline (repartidor recibe al sincronizar)
- [ ] Métricas por repartidor en `/metricas` del jefe

---

## P7 — Integraciones externas (WhatsApp Business + Shopify) 🟢

**Objetivo:** Conectar Mueve Reparto con los sistemas que ya usan los negocios en Cancún.

### P7.1 — WhatsApp Business API (Twilio)

**Problema actual:** El repartidor copia manualmente el número y manda mensaje por WhatsApp.
**Solución:** Envío automático al completar una parada.

- Webhook: al marcar parada "completada" → enviar mensaje al cliente automáticamente
- Plantilla de mensaje aprobada por Meta: "Hola {nombre}, tu pedido fue entregado en {dirección}. ✅ Mueve Reparto"
- Config: admin puede personalizar el mensaje en `/enviar`

### P7.2 — Shopify / WooCommerce Import

**Problema:** Tiendas online exportan pedidos en CSV/Excel. El repartidor los copia a mano.
**Solución:** Import de pedidos desde CSV o via webhook de Shopify/WooCommerce.

- Página `/importar`:
  - Subir CSV con columnas: nombre, teléfono, dirección, monto
  - Parsear y crear paradas en batch
  - Previsualizar antes de confirmar import
- Webhook Shopify: `POST /integrations/shopify` — crea parada automáticamente al crear orden

### P7.3 — Facturación simple (XML/PDF)

- Al completar parada con cobro registrado: generar recibo PDF simple
- Enviar recibo automáticamente al cliente por WhatsApp/email

---

## P8 — Analytics y BI para Jefes de Reparto 🟢

**Objetivo:** Darle al "jefe de reparto" (o repartidor independiente pro) datos accionables.

### Funcionalidades

1. **Dashboard ejecutivo `/metricas` ampliado:**
   - Mapa de calor: zonas de Cancún con más entregas
   - Horas pico: ¿cuándo se completan más paradas?
   - Paradas por tipo de cliente (recurrente vs. nuevo)
   - Tiempo promedio por entrega
   - Ingresos proyectados del mes basado en tendencia actual

2. **Exportar datos:**
   - CSV/Excel de paradas completadas por rango de fechas
   - PDF de reporte semanal/mensual listo para enviar al jefe o clientes

3. **Comparativa semana a semana:**
   - "Esta semana: +15% vs. la semana pasada"
   - Alertas: "Llevas 3 días sin registrar paradas" → notificación push

4. **Backend — nuevas tablas:**
   ```sql
   -- Ya cubierto por daily_stats; solo agregar columnas nuevas
   ALTER TABLE daily_stats ADD COLUMN avg_delivery_min FLOAT;
   ALTER TABLE daily_stats ADD COLUMN zone_counts JSONB;
   ```

---

## Prioridad de ejecución recomendada

```
P5.2 (Conekta) → P6 (Equipos) → P7.1 (WhatsApp auto) → P7.2 (CSV import) → P8 (Analytics)
```

**Criterio:** P5.2 genera ingresos inmediatos → P6 expande el mercado → P7 aumenta retención → P8 diferencia del competidor.

---

## Próximos prompts para Jules/Claude

Los prompts de especificación para P5.2, P6, P7 y P8 se generarán en:
- `docs/prompts/CLAUDE_P5_2_CONEKTA.md`
- `docs/prompts/CLAUDE_P6_EQUIPOS.md`
- `docs/prompts/CLAUDE_P7_INTEGRACIONES.md`
- `docs/prompts/CLAUDE_P8_ANALYTICS.md`
