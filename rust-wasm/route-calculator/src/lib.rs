use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::RwLock;

use wasm_bindgen::prelude::*;

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

    // Computed fields (skipped in serialization)
    #[serde(skip)]
    pub stops_normalized: Vec<String>,
    #[serde(skip)]
    pub stop_name_to_index: HashMap<String, usize>,

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
    pub type_: String, // "Direct" | "Transfer" | "Transfer2"
    pub legs: Vec<Route>,
    pub transfer_point: Option<String>,
    pub total_price: f64,
    /// Indicates transfer was found via geographic proximity (not exact stop name match)
    #[serde(default)]
    pub geo_transfer: bool,
    /// True if origin stop comes before destination in the route (forward direction)
    #[serde(default)]
    pub is_forward: bool,
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

// --- HAVERSINE DISTANCE ---

/// Returns distance in meters between two lat/lng points.
#[inline]
#[allow(dead_code)]
fn haversine_distance_m(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    const R: f64 = 6_371_000.0;
    let d_lat = (lat2 - lat1).to_radians();
    let d_lon = (lon2 - lon1).to_radians();
    let a = (d_lat / 2.0).sin().powi(2)
        + lat1.to_radians().cos() * lat2.to_radians().cos() * (d_lon / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
    R * c
}

/// True if stop has valid non-zero coordinates.
#[inline]
#[allow(dead_code)]
fn stop_has_coords(stop: &Stop) -> bool {
    stop.lat.abs() > 0.0001 && stop.lng.abs() > 0.0001
}

// --- CATALOG VALIDATION ---

fn validate_catalog(catalog: &RouteCatalog) -> Result<(), String> {
    const MAX_ROUTES: usize = 5000;
    const MAX_STOPS_PER_ROUTE: usize = 500;
    const MAX_ID_LEN: usize = 100;
    const MAX_NAME_LEN: usize = 200;

    if catalog.rutas.len() > MAX_ROUTES {
        return Err(format!(
            "Catalog exceeds maximum route limit ({} > {})",
            catalog.rutas.len(),
            MAX_ROUTES
        ));
    }

    for route in &catalog.rutas {
        if route.id.len() > MAX_ID_LEN {
            return Err(format!("Route ID too long ({} > {})", route.id.len(), MAX_ID_LEN));
        }
        if route.name.len() > MAX_NAME_LEN {
            return Err(format!(
                "Route Name too long ({} > {})",
                route.name.len(),
                MAX_NAME_LEN
            ));
        }
        if route.stops.len() > MAX_STOPS_PER_ROUTE {
            return Err(format!(
                "Route '{}' has too many stops ({} > {})",
                route.id,
                route.stops.len(),
                MAX_STOPS_PER_ROUTE
            ));
        }
        for stop in &route.stops {
            if stop.name.len() > MAX_ID_LEN {
                return Err(format!(
                    "Stop Name too long in route '{}' ({} > {})",
                    route.id,
                    stop.name.len(),
                    MAX_ID_LEN
                ));
            }
        }
    }
    Ok(())
}

pub fn load_catalog_core(json_payload: &str) -> Result<(), String> {
    const MAX_PAYLOAD_SIZE: usize = 10 * 1024 * 1024; // 10 MB
    if json_payload.len() > MAX_PAYLOAD_SIZE {
        return Err("Payload too large (max 10MB)".to_string());
    }

    let mut catalog: RouteCatalog = serde_json::from_str(json_payload).map_err(|e| {
        format!(
            "JSON Parse Error: {}. Expected {{version, rutas: [...]}}",
            e
        )
    })?;

    validate_catalog(&catalog)?;

    if catalog.rutas.is_empty() {
        return Err("ERROR: Catalog contains 0 routes".to_string());
    }

    // Pre-compute normalized stop names + O(1) index
    for route in &mut catalog.rutas {
        route.stops_normalized = route.stops.iter().map(|s| normalize_str(&s.name)).collect();
        route.stop_name_to_index = route
            .stops_normalized
            .iter()
            .enumerate()
            .map(|(idx, name)| (name.clone(), idx))
            .collect();
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
    // Sentinel: DoS Protection - Limit ID length to prevent hash collision attacks or massive allocation
    if id.len() > 100 {
        return Ok(None);
    }
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

/// Normalises a stop-name string for accent-insensitive, case-insensitive
/// comparisons.  Trims whitespace, lowercases, and replaces the most common
/// Spanish diacritics so that, e.g., "Aeropuerto" and "aeropuerto" and
/// "Aeropuerto" all hash to the same key.
///
/// Must stay in sync with `normalizeString()` in `src/utils/utils.ts`.
fn normalize_str(s: &str) -> String {
    s.trim()
        .to_lowercase()
        .replace("á", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ú", "u")
        .replace("ü", "u")
        .replace("ñ", "n")
}

/// Known Cancún transfer hubs. Substring match against stop names.
const PREFERRED_HUBS: &[&str] = &[
    "El Crucero",
    "Plaza Las Américas",
    "Las Américas",
    "ADO",
    "Zona Hotelera",
    "Muelle Ultramar",
    "Terminal de Autobuses",
    "Mercado 23",
    "Mercado 28",
    "Parque de las Palapas",
    "Puerto Juárez",
    "Punta Sam",
    "Gran Plaza",
    "Walmart",
    "Sam's Club",
    "La Diana",
    "Kabah",
    "Chedraui",
    "Liverpool",
    "Nichupté",
    "SM 64",
    "Súper Manzana",
];

/// Geographic transfer threshold: stops within 350 m can be used as a transfer point.
#[allow(dead_code)]
const GEO_TRANSFER_RADIUS_M: f64 = 350.0;

/// Fuzzy stop matching with Jaro-Winkler (O(n) worst case, O(1) for exact match).
fn match_stop<'a>(
    query_norm: &str,
    route: &'a Route,
    cache: &mut HashMap<&'a str, f64>,
) -> Option<usize> {
    // O(1) exact match
    if let Some(&idx) = route.stop_name_to_index.get(query_norm) {
        return Some(idx);
    }

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
                None => best_match = Some((i, score)),
                Some((_, best_score)) if score > best_score => best_match = Some((i, score)),
                _ => {}
            }
        }
    }

    best_match.map(|(i, _)| i)
}

struct RouteMatch<'a> {
    route: &'a Route,
    origin_idx: Option<usize>,
    dest_idx: Option<usize>,
}

const MAX_SEARCH_RESULTS: usize = 200;
const MAX_OPS: usize = 10_000_000;
const MAX_CANDIDATES: usize = 2000;

struct TransferCandidate<'a> {
    route_a: &'a Route,
    route_b: &'a Route,
    transfer_name: String,
    price: f64,
    is_preferred: bool,
    geo_transfer: bool,
}

/// Find direct (single-leg) routes.
/// Prefers routes where origin comes before destination (forward direction).
fn find_direct_routes(route_matches: &[RouteMatch]) -> Vec<Journey> {
    let mut forward = Vec::new();
    let mut reverse = Vec::new();

    for m in route_matches {
        if forward.len() + reverse.len() >= MAX_SEARCH_RESULTS {
            break;
        }
        if let (Some(origin_idx), Some(dest_idx)) = (m.origin_idx, m.dest_idx) {
            if origin_idx == dest_idx {
                continue;
            }
            let is_fwd = origin_idx < dest_idx;
            let journey = Journey {
                type_: "Direct".to_string(),
                legs: vec![m.route.clone()],
                transfer_point: None,
                total_price: m.route.price,
                geo_transfer: false,
                is_forward: is_fwd,
            };
            if is_fwd {
                forward.push(journey);
            } else {
                // Route goes in reverse direction — still valid (bidirectional buses),
                // but deprioritized in the final sort.
                reverse.push(journey);
            }
        }
    }

    let mut journeys = forward;
    journeys.extend(reverse);

    if journeys.len() > 5 {
        journeys.sort_by(|a, b| {
            a.total_price
                .partial_cmp(&b.total_price)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        journeys.truncate(5);
    }

    journeys
}

/// Find routes with a single transfer (A → hub → B).
/// Uses exact stop-name matching first, then falls back to geographic proximity (≤350 m).
fn find_transfer_routes(
    route_matches: &[RouteMatch],
    mut ops_count: usize,
    existing_journeys_len: usize,
) -> Vec<Journey> {
    let routes_from_origin: Vec<&RouteMatch> = route_matches
        .iter()
        .filter(|m| m.origin_idx.is_some())
        .collect();
    let routes_to_dest: Vec<&RouteMatch> = route_matches
        .iter()
        .filter(|m| m.dest_idx.is_some())
        .collect();

    let mut candidates: Vec<TransferCandidate> = Vec::with_capacity(MAX_CANDIDATES);

    'outer: for match_a in &routes_from_origin {
        let route_a = match_a.route;
        let origin_idx_a = match match_a.origin_idx {
            Some(idx) => idx,
            None => continue,
        };

        for match_b in &routes_to_dest {
            if existing_journeys_len + candidates.len() >= MAX_CANDIDATES {
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

            let mut best_transfer: Option<(usize, bool, bool)> = None; // (idx_a, is_preferred, geo)

            // Pass 1: Exact stop-name match between route_a and route_b
            for (idx_a, stop_norm_a) in route_a.stops_normalized.iter().enumerate() {
                ops_count += 1;
                if ops_count > MAX_OPS {
                    break 'outer;
                }

                if idx_a == origin_idx_a {
                    continue;
                }

                if let Some(&idx_b) = route_b.stop_name_to_index.get(stop_norm_a) {
                    if idx_b == dest_idx_b {
                        continue;
                    }

                    if let Some(stop) = route_a.stops.get(idx_a) {
                        let stop_name = &stop.name;
                        let is_preferred = PREFERRED_HUBS.iter().any(|h| stop_name.contains(h));

                        match best_transfer {
                            None => {
                                best_transfer = Some((idx_a, is_preferred, false));
                            }
                            Some((_, current_is_preferred, _)) => {
                                if is_preferred && !current_is_preferred {
                                    best_transfer = Some((idx_a, is_preferred, false));
                                }
                            }
                        }
                    }
                }
            }

            // Pass 2: Geographic match between route_a and route_b (if no exact match found)
            if best_transfer.is_none() {
                'geo: for (idx_a, stop_a) in route_a.stops.iter().enumerate() {
                    if idx_a == origin_idx_a || !stop_has_coords(stop_a) {
                        continue;
                    }
                    for (idx_b, stop_b) in route_b.stops.iter().enumerate() {
                        ops_count += 1;
                        if ops_count > MAX_OPS {
                            break 'outer;
                        }
                        if idx_b == dest_idx_b || !stop_has_coords(stop_b) {
                            continue;
                        }
                        if haversine_distance_m(stop_a.lat, stop_a.lng, stop_b.lat, stop_b.lng) <= GEO_TRANSFER_RADIUS_M {
                            let stop_name = &stop_a.name;
                            let is_preferred = PREFERRED_HUBS.iter().any(|h| stop_name.contains(h));
                            best_transfer = Some((idx_a, is_preferred, true));
                            break 'geo;
                        }
                    }
                }
            }

            if let Some((idx_a, is_preferred, geo_transfer)) = best_transfer {
                if let Some(stop) = route_a.stops.get(idx_a) {
                    candidates.push(TransferCandidate {
                        route_a,
                        route_b,
                        transfer_name: stop.name.clone(),
                        price: route_a.price + route_b.price,
                        is_preferred,
                        geo_transfer,
                    });
                }
            }
        }
    }

    // Sort: preferred hubs > exact-name matches > geo matches > lowest price
    candidates.sort_by(|a, b| {
        let score_a = if a.is_preferred { 2 } else if !a.geo_transfer { 1 } else { 0 };
        let score_b = if b.is_preferred { 2 } else if !b.geo_transfer { 1 } else { 0 };
        score_b.cmp(&score_a).then_with(|| {
            a.price
                .partial_cmp(&b.price)
                .unwrap_or(std::cmp::Ordering::Equal)
        })
    });

    let slots = 5_usize.saturating_sub(existing_journeys_len);
    candidates
        .into_iter()
        .take(slots)
        .map(|c| Journey {
            type_: "Transfer".to_string(),
            legs: vec![c.route_a.clone(), c.route_b.clone()],
            transfer_point: Some(c.transfer_name),
            total_price: c.price,
            geo_transfer: c.geo_transfer,
            is_forward: false,
        })
        .collect()
}

/// Main routing function. Returns up to 5 journeys (Direct first, then Transfer).
fn find_route_rs(origin: &str, dest: &str, all_routes: &[Route]) -> Vec<Journey> {
    let origin_norm = normalize_str(origin);
    let dest_norm = normalize_str(dest);
    let mut origin_cache: HashMap<&str, f64> = HashMap::new();
    let mut dest_cache: HashMap<&str, f64> = HashMap::new();

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

    let mut journeys = find_direct_routes(&route_matches);

    if journeys.len() >= 5 {
        return journeys;
    }

    let transfer_journeys =
        find_transfer_routes(&route_matches, 0, journeys.len());
    journeys.extend(transfer_journeys);

    // Final sort: Forward Direct > Reverse Direct > Transfer via preferred hub > Transfer via geo > price
    journeys.sort_by(|a, b| {
        let score = |j: &Journey| -> i32 {
            if j.type_ == "Direct" {
                if j.is_forward { 5 } else { 4 }
            } else if let Some(tp) = &j.transfer_point {
                if PREFERRED_HUBS.iter().any(|h| tp.contains(h)) {
                    if j.geo_transfer { 2 } else { 3 }
                } else {
                    if j.geo_transfer { 1 } else { 2 }
                }
            } else {
                0
            }
        };

        score(b).cmp(&score(a)).then_with(|| {
            a.total_price
                .partial_cmp(&b.total_price)
                .unwrap_or(std::cmp::Ordering::Equal)
        })
    });

    journeys.truncate(5);
    journeys
}

// --- TESTS ---

#[cfg(test)]
mod tests {
    use super::*;

    fn catalog_two_routes() -> &'static str {
        r#"{
            "version": "2.3.0",
            "rutas": [
                {
                    "id": "R1_ZONA_HOTELERA_001",
                    "nombre": "R-1 Centro -> Zona Hotelera",
                    "tarifa": 15,
                    "tipo": "Bus_Urbano",
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
                    "tipo": "Bus_Urbano",
                    "paradas": [
                        { "nombre": "Villas Otoch Paraíso", "lat": 21.1685, "lng": -86.885, "orden": 1 },
                        { "nombre": "El Crucero", "lat": 21.1576, "lng": -86.8269, "orden": 2 }
                    ]
                }
            ]
        }"#
    }

    fn load_two_routes() {
        load_catalog_core(catalog_two_routes()).unwrap();
    }

    #[test]
    fn test_load_catalog() {
        load_two_routes();
        let db = DB.read().unwrap();
        assert_eq!(db.routes_list.len(), 2);
        assert!(db.routes_map.contains_key("R1_ZONA_HOTELERA_001"));
    }

    #[test]
    fn test_find_route_direct_forward() {
        load_two_routes();
        let db = DB.read().unwrap();
        let res = find_route_rs("La Rehoyada", "Zona Hotelera", &db.routes_list);
        assert!(!res.is_empty());
        assert_eq!(res[0].type_, "Direct");
        assert_eq!(res[0].legs[0].id, "R1_ZONA_HOTELERA_001");
    }

    #[test]
    fn test_find_route_direct_reverse_deprioritized() {
        load_two_routes();
        let db = DB.read().unwrap();
        // Zona Hotelera is stop 3, La Rehoyada is stop 1 → reverse direction
        let res = find_route_rs("Zona Hotelera", "La Rehoyada", &db.routes_list);
        // Should still find a route, but it's a reverse-direction journey
        assert!(!res.is_empty());
        // Forward routes come before reverse; reverse is still returned
        assert_eq!(res[0].type_, "Direct");
    }

    #[test]
    fn test_find_route_transfer_exact_name() {
        load_two_routes();
        let db = DB.read().unwrap();
        let res = find_route_rs("Villas Otoch Paraíso", "Zona Hotelera", &db.routes_list);
        assert!(!res.is_empty());
        let transfer = res.iter().find(|j| j.type_ == "Transfer");
        assert!(transfer.is_some(), "Expected at least one Transfer journey");
        let t = transfer.unwrap();
        assert_eq!(t.legs[0].id, "R2_94_VILLAS_OTOCH_001");
        assert_eq!(t.legs[1].id, "R1_ZONA_HOTELERA_001");
        assert_eq!(t.transfer_point.as_deref(), Some("El Crucero"));
        assert!(!t.geo_transfer, "Should be exact-name transfer, not geo");
    }

    #[test]
    fn test_find_route_transfer_geographic() {
        // Route A: origin → Stop near [21.15, -86.82]
        // Route B: Stop near [21.1502, -86.8205] (within 350m) → destination
        // No shared stop name — should find geo transfer
        let json = r#"{
            "version": "1.0",
            "rutas": [
                {
                    "id": "GEO_A",
                    "nombre": "Geo Route A",
                    "tarifa": 12,
                    "tipo": "Bus_Urbano",
                    "paradas": [
                        { "nombre": "Origen Norte", "lat": 21.20, "lng": -86.85, "orden": 1 },
                        { "nombre": "Parada Intermedia A", "lat": 21.150, "lng": -86.820, "orden": 2 }
                    ]
                },
                {
                    "id": "GEO_B",
                    "nombre": "Geo Route B",
                    "tarifa": 12,
                    "tipo": "Bus_Urbano",
                    "paradas": [
                        { "nombre": "Parada Intermedia B", "lat": 21.1503, "lng": -86.8202, "orden": 1 },
                        { "nombre": "Destino Sur", "lat": 21.10, "lng": -86.80, "orden": 2 }
                    ]
                }
            ]
        }"#;
        load_catalog_core(json).unwrap();
        let db = DB.read().unwrap();
        let res = find_route_rs("Origen Norte", "Destino Sur", &db.routes_list);
        assert!(!res.is_empty(), "Should find at least one route via geo transfer");
        let transfer = res.iter().find(|j| j.type_ == "Transfer");
        assert!(transfer.is_some(), "Expected a Transfer journey via geo proximity");
        let t = transfer.unwrap();
        assert!(t.geo_transfer, "Should be marked as geo_transfer");
    }

    #[test]
    fn test_find_route_no_results_garbage() {
        load_two_routes();
        let db = DB.read().unwrap();
        let res = find_route_rs("XyZ123Rubbish", "AbC987Junk", &db.routes_list);
        assert!(res.is_empty(), "Should return empty for garbage input");
    }

    #[test]
    fn test_invalid_json() {
        let res = load_catalog_core("invalid json");
        assert!(res.is_err());
    }

    #[test]
    fn test_get_route_by_id() {
        load_two_routes();
        let route = get_route_by_id_core("R1_ZONA_HOTELERA_001").unwrap();
        assert!(route.is_some());
        assert_eq!(route.unwrap().id, "R1_ZONA_HOTELERA_001");
    }

    #[test]
    fn test_large_payload_rejected() {
        let padding = " ".repeat(11 * 1024 * 1024);
        let route = r#"{"id": "R1", "nombre": "R1", "tarifa": 10.0, "tipo": "Bus", "paradas": []}"#;
        let json = format!(r#"{{"version": "1.0", "rutas": [{}]{}}}"#, route, padding);
        let res = load_catalog_core(&json);
        assert!(res.is_err());
        assert_eq!(res.err().unwrap(), "Payload too large (max 10MB)");
    }

    #[test]
    fn test_too_many_routes_rejected() {
        let mut routes = Vec::new();
        for i in 0..5001 {
            routes.push(Route {
                id: format!("R_{}", i),
                name: "R".to_string(),
                price: 10.0,
                transport_type: "Bus".to_string(),
                empresa: None,
                frecuencia_minutos: None,
                horario: None,
                stops: Vec::new(),
                stops_normalized: Vec::new(),
                stop_name_to_index: HashMap::new(),
                social_alerts: Vec::new(),
                last_updated: String::new(),
            });
        }
        let catalog = RouteCatalog {
            version: "1.0".to_string(),
            rutas: routes,
        };
        let json = serde_json::to_string(&catalog).unwrap();
        let res = load_catalog_core(&json);
        assert!(res.is_err());
        assert!(res.err().unwrap().contains("Catalog exceeds maximum route limit"));
    }

    #[test]
    fn test_too_many_stops_rejected() {
        let mut stops_json = String::new();
        for i in 0..501 {
            stops_json.push_str(&format!(
                r#"{{"nombre": "Stop {}", "lat": 0.0, "lng": 0.0, "orden": {}}},"#,
                i, i
            ));
        }
        stops_json.pop();
        let json = format!(
            r#"{{"version": "1.0", "rutas": [{{"id": "R_BOMB", "nombre": "Logic Bomb", "tarifa": 10.0, "tipo": "Bus", "paradas": [{}]}}]}}"#,
            stops_json
        );
        let res = load_catalog_core(&json);
        assert!(res.is_err());
        assert!(res.err().unwrap().contains("too many stops"));
    }

    #[test]
    fn test_dos_protection() {
        // Worst-case: many route pairs with no transfers, triggers MAX_OPS guard
        let mut routes = Vec::new();
        for i in 0..100 {
            let mut stops = Vec::new();
            for j in 0..50 {
                stops.push(Stop {
                    id: None,
                    name: format!("Stop A {} {}", i, j),
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
                stops_normalized: (0..50).map(|j| format!("stop a {} {}", i, j)).collect(),
                stop_name_to_index: (0..50)
                    .map(|j| (format!("stop a {} {}", i, j), j))
                    .collect(),
                stops,
                social_alerts: Vec::new(),
                last_updated: String::new(),
            });
        }
        let start = std::time::Instant::now();
        let _res = find_route_rs("Stop A 0 0", "Stop A 99 49", &routes);
        let duration = start.elapsed();
        assert!(
            duration.as_millis() < 2000,
            "DoS protection triggered too late: {:?}",
            duration
        );
    }

    #[test]
    fn test_high_transfer_volume_truncated() {
        let mut routes = Vec::new();
        for i in 0..50 {
            routes.push(Route {
                id: format!("A_{}", i),
                name: format!("A {}", i),
                price: 5.0,
                transport_type: "Bus".to_string(),
                empresa: None,
                frecuencia_minutos: None,
                horario: None,
                stops: vec![
                    Stop { id: None, name: "Start".to_string(), lat: 0.0, lng: 0.0, orden: 1, landmarks: String::new() },
                    Stop { id: None, name: format!("Hub_{}", i), lat: 0.0, lng: 0.0, orden: 2, landmarks: String::new() },
                ],
                stops_normalized: vec!["start".to_string(), format!("hub_{}", i)],
                stop_name_to_index: vec![("start".to_string(), 0), (format!("hub_{}", i), 1)].into_iter().collect(),
                social_alerts: Vec::new(),
                last_updated: String::new(),
            });
            routes.push(Route {
                id: format!("B_{}", i),
                name: format!("B {}", i),
                price: 5.0,
                transport_type: "Bus".to_string(),
                empresa: None,
                frecuencia_minutos: None,
                horario: None,
                stops: vec![
                    Stop { id: None, name: format!("Hub_{}", i), lat: 0.0, lng: 0.0, orden: 1, landmarks: String::new() },
                    Stop { id: None, name: "End".to_string(), lat: 0.0, lng: 0.0, orden: 2, landmarks: String::new() },
                ],
                stops_normalized: vec![format!("hub_{}", i), "end".to_string()],
                stop_name_to_index: vec![(format!("hub_{}", i), 0), ("end".to_string(), 1)].into_iter().collect(),
                social_alerts: Vec::new(),
                last_updated: String::new(),
            });
        }

        let res = find_route_rs("Start", "End", &routes);
        assert!(!res.is_empty());
        assert!(res.len() <= 5, "Result must be truncated to max 5");
    }

    #[test]
    fn test_haversine_accuracy() {
        // ~157 m between two close Cancún coordinates
        let d = haversine_distance_m(21.1576, -86.8269, 21.1590, -86.8269);
        assert!(d > 100.0 && d < 250.0, "Expected ~157m, got {}m", d);
    }

    #[test]
    fn test_geo_transfer_threshold() {
        // Two stops exactly 300m apart should qualify for geo transfer
        let stop_a = Stop { id: None, name: "A".to_string(), lat: 21.1576, lng: -86.8269, orden: 1, landmarks: String::new() };
        let stop_b = Stop { id: None, name: "B".to_string(), lat: 21.1603, lng: -86.8269, orden: 1, landmarks: String::new() };
        let d = haversine_distance_m(stop_a.lat, stop_a.lng, stop_b.lat, stop_b.lng);
        assert!(d < GEO_TRANSFER_RADIUS_M, "Should be within geo threshold: {}m", d);
    }
}
