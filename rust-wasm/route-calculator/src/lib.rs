use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use shared_types::{RootData, haversine_distance};
use petgraph::graph::{NodeIndex, UnGraph};
use petgraph::algo::dijkstra;
use std::collections::HashMap;

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
}

#[derive(Clone)]
struct GraphNode {
    stop_id: String,
    route_id: String,
    name: String,
    lat: f64,
    lng: f64,
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
    // 1. Find nearest stops for origin and destination
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

    if dist_start > 1.0 || dist_end > 1.0 {
        return error_response("out_of_coverage");
    }

    // 2. Build Graph
    let mut graph = UnGraph::<GraphNode, f64>::new_undirected();
    let mut nodes = HashMap::new();

    for route in &data.routes {
        let mut prev_node_idx: Option<NodeIndex> = None;
        for stop in &route.stops {
            let node = GraphNode {
                stop_id: stop.id.clone(),
                route_id: route.id.clone(),
                name: stop.name.clone(),
                lat: stop.lat,
                lng: stop.lng,
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

    // Connect inter-route (transfers)
    let all_nodes: Vec<NodeIndex> = graph.node_indices().collect();
    for i in 0..all_nodes.len() {
        for j in i + 1..all_nodes.len() {
            let node_a = graph.node_weight(all_nodes[i]).unwrap();
            let node_b = graph.node_weight(all_nodes[j]).unwrap();

            if node_a.route_id != node_b.route_id {
                let dist = haversine_distance(node_a.lat, node_a.lng, node_b.lat, node_b.lng);
                if dist < 0.05 { // Increased tolerance to 50 meters
                    // 5 min penalty = approx 2.5 km at 30 km/h average
                    graph.add_edge(all_nodes[i], all_nodes[j], 2.5);
                }
            }
        }
    }

    // 3. Dijkstra
    let start_idx = nodes.get(&(start_stop_id, start_route_id)).unwrap();
    let end_idx = nodes.get(&(end_stop_id, end_route_id)).unwrap();

    let node_weights = dijkstra(&graph, *start_idx, Some(*end_idx), |e| *e.weight());

    if !node_weights.contains_key(end_idx) {
        return error_response("no_path");
    }

    // Backtracking
    let mut path = Vec::new();
    let mut current = *end_idx;
    path.push(current);

    while current != *start_idx {
        let current_dist = node_weights[&current];
        let neighbors = graph.neighbors(current);
        let mut next_node = None;

        for neighbor in neighbors {
            let edge = graph.find_edge(current, neighbor).unwrap();
            let weight = graph.edge_weight(edge).unwrap();
            if (current_dist - weight - node_weights[&neighbor]).abs() < 0.0001 {
                next_node = Some(neighbor);
                break;
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

    // 4. Format Output
    let mut res = RouteResponse::default();
    res.success = true;
    res.distance_km = node_weights[end_idx];
    res.time_min = (res.distance_km * 2.0).round() as u32;

    let mut routes_used = Vec::new();
    let mut transfer_point = None;
    let mut last_route = "".to_string();

    for (i, &idx) in path.iter().enumerate() {
        let node = graph.node_weight(idx).unwrap();
        res.path.push(node.stop_id.clone());

        if node.route_id != last_route {
            if !last_route.is_empty() {
                res.has_transfer = true;
                transfer_point = Some(BilingualString {
                    en: node.name.clone(),
                    es: node.name.clone(),
                });

                res.instructions.push(BilingualString {
                    en: format!("Wait for {} (approx 5 min)", node.route_id),
                    es: format!("Espera {} (aprox 5 min)", node.route_id),
                });
            }

            routes_used.push(node.route_id.clone());

            res.instructions.push(BilingualString {
                en: format!("Board {} at {}", node.route_id, node.name),
                es: format!("Aborda {} en {}", node.route_id, node.name),
            });

            last_route = node.route_id.clone();
        }

        if i == path.len() - 1 {
            res.instructions.push(BilingualString {
                en: format!("Get off at {}", node.name),
                es: format!("Baja en {}", node.name),
            });
        }
    }

    res.routes = routes_used;
    res.transfer_point = transfer_point;

    res
}

#[wasm_bindgen]
pub fn calculate_trip_cost(distance: f64, seats: u32, is_tourist: bool) -> JsValue {
    let base_price = if is_tourist {
        29.0
    } else if distance > 15.0 {
        25.0
    } else {
        20.0
    };

    let total_mxn = base_price * (seats as f64);

    // Simple mock Gatekeeper check:
    // In a real scenario, this would check against a wallet balance passed in or stored.
    // For now, we return the cost and a 'gatekeeper_pass' flag.
    serde_wasm_bindgen::to_value(&serde_json::json!({
        "cost_mxn": total_mxn,
        "base_price": base_price,
        "currency": "MXN",
        "gatekeeper_pass": true, // Antigravity will handle the $5 USD check in the UI/DB
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
            en: "Origin/destination out of coverage".to_string(),
            es: "Origen/destino fuera de cobertura".to_string(),
        },
        "no_path" => BilingualString {
            en: "No route found between these points".to_string(),
            es: "No se encontró ruta entre estos puntos".to_string(),
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
    use shared_types::{Route, Stop, RootData};

    fn mock_data() -> RootData {
        RootData {
            routes: vec![
                Route {
                    id: "R1".to_string(),
                    name: "Crucero".to_string(),
                    color: "red".to_string(),
                    fare: 15.0,
                    stops: vec![
                        Stop { id: "R1_001".to_string(), name: "Parque La Rehoyada".to_string(), lat: 21.1619, lng: -86.8515, order: 1 },
                        Stop { id: "R1_003".to_string(), name: "Plaza Las Américas".to_string(), lat: 21.1472, lng: -86.8234, order: 3 },
                        Stop { id: "R1_007".to_string(), name: "Coco Bongo".to_string(), lat: 21.1385, lng: -86.7474, order: 7 },
                    ],
                },
                Route {
                    id: "R10".to_string(),
                    name: "Aeropuerto".to_string(),
                    color: "yellow".to_string(),
                    fare: 15.0,
                    stops: vec![
                        Stop { id: "R10_001".to_string(), name: "Plaza Las Américas".to_string(), lat: 21.1472, lng: -86.8234, order: 1 },
                        Stop { id: "R10_009".to_string(), name: "Aeropuerto T3".to_string(), lat: 21.0412, lng: -86.8725, order: 9 },
                    ],
                },
            ],
        }
    }

    #[test]
    fn test_direct_route() {
        let data = mock_data();
        let res = find_route_internal(21.1619, -86.8515, 21.1385, -86.7474, &data);
        assert!(res.success);
        assert!(!res.has_transfer);
        assert_eq!(res.routes, vec!["R1"]);
    }

    #[test]
    fn test_transfer_route() {
        let data = mock_data();
        // R1_001 to R10_009
        let res = find_route_internal(21.1619, -86.8515, 21.0412, -86.8725, &data);
        assert!(res.success);
        assert!(res.has_transfer);
        assert_eq!(res.routes, vec!["R1", "R10"]);
        assert_eq!(res.transfer_point.unwrap().es, "Plaza Las Américas");
    }

    #[test]
    fn test_out_of_coverage() {
        let data = mock_data();
        let res = find_route_internal(20.6296, -87.0739, 21.1385, -86.7474, &data);
        assert!(!res.success);
        assert_eq!(res.error.unwrap().es, "Origen/destino fuera de cobertura");
    }
}
