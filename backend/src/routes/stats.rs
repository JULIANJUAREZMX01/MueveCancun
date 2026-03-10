use axum::{extract::State, http::StatusCode, Json};
use chrono::Utc;
use sqlx::PgPool;

use crate::{middleware::auth::AuthUser, models::DailyStats};

pub async fn get_daily_stats(
    AuthUser { user_id }: AuthUser,
    State(pool): State<PgPool>,
) -> Result<Json<DailyStats>, StatusCode> {
    let today = Utc::now().date_naive();

    // Si no hay stats, devolvemos stats en 0.
    // Opcionalmente podemos crearlo aquí.
    let stat = sqlx::query_as!(
        DailyStats,
        r#"
        SELECT id, user_id, date, deliveries, income, goal, created_at
        FROM daily_stats
        WHERE user_id = $1 AND date = $2
        "#,
        user_id,
        today
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match stat {
        Some(s) => Ok(Json(s)),
        None => {
            // Devolver objeto por defecto (sin insertarlo necesariamente)
            Ok(Json(DailyStats {
                id: uuid::Uuid::new_v4(),
                user_id,
                date: today,
                deliveries: 0,
                income: 0.0,
                goal: None,
                created_at: Utc::now(),
            }))
        }
    }
}
