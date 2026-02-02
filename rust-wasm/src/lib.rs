mod utils;
mod models;

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use crate::utils::geo::{Stop, find_closest_stop};
use crate::models::MasterRoutes;

#[derive(Serialize, Deserialize)]
pub struct NearestStopResult {
    pub stop: Stop,
    pub distance_meters: f64,
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub struct RouteResult {
    pub route_id: String,
    pub total_time: u32,
    pub total_cost: f64,
    pub steps: Vec<RouteStep>,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
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

// Internal function to calculate route
pub fn calculate_route(from: &str, to: &str, data: &MasterRoutes) -> Option<RouteResult> {
    let from_lower = from.to_lowercase();
    let to_lower = to.to_lowercase();

    // Helper to find stop ID from name (checking destinations and stops)
    let find_stop_id = |name: &str| -> Option<String> {
        // Check destinations
        if let Some(dest) = data.destinos.iter().find(|d| d.name.to_lowercase().contains(name)) {
            return Some(dest.parada_cercana.clone());
        }
        // Check stops in all routes
        for route in &data.rutas {
            if let Some(stop) = route.paradas.iter().find(|s| s.name.to_lowercase().contains(name)) {
                return Some(stop.id.clone());
            }
        }
        None
    };

    let start_stop_id = find_stop_id(&from_lower)?;
    let end_stop_id = find_stop_id(&to_lower)?;

    if start_stop_id == end_stop_id {
        return None; // Same start and end
    }

    // Search for a route containing both stops
    for route in &data.rutas {
        let start_idx = route.paradas.iter().position(|s| s.id == start_stop_id);
        let end_idx = route.paradas.iter().position(|s| s.id == end_stop_id);

        if let (Some(s_idx), Some(e_idx)) = (start_idx, end_idx) {
            // Check direction (assuming strictly ordered stops for now)
            if s_idx < e_idx {
                let start_stop = &route.paradas[s_idx];
                let end_stop = &route.paradas[e_idx];

                // Calculate estimated time: (end_idx - start_idx) * time_per_stop
                // Assuming ~3 minutes per stop for estimation.
                let stops_count = (e_idx - s_idx) as u32;
                let duration = stops_count * 3;

                let steps = vec![
                    RouteStep {
                        instruction: format!("Aborda la ruta {} ({}) en {}", route.id, route.nombre, start_stop.name),
                        route: route.id.clone(),
                        duration: 0,
                    },
                    RouteStep {
                        instruction: format!("Viaja {} paradas (~{} min)", stops_count, duration),
                        route: route.id.clone(),
                        duration,
                    },
                    RouteStep {
                        instruction: format!("Baja en {}", end_stop.name),
                        route: route.id.clone(),
                        duration: 0,
                    }
                ];

                return Some(RouteResult {
                    route_id: route.id.clone(),
                    total_time: duration,
                    total_cost: route.tarifa,
                    steps,
                });
            }
        }
    }

    None
}

#[wasm_bindgen]
pub fn find_route(from: &str, to: &str, _routes_val: JsValue) -> JsValue {
    let routes_data: MasterRoutes = match serde_wasm_bindgen::from_value(_routes_val) {
        Ok(data) => data,
        Err(_) => return JsValue::NULL,
    };

    if let Some(result) = calculate_route(from, to, &routes_data) {
        serde_wasm_bindgen::to_value(&result).unwrap()
    } else {
        JsValue::NULL
    }
}

#[wasm_bindgen]
pub fn search_destinations(_query: &str) -> JsValue {
    // Búsqueda fuzzy (placeholder)
    let results = vec!["Coco Bongo", "Parque La Rehoyada", "Zona Hotelera"];
    serde_wasm_bindgen::to_value(&results).unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::MasterRoutes;

    fn mock_data() -> MasterRoutes {
        let json_data = r##"
        {
          "rutas": [
            {
              "id": "R1",
              "nombre": "Ruta 1",
              "color": "#FF0000",
              "tarifa": 10.0,
              "horario": "08:00-22:00",
              "frecuencia_minutos": 10,
              "paradas": [
                {"id": "S1", "nombre": "Stop A", "lat": 0.0, "lng": 0.0, "orden": 1, "referencias": ""},
                {"id": "S2", "nombre": "Stop B", "lat": 0.0, "lng": 0.0, "orden": 2, "referencias": ""},
                {"id": "S3", "nombre": "Stop C", "lat": 0.0, "lng": 0.0, "orden": 3, "referencias": ""}
              ],
              "polyline": []
            }
          ],
          "destinos": [
            {"nombre": "Mall", "categoria": "Shop", "lat": 0.0, "lng": 0.0, "parada_cercana": "S2"}
          ]
        }
        "##;
        serde_json::from_str(json_data).unwrap()
    }

    #[test]
    fn test_calculate_route_direct() {
        let data = mock_data();
        let result = calculate_route("Stop A", "Stop C", &data);
        assert!(result.is_some());
        let r = result.unwrap();
        assert_eq!(r.route_id, "R1");
        // 2 stops between A and C (A -> B -> C)?
        // s_idx=0, e_idx=2. stops_count = 2. duration = 6.
        assert_eq!(r.total_time, 6);
    }

    #[test]
    fn test_calculate_route_via_destination() {
        let data = mock_data();
        // Mall -> Stop C. Mall maps to S2. S2 -> S3 is valid.
        let result = calculate_route("Mall", "Stop C", &data);
        assert!(result.is_some());
        let r = result.unwrap();
        assert_eq!(r.route_id, "R1");
        // S2 (idx 1) -> S3 (idx 2). stops_count = 1. duration = 3.
        assert_eq!(r.total_time, 3);
    }

    #[test]
    fn test_calculate_route_reverse_fail() {
        let data = mock_data();
        // Stop C -> Stop A. idx 2 -> idx 0. Should fail (return None) as strictly ordered.
        let result = calculate_route("Stop C", "Stop A", &data);
        assert!(result.is_none());
    }

    #[test]
    fn test_calculate_route_not_found() {
        let data = mock_data();
        let result = calculate_route("Stop A", "NonExistent", &data);
        assert!(result.is_none());
    }
}
