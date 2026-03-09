# Prompt para Jules — Mueve Reparto: Fixes P1/P2 + Backend P3

> **Instrucciones de uso:** Este documento es el brief técnico completo para Jules.
> Jules debe leer este archivo de principio a fin antes de ejecutar cualquier cambio.
> Trabajar en rama `jules/p3-backend-{id}`. PR hacia `main` al terminar. No hacer push directo a `main`.

---

## 0. Contexto del proyecto

**Mueve Reparto** es una PWA offline-first para repartidores independientes en Cancún.
El repartidor organiza sus paradas del día, traza la ruta óptima, completa entregas y notifica a los clientes por WhatsApp/Telegram.

**Stack frontend (ya implementado, P1/P2 completos):**
- Astro 5, Vanilla JS, Tailwind CSS v3
- IndexedDB via `idb` 8 — `src/lib/idb.ts`
- Leaflet (mapas, dark tiles OSM)
- PWA: Service Worker + manifest
- Deploy target: Render (Node.js Web Service)

**Repo:** `sistemascancunjefe-ai/MueveRepartoEnCancun-`
**Branch actual de trabajo Claude:** `claude/clone-delivery-platform-9zhnf` (mergeado o en PR hacia `main`)
**Tu rama de trabajo:** `jules/p3-backend-{id}`

**Páginas activas:**
- `/` splash → `/home` dashboard
- `/pedidos` CRUD paradas
- `/reparto` mapa + GPS + nearest-neighbor
- `/enviar` notificaciones WhatsApp/Telegram
- `/metricas` bar chart 7 días + ROI

---

## 1. FASE 0 — Fixes de configuración (bloqueantes)

Estos archivos quedaron con referencias legacy y deben corregirse antes de P3.

### 1.1 `astro.config.mjs` — corregir a SSR y limpiar legacy

**Problema:** `output: 'static'` pero el proyecto requiere SSR (CLAUDE.md lo especifica). El `site` apunta a dominio incorrecto. Los `external` de WASM ya no se usan en el frontend de delivery.

**Reemplazar el archivo completo con:**

```js
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwind from '@astrojs/tailwind'
import node from '@astrojs/node'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  site: 'https://muevereparto.onrender.com',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    sitemap(),
    tailwind({ applyBaseStyles: false }),
  ],
  vite: {
    resolve: {
      alias: {
        '@components': path.resolve(__dirname, 'src/components'),
        '@layouts':    path.resolve(__dirname, 'src/layouts'),
        '@utils':      path.resolve(__dirname, 'src/utils'),
        '@lib':        path.resolve(__dirname, 'src/lib'),
        '@consts':     path.resolve(__dirname, 'src/consts.ts'),
        '@types':      path.resolve(__dirname, 'src/types.ts'),
      },
    },
  },
})
```

**Instalar el adapter que falta:**
```bash
pnpm add @astrojs/node
```

### 1.2 `package.json` — actualizar nombre y limpiar scripts

Cambiar `"name": "cancunmueve-pwa"` → `"name": "mueve-reparto"`.

Cambiar el script `"build"` para eliminar la dependencia de `optimize-json` y `build-wasm` (son legacies del sistema de transporte que no aplican al frontend de delivery):

```json
"build": "astro build",
"dev": "astro dev",
"dev:network": "astro dev --host",
```

Los scripts `build:wasm`, `check-wasm`, `optimize-json` pueden eliminarse si no afectan el build.
Verificar primero que `scripts/build-wasm.mjs` y `scripts/check-wasm.cjs` no sean referenciados en otro lugar; si no lo son, eliminarlos también.

### 1.3 `render.yaml` — reescribir para MueveReparto

**Reemplazar completamente:**

```yaml
version: "1"
services:
  - type: web
    name: mueve-reparto-frontend
    runtime: node
    repo: https://github.com/sistemascancunjefe-ai/MueveRepartoEnCancun-
    branch: main
    buildCommand: pnpm install && pnpm run build
    startCommand: node ./dist/server/entry.mjs
    envVars:
      - key: NODE_VERSION
        value: "20.10.0"
      - key: NODE_ENV
        value: production
      - key: PUBLIC_API_URL
        value: https://mueve-reparto-api.onrender.com
    autoDeploy: true

  - type: web
    name: mueve-reparto-api
    runtime: rust
    repo: https://github.com/sistemascancunjefe-ai/MueveRepartoEnCancun-
    branch: main
    rootDir: backend
    buildCommand: cargo build --release
    startCommand: ./target/release/mueve-reparto-api
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: mueve-reparto-db
          property: connectionString
      - key: PORT
        value: "8080"
      - key: RUST_LOG
        value: info
      - key: ALLOWED_ORIGINS
        value: https://mueve-reparto-frontend.onrender.com
    autoDeploy: true

databases:
  - name: mueve-reparto-db
    databaseName: mueve_reparto
    user: reparto_user
    plan: free
```

---

## 2. FASE 1 — Backend Rust/Axum (P3)

### 2.1 Estructura de directorios a crear

```
backend/
├── Cargo.toml
├── src/
│   ├── main.rs
│   ├── db.rs          ← conexión PostgreSQL + migraciones
│   ├── models.rs      ← structs compartidos
│   ├── routes/
│   │   ├── mod.rs
│   │   ├── stops.rs   ← GET /stops, POST /stops, PATCH /stops/:id
│   │   └── stats.rs   ← GET /stats, POST /stats
│   └── middleware/
│       └── device.rs  ← extractor device_id del header
```

### 2.2 `backend/Cargo.toml`

```toml
[package]
name = "mueve-reparto-api"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "mueve-reparto-api"
path = "src/main.rs"

[dependencies]
axum = { version = "0.7", features = ["macros"] }
tokio = { version = "1", features = ["full"] }
sqlx = { version = "0.8", features = ["postgres", "runtime-tokio-rustls", "uuid", "chrono", "migrate"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
tower-http = { version = "0.5", features = ["cors", "trace"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
dotenvy = "0.15"
anyhow = "1"

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
```

### 2.3 Esquema PostgreSQL — `backend/migrations/001_initial.sql`

```sql
-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de dispositivos (identificación sin auth en MVP)
CREATE TABLE IF NOT EXISTS devices (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id   TEXT NOT NULL UNIQUE,   -- ID generado en el cliente (nanoid)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de paradas
CREATE TABLE IF NOT EXISTS stops (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id    TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  client_id    TEXT NOT NULL,          -- ID local del cliente (de IDB)
  address      TEXT NOT NULL,
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  priority     TEXT NOT NULL CHECK (priority IN ('normal', 'urgent')) DEFAULT 'normal',
  status       TEXT NOT NULL CHECK (status IN ('pending', 'in_transit', 'completed', 'failed')) DEFAULT 'pending',
  note         TEXT,
  income       NUMERIC(10, 2),
  client_name  TEXT,
  client_phone TEXT,
  stop_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL,   -- timestamp del cliente
  completed_at TIMESTAMPTZ,
  notified     BOOLEAN DEFAULT FALSE,
  synced_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stops_device_id ON stops(device_id);
CREATE INDEX IF NOT EXISTS idx_stops_status    ON stops(status);
CREATE INDEX IF NOT EXISTS idx_stops_created   ON stops(created_at DESC);

-- Tabla de estadísticas diarias
CREATE TABLE IF NOT EXISTS daily_stats (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id    TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  stat_date    DATE NOT NULL,
  completed    INTEGER NOT NULL DEFAULT 0,
  total        INTEGER NOT NULL DEFAULT 0,
  income       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  distance_km  NUMERIC(8, 2),
  duration_min INTEGER,
  UNIQUE(device_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_stats_device_date ON daily_stats(device_id, stat_date DESC);
```

### 2.4 `backend/src/models.rs`

```rust
use chrono::{DateTime, Utc, NaiveDate};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Stop {
    pub id:           Uuid,
    pub device_id:    String,
    pub client_id:    String,
    pub address:      String,
    pub lat:          Option<f64>,
    pub lng:          Option<f64>,
    pub priority:     String,
    pub status:       String,
    pub note:         Option<String>,
    pub income:       Option<f64>,
    pub client_name:  Option<String>,
    pub client_phone: Option<String>,
    pub stop_order:   i32,
    pub created_at:   DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub notified:     bool,
    pub synced_at:    DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateStop {
    pub client_id:    String,
    pub address:      String,
    pub lat:          Option<f64>,
    pub lng:          Option<f64>,
    pub priority:     Option<String>,   // "normal" | "urgent"
    pub note:         Option<String>,
    pub income:       Option<f64>,
    pub client_name:  Option<String>,
    pub client_phone: Option<String>,
    pub stop_order:   Option<i32>,
    pub created_at:   Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateStop {
    pub status:       Option<String>,
    pub completed_at: Option<DateTime<Utc>>,
    pub notified:     Option<bool>,
    pub stop_order:   Option<i32>,
    pub income:       Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct DailyStats {
    pub id:           Uuid,
    pub device_id:    String,
    pub stat_date:    NaiveDate,
    pub completed:    i32,
    pub total:        i32,
    pub income:       f64,
    pub distance_km:  Option<f64>,
    pub duration_min: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpsertStats {
    pub stat_date:    NaiveDate,
    pub completed:    i32,
    pub total:        i32,
    pub income:       f64,
    pub distance_km:  Option<f64>,
    pub duration_min: Option<i32>,
}

// Batch sync desde IDB
#[derive(Debug, Deserialize)]
pub struct SyncPayload {
    pub stops: Vec<CreateStop>,
    pub stats: Option<Vec<UpsertStats>>,
}

#[derive(Debug, Serialize)]
pub struct SyncResponse {
    pub synced_stops: usize,
    pub synced_stats: usize,
    pub errors:       Vec<String>,
}
```

### 2.5 `backend/src/db.rs`

```rust
use anyhow::Result;
use sqlx::{PgPool, postgres::PgPoolOptions};
use std::env;

pub async fn create_pool() -> Result<PgPool> {
    let url = env::var("DATABASE_URL")
        .expect("DATABASE_URL debe estar configurada");

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&url)
        .await?;

    // Ejecutar migraciones automáticamente al arrancar
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;

    Ok(pool)
}

/// Registrar o actualizar dispositivo
pub async fn upsert_device(pool: &PgPool, device_id: &str) -> Result<()> {
    sqlx::query!(
        r#"
        INSERT INTO devices (device_id)
        VALUES ($1)
        ON CONFLICT (device_id) DO UPDATE SET last_seen = NOW()
        "#,
        device_id
    )
    .execute(pool)
    .await?;
    Ok(())
}
```

### 2.6 `backend/src/middleware/device.rs`

El `device_id` identifica al repartidor sin requerir auth. Viene en el header `X-Device-Id`.

```rust
use axum::{
    extract::{FromRequestParts, Request},
    http::{request::Parts, StatusCode},
    middleware::Next,
    response::Response,
};

#[derive(Clone)]
pub struct DeviceId(pub String);

#[axum::async_trait]
impl<S: Send + Sync> FromRequestParts<S> for DeviceId {
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let id = parts
            .headers
            .get("x-device-id")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
            .filter(|s| !s.is_empty() && s.len() <= 64)
            .ok_or((StatusCode::BAD_REQUEST, "Header X-Device-Id requerido"))?;

        Ok(DeviceId(id))
    }
}
```

### 2.7 `backend/src/routes/stops.rs`

```rust
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{middleware::device::DeviceId, models::*};

/// GET /stops
/// Retorna todas las paradas del device_id, ordenadas por stop_order
pub async fn list_stops(
    DeviceId(device_id): DeviceId,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<Stop>>, StatusCode> {
    let stops = sqlx::query_as!(
        Stop,
        r#"
        SELECT id, device_id, client_id, address, lat, lng,
               priority, status, note, income, client_name, client_phone,
               stop_order, created_at, completed_at, notified, synced_at
        FROM stops
        WHERE device_id = $1
        ORDER BY stop_order ASC, created_at ASC
        "#,
        device_id
    )
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(stops))
}

/// POST /stops
/// Crear una parada nueva
pub async fn create_stop(
    DeviceId(device_id): DeviceId,
    State(pool): State<PgPool>,
    Json(body): Json<CreateStop>,
) -> Result<(StatusCode, Json<Stop>), StatusCode> {
    // Asegurar que el dispositivo existe
    crate::db::upsert_device(&pool, &device_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let stop = sqlx::query_as!(
        Stop,
        r#"
        INSERT INTO stops (
            device_id, client_id, address, lat, lng, priority, status,
            note, income, client_name, client_phone, stop_order, created_at
        )
        VALUES ($1, $2, $3, $4, $5,
                COALESCE($6, 'normal'),
                'pending',
                $7, $8, $9, $10,
                COALESCE($11, 0),
                COALESCE($12, NOW()))
        RETURNING id, device_id, client_id, address, lat, lng,
                  priority, status, note, income, client_name, client_phone,
                  stop_order, created_at, completed_at, notified, synced_at
        "#,
        device_id,
        body.client_id,
        body.address,
        body.lat,
        body.lng,
        body.priority,
        body.note,
        body.income,
        body.client_name,
        body.client_phone,
        body.stop_order,
        body.created_at,
    )
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((StatusCode::CREATED, Json(stop)))
}

/// PATCH /stops/:id
/// Actualizar estado de una parada (completar, cambiar orden, etc.)
pub async fn update_stop(
    DeviceId(device_id): DeviceId,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(body): Json<UpdateStop>,
) -> Result<Json<Stop>, StatusCode> {
    let stop = sqlx::query_as!(
        Stop,
        r#"
        UPDATE stops SET
            status       = COALESCE($3, status),
            completed_at = COALESCE($4, completed_at),
            notified     = COALESCE($5, notified),
            stop_order   = COALESCE($6, stop_order),
            income       = COALESCE($7, income),
            synced_at    = NOW()
        WHERE id = $1 AND device_id = $2
        RETURNING id, device_id, client_id, address, lat, lng,
                  priority, status, note, income, client_name, client_phone,
                  stop_order, created_at, completed_at, notified, synced_at
        "#,
        id,
        device_id,
        body.status,
        body.completed_at,
        body.notified,
        body.stop_order,
        body.income,
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(stop))
}

/// DELETE /stops/:id
pub async fn delete_stop(
    DeviceId(device_id): DeviceId,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> StatusCode {
    let res = sqlx::query!(
        "DELETE FROM stops WHERE id = $1 AND device_id = $2",
        id,
        device_id,
    )
    .execute(&pool)
    .await;

    match res {
        Ok(r) if r.rows_affected() > 0 => StatusCode::NO_CONTENT,
        Ok(_)  => StatusCode::NOT_FOUND,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

/// POST /stops/sync
/// Batch upsert desde la syncQueue de IDB
/// Body: { stops: CreateStop[], stats?: UpsertStats[] }
pub async fn sync_stops(
    DeviceId(device_id): DeviceId,
    State(pool): State<PgPool>,
    Json(payload): Json<SyncPayload>,
) -> Result<Json<SyncResponse>, StatusCode> {
    crate::db::upsert_device(&pool, &device_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut synced_stops = 0usize;
    let mut errors: Vec<String> = Vec::new();

    for s in &payload.stops {
        let res = sqlx::query!(
            r#"
            INSERT INTO stops (device_id, client_id, address, lat, lng, priority,
                               status, note, income, client_name, client_phone,
                               stop_order, created_at)
            VALUES ($1, $2, $3, $4, $5, COALESCE($6,'normal'), 'pending',
                    $7, $8, $9, $10, COALESCE($11,0), COALESCE($12,NOW()))
            ON CONFLICT DO NOTHING
            "#,
            device_id, s.client_id, s.address, s.lat, s.lng, s.priority,
            s.note, s.income, s.client_name, s.client_phone, s.stop_order, s.created_at
        )
        .execute(&pool)
        .await;

        match res {
            Ok(_) => synced_stops += 1,
            Err(e) => errors.push(format!("stop {}: {}", s.client_id, e)),
        }
    }

    // Stats upsert
    let mut synced_stats = 0usize;
    if let Some(stats_list) = &payload.stats {
        for st in stats_list {
            let res = sqlx::query!(
                r#"
                INSERT INTO daily_stats (device_id, stat_date, completed, total, income, distance_km, duration_min)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (device_id, stat_date) DO UPDATE SET
                    completed    = EXCLUDED.completed,
                    total        = EXCLUDED.total,
                    income       = EXCLUDED.income,
                    distance_km  = EXCLUDED.distance_km,
                    duration_min = EXCLUDED.duration_min
                "#,
                device_id, st.stat_date, st.completed, st.total, st.income,
                st.distance_km, st.duration_min
            )
            .execute(&pool)
            .await;

            match res {
                Ok(_) => synced_stats += 1,
                Err(e) => errors.push(format!("stats {}: {}", st.stat_date, e)),
            }
        }
    }

    Ok(Json(SyncResponse { synced_stops, synced_stats, errors }))
}
```

### 2.8 `backend/src/routes/stats.rs`

```rust
use axum::{extract::State, http::StatusCode, Json};
use sqlx::PgPool;

use crate::{middleware::device::DeviceId, models::*};

/// GET /stats?days=7
/// Retorna las estadísticas de los últimos N días
pub async fn get_stats(
    DeviceId(device_id): DeviceId,
    State(pool): State<PgPool>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Vec<DailyStats>>, StatusCode> {
    let days: i64 = params
        .get("days")
        .and_then(|d| d.parse().ok())
        .unwrap_or(7)
        .min(90);

    let stats = sqlx::query_as!(
        DailyStats,
        r#"
        SELECT id, device_id, stat_date, completed, total,
               income::float8 as "income!: f64",
               distance_km::float8 as distance_km,
               duration_min
        FROM daily_stats
        WHERE device_id = $1
          AND stat_date >= CURRENT_DATE - ($2 || ' days')::interval
        ORDER BY stat_date DESC
        "#,
        device_id,
        days.to_string()
    )
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(stats))
}
```

### 2.9 `backend/src/routes/mod.rs`

```rust
pub mod stops;
pub mod stats;
```

### 2.10 `backend/src/main.rs`

```rust
use axum::{
    Router,
    routing::{delete, get, patch, post},
    http::{HeaderValue, Method},
};
use std::{env, net::SocketAddr};
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod db;
mod middleware;
mod models;
mod routes;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let pool = db::create_pool().await?;

    let allowed_origin = env::var("ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:4321".to_string());

    let cors = CorsLayer::new()
        .allow_origin(allowed_origin.parse::<HeaderValue>()?)
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE])
        .allow_headers(Any);

    let app = Router::new()
        // Health check
        .route("/health", get(|| async { "OK" }))
        // Stops
        .route("/stops",          get(routes::stops::list_stops))
        .route("/stops",          post(routes::stops::create_stop))
        .route("/stops/sync",     post(routes::stops::sync_stops))
        .route("/stops/:id",      patch(routes::stops::update_stop))
        .route("/stops/:id",      delete(routes::stops::delete_stop))
        // Stats
        .route("/stats",          get(routes::stats::get_stats))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(pool);

    let port = env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()?;

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Mueve Reparto API escuchando en {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
```

---

## 3. FASE 2 — Frontend: cliente de sync + variable de entorno

### 3.1 `src/lib/sync.ts` — crear archivo nuevo

Este módulo consume la `syncQueue` de IDB y la envía al backend cuando hay conexión.

```typescript
import { dbGetAll, dbDelete, dbPut, STORES, type SyncEntry } from './idb'

const API_URL = import.meta.env.PUBLIC_API_URL ?? ''

/** Obtiene o genera el device_id persistido en localStorage */
export function getDeviceId(): string {
  let id = localStorage.getItem('mr_device_id')
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    localStorage.setItem('mr_device_id', id)
  }
  return id
}

/** Cabeceras comunes para todas las peticiones al API */
function apiHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Device-Id': getDeviceId(),
  }
}

/** POST al backend con timeout de 10s */
async function apiPost(path: string, body: unknown): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10_000)
  try {
    return await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

/** PATCH al backend con timeout de 10s */
async function apiPatch(path: string, body: unknown): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10_000)
  try {
    return await fetch(`${API_URL}${path}`, {
      method: 'PATCH',
      headers: apiHeaders(),
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Procesa la syncQueue de IDB:
 * - Si hay internet, intenta enviar cada entrada al backend
 * - Si tiene éxito, elimina la entrada de la queue
 * - Si falla, incrementa retries (se reintenta en el siguiente ciclo)
 * - Máximo 5 reintentos por entrada
 */
export async function flushSyncQueue(): Promise<void> {
  if (!navigator.onLine || !API_URL) return

  const queue = await dbGetAll<SyncEntry>(STORES.SYNC)
  if (queue.length === 0) return

  for (const entry of queue) {
    if (entry.retries >= 5) {
      // Abandonar entradas con demasiados fallos
      await dbDelete(STORES.SYNC, entry.id)
      continue
    }

    try {
      let ok = false

      if (entry.type === 'delivery_update') {
        const payload = entry.payload as { id: string; status: string; completedAt?: number; income?: number }
        const res = await apiPatch(`/stops/${payload.id}`, {
          status:       payload.status,
          completed_at: payload.completedAt ? new Date(payload.completedAt).toISOString() : undefined,
          income:       payload.income,
        })
        ok = res.ok
      }

      if (entry.type === 'daily_summary') {
        const res = await apiPost('/stats', entry.payload)
        ok = res.ok
      }

      if (ok) {
        await dbDelete(STORES.SYNC, entry.id)
      } else {
        await dbPut(STORES.SYNC, { ...entry, retries: entry.retries + 1, lastAttempt: Date.now() })
      }
    } catch {
      // Timeout o error de red: incrementar retries
      await dbPut(STORES.SYNC, { ...entry, retries: entry.retries + 1, lastAttempt: Date.now() })
    }
  }
}

/**
 * Inicializa el sync manager:
 * - Procesa la queue al recuperar conexión
 * - Procesa la queue cada 5 minutos mientras hay conexión
 */
export function initSyncManager(): void {
  if (!API_URL) return  // Sin API configurada, no hacer nada

  window.addEventListener('online', () => {
    flushSyncQueue().catch(console.error)
  })

  // Procesar al cargar si hay conexión
  if (navigator.onLine) {
    flushSyncQueue().catch(console.error)
  }

  // Ciclo periódico cada 5 minutos
  setInterval(() => {
    if (navigator.onLine) flushSyncQueue().catch(console.error)
  }, 5 * 60 * 1000)
}
```

### 3.2 Agregar `PUBLIC_API_URL` a `.env.example`

En `.env.example`, descomentar la línea:

```
PUBLIC_API_URL=https://mueve-reparto-api.onrender.com
```

### 3.3 Inicializar el sync en `MainLayout.astro`

En el `<script>` del layout principal, agregar al final del script existente:

```js
// Sync manager — solo si hay API configurada
import { initSyncManager } from '@lib/sync'
initSyncManager()
```

Si el `<script>` usa `is:inline`, cambiar el import a la forma dinámica:
```js
import('@lib/sync').then(m => m.initSyncManager())
```

---

## 4. FASE 3 — Verificación

### 4.1 Build del frontend

```bash
pnpm install
pnpm build
# Debe completar sin errores
# Debe generar dist/server/entry.mjs
```

### 4.2 Build del backend

```bash
cd backend
cargo check       # Sin errores de compilación
cargo test        # Tests (si se implementan)
cargo build --release
```

### 4.3 Test de integración manual (local)

```bash
# Terminal 1: Levantar PostgreSQL local
docker run -d --name mr-postgres \
  -e POSTGRES_DB=mueve_reparto \
  -e POSTGRES_USER=reparto_user \
  -e POSTGRES_PASSWORD=reparto_pass \
  -p 5432:5432 postgres:16

# Terminal 2: Levantar API
cd backend
DATABASE_URL="postgresql://reparto_user:reparto_pass@localhost/mueve_reparto" \
PORT=8080 ALLOWED_ORIGINS=http://localhost:4321 \
cargo run

# Terminal 3: Levantar frontend
cd ..
PUBLIC_API_URL=http://localhost:8080 pnpm dev

# Verificar health
curl http://localhost:8080/health  # → "OK"

# Crear una parada
curl -X POST http://localhost:8080/stops \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: test-device-001" \
  -d '{"client_id":"abc123","address":"Av Tulum 123, Cancún","priority":"normal"}'

# Listar paradas
curl http://localhost:8080/stops \
  -H "X-Device-Id: test-device-001"

# Completar parada (reemplazar {id} con el UUID devuelto)
curl -X PATCH http://localhost:8080/stops/{id} \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: test-device-001" \
  -d '{"status":"completed","completed_at":"2026-03-09T15:00:00Z","income":80}'

# Obtener stats
curl "http://localhost:8080/stats?days=7" \
  -H "X-Device-Id: test-device-001"
```

### 4.4 Verificar páginas del frontend

Con `pnpm dev`, verificar que:
- `/` → redirect a `/home` en < 2s
- `/home` → carga con métricas (aunque IDB vacío)
- `/pedidos` → formulario funcional, sin errores consola
- `/reparto` → mapa Leaflet carga
- `/enviar` → plantillas visibles
- `/metricas` → bar chart visible (puede estar vacío)
- `/404` → error page correcta
- `/offline` → fallback visible
- `/rutas`, `/wallet`, `/mapa` → deben devolver 404 (no existir)

### 4.5 Deploy en Render

1. Merge del PR a `main`
2. Render detecta el push automáticamente (autoDeploy: true)
3. El servicio `mueve-reparto-api` compila Rust (~3-5 min primera vez)
4. El servicio `mueve-reparto-frontend` buildea Astro (~1-2 min)
5. La base de datos `mueve-reparto-db` se crea automáticamente
6. Verificar en Render dashboard que ambos servicios estén en `Live`

**Variables de entorno a configurar en Render (solo las sensibles):**
- `mueve-reparto-api` → `DATABASE_URL` se autoconfigura desde el fromDatabase del render.yaml
- `mueve-reparto-frontend` → `PUBLIC_API_URL=https://mueve-reparto-api.onrender.com`

---

## 5. Convenciones obligatorias

- **Commits:** en español o inglés, formato `tipo: descripción` (feat, fix, chore, docs)
- **Branch:** `jules/p3-backend-{id}` — nunca push directo a `main`
- **PR:** describir cambios en inglés o español, incluir checklist de verificación
- **Sin frameworks JS en el frontend** — Astro + Vanilla únicamente
- **Sin auth en P3** — identificación solo por `X-Device-Id` header
- **Error handling:** todos los endpoints deben retornar JSON, incluso en errores (usar `axum::Json` wrappers)
- **CORS:** solo el origen del frontend — no `allow_origin(Any)` en producción
- **Logs:** usar `tracing::info/warn/error` — no `println!`

---

## 6. Resumen de entregables esperados

Al terminar, el PR de Jules debe contener:

| Archivo | Acción |
|---------|--------|
| `astro.config.mjs` | Reescribir: output server, adapter node, site corregido |
| `package.json` | Cambiar name, simplificar scripts |
| `render.yaml` | Reescribir: 2 servicios + 1 database |
| `.env.example` | Descomentar `PUBLIC_API_URL` |
| `backend/Cargo.toml` | Crear |
| `backend/src/main.rs` | Crear |
| `backend/src/db.rs` | Crear |
| `backend/src/models.rs` | Crear |
| `backend/src/middleware/device.rs` | Crear |
| `backend/src/routes/mod.rs` | Crear |
| `backend/src/routes/stops.rs` | Crear |
| `backend/src/routes/stats.rs` | Crear |
| `backend/migrations/001_initial.sql` | Crear |
| `src/lib/sync.ts` | Crear |
| `src/layouts/MainLayout.astro` | Modificar: añadir `initSyncManager()` |
| `docs/ROADMAP.md` | Actualizar P3 como completado |

**No modificar:**
- `src/lib/idb.ts` (schema ya es correcto)
- `src/pages/*.astro` (páginas ya implementadas en P1)
- `public/manifest.json` (correcto)
- `CLAUDE.md`, `AGENTS.md`, `README.md` (actualizados en P2)
- `rust-wasm/` (no eliminar; infraestructura futura P3 quizá lo usa)
- `pnpm-lock.yaml` (no editar manualmente)
