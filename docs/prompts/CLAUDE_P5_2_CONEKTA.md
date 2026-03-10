# Prompt P5.2 — Integración Conekta para Mueve Reparto

## Contexto del proyecto

**Repo:** `sistemascancunjefe-ai/MueveRepartoEnCancun-`
**Stack:** Astro 5 + Vanilla JS (frontend) / Rust Axum + PostgreSQL (backend)
**URL producción:** https://mueverepartoencancun.onrender.com

P5 base (Auth OTP + plan Free/Pro) ya está implementado. Los endpoints `/auth/*` funcionan.
Ahora necesito el flujo de pago real para que usuarios free puedan actualizar a Pro.

## Lo que ya existe (no modificar)

- `backend/src/routes/auth.rs` — send-otp, verify-otp, me
- `backend/migrations/002_auth.sql` — tablas users, subscriptions
- `src/pages/suscripcion.astro` — página con botón "Actualizar a Pro" (placeholder)
- `src/pages/auth.astro` — login OTP completo
- `src/utils/apiClient.ts` — inyecta `Authorization: Bearer {token}` automáticamente

## Lo que necesito implementar

### Backend Rust

**1. `backend/src/routes/subscriptions.rs`**

```
POST /subscriptions/checkout
  - Extrae JWT (AuthUser extractor de middleware/auth.rs)
  - Crea orden en Conekta API v2:
    POST https://api.conekta.io/orders
    Headers: Authorization: Basic {base64(CONEKTA_PRIVATE_KEY:)}
    Body: {
      currency: "MXN",
      customer_info: { phone: claims.phone },
      line_items: [{ name: "Mueve Reparto Pro — 1 mes", unit_price: 9900, quantity: 1 }],
      checkout: { type: "HostedPayment", success_url: "{PUBLIC_URL}/suscripcion?success=1",
                  failure_url: "{PUBLIC_URL}/suscripcion?error=1" }
    }
  - Devuelve: { checkout_url: String }

POST /subscriptions/webhook
  - Verifica firma HMAC-SHA256 del header "Conekta-Signature"
    key = CONEKTA_WEBHOOK_SECRET
    payload = request body (raw bytes)
  - Si event.type == "order.paid":
    - Extraer metadata.user_id
    - UPDATE users SET plan = 'pro', updated_at = NOW() WHERE id = user_id
    - INSERT INTO subscriptions (user_id, plan, status, provider, provider_ref, amount_mxn)
      VALUES (user_id, 'pro', 'active', 'conekta', event.data.id, 9900)
  - Devolver StatusCode::OK
```

**2. Actualizar `backend/src/routes/mod.rs`:**
Añadir `pub mod subscriptions;`

**3. Actualizar `backend/src/main.rs`:**
```rust
.route("/subscriptions/checkout", post(routes::subscriptions::checkout))
.route("/subscriptions/webhook",  post(routes::subscriptions::webhook))
```

**4. Actualizar `backend/Cargo.toml`:**
```toml
hmac   = "0.12"
base64 = { version = "0.22", features = ["std"] }
```

**5. Actualizar `render.yaml` backend envVars:**
```yaml
- key: CONEKTA_PRIVATE_KEY
  sync: false
- key: CONEKTA_WEBHOOK_SECRET
  sync: false
- key: PUBLIC_URL
  value: https://mueverepartoencancun.onrender.com
```

### Frontend Astro

**6. Actualizar `src/pages/suscripcion.astro`:**

Reemplazar el placeholder en `handleUpgrade()`:
```typescript
async function handleUpgrade() {
  const token = localStorage.getItem('mr-auth-token');
  if (!token) {
    window.location.href = '/auth?next=/suscripcion';
    return;
  }

  const btn = document.getElementById('btn-upgrade-card') as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = 'Redirigiendo...';

  try {
    const res = await fetch(`${API_URL}/subscriptions/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error('Error al crear checkout');
    const { checkout_url } = await res.json();
    window.location.href = checkout_url;
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Actualizar a Pro — $99/mes';
    alert('Error al procesar pago. Intenta de nuevo.');
  }
}
```

**7. Manejar retorno de Conekta en `suscripcion.astro`:**
Al cargar la página, verificar `?success=1` o `?error=1`:
```typescript
const params = new URLSearchParams(window.location.search);
if (params.get('success') === '1') {
  // Renovar JWT para obtener plan actualizado
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('mr-auth-token')}` }
  });
  if (res.ok) {
    // El plan en el JWT puede tardar en actualizarse (hasta la próxima verificación OTP)
    // Actualizar localStorage manualmente hasta próximo login
    localStorage.setItem('mr-plan', 'pro');
    renderPlan(); // re-render
    showToast('¡Bienvenido al plan Pro! 🚀');
  }
}
```

**8. Actualizar `render.yaml` frontend envVars:**
```yaml
- key: PUBLIC_CONEKTA_PUBLIC_KEY
  sync: false
```

## Criterios de aceptación

- [ ] Usuario free puede iniciar pago con tarjeta desde `/suscripcion`
- [ ] Al completar pago, plan se actualiza automáticamente a Pro
- [ ] El badge del header cambia de "Free" a "Pro" sin reiniciar sesión
- [ ] El paywall de 20 paradas desaparece al activar Pro
- [ ] Webhook de Conekta es verificado con HMAC antes de actualizar plan
- [ ] En modo dev (sin credenciales Conekta), el botón muestra un mensaje de próximamente

## Notas importantes

- NO crear cuenta de Conekta en el código — el usuario debe configurar sus propias credenciales
- El endpoint `/subscriptions/checkout` debe protegerse con `AuthUser` extractor (401 si no hay JWT)
- El endpoint `/subscriptions/webhook` es PÚBLICO pero con verificación HMAC
- No agregar otras dependencias JS (no Stripe.js, no iframes externos excepto Conekta)
- Todo en Vanilla JS, sin React/Vue
- El monto 9900 = $99.00 MXN en centavos (Conekta usa centavos)

## Referencias

- API Conekta v2: https://developers.conekta.com/reference/createorder
- Hosted Checkout: https://developers.conekta.com/docs/checkout-hosted
- Webhooks: https://developers.conekta.com/docs/webhooks
