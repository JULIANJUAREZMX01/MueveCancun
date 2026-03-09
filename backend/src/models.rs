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
