# Prompt Jules — P3.3: Backend Rust + PostgreSQL

> **Para Jules:** Este es el prompt corregido. El prompt anterior (`docs/JULES_PROMPT_P3.md`)
> fue ignorado — no se creó ningún archivo. Ahora se requieren acciones concretas y verificables.
> Trabaja en rama `jules/p3-3-backend-{id}`. PR hacia `main` al terminar.
> NUNCA push directo a `main`.

---

## 0. Estado actual — lo que existe y lo que falta

### Ya existe (NO recrear):
```
backend/
├── .gitignore             ✅ (target/, .env)
├── rust-toolchain.toml    ✅ (stable)
├── migrations/
│   └── 001_initial.sql    ✅ (schema completo: devices, stops, daily_stats)
└── src/
    ├── middleware/         ✅ (directorio vacío)
    └── routes/             ✅ (directorio vacío)
```

### Lo que Jules debe crear (9 archivos):
```
backend/
├── Cargo.toml                    ← CREAR
└── src/
    ├── main.rs                   ← CREAR
    ├── db.rs                     ← CREAR
    ├── models.rs                 ← CREAR
    ├── middleware/
    │   ├── mod.rs                ← CREAR
    │   └── device.rs             ← CREAR
    └── routes/
        ├── mod.rs                ← CREAR
        ├── stops.rs              ← CREAR
        └── stats.rs              ← CREAR
```

---

## 1. Análisis previo requerido antes de codificar

### 1.1 Lee la migración SQL existente

Lee `backend/migrations/001_initial.sql` completo. Identifica:
- Las 3 tablas: `devices`, `stops`, `daily_stats`
- Los tipos de columna (FLOAT8 en lugar de NUMERIC — importante para Rust/sqlx)
- El UNIQUE constraint `(device_id, client_id)` en stops — crítico para el sync idempotente
- Los índices creados

### 1.2 Investiga y compara opciones del stack Rust HTTP

| Framework | Madurez | Ergonomía | Render soporte | Decisión |
|-----------|---------|-----------|----------------|---------|
| Axum 0.7 | Alta | Excelente | ✅ | **Elegido** |
| Actix-web 4 | Alta | Buena | ✅ | Más verboso, más raw |
| Warp | Media | Regular | ✅ | Menos mantenido |
| Poem | Baja | Buena | ✅ | Menos adoptado |

**Decisión justificada:** Axum 0.7 — ecosistema Tokio, extractores tipados, composable, compatible con tower middleware. Integra perfectamente con sqlx.

### 1.3 Investiga sqlx offline mode

`sqlx` verifica queries en tiempo de compilación contra una base de datos real.
Para compilar sin PostgreSQL disponible (en CI o entorno Jules):

```bash
# Opción A — compilar sin verificación de queries (más simple):
cargo build  # Con DATABASE_URL de una DB real
# O bien, usar cargo check con SQLX_OFFLINE=true y cache .sqlx/ preexistente

# Opción B — Macro sqlx::query! vs sqlx::query_as!:
# query_as! verifica tipos en compilación — requiere DB o .sqlx/ cache
# query! sin tipo requiere DB o cache también
```

**Para este proyecto:** Jules debe incluir el archivo `.sqlx/` generado con `cargo sqlx prepare`
O bien usar `cargo check` pasando DATABASE_URL a una DB temporal.

Alternativa más simple para que Jules pueda compilar sin DB real:
usar `sqlx::query_as` (sin macro `!`) con tipos explícitos. Sin embargo, esto pierde
verificación en tiempo de compilación. **Jules debe elegir y justificar.**

### 1.4 Lee `src/lib/sync.ts` para entender el cliente

Lee el archivo `src/lib/sync.ts` — este es el cliente en el frontend que enviará datos
al backend. Identifica:
- El formato del payload que envía
- Los endpoints que llama (`/stops/sync`, `/stops`, etc.)
- El header `X-Device-Id` que el cliente incluye
- Cómo construye la URL base desde `PUBLIC_API_URL`

Asegúrate de que tu backend procese exactamente los payloads que este cliente envía.

### 1.5 Analiza el render.yaml existente

Lee el archivo `render.yaml` en la raíz del repo. Verifica:
- Que ya tiene configurado el servicio `mueve-reparto-api` con el build de Rust
- Que ya tiene la base de datos `mueve-reparto-db`
- Qué variables de entorno están configuradas
- El start command del servicio API

Si `render.yaml` no existe o está incompleto, Jules debe crearlo o completarlo.

---

## 2. Implementación requerida

### 2.1 `backend/Cargo.toml`

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
strip          = true    # Reduce binario ~40%
```

### 2.2 `backend/src/models.rs`

Incluir todos los structs con sus derives correctos. Usar `f64` directamente (no `Decimal`)
porque la migración usa `FLOAT8`. Jules debe verificar que cada campo del struct corresponde
exactamente a una columna en la migración SQL (mismo nombre, tipo compatible).

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

### 2.3 `backend/src/db.rs`

```rust
use anyhow::Result;
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::env;

pub async fn create_pool() -> Result<PgPool> {
    let url = env::var("DATABASE_URL")
        .expect("DATABASE_URL debe estar configurada");

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .min_connections(2)
        .acquire_timeout(std::time::Duration::from_secs(5))
        .connect(&url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;
    tracing::info!("Base de datos conectada y migraciones aplicadas");

    Ok(pool)
}

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

### 2.4 `backend/src/middleware/mod.rs`
```rust
pub mod device;
```

### 2.5 `backend/src/middleware/device.rs`

```rust
use axum::{
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
};

/// Extrae el header X-Device-Id y lo valida.
/// Sin este header → 400 Bad Request.
#[derive(Clone, Debug)]
pub struct DeviceId(pub String);

#[axum::async_trait]
impl<S: Send + Sync> FromRequestParts<S> for DeviceId {
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let id = parts
            .headers
            .get("x-device-id")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty() && s.len() <= 64)
            .ok_or((StatusCode::BAD_REQUEST, "Header X-Device-Id requerido (max 64 chars)"))?;

        Ok(DeviceId(id))
    }
}
```

### 2.6 `backend/src/routes/mod.rs`
```rust
pub mod stats;
pub mod stops;
```

### 2.7 `backend/src/routes/stops.rs`

Implementar 5 handlers:
- `list_stops` — GET /stops con X-Device-Id
- `create_stop` — POST /stops
- `update_stop` — PATCH /stops/:id
- `delete_stop` — DELETE /stops/:id
- `sync_stops` — POST /stops/sync (batch upsert idempotente)

Ver spec completo en `docs/JULES_PROMPT_P3.md` sección 2.8 — copiar implementación exacta.

**Punto de atención para Jules:** El handler `sync_stops` usa `ON CONFLICT (device_id, client_id) DO NOTHING`.
Analizar: ¿Es correcto ignorar en conflicto en lugar de actualizar? El conflicto indica que la parada
ya existe en el servidor. El cliente luego puede actualizarla via PATCH /stops/:id. Este comportamiento
es intencional para el sync inicial — Jules debe confirmar que lo entiende antes de implementar.

### 2.8 `backend/src/routes/stats.rs`

Implementar 2 handlers:
- `get_stats` — GET /stats?days=7 (default 7, máx 90)
- `upsert_stats` — POST /stats

Ver spec completo en `docs/JULES_PROMPT_P3.md` sección 2.9.

**Punto de atención:** El query usa `$2::integer * INTERVAL '1 day'` — sintaxis específica
de PostgreSQL. Jules debe verificar que sqlx lo maneja correctamente con tipo `i32`.

### 2.9 `backend/src/main.rs`

```rust
use axum::{
    Router,
    http::{HeaderName, HeaderValue, Method},
    routing::{delete, get, patch, post},
};
use std::{env, net::SocketAddr};
use tower_http::{cors::CorsLayer, trace::TraceLayer};
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
                .unwrap_or_else(|_| "info,mueve_reparto_api=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let pool = db::create_pool().await?;

    let allowed_origin = env::var("ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "https://mueverepartoencancun.onrender.com".to_string());

    let cors = CorsLayer::new()
        .allow_origin(allowed_origin.parse::<HeaderValue>()?)
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE, Method::OPTIONS])
        .allow_headers([
            HeaderName::from_static("content-type"),
            HeaderName::from_static("x-device-id"),
        ]);

    let app = Router::new()
        .route("/health", get(|| async { "OK" }))
        .route("/stops",       get(routes::stops::list_stops))
        .route("/stops",       post(routes::stops::create_stop))
        .route("/stops/sync",  post(routes::stops::sync_stops))
        .route("/stops/:id",   patch(routes::stops::update_stop))
        .route("/stops/:id",   delete(routes::stops::delete_stop))
        .route("/stats",       get(routes::stats::get_stats))
        .route("/stats",       post(routes::stats::upsert_stats))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(pool);

    let port = env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()?;

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Mueve Reparto API escuchando en {addr}");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
```

---

## 3. Pruebas que Jules debe ejecutar

### 3.1 Compilación (sin DB real — usando cargo check)

```bash
cd backend
cargo check 2>&1
# Si hay errores de sqlx sobre tipos: ajustar models.rs según el error
# Si hay errores de imports: verificar que todos los mod están declarados
```

### 3.2 Prueba con DB real local (Docker)

```bash
# Terminal 1: PostgreSQL
docker run -d --name mr-db \
  -e POSTGRES_DB=mueve_reparto \
  -e POSTGRES_USER=reparto_user \
  -e POSTGRES_PASSWORD=reparto_pass \
  -p 5432:5432 postgres:16

# Esperar 5 segundos que levante, luego:

# Terminal 2: API
cd backend
DATABASE_URL="postgresql://reparto_user:reparto_pass@localhost/mueve_reparto" \
PORT=8080 \
ALLOWED_ORIGINS="http://localhost:4321" \
cargo run

# Esperar "Mueve Reparto API escuchando en 0.0.0.0:8080"
```

### 3.3 Suite de tests curl (copiar y ejecutar completo)

```bash
# Health check
curl -s http://localhost:8080/health
# Esperado: OK

# Crear parada
RESP=$(curl -s -X POST http://localhost:8080/stops \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: test-device-001" \
  -d '{
    "client_id": "local-stop-1",
    "address": "Av. Tulum 340, SM 4, Cancún",
    "lat": 21.1619,
    "lng": -86.8515,
    "priority": "normal",
    "income": 80.0,
    "client_name": "Juan Pérez",
    "client_phone": "9981234567"
  }')
echo "CREATE STOP:" && echo $RESP | python3 -m json.tool
STOP_ID=$(echo $RESP | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Stop ID: $STOP_ID"

# Listar paradas
curl -s http://localhost:8080/stops -H "X-Device-Id: test-device-001" | python3 -m json.tool

# Completar parada
curl -s -X PATCH "http://localhost:8080/stops/$STOP_ID" \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: test-device-001" \
  -d '{"status": "completed", "completed_at": "2026-03-09T15:00:00Z", "income": 85.0}' \
  | python3 -m json.tool

# Sync batch (idempotente)
curl -s -X POST http://localhost:8080/stops/sync \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: test-device-002" \
  -d '{
    "stops": [
      {"client_id": "local-1", "address": "Av. Cobá 15", "priority": "urgent"},
      {"client_id": "local-2", "address": "Av. Yaxchilán 30", "income": 120.0}
    ],
    "stats": [
      {"stat_date": "2026-03-09", "completed": 5, "total": 8, "income": 400.0}
    ]
  }' | python3 -m json.tool
# Esperado: {"synced_stops": 2, "synced_stats": 1, "errors": []}

# Stats
curl -s "http://localhost:8080/stats?days=7" -H "X-Device-Id: test-device-002" | python3 -m json.tool

# Sin X-Device-Id → debe dar 400
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/stops
# Esperado: 400

# Sin X-Device-Id diferente → no debe ver paradas de otro device
curl -s http://localhost:8080/stops -H "X-Device-Id: otro-device"
# Esperado: []

# Eliminar parada
curl -s -o /dev/null -w "%{http_code}" -X DELETE "http://localhost:8080/stops/$STOP_ID" \
  -H "X-Device-Id: test-device-001"
# Esperado: 204

# Intentar eliminar otra vez → 404
curl -s -o /dev/null -w "%{http_code}" -X DELETE "http://localhost:8080/stops/$STOP_ID" \
  -H "X-Device-Id: test-device-001"
# Esperado: 404
```

### 3.4 Prueba de idempotencia del sync

```bash
# Enviar el mismo payload dos veces — el segundo no debe crear duplicados
PAYLOAD='{
  "stops": [{"client_id": "idem-1", "address": "Test Idempotencia"}],
  "stats": []
}'
curl -s -X POST http://localhost:8080/stops/sync \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: idem-device" \
  -d "$PAYLOAD"
# Primer sync: {"synced_stops": 1, ...}

curl -s -X POST http://localhost:8080/stops/sync \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: idem-device" \
  -d "$PAYLOAD"
# Segundo sync: {"synced_stops": 1, "errors": []} — ON CONFLICT DO NOTHING
# Verificar que solo existe 1 registro en DB:
# docker exec mr-db psql -U reparto_user -d mueve_reparto -c "SELECT count(*) FROM stops WHERE device_id='idem-device';"
# Esperado: 1
```

### 3.5 Prueba de CORS

```bash
# Desde origen permitido
curl -s -X OPTIONS http://localhost:8080/stops \
  -H "Origin: http://localhost:4321" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: X-Device-Id" \
  -v 2>&1 | grep "access-control"
# Esperado: access-control-allow-origin: http://localhost:4321

# Desde origen NO permitido
curl -s -X OPTIONS http://localhost:8080/stops \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: GET" \
  -v 2>&1 | grep "access-control"
# Esperado: SIN access-control-allow-origin (CORS bloqueado)
```

### 3.6 Prueba del frontend integrado

```bash
# Con API corriendo en puerto 8080:
cd ..  # raíz del repo
PUBLIC_API_URL=http://localhost:8080 pnpm dev

# Abrir http://localhost:4321/pedidos
# Agregar parada, completarla
# Verificar en API:
curl http://localhost:8080/stops -H "X-Device-Id: $(cat /tmp/device-id 2>/dev/null || echo 'browser-test')"
```

---

## 4. Verificaciones de calidad antes del PR

- [ ] `cargo check` sin errores de compilación
- [ ] `cargo clippy -- -D warnings` sin warnings
- [ ] Los 9 archivos creados (ver lista al inicio)
- [ ] `GET /health` → `OK` sin autenticación
- [ ] Todos los endpoints requieren `X-Device-Id` y retornan 400 sin él
- [ ] `GET /stops` solo retorna paradas del `device_id` del header (aislamiento)
- [ ] `POST /stops/sync` es idempotente (segundo sync con mismo `client_id` → no duplica)
- [ ] CORS: solo permite `ALLOWED_ORIGINS` (no `*` en producción)
- [ ] El binario escucha en `0.0.0.0:PORT` (necesario para Render)
- [ ] Las migraciones se aplican automáticamente al arrancar (`sqlx::migrate!`)
- [ ] Logs con `tracing::info/warn/error` (no `println!`)

---

## 5. Archivos de configuración a verificar/crear

### `render.yaml` (verificar que tiene el servicio API)

```yaml
services:
  - type: web
    name: mueve-reparto-api
    env: rust
    buildCommand: cd backend && cargo build --release
    startCommand: cd backend && ./target/release/mueve-reparto-api
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: mueve-reparto-db
          property: connectionString
      - key: ALLOWED_ORIGINS
        value: https://mueverepartoencancun.onrender.com
      - key: PORT
        value: 8080

  - type: web
    name: mueve-reparto-frontend
    env: node
    buildCommand: pnpm install && pnpm build
    startCommand: node ./dist/server/entry.mjs
    envVars:
      - key: NODE_VERSION
        value: 20.10.0
      - key: PUBLIC_API_URL
        fromService:
          name: mueve-reparto-api
          type: web
          property: host

databases:
  - name: mueve-reparto-db
    plan: free
```

Si `render.yaml` ya existe con contenido diferente, Jules debe **analizar las diferencias**,
no sobrescribir ciegamente. Preservar configuraciones existentes que estén correctas.

---

## 6. Entregables del PR

| Archivo | Acción |
|---------|--------|
| `backend/Cargo.toml` | Crear |
| `backend/src/main.rs` | Crear |
| `backend/src/db.rs` | Crear |
| `backend/src/models.rs` | Crear |
| `backend/src/middleware/mod.rs` | Crear |
| `backend/src/middleware/device.rs` | Crear |
| `backend/src/routes/mod.rs` | Crear |
| `backend/src/routes/stops.rs` | Crear |
| `backend/src/routes/stats.rs` | Crear |
| `render.yaml` | Verificar/completar si falta el servicio API |

**NO modificar:** `src/pages/*.astro`, `src/lib/idb.ts`, `src/lib/sync.ts`, `pnpm-lock.yaml`.

---

## 7. Mensaje de commit esperado

```
feat(P3.3): backend Rust/Axum/PostgreSQL para sync de paradas

- Cargo.toml con Axum 0.7, sqlx 0.8, tokio, tower-http CORS
- main.rs: router completo con CORS restrictivo y tracing
- db.rs: pool PostgreSQL + migraciones automáticas al arrancar
- models.rs: Stop, DailyStats, SyncPayload con serde/sqlx derives
- middleware/device.rs: extractor X-Device-Id con validación
- routes/stops.rs: GET/POST/PATCH/DELETE + POST /sync idempotente
- routes/stats.rs: GET y POST /stats con query params
- render.yaml: servicio mueve-reparto-api configurado para Render
```
