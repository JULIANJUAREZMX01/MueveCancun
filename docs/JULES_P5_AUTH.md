# Prompt Jules — P5: Auth OTP + Monetización

> **Para Jules:** Este es el módulo más complejo. Requiere P3.3 (backend Rust) completado.
> Trabaja en rama `jules/p5-auth-otp-{id}`. PR hacia `main`.
> NUNCA push directo a `main`.
> **IMPORTANTE:** Este módulo introduce cambios breaking en el flujo de usuario.
> Leer TODO el prompt antes de comenzar. Hacer todas las investigaciones antes de codificar.

---

## 0. Contexto de negocio — comprende antes de codificar

El repartidor objetivo:
- No quiere registrarse con email/contraseña — lo abandona
- SÍ tiene WhatsApp/SMS con su número de teléfono mexicano
- Necesita < 60 segundos para estar listo
- Actualmente usa la app SIN cuenta (datos solo en su dispositivo)

**Plan de monetización:**
| Plan | Precio | Límites |
|------|--------|---------|
| Gratuito | $0 | Max 20 paradas/día, historial 7 días |
| Pro | $99 MXN/mes | Ilimitado, historial 90 días, exportación, sync multi-dispositivo |

**Flujo OTP:**
1. Usuario ingresa teléfono (10 dígitos México)
2. Recibe SMS/WhatsApp con código de 6 dígitos (válido 10 minutos)
3. Ingresa código → recibe JWT (72 horas)
4. JWT se guarda en `localStorage['mr-auth-token']`
5. Se incluye en headers de todas las llamadas al backend

---

## 1. Análisis previo requerido — Jules debe investigar ANTES de codificar

### 1.1 Compara proveedores de SMS/OTP para México

Jules debe investigar cada opción y documentar:

| Proveedor | Precio SMS MX | WhatsApp | Setup | Latencia | Decisión |
|-----------|--------------|---------|-------|---------|---------|
| Twilio Verify | ~$0.05/SMS | Sí (extra) | Fácil | < 30s | Candidato A |
| Vonage (Nexmo) | ~$0.04/SMS | No | Medio | < 30s | Candidato B |
| AWS SNS | ~$0.00645/SMS | No | Medio | < 60s | Candidato C |
| Conekta (local MX) | No tiene SMS | No | — | — | No aplica |
| WhatsApp Business API | Variable | Sí | Complejo | < 10s | Candidato D |

**Para el MVP de P5:** Twilio Verify es el más simple — una sola API para SMS + WhatsApp fallback.

Jules debe verificar:
```bash
# Probar que Twilio puede enviar a México (código país +52)
# Documentar el costo por SMS en Quintana Roo, México
# Verificar si el número de Twilio puede enviar WhatsApp
```

### 1.2 Compara estrategias de JWT en Astro SSR

| Estrategia | Seguridad | Complejidad | Revocación | Decisión |
|-----------|-----------|-------------|-----------|---------|
| localStorage + header | Media | Baja | Solo expiración | MVP |
| HttpOnly Cookie | Alta | Media | Posible | Producción |
| Cookie + CSRF | Alta | Alta | Posible | Overkill MVP |
| Astro session (memoria) | Alta | Media | Sí | Sin persistence |

**Para P5 MVP:** JWT en `localStorage` con expiración 72h. Simple, funciona con SSR.
`Authorization: Bearer {token}` en cada request al backend Rust.

Jules debe investigar:
- ¿Qué biblioteca usar para JWT en Rust? (`jsonwebtoken` crate, actualmente v9)
- ¿Cómo generar y validar JWT HS256 en el backend Rust?
- ¿Cómo leer el token desde el header en Axum?

### 1.3 Compara pasarelas de pago para México

Jules debe investigar:

| Pasarela | Comisión | México | Tarjetas | OXXO | Suscripciones | Decisión |
|---------|---------|--------|---------|------|--------------|---------|
| Conekta | 2.9% + $2.50 | Nativa | ✅ | ✅ | ✅ | **Candidato A** |
| Stripe | 3.6% (MX) | ✅ | ✅ | ❌ | ✅ | Candidato B |
| OpenPay | 2.9% | Nativa | ✅ | ✅ | ✅ | Candidato C |
| MercadoPago | 3.29% | ✅ | ✅ | ✅ | ✅ | Candidato D |

Para el repartidor de Cancún: **Conekta** — pago en OXXO es crítico (muchos sin tarjeta de crédito).

### 1.4 Analiza el impacto en el flujo existente

La app actualmente es 100% anónima. P5 introduce auth. Jules debe analizar:

**Preguntas críticas:**
1. ¿Las paradas de IDB local se migran al backend cuando el usuario se registra?
2. ¿Puede el usuario seguir usando la app sin registro? (Plan gratuito sin cuenta = usar local)
3. ¿El JWT se renueva automáticamente o el usuario tiene que re-login cada 72h?
4. ¿Qué pasa si el JWT expira mientras el repartidor está en ruta?

**Decisiones de diseño que Jules debe tomar y justificar:**
- ¿Auth obligatorio o opcional con features bloqueadas?
- ¿Cuándo mostrar el paywall? (al superar 20 paradas, al intentar sync, etc.)
- ¿El modo offline sigue funcionando con JWT expirado?

---

## 2. Cambios en el backend Rust (requiere P3.3 completado)

### 2.1 Nueva migración SQL

Crear `backend/migrations/002_auth.sql`:

```sql
-- Tabla de usuarios autenticados
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        TEXT NOT NULL UNIQUE,         -- +521XXXXXXXXXX (E.164)
  plan         TEXT NOT NULL DEFAULT 'free', -- 'free' | 'pro'
  plan_expires TIMESTAMPTZ,                  -- NULL = gratis, fecha = pro expira
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de OTP pendientes
CREATE TABLE IF NOT EXISTS otp_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        TEXT NOT NULL,
  code         TEXT NOT NULL,               -- 6 dígitos (hasheado con SHA256)
  expires_at   TIMESTAMPTZ NOT NULL,        -- NOW() + 10 minutos
  attempts     INTEGER NOT NULL DEFAULT 0,  -- Máx 3 intentos
  used         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_attempts (phone, expires_at DESC);

-- Ligar dispositivo a usuario (1 usuario → N dispositivos)
ALTER TABLE devices ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices (user_id);

-- Tabla de suscripciones/pagos
CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,            -- 'conekta' | 'stripe'
  provider_sub_id TEXT NOT NULL UNIQUE,     -- ID de suscripción en el proveedor
  status          TEXT NOT NULL,            -- 'active' | 'cancelled' | 'past_due'
  amount_mxn      INTEGER NOT NULL,         -- En centavos (9900 = $99 MXN)
  current_period_end TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.2 Nuevos endpoints en el backend

Agregar en `backend/src/routes/`:

**`auth.rs`** — 3 endpoints:

```
POST /auth/send-otp
  Body: { phone: "+521XXXXXXXXXX" }
  → Genera OTP de 6 dígitos
  → Llama a Twilio Verify
  → Guarda OTP hasheado en DB con expiración 10min
  → Retorna: { message: "OTP enviado" }

POST /auth/verify-otp
  Body: { phone: "+521XXXXXXXXXX", code: "123456" }
  → Verifica OTP (hash, no expirado, < 3 intentos)
  → Crea/actualiza usuario en DB
  → Genera JWT con { user_id, phone, plan, exp: now+72h }
  → Retorna: { token: "eyJ...", plan: "free", expiresAt: "..." }

GET /auth/me
  Header: Authorization: Bearer {token}
  → Verifica JWT
  → Retorna: { user_id, phone, plan, plan_expires, stops_today }
```

**Seguridad OTP obligatoria:**
- Rate limit: máx 3 intentos de envío por teléfono por hora
- OTP hasheado con SHA256 (no texto plano en DB)
- OTP inválido incrementa contador, a 3 intentos → OTP invalidado
- OTP expirado (> 10 min) → rechazar
- Invalidar OTP después de uso exitoso

### 2.3 Middleware JWT para endpoints autenticados

Crear `backend/src/middleware/auth.rs`:

```rust
// Extractor que verifica el JWT del header Authorization: Bearer {token}
// Si el token es inválido o expirado → 401 Unauthorized
// Si el token es válido → inyecta UserClaims en el handler
```

### 2.4 Actualizar endpoints de stops y stats para plan limits

En `routes/stops.rs`, modificar `create_stop` y `sync_stops`:
- Si el usuario está autenticado y tiene plan `free`:
  - Contar paradas del día → si >= 20 → retornar 403 con `{ error: "plan_limit", limit: 20 }`
- Si no autenticado → no hay límite de plan (modo anónimo local)

---

## 3. Cambios en el frontend Astro

### 3.1 Nueva página `/auth` en `src/pages/auth.astro`

Flujo en 2 pasos (sin JavaScript pesado):

**Paso 1:** Input de teléfono
```
[🇲🇽 +52] [XXXXXXXXXX       ]
[Enviar código]
```

**Paso 2:** Input de OTP (aparece después de enviar)
```
Código enviado a +521XXXXXXXXXX
[_ _ _ _ _ _]
[Verificar]
[Reenviar en 60s]
```

### 3.2 Nueva página `/suscripcion` en `src/pages/suscripcion.astro`

```
Plan actual: Gratuito
20 paradas/día · historial 7 días

[Actualizar a Pro — $99/mes]
  · Paradas ilimitadas
  · Historial 90 días
  · Sync entre dispositivos
  · Exportar métricas

Pagar con:
[Tarjeta] [OXXO]
```

### 3.3 Modificar `MainLayout.astro` para indicador de plan

En el header, si el usuario está autenticado:
- Mostrar badge del plan (`Gratis` / `Pro`)
- Mostrar contador de paradas del día si plan Gratis: `15/20`

### 3.4 Paywall en `pedidos.astro`

Al intentar agregar parada 21+ con plan gratuito:
```javascript
// Interceptar en saveStop()
const stats = await getTodayStats();
const token = localStorage.getItem('mr-auth-token');
if (token && stats.total >= 20) {
  // Mostrar bottom sheet de upgrade
  openUpgradeSheet();
  return;
}
```

---

## 4. Pruebas que Jules debe ejecutar

### 4.1 Test de flujo OTP completo

```bash
# 1. Solicitar OTP
curl -s -X POST http://localhost:8080/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+521XXXXXXXXXX"}'
# Esperado: {"message": "OTP enviado"} + SMS recibido en el teléfono

# 2. Verificar con código incorrecto
curl -s -X POST http://localhost:8080/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+521XXXXXXXXXX", "code": "000000"}'
# Esperado: 401 {"error": "Código incorrecto (2 intentos restantes)"}

# 3. Verificar con código correcto (usar el del SMS)
curl -s -X POST http://localhost:8080/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+521XXXXXXXXXX", "code": "CÓDIGO_REAL"}'
# Esperado: 200 {"token": "eyJ...", "plan": "free"}

# 4. Usar el token
JWT="eyJ..."
curl -s http://localhost:8080/auth/me -H "Authorization: Bearer $JWT"
# Esperado: {"user_id": "...", "phone": "+521XXXXXXXXXX", "plan": "free"}
```

### 4.2 Test de rate-limit OTP

```bash
# Enviar 4 solicitudes de OTP en menos de 1 hora
for i in 1 2 3 4; do
  curl -s -X POST http://localhost:8080/auth/send-otp \
    -H "Content-Type: application/json" \
    -d '{"phone": "+521XXXXXXXXXX"}'
  sleep 1
done
# La 4ta debe retornar 429 Too Many Requests
```

### 4.3 Test de expiración de OTP

```bash
# Solicitar OTP
curl -X POST http://localhost:8080/auth/send-otp -d '{"phone":"+521XXXXXXXXXX"}' ...

# Esperar 11 minutos (o modificar el tiempo de expiración a 30 segundos para el test)

# Intentar verificar
curl -X POST http://localhost:8080/auth/verify-otp -d '{"phone":"+521XXXXXXXXXX","code":"CODIGO"}' ...
# Esperado: 401 {"error": "Código expirado"}
```

### 4.4 Test de límite de plan

```bash
# Crear 20 paradas
for i in $(seq 1 20); do
  curl -X POST http://localhost:8080/stops \
    -H "Authorization: Bearer $JWT" \
    -H "X-Device-Id: test" \
    -d "{\"client_id\":\"local-$i\",\"address\":\"Parada $i\"}" ...
done

# Intentar crear la 21
curl -X POST http://localhost:8080/stops \
  -H "Authorization: Bearer $JWT" \
  -H "X-Device-Id: test" \
  -d '{"client_id":"local-21","address":"Parada 21"}' ...
# Esperado: 403 {"error": "plan_limit", "limit": 20, "upgrade_url": "/suscripcion"}
```

### 4.5 Test del flujo en navegador

```
1. Abrir /auth
2. Ingresar número de teléfono propio
3. Verificar que llega SMS en < 30 segundos
4. Ingresar código de 6 dígitos
5. Verificar redirect a /home con badge "Gratis" en header
6. Agregar 3 paradas
7. Verificar contador "3/20" en header
8. Abrir /suscripcion → verificar plan actual y opción de upgrade
```

### 4.6 Test de JWT expirado en frontend

```javascript
// En DevTools console:
// Sobrescribir token con uno expirado
localStorage.setItem('mr-auth-token', 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjF9.invalido');
// Navegar a /pedidos y agregar parada
// Verificar: la app no crasha, muestra mensaje de "sesión expirada" y redirige a /auth
```

---

## 5. Verificaciones de calidad antes del PR

### Backend
- [ ] `cargo check` sin errores
- [ ] OTP hasheado con SHA256 en DB (nunca texto plano)
- [ ] Rate-limit: max 3 envíos de OTP por teléfono/hora
- [ ] Rate-limit: max 3 intentos de verificación por OTP
- [ ] JWT firmado con `JWT_SECRET` desde variable de entorno (nunca hardcodeado)
- [ ] JWT expiración: 72 horas
- [ ] Endpoint `/auth/me` verifica firma y expiración del JWT
- [ ] Plan `free` limita a 20 paradas/día con error 403 descriptivo
- [ ] CORS actualizado para incluir `/auth/*` endpoints

### Frontend
- [ ] `pnpm build` sin errores TypeScript
- [ ] Página `/auth` accesible sin login (lógico)
- [ ] Redirigir a `/auth` si JWT expirado (detectar 401 de la API)
- [ ] JWT guardado en `localStorage['mr-auth-token']` al verificar OTP
- [ ] Todas las llamadas al backend incluyen `Authorization: Bearer {token}`
- [ ] Paywall se activa en el cliente al llegar a 20 paradas/día (plan free)
- [ ] La app funciona en modo offline incluso con JWT expirado (IDB sigue siendo fuente de verdad)
- [ ] Página `/suscripcion` renderiza el estado actual del plan

---

## 6. Variables de entorno nuevas (agregar a `render.yaml` y `.env.example`)

```bash
# Backend Rust
JWT_SECRET=un_secreto_muy_largo_y_aleatorio_min_32_chars
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Frontend Astro
PUBLIC_PLAN_FREE_LIMIT=20    # paradas/día para plan gratuito
PUBLIC_PRO_PRICE_MXN=99      # precio mensual en pesos
```

---

## 7. Entregables del PR

| Archivo | Cambio |
|---------|--------|
| `backend/migrations/002_auth.sql` | Crear — tablas users, otp_attempts, subscriptions |
| `backend/src/routes/auth.rs` | Crear — send-otp, verify-otp, me |
| `backend/src/middleware/auth.rs` | Crear — extractor JWT |
| `backend/src/models.rs` | Agregar structs User, OtpAttempt, Subscription |
| `backend/src/main.rs` | Agregar rutas /auth/* |
| `backend/Cargo.toml` | Agregar dependencias: jsonwebtoken, sha2, rand |
| `src/pages/auth.astro` | Crear — flujo OTP 2 pasos |
| `src/pages/suscripcion.astro` | Crear — plan actual + upgrade |
| `src/layouts/MainLayout.astro` | Badge de plan + contador paradas |
| `src/pages/pedidos.astro` | Paywall al llegar a límite de plan |
| `.env.example` | Variables JWT_SECRET, TWILIO_* |

---

## 8. Mensaje de commit esperado

```
feat(P5): auth OTP + planes free/pro + paywall

- migrations/002_auth.sql: users, otp_attempts, subscriptions
- routes/auth.rs: /auth/send-otp, /auth/verify-otp (rate-limit, hash SHA256), /auth/me
- middleware/auth.rs: extractor JWT HS256 con validación de expiración
- Plan free: límite 20 paradas/día → 403 con upgrade_url
- pages/auth.astro: flujo OTP 2 pasos (teléfono → código 6 dígitos)
- pages/suscripcion.astro: estado de plan + opciones de pago Conekta
- MainLayout: badge de plan + contador paradas del día
- pedidos.astro: paywall con redirect a /suscripcion al superar límite
```
