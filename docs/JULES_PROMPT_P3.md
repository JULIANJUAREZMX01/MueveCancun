# Prompt para Jules — Mueve Reparto: Backend P3 (Rust/Axum/PostgreSQL)

> **Instrucciones de uso:**
> Jules debe leer este archivo completo antes de ejecutar cualquier cambio.
> Trabajar en rama `jules/p3-backend-{id}`. PR hacia `main` al terminar.
> **Nunca** push directo a `main`.

---

## 0. Contexto del proyecto

**Mueve Reparto** es una PWA offline-first para repartidores independientes en Cancún.
Organiza paradas, optimiza rutas, notifica clientes por WhatsApp/Telegram y mide productividad — todo offline.

**Stack frontend (implementado y configurado — NO modificar):**
- Astro 5.18 + SSR (`@astrojs/node`, `output: 'server'`) + Tailwind CSS v3
- IndexedDB via `idb` 8 — `src/lib/idb.ts` (schema completo)
- `src/lib/sync.ts` — cliente sync IDB → API (ya creado, listo para usar)
- Leaflet (mapas, dark tiles OSM)
- PWA: Service Worker + manifest
- Deploy: Render Node.js Web Service

**Repo:** `sistemascancunjefe-ai/MueveRepartoEnCancun-`
**Branch Claude actual:** `claude/clone-delivery-platform-9zhnf`
**Tu rama:** `jules/p3-backend-{id}`

---

## 1. Estado actual del repo — QUÉ YA ESTÁ HECHO

Los siguientes cambios fueron aplicados antes de este prompt. Jules **no debe rehacerlos**:

| Archivo | Estado |
|---------|--------|
| `astro.config.mjs` | ✅ SSR, `@astrojs/node`, site correcto, aliases limpios |
| `package.json` | ✅ name: `mueve-reparto`, scripts simplificados |
| `render.yaml` | ✅ 2 servicios (frontend + API) + 1 database PostgreSQL |
| `.env.example` | ✅ `PUBLIC_API_URL` documentado |
| `src/lib/sync.ts` | ✅ Sync manager completo (flushSyncQueue + initSyncManager) |
| `src/layouts/MainLayout.astro` | ✅ `initSyncManager()` integrado vía `<script>` module |
| `backend/.gitignore` | ✅ `/target` + `.env` ignorados |
| `backend/rust-toolchain.toml` | ✅ Rust `stable` |
| `backend/migrations/001_initial.sql` | ✅ Schema completo (devices, stops, daily_stats) |

---

## 2. LO QUE JULES DEBE CREAR — Solo el backend Rust

### 2.1 Estructura de archivos a crear

```
backend/
├── Cargo.toml                       ← CREAR
└── src/
    ├── main.rs                      ← CREAR
    ├── db.rs                        ← CREAR
    ├── models.rs                    ← CREAR
    ├── middleware/
    │   ├── mod.rs                   ← CREAR
    │   └── device.rs                ← CREAR
    └── routes/
        ├── mod.rs                   ← CREAR
        ├── stops.rs                 ← CREAR
        └── stats.rs                 ← CREAR
```

---

### 2.2 `backend/Cargo.toml`

```toml
[package]
name        = "mueve-reparto-api"
version     = "0.1.0"
edition     = "2021"

[[bin]]
name = "mueve-reparto-api"
path = "src/main.rs"

[dependencies]
axum            = { version = "0.7", features = ["macros"] }
tokio           = { version = "1",   features = ["full"] }
sqlx            = { version = "0.8", features = ["postgres", "runtime-tokio-rustls", "uuid", "chrono", "migrate"] }
serde           = { version = "1",   features = ["derive"] }
serde_json      = "1"
uuid            = { version = "1",   features = ["v4", "serde"] }
chrono          = { version = "0.4", features = ["serde"] }
tower-http      = { version = "0.5", features = ["cors", "trace"] }
tracing         = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
dotenvy         = "0.15"
anyhow          = "1"

[profile.release]
opt-level      = 3
lto            = true
codegen-units  = 1
```

---

### 2.3 `backend/src/models.rs`

> Usa `f64` directamente porque la migración usa `FLOAT8` (no NUMERIC), compatible con sqlx sin dependencias extra.

```rust
use chrono::{DateTime, NaiveDate, Utc};
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
    pub priority:     Option<String>,
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

---

### 2.4 `backend/src/db.rs`

```rust
use anyhow::Result;
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::env;

pub async fn create_pool() -> Result<PgPool> {
    let url = env::var("DATABASE_URL")
        .expect("DATABASE_URL debe estar configurada");

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&url)
        .await?;

    // Migraciones embebidas en el binario en tiempo de compilación
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;

    Ok(pool)
}

/// Registra el dispositivo si no existe, actualiza last_seen si ya existe.
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

---

### 2.5 `backend/src/middleware/mod.rs`

```rust
pub mod device;
```

---

### 2.6 `backend/src/middleware/device.rs`

> Extractor de Axum que lee `X-Device-Id` del header. Sin este header, el request falla con 400.

```rust
use axum::{
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
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

---

### 2.7 `backend/src/routes/mod.rs`

```rust
pub mod stats;
pub mod stops;
```

---

### 2.8 `backend/src/routes/stops.rs`

```rust
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{middleware::device::DeviceId, models::*};

/// GET /stops — Lista paradas del dispositivo ordenadas por stop_order
pub async fn list_stops(
    DeviceId(device_id): DeviceId,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<Stop>>, StatusCode> {
    sqlx::query_as!(
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
    .map(Json)
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// POST /stops — Crear parada nueva
pub async fn create_stop(
    DeviceId(device_id): DeviceId,
    State(pool): State<PgPool>,
    Json(body): Json<CreateStop>,
) -> Result<(StatusCode, Json<Stop>), StatusCode> {
    crate::db::upsert_device(&pool, &device_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    sqlx::query_as!(
        Stop,
        r#"
        INSERT INTO stops (
            device_id, client_id, address, lat, lng,
            priority, note, income, client_name, client_phone,
            stop_order, created_at
        )
        VALUES (
            $1, $2, $3, $4, $5,
            COALESCE($6, 'normal'), $7, $8, $9, $10,
            COALESCE($11, 0), COALESCE($12, NOW())
        )
        RETURNING id, device_id, client_id, address, lat, lng,
                  priority, status, note, income, client_name, client_phone,
                  stop_order, created_at, completed_at, notified, synced_at
        "#,
        device_id, body.client_id, body.address, body.lat, body.lng,
        body.priority, body.note, body.income, body.client_name, body.client_phone,
        body.stop_order, body.created_at,
    )
    .fetch_one(&pool)
    .await
    .map(|s| (StatusCode::CREATED, Json(s)))
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// PATCH /stops/:id — Actualizar estado (completar, cambiar orden, etc.)
pub async fn update_stop(
    DeviceId(device_id): DeviceId,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(body): Json<UpdateStop>,
) -> Result<Json<Stop>, StatusCode> {
    sqlx::query_as!(
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
        id, device_id,
        body.status, body.completed_at, body.notified, body.stop_order, body.income,
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .map(Json)
    .ok_or(StatusCode::NOT_FOUND)
}

/// DELETE /stops/:id
pub async fn delete_stop(
    DeviceId(device_id): DeviceId,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> StatusCode {
    match sqlx::query!(
        "DELETE FROM stops WHERE id = $1 AND device_id = $2",
        id, device_id,
    )
    .execute(&pool)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => StatusCode::NO_CONTENT,
        Ok(_)                          => StatusCode::NOT_FOUND,
        Err(_)                         => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

/// POST /stops/sync — Batch upsert desde syncQueue del cliente IDB.
/// Idempotente gracias a UNIQUE(device_id, client_id) en la migración.
pub async fn sync_stops(
    DeviceId(device_id): DeviceId,
    State(pool): State<PgPool>,
    Json(payload): Json<SyncPayload>,
) -> Result<Json<SyncResponse>, StatusCode> {
    crate::db::upsert_device(&pool, &device_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut synced_stops = 0usize;
    let mut synced_stats = 0usize;
    let mut errors: Vec<String> = Vec::new();

    for s in &payload.stops {
        let res = sqlx::query!(
            r#"
            INSERT INTO stops (
                device_id, client_id, address, lat, lng,
                priority, note, income, client_name, client_phone,
                stop_order, created_at
            )
            VALUES (
                $1, $2, $3, $4, $5,
                COALESCE($6, 'normal'), $7, $8, $9, $10,
                COALESCE($11, 0), COALESCE($12, NOW())
            )
            ON CONFLICT (device_id, client_id) DO NOTHING
            "#,
            device_id, s.client_id, s.address, s.lat, s.lng,
            s.priority, s.note, s.income, s.client_name, s.client_phone,
            s.stop_order, s.created_at,
        )
        .execute(&pool)
        .await;

        match res {
            Ok(_)  => synced_stops += 1,
            Err(e) => errors.push(format!("stop {}: {e}", s.client_id)),
        }
    }

    if let Some(stats_list) = &payload.stats {
        for st in stats_list {
            let res = sqlx::query!(
                r#"
                INSERT INTO daily_stats
                    (device_id, stat_date, completed, total, income, distance_km, duration_min)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (device_id, stat_date) DO UPDATE SET
                    completed    = EXCLUDED.completed,
                    total        = EXCLUDED.total,
                    income       = EXCLUDED.income,
                    distance_km  = EXCLUDED.distance_km,
                    duration_min = EXCLUDED.duration_min
                "#,
                device_id, st.stat_date, st.completed, st.total,
                st.income, st.distance_km, st.duration_min,
            )
            .execute(&pool)
            .await;

            match res {
                Ok(_)  => synced_stats += 1,
                Err(e) => errors.push(format!("stats {}: {e}", st.stat_date)),
            }
        }
    }

    Ok(Json(SyncResponse { synced_stops, synced_stats, errors }))
}
```

---

### 2.9 `backend/src/routes/stats.rs`

> Usa `$2::integer * INTERVAL '1 day'` para el cálculo de intervalo — evita interpolación de strings.

```rust
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use sqlx::PgPool;

use crate::{middleware::device::DeviceId, models::*};

#[derive(Deserialize)]
pub struct StatsQuery {
    #[serde(default = "default_days")]
    pub days: i32,
}

fn default_days() -> i32 { 7 }

/// GET /stats?days=7 — Estadísticas de los últimos N días (máx 90)
pub async fn get_stats(
    DeviceId(device_id): DeviceId,
    State(pool): State<PgPool>,
    Query(q): Query<StatsQuery>,
) -> Result<Json<Vec<DailyStats>>, StatusCode> {
    let days = q.days.clamp(1, 90);

    sqlx::query_as!(
        DailyStats,
        r#"
        SELECT id, device_id, stat_date, completed, total,
               income, distance_km, duration_min
        FROM daily_stats
        WHERE device_id = $1
          AND stat_date >= CURRENT_DATE - ($2::integer * INTERVAL '1 day')
        ORDER BY stat_date DESC
        "#,
        device_id,
        days,
    )
    .fetch_all(&pool)
    .await
    .map(Json)
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// POST /stats — Upsert estadísticas del día
pub async fn upsert_stats(
    DeviceId(device_id): DeviceId,
    State(pool): State<PgPool>,
    Json(body): Json<UpsertStats>,
) -> Result<Json<DailyStats>, StatusCode> {
    crate::db::upsert_device(&pool, &device_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    sqlx::query_as!(
        DailyStats,
        r#"
        INSERT INTO daily_stats
            (device_id, stat_date, completed, total, income, distance_km, duration_min)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (device_id, stat_date) DO UPDATE SET
            completed    = EXCLUDED.completed,
            total        = EXCLUDED.total,
            income       = EXCLUDED.income,
            distance_km  = EXCLUDED.distance_km,
            duration_min = EXCLUDED.duration_min
        RETURNING id, device_id, stat_date, completed, total,
                  income, distance_km, duration_min
        "#,
        device_id, body.stat_date, body.completed, body.total,
        body.income, body.distance_km, body.duration_min,
    )
    .fetch_one(&pool)
    .await
    .map(Json)
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}
```

---

### 2.10 `backend/src/main.rs`

```rust
use axum::{
    Router,
    http::{HeaderName, HeaderValue, Method},
    routing::{delete, get, patch, post},
};
use std::{env, net::SocketAddr};
use tower_http::{
    cors::CorsLayer,
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
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let pool = db::create_pool().await?;

    // CORS: solo el origen del frontend configurado; nunca Any en producción
    let allowed_origin = env::var("ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:4321".to_string());

    let cors = CorsLayer::new()
        .allow_origin(allowed_origin.parse::<HeaderValue>()?)
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE])
        .allow_headers([
            HeaderName::from_static("content-type"),
            HeaderName::from_static("x-device-id"),
        ]);

    let app = Router::new()
        // Health check (sin auth, para Render health checks)
        .route("/health", get(|| async { "OK" }))
        // Stops
        .route("/stops",      get(routes::stops::list_stops))
        .route("/stops",      post(routes::stops::create_stop))
        .route("/stops/sync", post(routes::stops::sync_stops))
        .route("/stops/:id",  patch(routes::stops::update_stop))
        .route("/stops/:id",  delete(routes::stops::delete_stop))
        // Stats
        .route("/stats",      get(routes::stats::get_stats))
        .route("/stats",      post(routes::stats::upsert_stats))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(pool);

    let port = env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()?;

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Mueve Reparto API → {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
```

---

## 3. Verificación que Jules debe ejecutar

### 3.1 Backend — compilación

```bash
cd backend

# Verificar tipos (requiere DATABASE_URL o modo offline)
# Opción A — con DB activa:
DATABASE_URL="postgresql://reparto_user:reparto_pass@localhost/mueve_reparto" \
  cargo check

# Opción B — modo offline (sin DB, genera caché .sqlx/):
DATABASE_URL="postgresql://..." cargo sqlx prepare
SQLX_OFFLINE=true cargo check
```

### 3.2 Test de integración local

```bash
# Terminal 1 — PostgreSQL
docker run -d --name mr-db \
  -e POSTGRES_DB=mueve_reparto \
  -e POSTGRES_USER=reparto_user \
  -e POSTGRES_PASSWORD=reparto_pass \
  -p 5432:5432 postgres:16

# Terminal 2 — API
cd backend
DATABASE_URL="postgresql://reparto_user:reparto_pass@localhost/mueve_reparto" \
PORT=8080 ALLOWED_ORIGINS="http://localhost:4321" \
cargo run

# Terminal 3 — Pruebas curl
curl http://localhost:8080/health
# → OK

curl -X POST http://localhost:8080/stops \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: test-device-001" \
  -d '{"client_id":"local-1","address":"Av Tulum 123, Cancún","priority":"normal"}'
# → 201 Created con JSON del stop

curl http://localhost:8080/stops -H "X-Device-Id: test-device-001"
# → Array con el stop creado

curl -X PATCH "http://localhost:8080/stops/{UUID}" \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: test-device-001" \
  -d '{"status":"completed","completed_at":"2026-03-09T15:00:00Z","income":80.0}'
# → 200 con stop actualizado

curl "http://localhost:8080/stats?days=7" -H "X-Device-Id: test-device-001"
# → Array de stats
```

### 3.3 Frontend — build SSR

```bash
cd ..  # raíz del repo
pnpm install
pnpm build
ls dist/server/entry.mjs  # debe existir
```

---

## 4. Deploy en Render

1. Merge del PR a `main`
2. Render provisiona `mueve-reparto-db` PostgreSQL (~1 min)
3. `mueve-reparto-api` compila Rust (~4-6 min primera vez)
4. `mueve-reparto-frontend` buildea Astro (~1-2 min)
5. Verificar:
   - `GET https://mueve-reparto-api.onrender.com/health` → `OK`
   - `GET https://muevereparto.onrender.com/home` → página carga

**Ajuste post-deploy:** En Render Dashboard, confirmar que `PUBLIC_API_URL` en el frontend apunta al URL real del API service (Render puede asignar hostnames distintos a los del `render.yaml`).

---

## 5. Convenciones

- Branch: `jules/p3-backend-{id}` — nunca push a `main`
- Commits: `tipo: descripción` (feat, fix, chore)
- Sin modificaciones al frontend (src/pages/, src/components/)
- Logs: `tracing::info/warn/error`, no `println!`
- CORS: solo el origen del frontend, nunca `allow_origin(Any)` en producción

---

## 6. Resumen de entregables esperados

| Archivo | Acción Jules |
|---------|-------------|
| `backend/Cargo.toml` | Crear |
| `backend/src/main.rs` | Crear |
| `backend/src/db.rs` | Crear |
| `backend/src/models.rs` | Crear |
| `backend/src/middleware/mod.rs` | Crear |
| `backend/src/middleware/device.rs` | Crear |
| `backend/src/routes/mod.rs` | Crear |
| `backend/src/routes/stops.rs` | Crear |
| `backend/src/routes/stats.rs` | Crear |
| `docs/ROADMAP.md` | Actualizar: marcar P3 como completado |

**No tocar (ya hecho por Claude):**
- `astro.config.mjs`, `package.json`, `render.yaml`, `.env.example`
- `src/lib/sync.ts`, `src/layouts/MainLayout.astro`
- `backend/migrations/001_initial.sql`, `backend/.gitignore`, `backend/rust-toolchain.toml`
- `src/lib/idb.ts`, `src/pages/*.astro`, `public/manifest.json`
- `CLAUDE.md`, `AGENTS.md`, `README.md`
- `pnpm-lock.yaml` (no editar manualmente)
- `rust-wasm/` (no eliminar)
