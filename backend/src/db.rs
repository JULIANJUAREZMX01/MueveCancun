use anyhow::Result;
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::env;

pub async fn create_pool() -> Result<PgPool> {
    let url = env::var("DATABASE_URL").expect("DATABASE_URL debe estar configurada");

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .min_connections(2)
        .acquire_timeout(std::time::Duration::from_secs(5))
        .connect(&url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;
    tracing::info!("Base de datos conectada y migraciones aplicadas");

    Ok(pool)
}

pub async fn upsert_device(pool: &PgPool, device_id: &str) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO devices (device_id)
        VALUES ($1)
        ON CONFLICT (device_id) DO UPDATE SET last_seen = NOW()
        "#,
    )
    .bind(device_id)
    .execute(pool)
    .await?;
    Ok(())
}
