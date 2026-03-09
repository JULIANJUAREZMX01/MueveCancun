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
