use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub phone: String,
    pub plan: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Stop {
    pub id: String,
    pub user_id: Uuid,
    pub address: String,
    pub client_name: Option<String>,
    pub phone: Option<String>,
    pub notes: Option<String>,
    pub lat: Option<f64>,
    pub lng: Option<f64>,
    pub status: String,
    pub income: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateStop {
    pub id: String,
    pub address: String,
    pub client_name: Option<String>,
    pub phone: Option<String>,
    pub notes: Option<String>,
    pub lat: Option<f64>,
    pub lng: Option<f64>,
    pub status: Option<String>,
    pub income: Option<f64>,
    pub created_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct DailyStats {
    pub id: Uuid,
    pub user_id: Uuid,
    pub date: NaiveDate,
    pub deliveries: i32,
    pub income: f64,
    pub goal: Option<f64>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct SyncPayload {
    pub stops: Vec<CreateStop>,
}

#[derive(Debug, Serialize)]
pub struct SyncResponse {
    pub synced_stops: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct OtpRequest {
    pub phone: String,
}

#[derive(Debug, Deserialize)]
pub struct OtpVerify {
    pub phone: String,
    pub code: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
}
