use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct Stop {
    pub name: String,
    pub lat: f64,
    pub lng: f64,
}

/// Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine.
/// Retorna la distancia en metros.
pub fn haversine_distance(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f64 {
    let r = 6371000.0; // Radio de la Tierra en metros
    let phi1 = lat1.to_radians();
    let phi2 = lat2.to_radians();
    let delta_phi = (lat2 - lat1).to_radians();
    let delta_lambda = (lng2 - lng1).to_radians();

    let a = (delta_phi / 2.0).sin().powi(2)
        + phi1.cos() * phi2.cos() * (delta_lambda / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());

    r * c
}

/// Encuentra la parada más cercana de una lista proporcionada.
pub fn find_closest_stop(user_lat: f64, user_lng: f64, stops: &[Stop]) -> Option<(Stop, f64)> {
    stops.iter()
        .map(|stop| {
            let dist = haversine_distance(user_lat, user_lng, stop.lat, stop.lng);
            (stop.clone(), dist)
        })
        .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
}
