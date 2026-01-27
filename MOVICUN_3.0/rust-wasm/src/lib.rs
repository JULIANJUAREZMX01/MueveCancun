use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

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
