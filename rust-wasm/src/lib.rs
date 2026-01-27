mod utils;

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use crate::utils::geo::{Stop, find_closest_stop};

#[derive(Serialize, Deserialize, Clone)]
pub struct RouteData {
    pub rutas: Vec<BusRoute>,
    pub destinos: Vec<Destination>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct BusRoute {
    pub id: String,
    pub nombre: String,
    pub tarifa: f64,
    pub paradas: Vec<Stop>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Destination {
    pub nombre: String,
    pub lat: f64,
    pub lng: f64,
}

#[derive(Serialize, Deserialize)]
pub struct NearestStopResult {
    pub stop: Stop,
    pub distance_meters: f64,
}

#[derive(Serialize, Deserialize)]
pub struct RouteResult {
    pub route_id: String,
    pub total_time: u32,
    pub total_cost: f64,
    pub steps: Vec<RouteStep>,
}

#[derive(Serialize, Deserialize)]
pub struct RouteStep {
    pub instruction: String,
    pub route: String,
    pub duration: u32,
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
pub fn calculate_route(from: &str, to: &str, routes_val: JsValue) -> JsValue {
    let data: RouteData = serde_wasm_bindgen::from_value(routes_val).unwrap_or(RouteData {
        rutas: vec![],
        destinos: vec![],
    });

    let from_lower = from.to_lowercase();
    let to_lower = to.to_lowercase();

    // Buscar una ruta que pase cerca de "from" y "to" (simulado por nombres de paradas)
    for ruta in data.rutas {
        let has_from = ruta.paradas.iter().any(|p| p.nombre.to_lowercase().contains(&from_lower));
        let has_to = ruta.paradas.iter().any(|p| p.nombre.to_lowercase().contains(&to_lower));

        if has_from && has_to {
            let result = RouteResult {
                route_id: ruta.id.clone(),
                total_time: 25, // Estimado
                total_cost: ruta.tarifa,
                steps: vec![
                    RouteStep {
                        instruction: format!("Toma la ruta {} desde {}", ruta.nombre, from),
                        route: ruta.id,
                        duration: 25,
                    }
                ],
            };
            return serde_wasm_bindgen::to_value(&result).unwrap();
        }
    }

    // Fallback si no encuentra coincidencia exacta
    let result = RouteResult {
        route_id: "R1".to_string(),
        total_time: 25,
        total_cost: 13.0,
        steps: vec![
            RouteStep {
                instruction: format!("No se encontró coincidencia exacta. Sugerencia: Toma R1 desde {}", from),
                route: "R1".to_string(),
                duration: 25,
            }
        ],
    };

    serde_wasm_bindgen::to_value(&result).unwrap()
}

#[wasm_bindgen]
pub fn search_destinations(query: &str, routes_val: JsValue) -> JsValue {
    let data: RouteData = serde_wasm_bindgen::from_value(routes_val).unwrap_or(RouteData {
        rutas: vec![],
        destinos: vec![],
    });

    let query_lower = query.to_lowercase();
    let mut results = Vec::new();

    // Buscar en destinos
    for dest in data.destinos {
        if dest.nombre.to_lowercase().contains(&query_lower) {
            results.push(dest.nombre);
        }
    }

    // Buscar en paradas de rutas
    for ruta in data.rutas {
        for parada in ruta.paradas {
            if parada.nombre.to_lowercase().contains(&query_lower) && !results.contains(&parada.nombre) {
                results.push(parada.nombre);
            }
        }
    }

    results.truncate(5);
    serde_wasm_bindgen::to_value(&results).unwrap()
}
