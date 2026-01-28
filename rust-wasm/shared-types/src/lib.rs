use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Stop {
    pub id: String,
    #[serde(rename = "nombre")]
    pub name: String,
    pub lat: f64,
    pub lng: f64,
    #[serde(rename = "orden")]
    pub order: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Route {
    pub id: String,
    #[serde(rename = "nombre")]
    pub name: String,
    pub color: String,
    #[serde(rename = "tarifa")]
    pub fare: f64,
    #[serde(rename = "paradas")]
    pub stops: Vec<Stop>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RootData {
    #[serde(rename = "rutas")]
    pub routes: Vec<Route>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DriverWallet {
    pub driver_id: String,
    pub balance_mxn: f64,
    pub last_topup: String,
    pub commission_rate: f64,
}

pub fn haversine_distance(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f64 {
    let r = 6371.0; // Earth radius in km
    let phi1 = lat1.to_radians();
    let phi2 = lat2.to_radians();
    let delta_phi = (lat2 - lat1).to_radians();
    let delta_lambda = (lng2 - lng1).to_radians();

    let a = (delta_phi / 2.0).sin().powi(2)
        + phi1.cos() * phi2.cos() * (delta_lambda / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());

    r * c
}
