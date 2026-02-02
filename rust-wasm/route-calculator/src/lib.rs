use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use shared_types::{RootData, haversine_distance, TransportType};
use petgraph::graph::{NodeIndex, UnGraph};
use petgraph::algo::dijkstra;
use std::collections::HashMap;

// --- SYSTEM OVERRIDE: TRUTH OF THE STREET ---

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Route {
    pub id: String,
    pub name: String,
    pub transport_type: String, // "Bus", "Combi", "Van"
    pub price: f64,
    pub duration: String,
    pub badges: Vec<String>, // e.g., "Aire Acondicionado", "Solo Efectivo"
    pub origin_hub: String,
    pub dest_hub: String,
}

fn get_all_routes() -> Vec<Route> {
    vec![
        Route {
            id: "R-2-94".to_string(),
            name: "Ruta 2-94".to_string(),
            transport_type: "Bus".to_string(),
            price: 15.0,
            duration: "45 min".to_string(),
            badges: vec!["Aire Acondicionado".to_string(), "Muy Frecuente".to_string()],
            origin_hub: "Villas Otoch Paraíso".to_string(),
            dest_hub: "Zona Hotelera".to_string(),
        },
        Route {
            id: "R-19".to_string(),
            name: "Ruta 19".to_string(),
            transport_type: "Bus".to_string(),
            price: 12.0,
            duration: "55 min".to_string(),
            badges: vec!["Rápido".to_string(), "Inseguro de noche".to_string()],
            origin_hub: "Villas Otoch Paraíso".to_string(),
            dest_hub: "El Crucero".to_string(),
        },
        Route {
            id: "Combi-Roja".to_string(),
            name: "Combi Roja".to_string(),
            transport_type: "Combi".to_string(),
            price: 10.0,
            duration: "30 min".to_string(),
            badges: vec!["Solo Efectivo".to_string()],
            origin_hub: "Puerto Juárez".to_string(),
            dest_hub: "El Crucero".to_string(),
        },
        Route {
            id: "Playa-Express".to_string(),
            name: "Playa Express".to_string(),
            transport_type: "Van".to_string(),
            price: 55.0,
            duration: "60 min".to_string(),
            badges: vec!["Aire Acondicionado".to_string(), "Viaje Directo".to_string()],
            origin_hub: "El Crucero".to_string(),
            dest_hub: "Playa del Carmen".to_string(),
        },
    ]
}

pub fn find_route_rs(origin: &str, dest: &str) -> Vec<Route> {
    let origin_norm = origin.to_lowercase();
    let dest_norm = dest.to_lowercase();

    // Fallback/Demo Override
    if origin_norm.contains("villas otoch") || origin_norm.contains("paraíso") {
        let routes = get_all_routes();
        // Return R-2-94 and R-19 specifically
        return routes.into_iter()
            .filter(|r| r.id == "R-2-94" || r.id == "R-19")
            .collect();
    }

    let all_routes = get_all_routes();
    let mut matched_routes = Vec::new();

    for route in all_routes {
        // Fuzzy match logic
        // Check if origin matches route's origin_hub
        let origin_score = strsim::jaro_winkler(&origin_norm, &route.origin_hub.to_lowercase());
        let origin_contains = route.origin_hub.to_lowercase().contains(&origin_norm) || origin_norm.contains(&route.origin_hub.to_lowercase());

        // Check if dest matches route's dest_hub
        let dest_score = strsim::jaro_winkler(&dest_norm, &route.dest_hub.to_lowercase());
        let dest_contains = route.dest_hub.to_lowercase().contains(&dest_norm) || dest_norm.contains(&route.dest_hub.to_lowercase());

        let is_origin_match = origin_score > 0.8 || origin_contains;
        let is_dest_match = dest_score > 0.8 || dest_contains;

        if is_origin_match || is_dest_match {
            matched_routes.push(route);
        }
    }

    matched_routes
}

#[wasm_bindgen]
pub fn find_route(origin: &str, dest: &str) -> JsValue {
    let routes = find_route_rs(origin, dest);
    serde_wasm_bindgen::to_value(&routes).unwrap()
}

// --- LEGACY GRAPH LOGIC (Kept for compilation, bypassed for now) ---

#[derive(Serialize, Deserialize, Default, Clone, Debug, PartialEq)]
pub struct BilingualString {
    pub en: String,
    pub es: String,
}

#[derive(Serialize, Deserialize, Default, Debug)]
pub struct RouteResponse {
    pub success: bool,
    pub path: Vec<String>,
    pub has_transfer: bool,
    pub transfer_point: Option<BilingualString>,
    pub routes: Vec<String>,
    pub distance_km: f64,
    pub time_min: u32,
    pub instructions: Vec<BilingualString>,
    pub error: Option<BilingualString>,
    pub airport_warning: Option<BilingualString>,
    pub estimated_cost_mxn: f64,
}

#[derive(Clone)]
struct GraphNode {
    stop_id: String,
    route_id: String,
    transport_type: TransportType,
    name: String,
    lat: f64,
    lng: f64,
    fare: f64,
}

#[wasm_bindgen]
pub fn validate_operator_funds(balance: f64) -> bool {
    // Threshold is 180 MXN (approx 9 USD)
    // If balance is below this, they cannot operate "Compass"
    balance >= 180.0
}

#[wasm_bindgen]
pub fn calculate_route(
    origin_lat: f64,
    origin_lng: f64,
    dest_lat: f64,
    dest_lng: f64,
    routes_val: JsValue
) -> JsValue {
    let data: RootData = match serde_wasm_bindgen::from_value(routes_val) {
        Ok(d) => d,
        Err(_e) => {
            return serde_wasm_bindgen::to_value(&error_response("invalid_data")).unwrap();
        }
    };

    let res = find_route_internal(origin_lat, origin_lng, dest_lat, dest_lng, &data);
    serde_wasm_bindgen::to_value(&res).unwrap()
}

pub fn find_route_internal(
    origin_lat: f64,
    origin_lng: f64,
    dest_lat: f64,
    dest_lng: f64,
    data: &RootData
) -> RouteResponse {
    let mut start_node_info: Option<(String, String, f64)> = None;
    let mut end_node_info: Option<(String, String, f64)> = None;

    for route in &data.routes {
        for stop in &route.stops {
            let dist_origin = haversine_distance(origin_lat, origin_lng, stop.lat, stop.lng);
            let dist_dest = haversine_distance(dest_lat, dest_lng, stop.lat, stop.lng);

            if start_node_info.is_none() || dist_origin < start_node_info.as_ref().unwrap().2 {
                start_node_info = Some((stop.id.clone(), route.id.clone(), dist_origin));
            }
            if end_node_info.is_none() || dist_dest < end_node_info.as_ref().unwrap().2 {
                end_node_info = Some((stop.id.clone(), route.id.clone(), dist_dest));
            }
        }
    }

    let (start_stop_id, start_route_id, dist_start) = match start_node_info {
        Some(info) => info,
        None => return error_response("out_of_coverage"),
    };
    let (end_stop_id, end_route_id, dist_end) = match end_node_info {
        Some(info) => info,
        None => return error_response("out_of_coverage"),
    };

    if dist_start > 3.0 || dist_end > 3.0 {
        return error_response("out_of_coverage");
    }

    let mut graph = UnGraph::<GraphNode, f64>::new_undirected();
    let mut nodes = HashMap::new();

    for route in &data.routes {
        let mut prev_node_idx: Option<NodeIndex> = None;
        for stop in &route.stops {
            let node = GraphNode {
                stop_id: stop.id.clone(),
                route_id: route.id.clone(),
                transport_type: route.transport_type.clone(),
                name: stop.name.clone(),
                lat: stop.lat,
                lng: stop.lng,
                fare: route.fare,
            };
            let node_idx = graph.add_node(node);
            nodes.insert((stop.id.clone(), route.id.clone()), node_idx);

            if let Some(prev_idx) = prev_node_idx {
                let prev_node = graph.node_weight(prev_idx).unwrap();
                let dist = haversine_distance(prev_node.lat, prev_node.lng, stop.lat, stop.lng);
                graph.add_edge(prev_idx, node_idx, dist);
            }
            prev_node_idx = Some(node_idx);
        }
    }

    let all_nodes: Vec<NodeIndex> = graph.node_indices().collect();
    for i in 0..all_nodes.len() {
        for j in i + 1..all_nodes.len() {
            let node_a = graph.node_weight(all_nodes[i]).unwrap();
            let node_b = graph.node_weight(all_nodes[j]).unwrap();

            if node_a.route_id != node_b.route_id {
                let dist = haversine_distance(node_a.lat, node_a.lng, node_b.lat, node_b.lng);

                let penalty = if node_a.name.contains("Crucero") || node_a.name.contains("ADO") {
                    0.5
                } else {
                    2.0
                };

                if dist < 0.5 {
                    graph.add_edge(all_nodes[i], all_nodes[j], penalty);
                }
            }
        }
    }

    let start_idx = nodes.get(&(start_stop_id, start_route_id)).unwrap();
    let end_idx = nodes.get(&(end_stop_id, end_route_id)).unwrap();

    let node_weights = dijkstra(&graph, *start_idx, Some(*end_idx), |e| *e.weight());

    if !node_weights.contains_key(end_idx) {
        return error_response("no_path");
    }

    let mut path = Vec::new();
    let mut current = *end_idx;
    path.push(current);

    while current != *start_idx {
        let current_dist = node_weights[&current];
        let neighbors = graph.neighbors(current);
        let mut next_node = None;

        for neighbor in neighbors {
            if let Some(&neighbor_dist) = node_weights.get(&neighbor) {
                let edge = graph.find_edge(current, neighbor).unwrap();
                let weight = graph.edge_weight(edge).unwrap();
                if (current_dist - weight - neighbor_dist).abs() < 0.0001 {
                    next_node = Some(neighbor);
                    break;
                }
            }
        }

        if let Some(next) = next_node {
            current = next;
            path.push(current);
        } else {
            break;
        }
    }
    path.reverse();

    let mut res = RouteResponse::default();
    res.success = true;
    res.distance_km = node_weights[end_idx];
    res.time_min = (res.distance_km * 2.5).round() as u32;

    let mut routes_used = Vec::new();
    let mut total_fare = 0.0;
    let mut last_route = "".to_string();

    for (i, &idx) in path.iter().enumerate() {
        let node = graph.node_weight(idx).unwrap();
        res.path.push(node.stop_id.clone());

        if node.route_id != last_route {
            if !last_route.is_empty() {
                res.has_transfer = true;
                res.transfer_point = Some(BilingualString {
                    en: node.name.clone(),
                    es: node.name.clone(),
                });

                res.instructions.push(BilingualString {
                    en: format!("Transfer to {} (Wait approx 5 min)", node.route_id),
                    es: format!("Transbordo a {} (Espera aprox 5 min)", node.route_id),
                });
            }

            routes_used.push(node.route_id.clone());
            total_fare += node.fare;

            let vehicle_type = match node.transport_type {
                TransportType::CombiMunicipal => ("Combi", "Combi"),
                TransportType::PlayaExpress => ("Playa Express Van", "Playa Express"),
                TransportType::AdoAirport => ("ADO Bus", "Autobús ADO"),
                _ => ("Bus", "Autobús"),
            };

            res.instructions.push(BilingualString {
                en: format!("Board {} ({}) at {}", node.route_id, vehicle_type.0, node.name),
                es: format!("Aborda {} ({}) en {}", node.route_id, vehicle_type.1, node.name),
            });

            last_route = node.route_id.clone();
        }

        if i == path.len() - 1 {
            res.instructions.push(BilingualString {
                en: format!("Get off at {}", node.name),
                es: format!("Baja en {}", node.name),
            });

            if node.name.to_lowercase().contains("aeropuerto") || node.name.to_lowercase().contains("airport") {
                if node.transport_type != TransportType::AdoAirport {
                    res.airport_warning = Some(BilingualString {
                        en: "Access restricted to ADO/Private. Nearest drop-off: Airport Entrance (Highway).".to_string(),
                        es: "Acceso restringido a ADO/Privado. Punto más cercano: Entrada al Aeropuerto (Carretera).".to_string(),
                    });
                }
            }
        }
    }

    res.routes = routes_used;
    res.estimated_cost_mxn = total_fare;

    res
}

#[wasm_bindgen]
pub fn calculate_trip_cost(distance: f64, seats: u32, is_tourist: bool) -> JsValue {
    let base_price = if is_tourist {
        29.0
    } else if distance > 15.0 {
        25.0
    } else {
        15.0
    };

    let total_mxn = base_price * (seats as f64);

    serde_wasm_bindgen::to_value(&serde_json::json!({
        "cost_mxn": total_mxn,
        "base_price": base_price,
        "currency": "MXN",
        "payment_method": "CASH_ONLY",
        "info": {
            "en": "Pay in cash directly to the driver.",
            "es": "Paga en efectivo directamente al conductor."
        },
        "seats": seats
    })).unwrap()
}

fn error_response(error_key: &str) -> RouteResponse {
    let error_msg = match error_key {
        "invalid_data" => BilingualString {
            en: "Invalid data format".to_string(),
            es: "Formato de datos inválido".to_string(),
        },
        "out_of_coverage" => BilingualString {
            en: "Location out of coverage".to_string(),
            es: "Ubicación fuera de cobertura".to_string(),
        },
        "no_path" => BilingualString {
            en: "No route found".to_string(),
            es: "No se encontró ruta".to_string(),
        },
        _ => BilingualString {
            en: "Unknown error".to_string(),
            es: "Error desconocido".to_string(),
        }
    };

    RouteResponse {
        success: false,
        error: Some(error_msg),
        ..Default::default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_types::{Route, Stop, RootData, TransportType};

    fn mock_data() -> RootData {
        RootData {
            routes: vec![
                Route {
                    id: "R1".to_string(),
                    name: "Crucero".to_string(),
                    color: "red".to_string(),
                    fare: 15.0,
                    transport_type: TransportType::BusHotelZone,
                    stops: vec![
                        Stop { id: "R1_001".to_string(), name: "El Crucero Hub".to_string(), lat: 21.1619, lng: -86.8515, order: 1 },
                        Stop { id: "R1_003".to_string(), name: "Plaza Las Américas".to_string(), lat: 21.1472, lng: -86.8234, order: 3 },
                    ],
                },
                Route {
                    id: "ADO_AIR".to_string(),
                    name: "ADO".to_string(),
                    color: "blue".to_string(),
                    fare: 110.0,
                    transport_type: TransportType::AdoAirport,
                    stops: vec![
                        Stop { id: "ADO_001".to_string(), name: "ADO Centro".to_string(), lat: 21.1605, lng: -86.8260, order: 1 },
                        Stop { id: "ADO_002".to_string(), name: "Airport T2".to_string(), lat: 21.0412, lng: -86.8725, order: 2 },
                    ],
                },
                Route {
                    id: "R10".to_string(),
                    name: "Urban".to_string(),
                    color: "yellow".to_string(),
                    fare: 15.0,
                    transport_type: TransportType::BusUrban,
                    stops: vec![
                        Stop { id: "R10_001".to_string(), name: "Plaza Las Américas".to_string(), lat: 21.1472, lng: -86.8234, order: 1 },
                        Stop { id: "R10_009".to_string(), name: "Airport Entrance".to_string(), lat: 21.0450, lng: -86.8700, order: 9 },
                    ],
                },
            ],
        }
    }

    #[test]
    fn test_airport_gatekeeper() {
        let data = mock_data();
        let res = find_route_internal(21.1472, -86.8234, 21.0450, -86.8700, &data);
        assert!(res.success);
        assert!(res.airport_warning.is_some());
        assert!(res.airport_warning.unwrap().en.contains("restricted to ADO"));
    }

    #[test]
    fn test_ado_no_warning() {
        let data = mock_data();
        let res = find_route_internal(21.1605, -86.8260, 21.0412, -86.8725, &data);
        assert!(res.success);
        assert!(res.airport_warning.is_none());
    }

    // Updated test for truth of the street logic
    #[test]
    fn test_find_route_demo_override() {
        let res = find_route_rs("Villas Otoch Paraíso", "Anywhere");

        assert!(res.len() >= 2);
        assert!(res.iter().any(|r| r.id == "R-2-94"));
        assert!(res.iter().any(|r| r.id == "R-19"));
    }

    #[test]
    fn test_find_route_fuzzy() {
        // "El Crocero" is a typo for "El Crucero"
        let res = find_route_rs("Puerto Juárez", "El Crocero");

        // Should find "Combi-Roja" which goes from Puerto Juárez to El Crucero
        assert!(!res.is_empty());
        assert!(res.iter().any(|r| r.id == "Combi-Roja"));
    }
}
