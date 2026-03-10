use anyhow::Result;
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::env;

pub async fn create_pool() -> Result<PgPool> {
    let url = env::var("DATABASE_URL")
        .expect("DATABASE_URL debe estar configurada");

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&url)
        .await?;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;

    Ok(pool)
}
