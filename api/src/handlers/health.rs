use actix_web::{get, HttpResponse, Responder};

/// Consumido por el balanceador de Render para validar disponibilidad.
#[get("/health")]
pub async fn health_check() -> impl Responder {
    HttpResponse::Ok().body("OK")
}
