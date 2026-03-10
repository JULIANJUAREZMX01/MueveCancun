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

fn default_days() -> i32 {
    7
}

/// GET /stats?days=7 — Estadísticas de los últimos N días (máx 90)
pub async fn get_stats(
    DeviceId(device_id): DeviceId,
    State(pool): State<PgPool>,
    Query(q): Query<StatsQuery>,
) -> Result<Json<Vec<DailyStats>>, StatusCode> {
    let days = q.days.clamp(1, 90);

    sqlx::query_as::<_, DailyStats>(
        r#"
        SELECT id, device_id, stat_date, completed, total,
               income, distance_km, duration_min
        FROM daily_stats
        WHERE device_id = $1
          AND stat_date >= CURRENT_DATE - ($2::integer * INTERVAL '1 day')
        ORDER BY stat_date DESC
        "#,
    )
    .bind(&device_id)
    .bind(days)
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

    sqlx::query_as::<_, DailyStats>(
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
    )
    .bind(&device_id)
    .bind(body.stat_date)
    .bind(body.completed)
    .bind(body.total)
    .bind(body.income)
    .bind(body.distance_km)
    .bind(body.duration_min)
    .fetch_one(&pool)
    .await
    .map(Json)
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}
