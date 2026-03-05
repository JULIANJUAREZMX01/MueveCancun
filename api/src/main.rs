use actix_cors::Cors;
use actix_web::{middleware, web, App, HttpServer};
use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use std::env;

mod handlers;
mod models;

#[tokio::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let port: u16 = env::var("PORT")
        .unwrap_or_else(|_| "8080".into())
        .parse()
        .expect("PORT must be a number");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    // Run migrations on startup
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    println!("Mueve Reparto API listening on :{port}");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin_fn(|origin, _| {
                origin.as_bytes().ends_with(b".onrender.com")
                    || origin == "http://localhost:4321"
            })
            .allowed_methods(vec!["GET", "POST", "PATCH"])
            .allowed_header("Content-Type")
            .max_age(3600);

        App::new()
            .app_data(web::Data::new(pool.clone()))
            .wrap(cors)
            .wrap(middleware::Logger::default())
            .service(handlers::health::health_check)
            .service(handlers::deliveries::list)
            .service(handlers::deliveries::create)
            .service(handlers::deliveries::update_status)
            .service(handlers::tracking::record)
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}
