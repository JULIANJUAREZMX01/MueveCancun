use axum::{
    http::{HeaderName, HeaderValue, Method},
    routing::{delete, get, patch, post},
    Router,
};
use std::{env, net::SocketAddr};
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod db;
mod middleware;
mod models;
mod routes;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,mueve_reparto_api=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let pool = db::create_pool().await?;

    let allowed_origin = env::var("ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "https://mueverepartoencancun.onrender.com".to_string());

    let cors = CorsLayer::new()
        .allow_origin(allowed_origin.parse::<HeaderValue>()?)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            HeaderName::from_static("content-type"),
            HeaderName::from_static("x-device-id"),
        ]);

    let app = Router::new()
        .route("/health", get(|| async { "OK" }))
        .route("/stops", get(routes::stops::list_stops))
        .route("/stops", post(routes::stops::create_stop))
        .route("/stops/sync", post(routes::stops::sync_stops))
        .route("/stops/:id", patch(routes::stops::update_stop))
        .route("/stops/:id", delete(routes::stops::delete_stop))
        .route("/stats", get(routes::stats::get_stats))
        .route("/stats", post(routes::stats::upsert_stats))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(pool);

    let port = env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()?;

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Mueve Reparto API escuchando en {addr}");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
