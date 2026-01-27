use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Stop {
    pub id: String,
    pub nombre: String,
    pub lat: f64,
    pub lng: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Route {
    pub id: String,
    pub nombre: String,
    pub color: String,
    pub tarifa: f64,
    pub paradas: Vec<Stop>,
}

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
