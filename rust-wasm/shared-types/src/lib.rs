use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Default)]
pub enum TransportType {
    // Legacy Variants (Keep for compatibility)
    #[serde(rename = "Bus_HotelZone")]
    BusHotelZone,
    #[serde(rename = "Bus_Urban")]
    #[default]
    BusUrban,
    #[serde(rename = "Bus_Urbano")]
    BusUrbano,
    #[serde(rename = "Combi_Municipal")]
    CombiMunicipal,
    #[serde(rename = "Playa_Express", alias = "PlayaExpress")]
    PlayaExpress,
    #[serde(rename = "ADO_Airport")]
    AdoAirport,
    #[serde(rename = "Bus_Foraneo")]
    BusForaneo,
    #[serde(rename = "Van_Foranea")]
    VanForanea,
    // Generic Variants
    #[serde(rename = "Bus")]
    Bus,
    #[serde(rename = "Combi")]
    Combi,
    #[serde(rename = "Van")]
    Van,
    #[serde(rename = "ADO")]
    ADO,
    // === NEW MULTIMODAL VARIANTS ===
    #[serde(rename = "MotorTaxi")]
    MotorTaxi,
    #[serde(rename = "Bicicleta")]
    Bicicleta,
    #[serde(rename = "Caminata")]
    Caminata,
    #[serde(rename = "Indriver")]
    Indriver,
    #[serde(rename = "Uber")]
    Uber,
    #[serde(rename = "Ferry")]
    Ferry,
}

impl TransportType {
    /// Average speed in km/h for ETA estimation
    pub fn avg_speed_kmh(&self) -> f64 {
        match self {
            TransportType::Bus | TransportType::BusUrban | TransportType::BusUrbano
            | TransportType::BusHotelZone | TransportType::BusForaneo => 22.0,
            TransportType::Combi | TransportType::CombiMunicipal => 28.0,
            TransportType::Van | TransportType::VanForanea => 35.0,
            TransportType::ADO | TransportType::AdoAirport => 55.0,
            TransportType::PlayaExpress => 45.0,
            TransportType::MotorTaxi => 30.0,
            TransportType::Bicicleta => 15.0,
            TransportType::Caminata => 5.0,
            TransportType::Indriver | TransportType::Uber => 40.0,
            TransportType::Ferry => 25.0,
        }
    }

    /// CO2 grams per passenger per km
    pub fn co2_per_km(&self) -> f64 {
        match self {
            TransportType::Bus | TransportType::BusUrban | TransportType::BusUrbano
            | TransportType::BusHotelZone | TransportType::BusForaneo => 18.0,
            TransportType::Combi | TransportType::CombiMunicipal => 35.0,
            TransportType::Van | TransportType::VanForanea => 45.0,
            TransportType::ADO | TransportType::AdoAirport => 25.0,
            TransportType::PlayaExpress => 20.0,
            TransportType::MotorTaxi => 60.0,
            TransportType::Bicicleta => 0.0,
            TransportType::Caminata => 0.0,
            TransportType::Indriver | TransportType::Uber => 130.0,
            TransportType::Ferry => 50.0,
        }
    }

    /// Base fare in MXN
    pub fn base_fare(&self) -> f64 {
        match self {
            TransportType::Bus | TransportType::BusUrban | TransportType::BusUrbano
            | TransportType::BusHotelZone | TransportType::CombiMunicipal => 14.0,
            TransportType::Combi => 14.0,
            TransportType::Van | TransportType::VanForanea => 25.0,
            TransportType::ADO => 42.0,
            TransportType::AdoAirport => 65.0,
            TransportType::PlayaExpress => 25.0,
            TransportType::BusForaneo => 35.0,
            TransportType::MotorTaxi => 20.0,
            TransportType::Bicicleta => 0.0,
            TransportType::Caminata => 0.0,
            TransportType::Indriver => 45.0,
            TransportType::Uber => 55.0,
            TransportType::Ferry => 35.0,
        }
    }
}

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
    #[serde(rename = "tipo_transporte")]
    pub transport_type: TransportType,
    #[serde(rename = "paradas")]
    pub stops: Vec<Stop>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RootData {
    #[serde(rename = "rutas")]
    pub routes: Vec<Route>,
}

/// Haversine distance in meters between two lat/lng points
pub fn haversine_distance(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f64 {
    const R: f64 = 6_371_000.0; // Earth radius in meters
    let phi1 = lat1.to_radians();
    let phi2 = lat2.to_radians();
    let dphi = (lat2 - lat1).to_radians();
    let dlambda = (lng2 - lng1).to_radians();
    let a = (dphi / 2.0).sin().powi(2)
        + phi1.cos() * phi2.cos() * (dlambda / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
    R * c
}

/// Traffic congestion multiplier (1.0 = free flow, 3.0 = heavy traffic)
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TrafficConditions {
    pub congestion_factor: f64,  // 1.0 to 3.0
    pub rain_factor: f64,        // 1.0 to 1.5
    pub is_rush_hour: bool,
    pub hour: u8,
}

impl TrafficConditions {
    pub fn free_flow() -> Self {
        Self { congestion_factor: 1.0, rain_factor: 1.0, is_rush_hour: false, hour: 12 }
    }

    pub fn total_delay_factor(&self) -> f64 {
        self.congestion_factor * self.rain_factor
    }

    /// Estimate conditions from hour of day (Cancún patterns)
    pub fn from_hour(hour: u8) -> Self {
        let (congestion, is_rush) = match hour {
            7..=9 => (2.2, true),   // morning rush
            13..=14 => (1.5, false), // lunch
            17..=19 => (2.5, true), // evening rush — worst in Cancún
            20..=23 => (1.2, false),
            0..=5 => (1.0, false),
            _ => (1.1, false),
        };
        Self { congestion_factor: congestion, rain_factor: 1.0, is_rush_hour: is_rush, hour }
    }
}
