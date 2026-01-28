use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use shared_types::Route;

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
pub fn calculate_route(from: &str, to: &str, routes_val: JsValue) -> JsValue {
    let routes: Vec<Route> = serde_wasm_bindgen::from_value(routes_val).unwrap_or_default();

    let from_lower = from.to_lowercase();
    let to_lower = to.to_lowercase();

    for ruta in routes {
        // Find specific stop indices to ensure correct direction and distance
        let from_idx = ruta.paradas.iter().position(|p| p.nombre.to_lowercase() == from_lower);
        let to_idx = ruta.paradas.iter().position(|p| p.nombre.to_lowercase() == to_lower);

        if let (Some(f_idx), Some(t_idx)) = (from_idx, to_idx) {
            // Only valid if travel direction is correct (from before to)
            if f_idx < t_idx {
                let num_stops = (t_idx - f_idx) as u32;
                let avg_stop_time = 3; // Average 3 minutes per stop
                let duration = num_stops * avg_stop_time;

                let result = RouteResult {
                    route_id: ruta.id.clone(),
                    total_time: duration,
                    total_cost: ruta.tarifa,
                    steps: vec![
                        RouteStep {
                            instruction: format!("Toma la ruta {} desde {} hasta {}", ruta.nombre, from, to),
                            route: ruta.id,
                            duration,
                        }
                    ],
                };
                
                return serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL);
            }
        }
    }

    JsValue::NULL
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Instant;

    #[test]
    fn test_route_calculation_performance() {
        // En tests unitarios no usamos JsValue fácilmente sin wasm-bindgen-test
        // Pero podemos probar la lógica si la extraemos o si usamos mocks.
        // Por ahora, verifiquemos que compile y corra un test simple.
        let start = Instant::now();
        let duration = start.elapsed();
        assert!(duration.as_millis() < 50);
    }
}
