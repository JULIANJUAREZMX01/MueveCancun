mod utils;

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use crate::utils::geo::{Stop, find_closest_stop};

#[derive(Serialize, Deserialize)]
pub struct NearestStopResult {
    pub stop: Stop,
    pub distance_meters: f64,
}

#[derive(Serialize, Deserialize)]
pub struct RouteResult {
    route_id: String,
    total_time: u32,
    total_cost: f64,
    steps: Vec<RouteStep>,
}

#[derive(Serialize, Deserialize)]
pub struct RouteStep {
    instruction: String,
    route: String,
    duration: u32,
}

#[wasm_bindgen]
pub fn find_nearest_stop(user_lat: f64, user_lng: f64, stops_val: JsValue) -> JsValue {
    let stops: Vec<Stop> = serde_wasm_bindgen::from_value(stops_val).unwrap_or_default();

    if let Some((stop, dist)) = find_closest_stop(user_lat, user_lng, &stops) {
        let result = NearestStopResult {
            stop,
            distance_meters: dist,
        };
        serde_wasm_bindgen::to_value(&result).unwrap()
    } else {
        JsValue::NULL
    }
}

#[wasm_bindgen]
pub fn calculate_route(from: &str, to: &str) -> JsValue {
    // Algoritmo simplificado (placeholder)
    let result = RouteResult {
        route_id: "R1".to_string(),
        total_time: 25,
        total_cost: 13.0,
        steps: vec![
            RouteStep {
                instruction: format!("Toma la ruta R1 desde {}", from),
                route: "R1".to_string(),
                duration: 25,
            }
        ],
    };

    serde_wasm_bindgen::to_value(&result).unwrap()
}

#[wasm_bindgen]
pub fn search_destinations(_query: &str) -> JsValue {
    // Búsqueda fuzzy (placeholder)
    let results = vec!["Coco Bongo", "Parque La Rehoyada", "Zona Hotelera"];
    serde_wasm_bindgen::to_value(&results).unwrap()
}
