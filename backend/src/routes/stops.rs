use axum::{extract::State, http::StatusCode, Json};
use sqlx::PgPool;

use crate::{middleware::auth::AuthUser, models::{Stop, SyncPayload, SyncResponse}};

pub async fn list_stops(
    AuthUser { user_id }: AuthUser,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<Stop>>, StatusCode> {
    sqlx::query_as!(
        Stop,
        r#"
        SELECT id, user_id, address, client_name, phone, notes, lat, lng, status, income, created_at, completed_at
        FROM stops
        WHERE user_id = $1
        "#,
        user_id
    )
    .fetch_all(&pool)
    .await
    .map(Json)
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn sync_stops(
    AuthUser { user_id }: AuthUser,
    State(pool): State<PgPool>,
    Json(payload): Json<SyncPayload>,
) -> Result<Json<SyncResponse>, StatusCode> {
    let mut synced_stops = 0;
    let mut errors = Vec::new();

    for stop in payload.stops {
        let res = sqlx::query!(
            r#"
            INSERT INTO stops (id, user_id, address, client_name, phone, notes, lat, lng, status, income, created_at, completed_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'pending'), $10, COALESCE($11, NOW()), $12)
            ON CONFLICT (id) DO UPDATE SET
                status = EXCLUDED.status,
                completed_at = EXCLUDED.completed_at,
                notes = EXCLUDED.notes,
                income = EXCLUDED.income
            "#,
            stop.id,
            user_id,
            stop.address,
            stop.client_name,
            stop.phone,
            stop.notes,
            stop.lat,
            stop.lng,
            stop.status,
            stop.income,
            stop.created_at,
            stop.completed_at
        )
        .execute(&pool)
        .await;

        match res {
            Ok(_) => synced_stops += 1,
            Err(e) => errors.push(format!("Error syncing stop {}: {}", stop.id, e)),
        }
    }

    Ok(Json(SyncResponse {
        synced_stops,
        errors,
    }))
}
