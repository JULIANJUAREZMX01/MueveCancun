use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::RwLock;
<<<<<<< HEAD
use strsim;
use wasm_bindgen::prelude::*;

// --- STRUCTS ---
=======
use std::cmp::Ordering; // Sentinel: Added for safe comparison
>>>>>>> origin/security/harden-wasm-ffi-6480731573874893142

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RouteCatalog {
    pub version: String,
    pub rutas: Vec<Route>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Route {
    pub id: String,
    #[serde(rename = "nombre")]
    pub name: String,
    #[serde(rename = "tarifa")]
    pub price: f64,
    #[serde(rename = "tipo")]
    pub transport_type: String,

    #[serde(default)]
    pub empresa: Option<String>,
    #[serde(default)]
    pub frecuencia_minutos: Option<u32>,
    #[serde(default)]
    pub horario: Option<Schedule>,

    #[serde(rename = "paradas")]
    pub stops: Vec<Stop>,

    // Computed fields for internal use
    #[serde(skip)]
    pub stops_normalized: Vec<String>,

    #[serde(default)]
    pub social_alerts: Vec<String>,
    #[serde(default)]
    pub last_updated: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Stop {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(rename = "nombre")]
    pub name: String,
    pub lat: f64,
    pub lng: f64,
    pub orden: u32,
    #[serde(default)]
    pub landmarks: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Schedule {
    #[serde(default, alias = "inicio_oficial")]
    pub inicio: Option<String>,
    #[serde(default, alias = "fin_oficial")]
    pub fin: Option<String>,
    #[serde(default)]
    pub guardia_nocturna: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Journey {
    #[serde(rename = "type")]
    pub type_: String, // "Direct" or "Transfer"
    pub legs: Vec<Route>,
    pub transfer_point: Option<String>,
    pub total_price: f64,
}

// --- APP STATE ---

struct AppState {
    routes_list: Vec<Route>,
    routes_map: HashMap<String, Route>,
}

static DB: Lazy<RwLock<AppState>> = Lazy::new(|| {
    RwLock::new(AppState {
        routes_list: Vec::new(),
        routes_map: HashMap::new(),
    })
});

// --- CORE LOGIC (Pure Rust, Testable) ---

pub fn load_catalog_core(json_payload: &str) -> Result<(), String> {
    let mut catalog: RouteCatalog = serde_json::from_str(json_payload).map_err(|e| {
        format!(
            "JSON Parse Error: {}. Expected {{version, rutas: [...]}}",
            e
        )
    })?;

    if catalog.rutas.is_empty() {
        return Err("ERROR: Catalog contains 0 routes".to_string());
    }

    // Pre-compute normalized stops for fuzzy matching
    for route in &mut catalog.rutas {
        route.stops_normalized = route.stops.iter().map(|s| s.name.to_lowercase()).collect();
    }

    let mut map = HashMap::new();
    for r in &catalog.rutas {
        map.insert(r.id.clone(), r.clone());
    }

    let mut db = DB.write().map_err(|_| "DB Lock Poisoned".to_string())?;

    db.routes_list = catalog.rutas;
    db.routes_map = map;

    Ok(())
}

pub fn get_route_by_id_core(id: &str) -> Result<Option<Route>, String> {
    let db = DB.read().map_err(|_| "Lock failed".to_string())?;
    Ok(db.routes_map.get(id).cloned())
}

pub fn get_all_routes_core() -> Result<Vec<Route>, String> {
    let db = DB.read().map_err(|_| "Lock failed".to_string())?;
    Ok(db.routes_list.clone())
}

pub fn find_route_core_wrapper(origin: &str, dest: &str) -> Result<Vec<Journey>, String> {
    if origin.len() > 100 || dest.len() > 100 {
        return Ok(Vec::new());
    }

    let db = DB.read().map_err(|_| "Lock failed".to_string())?;

    if db.routes_list.is_empty() {
        return Err("ERROR: Catalog not loaded. Call load_catalog() first.".to_string());
    }

    Ok(find_route_rs(origin, dest, &db.routes_list))
}

// --- WASM EXPORTS ---

#[wasm_bindgen]
pub fn validate_operator_funds(balance: f64) -> bool {
    balance >= 180.0
}

#[wasm_bindgen]
pub fn load_stops_data(_stops: JsValue) -> Result<(), JsValue> {
    // No-op: Stops are now loaded via load_catalog() inside routes
    Ok(())
}

#[wasm_bindgen]
pub fn load_catalog(json_payload: &str) -> Result<(), JsValue> {
    load_catalog_core(json_payload).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn get_route_by_id(id: &str) -> Result<JsValue, JsValue> {
    match get_route_by_id_core(id) {
        Ok(Some(route)) => {
            serde_wasm_bindgen::to_value(&route).map_err(|e| JsValue::from_str(&e.to_string()))
        }
        Ok(None) => Ok(JsValue::NULL),
        Err(e) => Err(JsValue::from_str(&e)),
    }
}

#[wasm_bindgen]
pub fn get_all_routes() -> Result<JsValue, JsValue> {
    match get_all_routes_core() {
        Ok(routes) => {
            serde_wasm_bindgen::to_value(&routes).map_err(|e| JsValue::from_str(&e.to_string()))
        }
        Err(e) => Err(JsValue::from_str(&e)),
    }
}

#[wasm_bindgen]
pub fn find_route(origin: &str, dest: &str) -> Result<JsValue, JsValue> {
    match find_route_core_wrapper(origin, dest) {
        Ok(journeys) => {
            serde_wasm_bindgen::to_value(&journeys).map_err(|e| JsValue::from_str(&e.to_string()))
        }
        Err(e) => Err(JsValue::from_str(&e)),
    }
}

// --- INTERNAL ALGORITHMS ---

fn match_stop<'a>(
    query_norm: &str,
    route: &'a Route,
    cache: &mut HashMap<&'a str, f64>,
) -> Option<usize> {
    let mut best_match: Option<(usize, f64)> = None;

    for (i, stop_lower) in route.stops_normalized.iter().enumerate() {
        let score = *cache.entry(stop_lower.as_str()).or_insert_with(|| {
            let jaro_score = strsim::jaro_winkler(query_norm, stop_lower);
            if stop_lower.contains(query_norm) || query_norm.contains(stop_lower) {
                f64::max(jaro_score, 0.95)
            } else {
                jaro_score
            }
        });

        if score > 0.75 {
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

fn find_route_rs(origin: &str, dest: &str, all_routes: &Vec<Route>) -> Vec<Journey> {
    let mut journeys = Vec::new();
    let origin_norm = origin.to_lowercase();
    let dest_norm = dest.to_lowercase();
    let mut origin_cache: HashMap<&str, f64> = HashMap::new();
    let mut dest_cache: HashMap<&str, f64> = HashMap::new();

    struct RouteMatch<'a> {
        route: &'a Route,
        origin_idx: Option<usize>,
        dest_idx: Option<usize>,
    }

    let mut route_matches = Vec::with_capacity(all_routes.len());

    for route in all_routes {
        let origin_idx = match_stop(&origin_norm, route, &mut origin_cache);
        let dest_idx = match_stop(&dest_norm, route, &mut dest_cache);
        route_matches.push(RouteMatch {
            route,
            origin_idx,
            dest_idx,
        });
    }

    // Limit for DoS prevention
    const MAX_SEARCH_RESULTS: usize = 200;

    // 1. Direct Routes
    for m in &route_matches {
        if let Some(origin_idx) = m.origin_idx {
            if let Some(dest_idx) = m.dest_idx {
                if origin_idx < dest_idx {
                    journeys.push(Journey {
                        type_: "Direct".to_string(),
                        legs: vec![m.route.clone()],
                        transfer_point: None,
                        total_price: m.route.price,
                    });
                }
            }
        }
    }

    if !journeys.is_empty() {
        return journeys;
    }

    // 2. Transfer Routes (1-Stop)
    let routes_from_origin: Vec<&RouteMatch> = route_matches
        .iter()
        .filter(|m| m.origin_idx.is_some())
        .collect();
    let routes_to_dest: Vec<&RouteMatch> = route_matches
        .iter()
        .filter(|m| m.dest_idx.is_some())
        .collect();

    let preferred_hubs = [
        "El Crucero",
        "Plaza Las Américas",
        "ADO Centro",
        "Zona Hotelera",
        "Muelle Ultramar",
    ];

    const MAX_TRANSFER_ROUTES: usize = 50;

    'outer: for match_a in &routes_from_origin {
        let route_a = match_a.route;
        let origin_idx_a = match match_a.origin_idx {
            Some(idx) => idx,
            None => continue,
        };

        for match_b in &routes_to_dest {
            // Check limit
            if journeys.len() >= MAX_TRANSFER_ROUTES {
                break 'outer;
            }

            let route_b = match_b.route;
            let dest_idx_b = match match_b.dest_idx {
                Some(idx) => idx,
                None => continue,
            };

            if route_a.id == route_b.id {
                continue;
            }

            // Find the best transfer point for this pair
            let mut best_transfer: Option<(usize, bool)> = None; // (index in A, is_preferred)

            for (idx_a, stop_name_a) in route_a.stops_normalized.iter().enumerate() {
                if idx_a <= origin_idx_a {
                    continue;
                }

                for (idx_b, stop_name_b) in route_b.stops_normalized.iter().enumerate() {
                    if idx_b >= dest_idx_b {
                        continue;
                    }

                    if stop_name_a == stop_name_b {
                        // Found intersection
                        let stop_name = &route_a.stops[idx_a].name;
                        let is_preferred = preferred_hubs.iter().any(|h| stop_name.contains(h));

                        if best_transfer.is_none() {
                            best_transfer = Some((idx_a, is_preferred));
                        } else {
                            // If current is preferred and previous wasn't, switch
                            if is_preferred && !best_transfer.unwrap().1 {
                                best_transfer = Some((idx_a, is_preferred));
                            }
                        }
                    }
                }
            }

            if let Some((idx_a, _)) = best_transfer {
                let transfer_name = route_a.stops[idx_a].name.clone();
                journeys.push(Journey {
                    type_: "Transfer".to_string(),
                    legs: vec![route_a.clone(), route_b.clone()],
                    transfer_point: Some(transfer_name),
                    total_price: route_a.price + route_b.price,
                });
            }
        }
    }

    journeys.sort_by(|a, b| {
        let get_score = |j: &Journey| {
            if j.type_ == "Direct" {
                2
            } else if let Some(tp) = &j.transfer_point {
                if preferred_hubs.iter().any(|h| tp.contains(h)) {
                    1
                } else {
                    0
                }
            } else {
                0
            }
        };

        let score_a = get_score(a);
        let score_b = get_score(b);

<<<<<<< HEAD
        score_b.cmp(&score_a).then_with(|| {
            a.total_price
                .partial_cmp(&b.total_price)
                .unwrap_or(std::cmp::Ordering::Equal)
        })
=======
        // Sentinel Fix: Use unwrap_or(Ordering::Equal) to prevent panic on NaN
        score_b.cmp(&score_a) // Higher score first
            .then_with(|| a.total_price.partial_cmp(&b.total_price).unwrap_or(Ordering::Equal)) // Lower price first
>>>>>>> origin/security/harden-wasm-ffi-6480731573874893142
    });

    if journeys.len() > 5 {
        journeys.truncate(5);
    }

    journeys
}

<<<<<<< HEAD
=======
// Sentinel Fix: Return Result<JsValue, JsValue> to propagate errors safely
#[wasm_bindgen]
pub fn find_route(origin: &str, dest: &str) -> Result<JsValue, JsValue> {
    let routes = find_route_rs(origin, dest);
    serde_wasm_bindgen::to_value(&routes).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn get_all_routes() -> Result<JsValue, JsValue> {
    let routes = &*CATALOG;
    serde_wasm_bindgen::to_value(routes).map_err(|e| JsValue::from_str(&e.to_string()))
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

    // Secondary check for destination
    if let Some(ref ds) = dest_stop {
        if ds.distance_km > 3.0 && rec != "NoPublicCoverage" {
             // Optional logic
        }
    }

    GapAnalysis {
        origin_gap: origin_stop,
        dest_gap: dest_stop,
        recommendation: rec,
    }
}

#[wasm_bindgen]
pub fn find_nearest_stop(lat: f64, lng: f64) -> Result<JsValue, JsValue> {
    let res = find_nearest_stop_rs(lat, lng);
    serde_wasm_bindgen::to_value(&res).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn analyze_gap(user_lat: f64, user_lng: f64, dest_lat: f64, dest_lng: f64) -> Result<JsValue, JsValue> {
    let res = analyze_gap_rs(user_lat, user_lng, dest_lat, dest_lng);
    serde_wasm_bindgen::to_value(&res).map_err(|e| JsValue::from_str(&e.to_string()))
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
) -> Result<JsValue, JsValue> {
    println!("DEBUG: calculate_route called");
    let data: RootData = match serde_wasm_bindgen::from_value(routes_val) {
        Ok(d) => d,
        Err(_e) => {
            return serde_wasm_bindgen::to_value(&error_response("invalid_data"))
                .map_err(|e| JsValue::from_str(&e.to_string()));
        }
    };

    let res = find_route_internal(origin_lat, origin_lng, dest_lat, dest_lng, &data);
    serde_wasm_bindgen::to_value(&res).map_err(|e| JsValue::from_str(&e.to_string()))
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
pub fn calculate_trip_cost(distance: f64, seats: u32, is_tourist: bool) -> Result<JsValue, JsValue> {
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
    })).map_err(|e| JsValue::from_str(&e.to_string()))
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

>>>>>>> origin/security/harden-wasm-ffi-6480731573874893142
#[cfg(test)]
mod tests {
    use super::*;

    // Helper to load test data
    fn load_test_data() {
        let json = r#"{
            "version": "2.3.0",
            "rutas": [
                {
                    "id": "R1_ZONA_HOTELERA_001",
                    "nombre": "R-1 Centro -> Zona Hotelera",
                    "tarifa": 15,
                    "tipo": "Bus_Urban",
                    "paradas": [
                        { "nombre": "La Rehoyada", "lat": 21.1619, "lng": -86.8515, "orden": 1 },
                        { "nombre": "El Crucero", "lat": 21.1576, "lng": -86.8269, "orden": 2 },
                        { "nombre": "Zona Hotelera", "lat": 21.135, "lng": -86.768, "orden": 3 }
                    ]
                },
                {
                    "id": "R2_94_VILLAS_OTOCH_001",
                    "nombre": "R-2-94 Villas Otoch",
                    "tarifa": 15,
                    "tipo": "Bus_Urban",
                    "paradas": [
                        { "nombre": "Villas Otoch Paraíso", "lat": 21.1685, "lng": -86.885, "orden": 1 },
                        { "nombre": "El Crucero", "lat": 21.1576, "lng": -86.8269, "orden": 2 }
                    ]
                }
            ]
        }"#;
        // Use _core function to avoid JsValue panic
        load_catalog_core(json).unwrap();
    }

    #[test]
    fn test_load_catalog() {
        load_test_data();
        let all_routes_res = get_all_routes_core(); // Use _core
        assert!(all_routes_res.is_ok());

        let db = DB.read().unwrap();
        assert_eq!(db.routes_list.len(), 2);
        assert!(db.routes_map.contains_key("R1_ZONA_HOTELERA_001"));
    }

    #[test]
    fn test_find_route_direct() {
        load_test_data();
        let db = DB.read().unwrap();
        let res = find_route_rs("La Rehoyada", "Zona Hotelera", &db.routes_list);

        assert!(!res.is_empty());
        assert_eq!(res[0].type_, "Direct");
        assert_eq!(res[0].legs[0].id, "R1_ZONA_HOTELERA_001");
    }

    #[test]
    fn test_find_route_transfer() {
        load_test_data();
        let db = DB.read().unwrap();

        let res = find_route_rs("Villas Otoch Paraíso", "Zona Hotelera", &db.routes_list);

        assert!(!res.is_empty());
        let transfer = res.iter().find(|j| j.type_ == "Transfer");
        assert!(transfer.is_some());

        let t = transfer.unwrap();
        assert_eq!(t.legs[0].id, "R2_94_VILLAS_OTOCH_001");
        assert_eq!(t.legs[1].id, "R1_ZONA_HOTELERA_001");
        assert_eq!(t.transfer_point.as_deref(), Some("El Crucero"));
    }

    #[test]
<<<<<<< HEAD
    fn test_invalid_json() {
        let res = load_catalog_core("invalid json"); // Use _core
        assert!(res.is_err());
    }

    #[test]
    fn test_get_route_by_id() {
        load_test_data();
        let route = get_route_by_id_core("R1_ZONA_HOTELERA_001").unwrap(); // Use _core
        assert!(route.is_some());
        assert_eq!(route.unwrap().id, "R1_ZONA_HOTELERA_001");
=======
    fn test_transfer_logic() {
        // Villas Otoch -> Playa Delfines (requires transfer)
        // R-28 (Villas Otoch -> El Crucero)
        // R-1 (El Crucero -> Playa Delfines)

        // This relies on CATALOG data
        let res = find_route_rs("Villas Otoch", "Playa Delfines");
        // Optimization short-circuit
        if res.iter().any(|j| j.type_ == "Direct") { return; }

        // Filter for transfer
        let transfer_routes: Vec<_> = res.iter().filter(|j| j.type_ == "Transfer").collect();

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
        // "Plaza Las Américas" [21.141, -86.843]
        // Point slightly off
        let res = find_nearest_stop_rs(21.1415, -86.8435);
        assert!(res.is_some());
        assert_eq!(res.unwrap().name, "Plaza Las Américas");
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
        // Test Point: 21.145, -86.83 (Approx middle of nowhere in downtown)

        let res = analyze_gap_rs(21.145, -86.83, 21.1685, -86.885);

        assert_eq!(res.recommendation, "Private");
    }

    #[test]
    fn test_direct_priority() {
        // "Villas Otoch Paraíso" -> "Zona Hotelera" is a direct route on R-2-94.
        // It should NOT return any transfers even if they exist.
        let res = find_route_rs("Villas Otoch Paraíso", "Zona Hotelera");

        assert!(!res.is_empty());
        // All returned journeys must be Direct
        assert!(res.iter().all(|j| j.type_ == "Direct"));
>>>>>>> origin/security/harden-wasm-ffi-6480731573874893142
    }
}
