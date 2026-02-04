use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use shared_types::{RootData, haversine_distance, TransportType};
use petgraph::graph::{NodeIndex, UnGraph};
use petgraph::algo::dijkstra;
use std::collections::HashMap;
use once_cell::sync::Lazy;
use std::sync::RwLock;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct StopInfo {
    pub name: String,
    pub lat: f64,
    pub lng: f64,
    pub distance_km: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GapAnalysis {
    pub origin_gap: Option<StopInfo>,
    pub dest_gap: Option<StopInfo>,
    pub recommendation: String, // "Walk", "Private", "NoPublicCoverage"
}

// Embed the JSON
const EMBEDDED_ROUTES_JSON: &str = include_str!("rust_data/embedded_routes.json");

#[derive(Deserialize)]
struct EmbeddedData {
    routes: Vec<EmbeddedRoute>,
    #[serde(default)]
    stops: HashMap<String, Vec<f64>>,
}

#[derive(Deserialize)]
struct EmbeddedRoute {
     id: String,
     name: String,
     transport_type: TransportType,
     #[serde(alias = "fare", default)]
     price: f64,
     #[serde(default)]
     duration: String,
     #[serde(default)]
     badges: Vec<String>,
     #[serde(default)]
     origin_hub: String,
     #[serde(default)]
     dest_hub: String,
     stops: Vec<EmbeddedStop>,
     #[serde(default)]
     operator: String,
     #[serde(default)]
     schedule: String,
     #[serde(default)]
     frequency: String,
}

#[derive(Deserialize, Debug, Clone)]
struct EmbeddedStop {
    id: String,
    name: String,
    lat: f64,
    lng: f64,
    #[serde(default)]
    order: i32,
}

// Dynamic Stop Database for Last Mile Logic
static STOPS_DB: Lazy<RwLock<HashMap<String, (f64, f64)>>> = Lazy::new(|| {
    let mut m = HashMap::new();
    if let Ok(data) = serde_json::from_str::<EmbeddedData>(EMBEDDED_ROUTES_JSON) {
        for r in data.routes {
            for s in r.stops {
                m.insert(s.name, (s.lat, s.lng));
            }
        }
    }
    m.insert("El Crucero".to_string(), (21.1619, -86.8515));
    m.insert("Plaza Las Américas".to_string(), (21.141, -86.843));
    RwLock::new(m)
});

#[wasm_bindgen]
pub fn load_stops_data(val: JsValue) {
    let new_data: HashMap<String, Vec<f64>> = match serde_wasm_bindgen::from_value(val) {
        Ok(d) => d,
        Err(_) => {
            return;
        }
    };

    if let Ok(mut db) = STOPS_DB.write() {
        for (name, coords) in new_data {
            if coords.len() >= 2 {
                db.insert(name, (coords[0], coords[1]));
            }
        }
    }
}

// --- SYSTEM OVERRIDE: TRUTH OF THE STREET ---

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Route {
    pub id: String,
    pub name: String,
    pub transport_type: TransportType,
    pub price: f64,
    pub duration: String,
    pub badges: Vec<String>,
    pub origin_hub: String,
    pub dest_hub: String,
    pub stops: Vec<String>,
    #[serde(skip)]
    pub stops_normalized: Vec<String>,
    pub operator: String,
    pub schedule: String,
    pub frequency: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Journey {
    #[serde(rename = "type")]
    pub type_: String, // "Direct" or "Transfer"
    pub legs: Vec<Route>,
    pub transfer_point: Option<String>,
    pub total_price: f64,
}

static CATALOG: Lazy<Vec<Route>> = Lazy::new(|| {
    let mut routes = Vec::new();
    if let Ok(data) = serde_json::from_str::<EmbeddedData>(EMBEDDED_ROUTES_JSON) {
        for r in data.routes {
             let stop_names: Vec<String> = r.stops.iter().map(|s| s.name.clone()).collect();
             let stops_normalized: Vec<String> = stop_names.iter().map(|s| s.to_lowercase()).collect();
             routes.push(Route {
                 id: r.id,
                 name: r.name,
                 transport_type: r.transport_type,
                 price: r.price,
                 duration: r.duration,
                 badges: r.badges,
                 origin_hub: r.origin_hub,
                 dest_hub: r.dest_hub,
                 stops: stop_names,
                 stops_normalized,
                 operator: r.operator,
                 schedule: r.schedule,
                 frequency: r.frequency,
             });
        }
    }
    routes
});

fn match_stop(query: &str, route: &Route) -> Option<usize> {
    let query_norm = query.to_lowercase();
    let mut best_match: Option<(usize, f64)> = None;

    for (i, stop_lower) in route.stops_normalized.iter().enumerate() {
        let jaro_score = strsim::jaro_winkler(&query_norm, stop_lower);

        // Boost score for containment
        let score = if stop_lower.contains(&query_norm) || query_norm.contains(stop_lower) {
            f64::max(jaro_score, 0.95)
        } else {
            jaro_score
        };

        if score > 0.4 {
            match best_match {
                Some((_, best_score)) => {
                    if score > best_score {
                        best_match = Some((i, score));
                    }
                }
                None => {
                    best_match = Some((i, score));
                }
            }
        }
    }

    best_match.map(|(i, _)| i)
}

pub fn find_route_rs(origin: &str, dest: &str) -> Vec<Journey> {
    let all_routes = &*CATALOG;
    let mut journeys = Vec::new();

    // 1. Direct Routes
    for route in all_routes {
        if let Some(origin_idx) = match_stop(origin, route) {
            if let Some(dest_idx) = match_stop(dest, route) {
                // Strict directionality: Origin must come before Destination
                if origin_idx < dest_idx {
                    journeys.push(Journey {
                        type_: "Direct".to_string(),
                        legs: vec![route.clone()],
                        transfer_point: None,
                        total_price: route.price,
                    });
                }
            }
        }
    }

    // 2. Transfer Routes (1-Stop)
    let mut routes_from_origin = Vec::new();
    let mut routes_to_dest = Vec::new();

    for route in all_routes {
        if let Some(idx) = match_stop(origin, route) {
            routes_from_origin.push((route, idx));
        }
        if let Some(idx) = match_stop(dest, route) {
            routes_to_dest.push((route, idx));
        }
    }

    let preferred_hubs = ["El Crucero", "Plaza Las Américas", "ADO Centro", "Zona Hotelera", "Muelle Ultramar"];

    for (route_a, origin_idx_a) in &routes_from_origin {
        for (route_b, dest_idx_b) in &routes_to_dest {
            // Skip same route (already covered by direct check, but safety first)
            if route_a.id == route_b.id {
                continue;
            }

            // Find intersection
            for (idx_a, stop_a) in route_a.stops_normalized.iter().enumerate() {
                // Must be after origin
                if idx_a <= *origin_idx_a { continue; }

                for (idx_b, stop_b) in route_b.stops_normalized.iter().enumerate() {
                    // Must be before dest
                    if idx_b >= *dest_idx_b { continue; }

                    if stop_a == stop_b {
                        // Found a transfer point!
                        let transfer_name = route_a.stops[idx_a].clone();

                        journeys.push(Journey {
                            type_: "Transfer".to_string(),
                            legs: vec![(*route_a).clone(), (*route_b).clone()],
                            transfer_point: Some(transfer_name),
                            total_price: route_a.price + route_b.price,
                        });
                    }
                }
            }
        }
    }

    // Deduplicate and Sort
    journeys.sort_by(|a, b| {
        // Score: Direct=2, Hub Transfer=1, Other=0
        let get_score = |j: &Journey| {
            if j.type_ == "Direct" {
                2
            } else if let Some(tp) = &j.transfer_point {
                if preferred_hubs.iter().any(|h| tp.contains(h)) { 1 } else { 0 }
            } else {
                0
            }
        };

        let score_a = get_score(a);
        let score_b = get_score(b);

        score_b.cmp(&score_a) // Higher score first
            .then_with(|| a.total_price.partial_cmp(&b.total_price).unwrap()) // Lower price first
    });

    // Limit results to avoid overwhelming user
    if journeys.len() > 5 {
        journeys.truncate(5);
    }

    journeys
}

#[wasm_bindgen]
pub fn find_route(origin: &str, dest: &str) -> JsValue {
    let routes = find_route_rs(origin, dest);
    serde_wasm_bindgen::to_value(&routes).unwrap()
}

#[wasm_bindgen]
pub fn get_all_routes() -> JsValue {
    let routes = &*CATALOG;
    serde_wasm_bindgen::to_value(routes).unwrap()
}

pub fn find_nearest_stop_rs(lat: f64, lng: f64) -> Option<StopInfo> {
    let mut best_stop: Option<StopInfo> = None;
    let mut min_dist = f64::MAX;

    if let Ok(db) = STOPS_DB.read() {
        for (name, (s_lat, s_lng)) in db.iter() {
            let dist = haversine_distance(lat, lng, *s_lat, *s_lng);
            if dist < min_dist {
                min_dist = dist;
                best_stop = Some(StopInfo {
                    name: name.clone(),
                    lat: *s_lat,
                    lng: *s_lng,
                    distance_km: dist,
                });
            }
        }
    }
    best_stop
}

pub fn analyze_gap_rs(user_lat: f64, user_lng: f64, dest_lat: f64, dest_lng: f64) -> GapAnalysis {
    let origin_stop = find_nearest_stop_rs(user_lat, user_lng);
    let dest_stop = find_nearest_stop_rs(dest_lat, dest_lng);

    let direct_dist = haversine_distance(user_lat, user_lng, dest_lat, dest_lng);

    let mut rec = "Transit".to_string();

    if direct_dist < 1.5 {
        rec = "Walk".to_string();
    } else if let Some(ref os) = origin_stop {
        if os.distance_km > 2.0 {
            rec = "Private".to_string();
        }
    } else {
        rec = "Private".to_string();
    }

    GapAnalysis {
        origin_gap: origin_stop,
        dest_gap: dest_stop,
        recommendation: rec,
    }
}

#[wasm_bindgen]
pub fn find_nearest_stop(lat: f64, lng: f64) -> JsValue {
    let res = find_nearest_stop_rs(lat, lng);
    serde_wasm_bindgen::to_value(&res).unwrap()
}

#[wasm_bindgen]
pub fn analyze_gap(user_lat: f64, user_lng: f64, dest_lat: f64, dest_lng: f64) -> JsValue {
    let res = analyze_gap_rs(user_lat, user_lng, dest_lat, dest_lng);
    serde_wasm_bindgen::to_value(&res).unwrap()
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
    println!("DEBUG: calculate_route called");
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
        // DEBUG
        println!("DEBUG: Path Node: {} ({}) Type: {:?}", node.name, node.route_id, node.transport_type);
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

    #[test]
    fn test_ado_no_warning() {
        let res = find_route_rs("ADO Centro", "Airport T2");
        assert!(!res.is_empty());
        assert!(res.iter().any(|j| j.legs[0].transport_type == TransportType::AdoAirport));
    }

    #[test]
    fn test_find_route_demo_override() {
        let res = find_route_rs("Villas Otoch Paraíso", "Zona Hotelera");
        assert!(!res.is_empty(), "R2 direct route not found");
        assert!(res.iter().any(|j| j.legs[0].id == "R2_VILLAS_OTOCH"));
    }

    #[test]
    fn test_find_route_fuzzy() {
        let res = find_route_rs("Plaza Outlett", "Gran Plza");
        assert!(!res.is_empty(), "Fuzzy match R44 failed");
        assert!(res.iter().any(|j| j.legs[0].id == "R44_POLIGONO"));
    }

    #[test]
    fn test_transfer_logic() {
        let res = find_route_rs("Villas Otoch", "Playa Delfines");
        assert!(!res.is_empty(), "Transfer route not found");
        let transfer = res.iter().find(|j| j.type_ == "Transfer");
        assert!(transfer.is_some(), "No transfer option returned");
    }

    #[test]
    fn test_gap_analysis_walk() {
        let res = analyze_gap_rs(21.1411, -86.8431, 21.1685, -86.885);
        assert_eq!(res.recommendation, "Transit");
    }

    #[test]
    fn test_gap_analysis_private() {
        let res = analyze_gap_rs(21.1, -86.9, 21.1685, -86.885);
        assert_eq!(res.recommendation, "Private");
    }
}