use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use strsim::levenshtein;

#[derive(Serialize, Deserialize, Clone)]
pub struct Stop {
    name: String,
    lat: f64,
    lng: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Route {
    id: String,
    name: String,
    color: String,
    stops: Vec<Stop>,
}

#[derive(Serialize, Deserialize)]
pub struct RouteData {
    routes: Vec<Route>,
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
pub fn calculate_route(from: &str, to: &str, data: JsValue) -> JsValue {
    let route_data: RouteData = serde_wasm_bindgen::from_value(data).unwrap_or(RouteData { routes: vec![] });

    // Buscar la parada más cercana para 'from' y 'to' basándose en el nombre
    let mut best_from_stop: Option<&Stop> = None;
    let mut best_to_stop: Option<&Stop> = None;
    let mut best_from_dist = usize::MAX;
    let mut best_to_dist = usize::MAX;
    let mut best_route_id = "Desconocida".to_string();

    for route in &route_data.routes {
        for stop in &route.stops {
            let d_from = levenshtein(&stop.name.to_lowercase(), &from.to_lowercase());
            let d_to = levenshtein(&stop.name.to_lowercase(), &to.to_lowercase());

            if d_from < best_from_dist {
                best_from_dist = d_from;
                best_from_stop = Some(stop);
                best_route_id = route.id.clone();
            }
            if d_to < best_to_dist {
                best_to_dist = d_to;
                best_to_stop = Some(stop);
            }
        }
    }

    let from_name = best_from_stop.map(|s| s.name.clone()).unwrap_or(from.to_string());
    let to_name = best_to_stop.map(|s| s.name.clone()).unwrap_or(to.to_string());

    let result = RouteResult {
        route_id: best_route_id.clone(),
        total_time: 30, // Placeholder
        total_cost: 13.0,
        steps: vec![
            RouteStep {
                instruction: format!("Aborda en {} (Parada más cercana a tu búsqueda)", from_name),
                route: best_route_id.clone(),
                duration: 5,
            },
            RouteStep {
                instruction: format!("Baja en {} para llegar a tu destino", to_name),
                route: best_route_id,
                duration: 25,
            }
        ],
    };

    serde_wasm_bindgen::to_value(&result).unwrap()
}

#[wasm_bindgen]
pub fn search_destinations(_query: &str) -> JsValue {
    let results = vec!["Puerto Juárez", "Plaza Las Américas", "Coco Bongo", "Playa Delfines"];
    serde_wasm_bindgen::to_value(&results).unwrap()
}
