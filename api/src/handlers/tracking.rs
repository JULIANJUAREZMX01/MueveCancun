use actix_web::{post, web, HttpResponse, Responder};
use sqlx::PgPool;

use crate::models::TrackingPoint;

/// POST /api/tracking — recibe coordenadas GPS del repartidor
#[post("/api/tracking")]
pub async fn record(pool: web::Data<PgPool>, body: web::Json<TrackingPoint>) -> impl Responder {
    let result = sqlx::query!(
        "INSERT INTO tracking (stop_id, lat, lng, heading, speed, recorded_at)
         VALUES ($1, $2, $3, $4, $5, $6::timestamptz)",
        body.stop_id,
        body.lat,
        body.lng,
        body.heading,
        body.speed,
        body.recorded_at,
    )
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => HttpResponse::Created().finish(),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}
