use actix_web::{get, patch, post, web, HttpResponse, Responder};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{CreateDelivery, UpdateStatus};

/// GET /api/deliveries — lista todas las entregas del dia
#[get("/api/deliveries")]
pub async fn list(pool: web::Data<PgPool>) -> impl Responder {
    let rows = sqlx::query!(
        "SELECT id, address, lat, lng, status, priority, sequence, tracking_token, recipient_phone, created_at
         FROM deliveries
         WHERE created_at::date = CURRENT_DATE
         ORDER BY COALESCE(sequence, 9999), created_at"
    )
    .fetch_all(pool.get_ref())
    .await;

    match rows {
        Ok(rows) => HttpResponse::Ok().json(rows),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

/// POST /api/deliveries — crea una nueva entrega
#[post("/api/deliveries")]
pub async fn create(pool: web::Data<PgPool>, body: web::Json<CreateDelivery>) -> impl Responder {
    let token = Uuid::new_v4().to_string().replace('-', "")[..12].to_string();

    let row = sqlx::query!(
        "INSERT INTO deliveries (id, address, lat, lng, priority, tracking_token, recipient_phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id",
        Uuid::new_v4(),
        body.address,
        body.lat,
        body.lng,
        body.priority.as_deref().unwrap_or("normal"),
        token,
        body.recipient_phone,
    )
    .fetch_one(pool.get_ref())
    .await;

    match row {
        Ok(r) => HttpResponse::Created().json(serde_json::json!({ "id": r.id })),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

/// PATCH /api/deliveries/{id}/status — actualiza estado de entrega
#[patch("/api/deliveries/{id}/status")]
pub async fn update_status(
    pool: web::Data<PgPool>,
    path: web::Path<Uuid>,
    body: web::Json<UpdateStatus>,
) -> impl Responder {
    let id = path.into_inner();
    let result = sqlx::query!(
        "UPDATE deliveries SET status = $1, sequence = COALESCE($2, sequence) WHERE id = $3",
        body.status,
        body.sequence,
        id,
    )
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => HttpResponse::NoContent().finish(),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}
