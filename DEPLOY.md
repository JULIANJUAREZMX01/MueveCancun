# MueveCancún — Guía de Deploy: Vercel + Neon

> Stack: Astro 5 SSR · Vercel · Neon Postgres · Stripe

---

## Arquitectura

```
GitHub main → Vercel Build → mueve-cancun.vercel.app
               ↓
          Neon Postgres (serverless)
          DATABASE_URL → guardians + payments tables
               ↓
          Stripe Webhooks
          /api/webhooks/stripe → actualiza Neon
```

**Para cada PR:**
```
PR abierto → neon_workflow.yml → Neon branch preview/pr-N-branch
           → Vercel Preview deployment (DB aislada)
PR cerrado → Neon branch eliminada automáticamente
```

---

## Setup inicial (una sola vez)

### 1. Neon

1. Ir a https://console.neon.tech
2. Crear proyecto: `mueve-cancun`
3. Copiar la **Connection string** → será tu `DATABASE_URL`
4. En **Settings → API Keys**: crear key → será tu `NEON_API_KEY`
5. Copiar el **Project ID** de la URL del dashboard → `NEON_PROJECT_ID`

### 2. Vercel

1. Ir a https://vercel.com/new
2. Importar repo: `JULIANJUAREZMX01/MueveCancun`
3. Framework preset: **Astro** (detectado automáticamente)
4. Agregar variables de entorno (Settings → Environment Variables):

| Variable | Valor | Entorno |
|---|---|---|
| `DATABASE_URL` | `postgresql://...neon.tech/neondb?sslmode=require` | Production + Preview |
| `DATABASE_PROVIDER` | `neon` | Production + Preview |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Production |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Preview + Development |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Production |
| `NEON_API_KEY` | `neon_api_...` | — (solo en GitHub Secrets) |
| `GITHUB_ISSUES_TOKEN` | `ghp_...` | Production + Preview |
| `PUBLIC_MAPBOX_TOKEN` | `pk.eyJ1...` | Production + Preview |

5. Deploy → La URL será `mueve-cancun.vercel.app` (o el slug que asigne)

### 3. GitHub Secrets (para neon_workflow.yml)

En GitHub → Settings → Secrets and variables → Actions:

| Secret | Valor |
|---|---|
| `NEON_API_KEY` | Tu API key de Neon |

En GitHub → Settings → Variables → Actions:

| Variable | Valor |
|---|---|
| `NEON_PROJECT_ID` | ID del proyecto Neon |

### 4. Stripe Webhook

1. Ir a https://dashboard.stripe.com/webhooks
2. **Add endpoint**: `https://mueve-cancun.vercel.app/api/webhooks/stripe`
3. Eventos a escuchar:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copiar el **Signing secret** → `STRIPE_WEBHOOK_SECRET` en Vercel

---

## Deploy automático

- **main** → deploy a producción automáticamente
- **cualquier PR** → Vercel Preview URL + Neon branch aislada
- La branch Neon del PR se elimina cuando el PR se cierra

---

## Comandos locales

```bash
# Desarrollo
pnpm install
cp .env.example .env  # rellenar DATABASE_URL y STRIPE_SECRET_KEY
pnpm dev

# Build producción local
pnpm build

# Preview del build
pnpm preview

# Aplicar schema a Neon manualmente (si es necesario)
pnpm db:migrate
```

---

## Health check

```
GET https://mueve-cancun.vercel.app/api/health
→ { "status": "ok", "db": "connected", "db_latency_ms": 45, ... }
```
