use axum::{extract::State, http::StatusCode, Json};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{AuthResponse, OtpRequest, OtpVerify};
use crate::middleware::auth::create_token;

pub async fn request_otp(
    State(_pool): State<PgPool>,
    Json(payload): Json<OtpRequest>,
) -> Result<StatusCode, StatusCode> {
    // Stub: En un sistema real, aquí llamarías a Twilio/WhatsApp API.
    tracing::info!("OTP requested for phone: {}", payload.phone);
    Ok(StatusCode::OK)
}

pub async fn verify_otp(
    State(pool): State<PgPool>,
    Json(payload): Json<OtpVerify>,
) -> Result<Json<AuthResponse>, StatusCode> {
    // Stub: asumimos que el código es siempre válido para este demo
    // En un caso real, validaríamos contra Redis o la BD.
    tracing::info!("OTP verified for phone: {}, code: {}", payload.phone, payload.code);

    let user_id = match sqlx::query!(
        "SELECT id FROM users WHERE phone = $1",
        payload.phone
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    {
        Some(record) => record.id,
        None => {
            // Register new user
            let new_user = sqlx::query!(
                "INSERT INTO users (phone) VALUES ($1) RETURNING id",
                payload.phone
            )
            .fetch_one(&pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            new_user.id
        }
    };

    let token = create_token(user_id).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(AuthResponse { token }))
}
