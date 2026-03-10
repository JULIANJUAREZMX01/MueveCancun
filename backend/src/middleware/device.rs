use axum::{
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
};

/// Extrae el header X-Device-Id y lo valida.
/// Sin este header → 400 Bad Request.
#[derive(Clone, Debug)]
pub struct DeviceId(pub String);

#[axum::async_trait]
impl<S: Send + Sync> FromRequestParts<S> for DeviceId {
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let id = parts
            .headers
            .get("x-device-id")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty() && s.len() <= 64)
            .ok_or((
                StatusCode::BAD_REQUEST,
                "Header X-Device-Id requerido (max 64 chars)",
            ))?;

        Ok(DeviceId(id))
    }
}
