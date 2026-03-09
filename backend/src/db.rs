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

    // Migraciones embebidas en el binario en tiempo de compilación
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;

    Ok(pool)
}

/// Registra el dispositivo si no existe, actualiza last_seen si ya existe.
pub async fn upsert_device(pool: &PgPool, device_id: &str) -> Result<()> {
    sqlx::query!(
        r#"
        INSERT INTO devices (device_id)
        VALUES ($1)
        ON CONFLICT (device_id) DO UPDATE SET last_seen = NOW()
        "#,
        device_id
    )
    .execute(pool)
    .await?;
    Ok(())
}
