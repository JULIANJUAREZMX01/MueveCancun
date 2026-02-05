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

#[derive(Serialize, Deserialize, Clone, Debug)]
struct EmbeddedStop {
    name: String,
    lat: f64,
    lng: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct EmbeddedRoute {
    id: String,
    name: String,
    operator: String,
    stops: Vec<EmbeddedStop>,
    #[serde(default)]
    transport_type: String,
    #[serde(default)]
    price: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct EmbeddedData {
    routes: Vec<EmbeddedRoute>,
    stops: HashMap<String, Vec<f64>>,
}

// Dynamic Stop Database for Last Mile Logic
static STOPS_DB: Lazy<RwLock<HashMap<String, (f64, f64)>>> = Lazy::new(|| {
    let mut m = HashMap::new();
    // Keep legacy hardcoded stops for tests and fallback
    m.insert("OXXO Villas Otoch Paraíso".to_string(), (21.1685, -86.885));
    m.insert("Chedraui Lakin".to_string(), (21.165, -86.879));
    m.insert("Av. Kabah".to_string(), (21.16, -86.845));
    m.insert("Plaza Las Américas".to_string(), (21.141, -86.843));
    m.insert("Entrada Zona Hotelera".to_string(), (21.153, -86.815));
    m.insert("Zona Hotelera".to_string(), (21.135, -86.768));
    m.insert("La Rehoyada".to_string(), (21.1619, -86.8515));
    m.insert("El Crucero".to_string(), (21.1576, -86.8269));
    m.insert("Av. Tulum Norte".to_string(), (21.165, -86.823));
    m.insert("Playa del Niño".to_string(), (21.195, -86.81));
    m.insert("Muelle Ultramar".to_string(), (21.207, -86.802));
    m.insert("Terminal ADO Centro".to_string(), (21.1586, -86.8259));
    m.insert("Aeropuerto T2".to_string(), (21.0417, -86.8761));
    m.insert("Aeropuerto T3".to_string(), (21.041, -86.8755));
    m.insert("Aeropuerto T4".to_string(), (21.04, -86.875));
    m.insert("Playa del Carmen Centro".to_string(), (20.6296, -87.0739));
    m.insert("Villas Otoch Paraíso".to_string(), (21.1685, -86.885));
    m.insert("Villas Otoch".to_string(), (21.1685, -86.885));
    m.insert("Hospital General".to_string(), (21.15, -86.84));
    m.insert("Mercado 28".to_string(), (21.162, -86.828));

    // Load Embedded Data
    let json_str = include_str!("rust_data/embedded_routes.json");
    if let Ok(data) = serde_json::from_str::<EmbeddedData>(json_str) {
        for (name, coords) in data.stops {
            if coords.len() >= 2 {
                m.insert(name, (coords[0], coords[1]));
            }
        }
    } else {
        // Fallback
    }

    RwLock::new(m)
});

#[wasm_bindgen]
pub fn load_stops_data(val: JsValue) {
    // Expecting a JSON object: { "Stop Name": [lat, lng], ... }
    // Using simple array format for coords to match JS extraction output [lat, lng]
    // HashMap<String, Vec<f64>> or HashMap<String, (f64, f64)>?
    // serde_wasm_bindgen should handle [f64, f64] as (f64, f64) tuple or Vec<f64>.
    // Let's use Vec<f64> for safety and convert.

    let new_data: HashMap<String, Vec<f64>> = match serde_wasm_bindgen::from_value(val) {
        Ok(d) => d,
        Err(_) => {
            // console::error not available, silently fail or use println
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
    // New Fields
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
    let raw_data = vec![
        (
            "R2_94_VILLAS_OTOCH_001",
            "R-2-94 Villas Otoch (Eje Kabah - ZH)",
            TransportType::Bus,
            15.0,
            "05:00 - 22:30 (Guardia 03:00-05:00)",
            "10 min",
            vec!["OXXO Villas Otoch Paraíso", "Chedraui Lakin", "Av. Kabah", "Plaza Las Américas", "Entrada Zona Hotelera", "Zona Hotelera"],
            "",
        ),
        (
            "CR_PTO_JUAREZ_001",
            "Combi Roja Puerto Juárez (Ultramar)",
            TransportType::Combi,
            13.0,
            "05:30 - 00:30",
            "15 min",
            vec!["La Rehoyada", "El Crucero", "Av. Tulum Norte", "Playa del Niño", "Muelle Ultramar"],
            "Autocar",
        ),
        (
            "R1_ZONA_HOTELERA_001",
            "R-1 Centro - Zona Hotelera",
            TransportType::Bus,
            15.0,
            "06:00 - 22:30",
            "10 min",
            vec!["La Rehoyada", "El Crucero", "Av. Tulum Sur", "El Cebiche", "Zona Hotelera", "Playa Delfines"],
            "SEA / Maya Caribe",
        ),
        (
            "VAN_PLAYA_EXPRESS_001",
            "Playa Express (Cancún - Playa del Carmen)",
            TransportType::Van,
            55.0,
            "05:00 - 00:00",
            "30 min",
            vec!["Terminal ADO Centro", "Entrada Aeropuerto", "Gasolinera López Portillo", "Puerto Morelos", "Playa Maroma", "Playa del Carmen Centro"],
            "",
        ),
        (
            "R28_VILLAS_OTOCH_001",
            "R-28 Villas Otoch - Av. Tulum",
            TransportType::Bus,
            13.0,
            "", // No schedule in JSON
            "", // No frequency in JSON
            vec!["Villas Otoch Paraíso", "Paseos Kabah", "Hospital General", "El Crucero"],
            "",
        ),
        (
            "R19_VILLAS_OTOCH_002",
            "R-19 Villas Otoch - Crucero",
            TransportType::Bus,
            13.0,
            "",
            "",
            vec!["Villas Otoch", "Hospital General", "Zona Industrial", "Mercado 28", "El Crucero"],
            "",
        ),
        (
            "ADO_AEROPUERTO_001",
            "ADO Aeropuerto - Centro",
            TransportType::Bus,
            150.0,
            "",
            "",
            vec!["Aeropuerto T2", "Aeropuerto T3", "Aeropuerto T4", "Terminal ADO Centro"],
            "",
        ),
        (
            "R10_AEROPUERTO",
            "R-10 Las Américas - Aeropuerto (Trabajadores)",
            TransportType::Bus,
            15.0,
            "04:00-23:00",
            "",
            vec!["Plaza Las Américas", "Av. Nichupté", "Av. Kabah", "Av. La Luna", "Av. Las Torres", "Av. Huayacán", "Carr. Federal 307", "UT Cancún", "Aeropuerto T3", "Aeropuerto T2"],
            "",
        ),
    ];

    raw_data.into_iter().map(|(id, name, t_type, price, schedule, frequency, stops, operator)| {
        let stops_vec: Vec<String> = stops.into_iter().map(|s| s.to_string()).collect();
        let stops_normalized: Vec<String> = stops_vec.iter().map(|s| s.to_lowercase()).collect();
        let origin = stops_vec.first().cloned().unwrap_or_else(|| "Unknown".to_string());
        let dest = stops_vec.last().cloned().unwrap_or_else(|| "Unknown".to_string());

        // Infer duration or default
        let duration = if !frequency.is_empty() {
             format!("Freq: {}", frequency)
        } else {
             "Unknown".to_string()
        };

        Route {
            id: id.to_string(),
            name: name.to_string(),
            transport_type: t_type,
            price,
            duration,
            badges: vec![],
            origin_hub: origin,
            dest_hub: dest,
            stops: stops_vec,
            stops_normalized,
            operator: operator.to_string(),
            schedule: schedule.to_string(),
            frequency: frequency.to_string(),
        }
    }).collect()
});

fn match_stop<'a>(
    query_norm: &str,
    route: &'a Route,
    cache: &mut HashMap<&'a str, f64>
) -> Option<usize> {
    let mut best_match: Option<(usize, f64)> = None;

    for (i, stop_lower) in route.stops_normalized.iter().enumerate() {
        let score = *cache.entry(stop_lower.as_str()).or_insert_with(|| {
            let jaro_score = strsim::jaro_winkler(query_norm, stop_lower);
            // Boost score for containment
            if stop_lower.contains(query_norm) || query_norm.contains(stop_lower) {
                f64::max(jaro_score, 0.95)
            } else {
                jaro_score
            }
        });

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

    // 1. Direct Routes
    for m in &route_matches {
        if let Some(origin_idx) = m.origin_idx {
            if let Some(dest_idx) = m.dest_idx {
                // Strict directionality: Origin must come before Destination
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

    // 2. Transfer Routes (1-Stop)
    let routes_from_origin: Vec<&RouteMatch> = route_matches.iter().filter(|m| m.origin_idx.is_some()).collect();
    let routes_to_dest: Vec<&RouteMatch> = route_matches.iter().filter(|m| m.dest_idx.is_some()).collect();

    let preferred_hubs = ["El Crucero", "Plaza Las Américas", "ADO Centro", "Zona Hotelera", "Muelle Ultramar"];

    for match_a in &routes_from_origin {
        let route_a = match_a.route;
        let origin_idx_a = match_a.origin_idx.unwrap();

        for match_b in &routes_to_dest {
            let route_b = match_b.route;
            let dest_idx_b = match_b.dest_idx.unwrap();

            // Skip same route (already covered by direct check, but safety first)
            if route_a.id == route_b.id {
                continue;
            }

            // Find intersection
            for (idx_a, stop_a) in route_a.stops_normalized.iter().enumerate() {
                // Must be after origin
                if idx_a <= origin_idx_a { continue; }

                for (idx_b, stop_b) in route_b.stops_normalized.iter().enumerate() {
                    // Must be before dest
                    if idx_b >= dest_idx_b { continue; }

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

        // Nearest might be Plaza Las Américas (approx 1.5km) or others.
        // Let's verify distance > 0.5km
        let res = analyze_gap_rs(21.145, -86.83, 21.1685, -86.885);

        // Debug print if it fails
        if res.recommendation != "Private" {
             println!("DEBUG: Found Nearest: {:?} with dist {}", res.origin_gap.as_ref().map(|s| &s.name), res.origin_gap.as_ref().map(|s| s.distance_km).unwrap_or(0.0));
        }

        assert_eq!(res.recommendation, "Private");
    }

}
