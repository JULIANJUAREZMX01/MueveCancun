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

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct Schedule {
    pub inicio: Option<String>,
    pub fin: Option<String>,
    pub inicio_oficial: Option<String>,
    pub fin_oficial: Option<String>,
    pub guardia_nocturna: Option<String>,
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
pub struct Journey {
    #[serde(rename = "id")]
    pub id: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub legs: Vec<RouteLeg>,
    pub total_price: f64,
    pub transfer_point: Option<String>,
    pub geo_transfer: bool,
    #[serde(default)]
    pub is_forward: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RouteLeg {
    pub route_id: String,
    pub route_name: String,
    pub origin_stop: String,
    pub dest_stop: String,
    pub price: f64,
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

#[inline]
fn haversine_distance_m(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    const R: f64 = 6_371_000.0;
    let d_lat = (lat2 - lat1).to_radians();
    let d_lon = (lon2 - lon1).to_radians();
    let a = (d_lat / 2.0).sin().powi(2)
        + lat1.to_radians().cos() * lat2.to_radians().cos() * (d_lon / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
    R * c
}

// --- CONSTANTS ---

const MAX_SEARCH_RESULTS: usize = 5;
const MAX_OPS: usize = 10_000_000;
const MAX_CANDIDATES: usize = 2000;
const GEO_TRANSFER_RADIUS_M: f64 = 350.0;

const PREFERRED_HUBS: &[&str] = &[
    "El Crucero", "Plaza Las Américas", "ADO", "Zona Hotelera", "Muelle Ultramar",
    "Mercado 23", "Mercado 28", "Plaza Outlet", "Puerto Juárez", "Av. Tulum",
    "Av. Kabah", "Parque de las Palapas", "Glorieta del Ceviche", "Plaza Hollywood",
];

// --- CORE ---

pub fn validate_catalog(catalog: &RouteCatalog) -> Result<(), String> {
    if catalog.rutas.len() > 5000 { return Err("Too many routes".to_string()); }
    for r in &catalog.rutas {
        if r.stops.len() > 500 { return Err(format!("Route {} has too many stops", r.id)); }
    }
    Ok(())
}

pub fn load_catalog_core(json_payload: &str) -> Result<(), String> {
    if json_payload.len() > 10 * 1024 * 1024 { return Err("Payload too large".to_string()); }
    let mut catalog: RouteCatalog = serde_json::from_str(json_payload).map_err(|e| e.to_string())?;
    validate_catalog(&catalog)?;

    for route in &mut catalog.rutas {
        route.stops_normalized = route.stops.iter().map(|s| s.name.to_lowercase()).collect();
        route.stop_name_to_index = route.stops_normalized.iter().enumerate()
            .map(|(i, n)| (n.clone(), i)).collect();
    }

    let mut db = DB.write().map_err(|_| "Lock failed".to_string())?;
    db.routes_map = catalog.rutas.iter().map(|r| (r.id.clone(), r.clone())).collect();
    db.routes_list = catalog.rutas;
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
    balance >= 0.0
}
#[wasm_bindgen]
pub fn load_catalog(json_payload: &str) -> Result<(), JsValue> {
    load_catalog_core(json_payload).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn find_route(origin: &str, dest: &str) -> Result<JsValue, JsValue> {
    let db = DB.read().map_err(|_| JsValue::from_str("Lock failed"))?;
    let journeys = find_route_rs(origin, dest, &db.routes_list);
    serde_wasm_bindgen::to_value(&journeys).map_err(|e| JsValue::from_str(&e.to_string()))
}

// --- ROUTING ENGINE ---

struct RouteMatch<'a> {
    route: &'a Route,
    origin_idx: Option<usize>,
    dest_idx: Option<usize>,
}

fn find_route_rs(origin: &str, dest: &str, all_routes: &[Route]) -> Vec<Journey> {
    let origin_norm = origin.to_lowercase();
    let dest_norm = dest.to_lowercase();

    let mut route_matches = Vec::with_capacity(all_routes.len());
    for route in all_routes {
        let origin_idx = route.stop_name_to_index.get(&origin_norm).cloned();
        let dest_idx = route.stop_name_to_index.get(&dest_norm).cloned();
        route_matches.push(RouteMatch { route, origin_idx, dest_idx });
    }

    let mut journeys = find_direct_routes(&route_matches);

    // If we have fewer than MAX_SEARCH_RESULTS direct routes, look for transfers
    if journeys.len() < MAX_SEARCH_RESULTS {
        let transfers = find_transfer_routes(&route_matches, 0, journeys.len());
        journeys.extend(transfers);
    }

    // Sort: Direct (Forward > Reverse) > Hub Transfer > Geo Transfer > Price
    journeys.sort_by(|a, b| {
        let score = |j: &Journey| -> i32 {
            let mut s = 0;
            if j.type_ == "Direct" {
                s += 1000;
                if j.is_forward { s += 500; }
            } else {
                if let Some(tp) = &j.transfer_point {
                    if PREFERRED_HUBS.iter().any(|h| tp.contains(h)) { s += 100; }
                }
                if !j.geo_transfer { s += 50; }
            }
            s
        };
        score(b).cmp(&score(a)).then_with(|| a.total_price.partial_cmp(&b.total_price).unwrap())
    });

    journeys.truncate(MAX_SEARCH_RESULTS);
    journeys
}

fn find_direct_routes(matches: &[RouteMatch]) -> Vec<Journey> {
    let mut journeys = Vec::new();
    for m in matches {
        if let (Some(oi), Some(di)) = (m.origin_idx, m.dest_idx) {
            journeys.push(Journey {
                id: format!("{}_dir", m.route.id),
                type_: "Direct".to_string(),
                legs: vec![RouteLeg {
                    route_id: m.route.id.clone(),
                    route_name: m.route.name.clone(),
                    origin_stop: m.route.stops[oi].name.clone(),
                    dest_stop: m.route.stops[di].name.clone(),
                    price: m.route.price,
                }],
                total_price: m.route.price,
                transfer_point: None,
                geo_transfer: false,
                is_forward: oi < di,
            });
        }
    }
    journeys
}

fn find_transfer_routes(matches: &[RouteMatch], mut ops: usize, existing: usize) -> Vec<Journey> {
    let from_origin: Vec<&RouteMatch> = matches.iter().filter(|m| m.origin_idx.is_some()).collect();
    let to_dest: Vec<&RouteMatch> = matches.iter().filter(|m| m.dest_idx.is_some()).collect();
    let mut journeys = Vec::new();

    'outer: for ma in &from_origin {
        let oi_a = ma.origin_idx.unwrap();
        for mb in &to_dest {
            if existing + journeys.len() >= MAX_CANDIDATES { break 'outer; }
            if ma.route.id == mb.route.id { continue; }
            let di_b = mb.dest_idx.unwrap();

            // 1. Exact Name Transfer
            for (idx_a, stop_norm_a) in ma.route.stops_normalized.iter().enumerate() {
                ops += 1; if ops > MAX_OPS { break 'outer; }
                if idx_a == oi_a { continue; }

                if let Some(&idx_b) = mb.route.stop_name_to_index.get(stop_norm_a) {
                    if idx_b == di_b { continue; }
                    journeys.push(create_transfer_journey(ma, mb, idx_a, idx_b, &ma.route.stops[idx_a].name, false));
                    if journeys.len() >= MAX_SEARCH_RESULTS { break 'outer; }
                    continue 'outer;
                }
            }

            // 2. Geo Proximity Transfer
            for (idx_a, sa) in ma.route.stops.iter().enumerate() {
                if idx_a == oi_a { continue; }
                for (idx_b, sb) in mb.route.stops.iter().enumerate() {
                    ops += 1; if ops > MAX_OPS { break 'outer; }
                    if idx_b == di_b { continue; }

                    if haversine_distance_m(sa.lat, sa.lng, sb.lat, sb.lng) <= GEO_TRANSFER_RADIUS_M {
                        journeys.push(create_transfer_journey(ma, mb, idx_a, idx_b, &format!("{} / {}", sa.name, sb.name), true));
                        if journeys.len() >= MAX_SEARCH_RESULTS { break 'outer; }
                        continue 'outer;
                    }
                }
            }
        }
    }
    journeys
}

fn create_transfer_journey(ma: &RouteMatch, mb: &RouteMatch, idx_a: usize, idx_b: usize, tp: &str, geo: bool) -> Journey {
    Journey {
        id: format!("{}_{}_tx", ma.route.id, mb.route.id),
        type_: "Transfer".to_string(),
        legs: vec![
            RouteLeg {
                route_id: ma.route.id.clone(),
                route_name: ma.route.name.clone(),
                origin_stop: ma.route.stops[ma.origin_idx.unwrap()].name.clone(),
                dest_stop: ma.route.stops[idx_a].name.clone(),
                price: ma.route.price,
            },
            RouteLeg {
                route_id: mb.route.id.clone(),
                route_name: mb.route.name.clone(),
                origin_stop: mb.route.stops[idx_b].name.clone(),
                dest_stop: mb.route.stops[mb.dest_idx.unwrap()].name.clone(),
                price: mb.route.price,
            }
        ],
        total_price: ma.route.price + mb.route.price,
        transfer_point: Some(tp.to_string()),
        geo_transfer: geo,
        is_forward: true,
    }
}

// --- TESTS ---

#[cfg(test)]
mod tests {
    use super::*;

    fn mock_route(id: &str, stops: Vec<(&str, f64, f64)>) -> Route {
        let mut stop_objs = Vec::new();
        for (i, (name, lat, lng)) in stops.into_iter().enumerate() {
            stop_objs.push(Stop { id: None, name: name.to_string(), lat, lng, orden: i as u32, landmarks: String::new() });
        }
        let stops_normalized: Vec<String> = stop_objs.iter().map(|s| s.name.to_lowercase()).collect();
        let stop_name_to_index = stops_normalized.iter().enumerate().map(|(idx, name)| (name.clone(), idx)).collect();
        Route {
            id: id.to_string(), name: id.to_string(), price: 10.0, transport_type: "Bus".to_string(),
            empresa: None, frecuencia_minutos: None, horario: None, stops: stop_objs,
            stops_normalized, stop_name_to_index, social_alerts: vec![], last_updated: "".to_string()
        }
    }

    #[test]
    fn test_find_route_direct() {
        let routes = vec![mock_route("R1", vec![("A", 0.0, 0.0), ("B", 0.0, 0.01)])];
        let res = find_route_rs("A", "B", &routes);
        assert_eq!(res.len(), 1);
        assert_eq!(res[0].type_, "Direct");
    }

    #[test]
    fn test_find_route_transfer() {
        let r1 = mock_route("R1", vec![("A", 0.0, 0.0), ("Hub", 0.1, 0.1)]);
        let r2 = mock_route("R2", vec![("Hub", 0.1, 0.1), ("B", 0.2, 0.2)]);
        let res = find_route_rs("A", "B", &vec![r1, r2]);
        assert_eq!(res.len(), 1);
        assert_eq!(res[0].type_, "Transfer");
    }

    #[test]
    fn test_geo_transfer() {
        let r1 = mock_route("R1", vec![("A", 21.1576, -86.8269), ("H1", 21.1580, -86.8269)]);
        let r2 = mock_route("R2", vec![("H2", 21.1600, -86.8269), ("B", 21.1620, -86.8269)]);
        let res = find_route_rs("A", "B", &vec![r1, r2]);
        assert_eq!(res.len(), 1);
        assert!(res[0].geo_transfer);
    }
}
