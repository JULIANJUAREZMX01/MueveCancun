use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Delivery {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub address: String,
    pub lat: Option<f64>,
    pub lng: Option<f64>,
    pub status: String,       // pending | in_route | delivered | failed
    pub priority: String,     // normal | urgent
    pub sequence: Option<i32>,
    pub tracking_token: Option<String>,
    pub recipient_phone: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDelivery {
    pub address: String,
    pub lat: f64,
    pub lng: f64,
    pub priority: Option<String>,
    pub recipient_phone: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateStatus {
    pub status: String,
    pub sequence: Option<i32>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TrackingPoint {
    pub stop_id: Uuid,
    pub lat: f64,
    pub lng: f64,
    pub heading: Option<f64>,
    pub speed: Option<f64>,
    pub recorded_at: String,
}
