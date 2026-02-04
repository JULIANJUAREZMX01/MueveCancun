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
    stops: HashMap<String, Vec<f64>>,
}

#[derive(Deserialize)]
struct EmbeddedRoute {
     id: String,
     name: String,
     transport_type: TransportType,
     price: f64,
     duration: String,
     #[serde(default)]
     badges: Vec<String>,
     origin_hub: String,
     dest_hub: String,
     stops: Vec<String>,
     operator: String,
     schedule: String,
     frequency: String,
}

// Dynamic Stop Database for Last Mile Logic
static STOPS_DB: Lazy<RwLock<HashMap<String, (f64, f64)>>> = Lazy::new(|| {
    let mut m = HashMap::new();

    // Parse Embedded Data and Populate
    if let Ok(data) = serde_json::from_str::<EmbeddedData>(EMBEDDED_ROUTES_JSON) {
        for (name, coords) in data.stops {
             if coords.len() >= 2 {
                 m.insert(name, (coords[0], coords[1]));
             }
        }
    }

    // Hardcoded Fallbacks (merged / overridden if present in JSON)
    // These ensure some critical points exist even if JSON is missing them
    if !m.contains_key("OXXO Villas Otoch Paraíso") { m.insert("OXXO Villas Otoch Paraíso".to_string(), (21.1685, -86.885)); }
    if !m.contains_key("Chedraui Lakin") { m.insert("Chedraui Lakin".to_string(), (21.165, -86.879)); }

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

    // Parse Embedded Data
    if let Ok(data) = serde_json::from_str::<EmbeddedData>(EMBEDDED_ROUTES_JSON) {
        for r in data.routes {
             let stops_normalized: Vec<String> = r.stops.iter().map(|s| s.to_lowercase()).collect();
             routes.push(Route {
                 id: r.id,
                 name: r.name,
                 transport_type: r.transport_type,
                 price: r.price,
                 duration: r.duration,
                 badges: r.badges,
                 origin_hub: r.origin_hub,
                 dest_hub: r.dest_hub,
                 stops: r.stops,
                 stops_normalized,
                 operator: r.operator,
                 schedule: r.schedule,
                 frequency: r.frequency,
             });
        }
    } else {
        // Fallback only if JSON fails (which implies build error really)
        // Leaving empty or adding hardcoded
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

        if score > 0.6 {
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

    let mut rec = "Walk".to_string();

    if let Some(ref os) = origin_stop {
        if os.distance_km > 3.0 {
            rec = "NoPublicCoverage".to_string();
        } else if os.distance_km > 0.5 {
            rec = "Private".to_string();
        }
    } else {
        rec = "NoPublicCoverage".to_string();
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

    #[test]
    fn test_find_route_demo_override() {
        // Matches R-2-94: "OXXO Villas Otoch Paraíso" -> "Zona Hotelera"
        let res = find_route_rs("Villas Otoch Paraíso", "Zona Hotelera");

        assert!(!res.is_empty());
        assert!(res.iter().any(|j| j.type_ == "Direct" && j.legs[0].id == "R2_94_VILLAS_OTOCH_001"));
    }

    #[test]
    fn test_find_route_fuzzy() {
        // "El Crocero" (typo of "El Crucero") to "Ultramar" (part of "Muelle Ultramar")
        // Valid direction in CR_PTO_JUAREZ_001 (Index 1 -> Index 4)
        let res = find_route_rs("El Crocero", "Ultramar");

        assert!(!res.is_empty());
        assert!(res.iter().any(|j| j.type_ == "Direct" && j.legs[0].id == "CR_PTO_JUAREZ_001"));
    }

    #[test]
    fn test_transfer_logic() {
        // Villas Otoch -> Playa Delfines (requires transfer)
        // R-28 (Villas Otoch -> El Crucero)
        // R-1 (El Crucero -> Playa Delfines)

        // This relies on CATALOG data
        let res = find_route_rs("Villas Otoch", "Playa Delfines");

        // If "Villas Otoch Paraíso" matches both R-28 and R-2-94.
        // R-2-94 goes to "Zona Hotelera", but maybe not "Playa Delfines" explicitly in the stops list?
        // Let's check R-2-94 stops: ["OXXO Villas Otoch Paraíso", ..., "Zona Hotelera"]
        // R-1 stops: [..., "Zona Hotelera", "Playa Delfines"]

        // So R-2-94 is NOT a direct route to Playa Delfines (if strictly matching stops).
        // It might be a transfer.

        // R-28 goes: Villas Otoch -> El Crucero
        // R-1 goes: El Crucero -> Playa Delfines

        // So we expect a transfer at El Crucero.

        // Filter for transfer
        let transfer_routes: Vec<_> = res.iter().filter(|j| j.type_ == "Transfer").collect();

        if transfer_routes.is_empty() {
             // Maybe direct route found?
             // But let's see if we can find the specific transfer we want
        }

        assert!(res.iter().any(|j|
            j.type_ == "Transfer" &&
            j.transfer_point.as_ref().map(|s| s.contains("Crucero")).unwrap_or(false)
        ));
    }

    #[test]
    fn test_garbage_input() {
        let res = find_route_rs("XyZ123Rubbish", "AbC987Junk");
        assert!(res.is_empty(), "Should return empty for garbage input, got {} routes", res.len());
    }

    #[test]
    fn test_nearest_stop() {
        // "Plaza Las Américas (Kabah)" [21.141, -86.843]
        // Point slightly off
        let res = find_nearest_stop_rs(21.1415, -86.8435);
        assert!(res.is_some());
        assert_eq!(res.unwrap().name, "Plaza Las Américas (Kabah)");
    }

    #[test]
    fn test_gap_analysis_walk() {
        // Close to Plaza Las Américas
        let res = analyze_gap_rs(21.1411, -86.8431, 21.1685, -86.885); // dest: Villas Otoch
        assert_eq!(res.recommendation, "Walk");
    }

    #[test]
    fn test_gap_analysis_private() {
        // Point in between Plaza Las Américas and Entrada Zona Hotelera, but > 500m from both
        // Plaza: 21.141, -86.843
        // Entrada ZH: 21.153, -86.815
        // Test Point: 21.150, -86.83 (Shifted to avoid Av. Nichupté)

        // Nearest might be Plaza Las Américas (approx 1.5km) or others.
        // Let's verify distance > 0.5km
        let res = analyze_gap_rs(21.150, -86.83, 21.1685, -86.885);

        // Debug print if it fails
        if res.recommendation != "Private" {
             println!("DEBUG: Found Nearest: {:?} with dist {}", res.origin_gap.as_ref().map(|s| &s.name), res.origin_gap.as_ref().map(|s| s.distance_km).unwrap_or(0.0));
        }

        assert_eq!(res.recommendation, "Private");
    }

}
