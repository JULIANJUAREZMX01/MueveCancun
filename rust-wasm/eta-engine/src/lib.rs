//! ETA Engine — Real-time arrival estimation for ¿Qué Ruta Me Lleva?
//! 
//! Computes ETAs using haversine distances, transport speeds,
//! traffic congestion factors, and rain penalties.
//! Runs 100% on-device via WASM — no network calls required for estimation.

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use shared_types::{haversine_distance, TransportType, TrafficConditions};

#[derive(Serialize, Deserialize, Debug)]
pub struct EtaInput {
    /// Ordered list of stop coordinates for the journey segment
    pub stops: Vec<[f64; 2]>,  // [lat, lng]
    /// Transport type identifier
    pub transport_type: String,
    /// Current traffic conditions (optional — defaults to from_hour)
    pub traffic: Option<TrafficConditions>,
    /// Hour of day (0-23) for auto-traffic estimation
    pub hour: Option<u8>,
    /// How many stops remain in journey
    pub stops_remaining: Option<u32>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct EtaResult {
    /// Estimated travel time in minutes
    pub minutes: f64,
    /// Total distance in km
    pub distance_km: f64,
    /// Effective speed used (km/h, after traffic)
    pub effective_speed_kmh: f64,
    /// Congestion factor applied
    pub congestion_factor: f64,
    /// Rain penalty applied
    pub rain_factor: f64,
    /// Human-readable label: "~12 min"
    pub label: String,
    /// Confidence level: "high" | "medium" | "low"
    pub confidence: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MultiModalLeg {
    pub mode: String,
    pub minutes: f64,
    pub distance_km: f64,
    pub fare_mxn: f64,
    pub co2_grams: f64,
    pub label: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MultiModalPlan {
    pub legs: Vec<MultiModalLeg>,
    pub total_minutes: f64,
    pub total_fare_mxn: f64,
    pub total_co2_grams: f64,
    pub summary: String,
    pub eco_score: u8,  // 0-100, higher = greener
    pub budget_score: u8,  // 0-100, higher = cheaper
}

fn parse_transport(s: &str) -> TransportType {
    match s {
        "Bus" | "Bus_Urban" | "Bus_Urbano" | "BusUrban" => TransportType::Bus,
        "Bus_HotelZone" | "BusHotelZone" => TransportType::BusHotelZone,
        "Combi" | "Combi_Municipal" => TransportType::Combi,
        "Van" | "Van_Foranea" => TransportType::Van,
        "ADO" => TransportType::ADO,
        "ADO_Airport" | "AdoAirport" => TransportType::AdoAirport,
        "PlayaExpress" | "Playa_Express" => TransportType::PlayaExpress,
        "MotorTaxi" => TransportType::MotorTaxi,
        "Bicicleta" => TransportType::Bicicleta,
        "Caminata" => TransportType::Caminata,
        "Indriver" => TransportType::Indriver,
        "Uber" => TransportType::Uber,
        "Ferry" => TransportType::Ferry,
        _ => TransportType::Bus,
    }
}

/// Compute ETA for a transit leg
#[wasm_bindgen]
pub fn compute_eta(input_js: JsValue) -> JsValue {
    let input: EtaInput = match serde_wasm_bindgen::from_value(input_js) {
        Ok(v) => v,
        Err(e) => {
            let err = format!("{{\"error\": \"Invalid input: {}\"}}", e);
            return JsValue::from_str(&err);
        }
    };

    // Calculate total distance along the route
    let distance_m: f64 = input.stops.windows(2)
        .map(|w| haversine_distance(w[0][0], w[0][1], w[1][0], w[1][1]))
        .sum();
    let distance_km = distance_m / 1000.0;

    // Get transport characteristics
    let transport = parse_transport(&input.transport_type);
    let base_speed = transport.avg_speed_kmh();

    // Get traffic conditions
    let traffic = input.traffic.unwrap_or_else(|| {
        let hour = input.hour.unwrap_or(12);
        TrafficConditions::from_hour(hour)
    });

    let delay = traffic.total_delay_factor();
    let effective_speed = base_speed / delay;

    // Core ETA calculation: time = distance / speed
    let hours = distance_km / effective_speed;
    let mut minutes = hours * 60.0;

    // Add dwell time per stop (average 30 seconds per stop)
    let stop_count = input.stops_remaining.unwrap_or(input.stops.len() as u32);
    minutes += (stop_count as f64) * 0.5;

    // Confidence based on data quality
    let confidence = if distance_km > 0.1 && input.stops.len() > 2 {
        if traffic.is_rush_hour { "medium" } else { "high" }
    } else {
        "low"
    };

    let label = if minutes < 1.0 {
        "< 1 min".to_string()
    } else if minutes < 60.0 {
        format!("~{} min", minutes.round() as u32)
    } else {
        let h = (minutes / 60.0).floor() as u32;
        let m = (minutes % 60.0).round() as u32;
        format!("~{}h {}min", h, m)
    };

    let result = EtaResult {
        minutes,
        distance_km,
        effective_speed_kmh: effective_speed,
        congestion_factor: traffic.congestion_factor,
        rain_factor: traffic.rain_factor,
        label,
        confidence: confidence.to_string(),
    };

    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}

/// Plan a multimodal journey with cost, time, and carbon breakdown
#[wasm_bindgen]
pub fn plan_multimodal(legs_js: JsValue, hour: u8) -> JsValue {
    // legs_js: Array of {mode: string, stops: [[lat,lng],...]}
    let legs_raw: Vec<serde_json::Value> = match serde_wasm_bindgen::from_value(legs_js) {
        Ok(v) => v,
        Err(_) => return JsValue::NULL,
    };

    let traffic = TrafficConditions::from_hour(hour);
    let mut plan_legs: Vec<MultiModalLeg> = Vec::new();

    for leg_val in &legs_raw {
        let mode_str = leg_val["mode"].as_str().unwrap_or("Bus");
        let transport = parse_transport(mode_str);

        let stops: Vec<[f64; 2]> = leg_val["stops"]
            .as_array()
            .map(|arr| {
                arr.iter().filter_map(|s| {
                    let lat = s[0].as_f64()?;
                    let lng = s[1].as_f64()?;
                    Some([lat, lng])
                }).collect()
            })
            .unwrap_or_default();

        let distance_m: f64 = stops.windows(2)
            .map(|w| haversine_distance(w[0][0], w[0][1], w[1][0], w[1][1]))
            .sum();
        let distance_km = distance_m / 1000.0;

        let base_speed = transport.avg_speed_kmh();
        let delay = traffic.total_delay_factor();
        let effective_speed = base_speed / delay;
        let minutes = (distance_km / effective_speed) * 60.0 + (stops.len() as f64 * 0.5);

        let fare = transport.base_fare();
        let co2 = transport.co2_per_km() * distance_km;

        let label = format!("{} ~{} min {:.1} km ${:.0}",
            mode_str, minutes.round() as u32, distance_km, fare);

        plan_legs.push(MultiModalLeg {
            mode: mode_str.to_string(),
            minutes,
            distance_km,
            fare_mxn: fare,
            co2_grams: co2,
            label,
        });
    }

    let total_minutes: f64 = plan_legs.iter().map(|l| l.minutes).sum();
    let total_fare: f64 = plan_legs.iter().map(|l| l.fare_mxn).sum();
    let total_co2: f64 = plan_legs.iter().map(|l| l.co2_grams).sum();

    // Eco score: 100 = zero emissions, 0 = very polluting
    let eco_score = (100.0 - (total_co2 / 5.0).min(100.0)) as u8;

    // Budget score: 100 = free, 0 = expensive
    let budget_score = (100.0 - (total_fare / 2.0).min(100.0)) as u8;

    let summary = format!(
        "{} min · ${:.0} MXN · {}g CO₂",
        total_minutes.round() as u32,
        total_fare,
        total_co2.round() as u32
    );

    let plan = MultiModalPlan {
        legs: plan_legs,
        total_minutes,
        total_fare_mxn: total_fare,
        total_co2_grams: total_co2,
        summary,
        eco_score,
        budget_score,
    };

    serde_wasm_bindgen::to_value(&plan).unwrap_or(JsValue::NULL)
}

/// Quick ETA from two coordinates and transport type
#[wasm_bindgen]
pub fn quick_eta(
    from_lat: f64, from_lng: f64,
    to_lat: f64, to_lng: f64,
    transport_type: &str,
    hour: u8
) -> JsValue {
    let distance_m = haversine_distance(from_lat, from_lng, to_lat, to_lng);
    let distance_km = distance_m / 1000.0;
    let transport = parse_transport(transport_type);
    let traffic = TrafficConditions::from_hour(hour);
    let effective_speed = transport.avg_speed_kmh() / traffic.total_delay_factor();
    let minutes = (distance_km / effective_speed) * 60.0;

    let label = if minutes < 60.0 {
        format!("~{} min", minutes.round() as u32)
    } else {
        format!("~{:.0}h", minutes / 60.0)
    };

    let result = EtaResult {
        minutes,
        distance_km,
        effective_speed_kmh: effective_speed,
        congestion_factor: traffic.congestion_factor,
        rain_factor: traffic.rain_factor,
        label,
        confidence: "medium".to_string(),
    };

    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}
