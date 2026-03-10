use axum::{extract::State, http::StatusCode, Json};
use chrono::Utc;
use hex;
use jsonwebtoken::{encode, EncodingKey, Header};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use std::env;

use crate::middleware::auth::{AuthUser, Claims};

// ── DTOs ──────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct SendOtpRequest {
    /// Número en formato +521234567890 o 10 dígitos (se normaliza)
    pub phone: String,
}

#[derive(Debug, Serialize)]
pub struct SendOtpResponse {
    pub message: String,
    /// Solo en modo dev (sin Twilio) — nunca enviar en prod
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dev_code: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct VerifyOtpRequest {
    pub phone: String,
    pub code: String,
}

#[derive(Debug, Serialize)]
pub struct VerifyOtpResponse {
    pub token: String,
    pub plan: String,
    pub user_id: String,
}

#[derive(Debug, Serialize)]
pub struct MeResponse {
    pub user_id: String,
    pub phone: String,
    pub plan: String,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn normalize_phone(raw: &str) -> String {
    let digits: String = raw.chars().filter(|c| c.is_ascii_digit() || *c == '+').collect();
    // Si tiene 10 dígitos, asumir México
    if digits.len() == 10 {
        format!("+52{}", digits)
    } else if digits.starts_with("52") && digits.len() == 12 {
        format!("+{}", digits)
    } else {
        digits
    }
}

fn hash_otp(code: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(code.as_bytes());
    hex::encode(hasher.finalize())
}

fn generate_otp() -> String {
    let code: u32 = rand::thread_rng().gen_range(100_000..=999_999);
    format!("{code}")
}

fn make_jwt(user_id: &str, phone: &str, plan: &str) -> Result<String, StatusCode> {
    let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "dev_secret_change_in_prod".into());
    let exp = (Utc::now() + chrono::Duration::hours(72)).timestamp() as usize;
    let claims = Claims {
        sub: user_id.to_string(),
        phone: phone.to_string(),
        plan: plan.to_string(),
        exp,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/// POST /auth/send-otp
/// Rate limit: máx 3 intentos por hora por número.
pub async fn send_otp(
    State(pool): State<PgPool>,
    Json(body): Json<SendOtpRequest>,
) -> Result<Json<SendOtpResponse>, StatusCode> {
    let phone = normalize_phone(&body.phone);
    if phone.len() < 10 {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }

    // Rate limit: contar intentos en la última hora
    let recent: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM otp_attempts WHERE phone = $1 AND created_at > NOW() - INTERVAL '1 hour'",
    )
    .bind(&phone)
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    if recent >= 3 {
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }

    // Limpiar intentos expirados
    let _ = sqlx::query("DELETE FROM otp_attempts WHERE expires_at < NOW()")
        .execute(&pool)
        .await;

    let code = generate_otp();
    let code_hash = hash_otp(&code);

    sqlx::query(
        "INSERT INTO otp_attempts (phone, code_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '10 minutes')",
    )
    .bind(&phone)
    .bind(&code_hash)
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Twilio: enviar SMS si las variables de entorno están configuradas
    let twilio_sid = env::var("TWILIO_ACCOUNT_SID").ok();
    let twilio_token = env::var("TWILIO_AUTH_TOKEN").ok();
    let twilio_service = env::var("TWILIO_VERIFY_SERVICE_SID").ok();

    let dev_code = if twilio_sid.is_some() && twilio_token.is_some() && twilio_service.is_some() {
        // Producción: enviar vía Twilio Verify
        let client = reqwest::Client::new();
        let sid = twilio_sid.unwrap();
        let token = twilio_token.unwrap();
        let service = twilio_service.unwrap();
        let _ = client
            .post(format!(
                "https://verify.twilio.com/v2/Services/{service}/Verifications"
            ))
            .basic_auth(&sid, Some(&token))
            .form(&[("To", phone.as_str()), ("Channel", "sms")])
            .send()
            .await;
        None
    } else {
        // Modo dev: imprimir código en log y devolverlo en la respuesta
        tracing::warn!("DEV MODE — OTP para {phone}: {code}");
        Some(code)
    };

    Ok(Json(SendOtpResponse {
        message: format!("Código enviado a {phone}"),
        dev_code,
    }))
}

/// POST /auth/verify-otp
pub async fn verify_otp(
    State(pool): State<PgPool>,
    Json(body): Json<VerifyOtpRequest>,
) -> Result<Json<VerifyOtpResponse>, StatusCode> {
    let phone = normalize_phone(&body.phone);
    let code_hash = hash_otp(&body.code);

    // Buscar intento válido (no usado, no expirado)
    let attempt = sqlx::query!(
        "SELECT id FROM otp_attempts
         WHERE phone = $1 AND code_hash = $2 AND used = FALSE AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1",
        phone,
        code_hash,
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let attempt = attempt.ok_or(StatusCode::UNAUTHORIZED)?;

    // Marcar como usado
    sqlx::query("UPDATE otp_attempts SET used = TRUE WHERE id = $1")
        .bind(attempt.id)
        .execute(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Upsert usuario
    let user = sqlx::query!(
        "INSERT INTO users (phone) VALUES ($1)
         ON CONFLICT (phone) DO UPDATE SET updated_at = NOW()
         RETURNING id, plan",
        phone,
    )
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let user_id = user.id.to_string();
    let plan = user.plan;
    let token = make_jwt(&user_id, &phone, &plan)?;

    Ok(Json(VerifyOtpResponse {
        token,
        plan,
        user_id,
    }))
}

/// GET /auth/me — requiere JWT
pub async fn me(AuthUser(claims): AuthUser) -> Json<MeResponse> {
    Json(MeResponse {
        user_id: claims.sub,
        phone: claims.phone,
        plan: claims.plan,
    })
}
