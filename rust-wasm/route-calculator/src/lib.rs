use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::RwLock;
use strsim;
use wasm_bindgen::prelude::*; // Sentinel: Added for safe comparison

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
    #[serde(rename = "tipo", alias = "tipo_transporte")]
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

    #[serde(default, alias = "advertencias_usuario")]
    pub social_alerts: Vec<String>,
    #[serde(default)]
    pub last_updated: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Stop {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(rename = "nombre", alias = "parada")]
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
    const MAX_PAYLOAD_SIZE: usize = 10 * 1024 * 1024; // 10MB
    if json_payload.len() > MAX_PAYLOAD_SIZE {
        return Err("Payload too large (max 10MB)".to_string());
    }

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
    const MAX_OPS: usize = 10_000_000;
    let mut ops_count = 0;

    // 1. Direct Routes (Support bidirectional routes)
    for m in &route_matches {
        // Enforce limit on direct routes
        if journeys.len() >= MAX_SEARCH_RESULTS {
            break;
        }
        if let Some(origin_idx) = m.origin_idx {
            if let Some(dest_idx) = m.dest_idx {
                // ✅ FIX: Allow routes in BOTH directions
                // Most public transport routes in Cancún are bidirectional
                if origin_idx != dest_idx {
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

            // Optimization: Create a map of stops in route_b for O(1) lookup
            let mut route_b_stops = HashMap::new();
            for (idx, stop_name) in route_b.stops_normalized.iter().enumerate() {
                route_b_stops.insert(stop_name.as_str(), idx);
            }

            // Find the best transfer point for this pair
            let mut best_transfer: Option<(usize, bool)> = None; // (index in A, is_preferred)

            for (idx_a, stop_name_a) in route_a.stops_normalized.iter().enumerate() {
                ops_count += 1;
                if ops_count > MAX_OPS {
                    break 'outer;
                }

                // Skip if same as origin (unless it's a multi-stop loop, but usually redundant)
                if idx_a == origin_idx_a {
                    continue;
                }

                if let Some(&idx_b) = route_b_stops.get(stop_name_a.as_str()) {
                    // Skip if same as destination
                    if idx_b == dest_idx_b {
                        continue;
                    }

                    // Found intersection
                    let stop_name = &route_a.stops[idx_a].name;
                    let is_preferred = preferred_hubs.iter().any(|h| stop_name.contains(h));

                    match best_transfer {
                        None => {
                            best_transfer = Some((idx_a, is_preferred));
                        }
                        Some((_, current_is_preferred)) => {
                            // If current is preferred and previous wasn't, switch
                            if is_preferred && !current_is_preferred {
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

        // Sentinel Fix: Use unwrap_or(Ordering::Equal) to prevent panic on NaN
        score_b
            .cmp(&score_a) // Higher score first
            .then_with(|| {
                a.total_price
                    .partial_cmp(&b.total_price)
                    .unwrap_or(std::cmp::Ordering::Equal)
            }) // Lower price first
    });

    if journeys.len() > 5 {
        journeys.truncate(5);
    }

    journeys
}

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
    }
    #[test]
    fn test_garbage_input() {
        load_test_data();
        let db = DB.read().unwrap();
        let res = find_route_rs("XyZ123Rubbish", "AbC987Junk", &db.routes_list);
        assert!(res.is_empty(), "Should return empty for garbage input");
    }

    #[test]
    fn test_dos_repro() {
        // Create 2000 routes that all start with "Start"
        // Create 2000 routes that all end with "End"
        // Each has 50 stops.
        // Start routes: Stop A 0..49
        // End routes: Stop B 0..49
        // NO OVERLAP -> Worst case for finding no transfers (scan all pairs)

        let mut routes = Vec::new();
        for i in 0..2000 {
            let mut stops = Vec::new();
            for j in 0..50 {
                stops.push(Stop {
                    id: None,
                    name: format!("Common Long Prefix Stop A {}", j),
                    lat: 0.0,
                    lng: 0.0,
                    orden: j as u32,
                    landmarks: String::new(),
                });
            }
            routes.push(Route {
                id: format!("Start_{}", i),
                name: format!("Start Route {}", i),
                price: 10.0,
                transport_type: "Bus".to_string(),
                empresa: None,
                frecuencia_minutos: None,
                horario: None,
                stops: stops,
                stops_normalized: (0..50)
                    .map(|j| format!("common long prefix stop a {}", j))
                    .collect(),
                social_alerts: Vec::new(),
                last_updated: String::new(),
            });
        }

        for i in 0..2000 {
            let mut stops = Vec::new();
            for j in 0..50 {
                stops.push(Stop {
                    id: None,
                    name: format!("Common Long Prefix Stop B {}", j),
                    lat: 0.0,
                    lng: 0.0,
                    orden: j as u32,
                    landmarks: String::new(),
                });
            }
            routes.push(Route {
                id: format!("End_{}", i),
                name: format!("End Route {}", i),
                price: 10.0,
                transport_type: "Bus".to_string(),
                empresa: None,
                frecuencia_minutos: None,
                horario: None,
                stops: stops,
                stops_normalized: (0..50)
                    .map(|j| format!("common long prefix stop b {}", j))
                    .collect(),
                social_alerts: Vec::new(),
                last_updated: String::new(),
            });
        }

        let start = std::time::Instant::now();
        // Search from "Stop A 0" to "Stop B 49"
        // 2000 start routes * 2000 end routes * 49 stops * 50 stops
        // No matches found, so it scans everything.
        let _res = find_route_rs(
            "Common Long Prefix Stop A 0",
            "Common Long Prefix Stop B 49",
            &routes,
        );
        let duration = start.elapsed();
        println!("Time taken: {:?}", duration);

        // Without fix, this should take > 500ms (likely > 1s).
        assert!(
            duration.as_millis() < 500,
            "DoS vulnerability: took too long ({:?})",
            duration
        );
    }

    #[test]
    fn test_large_payload() {
        let padding = " ".repeat(11 * 1024 * 1024);
        let route = r#"{"id": "R1", "nombre": "R1", "tarifa": 10.0, "tipo": "Bus", "paradas": []}"#;
        let json = format!(r#"{{"version": "1.0", "rutas": [{}]{}}}"#, route, padding);

        let res = load_catalog_core(&json);
        assert!(res.is_err(), "Should reject large payload > 10MB");
        assert_eq!(res.err().unwrap(), "Payload too large (max 10MB)");
    }
}
