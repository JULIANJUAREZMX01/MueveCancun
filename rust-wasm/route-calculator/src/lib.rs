use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::RwLock;
use strsim;
use wasm_bindgen::prelude::*;

// --- STRUCTS ---

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

<<<<<<< HEAD
static CATALOG: Lazy<Vec<Route>> = Lazy::new(|| {
    let raw_data = vec![
        (
            "R2_94_VILLAS_OTOCH_001",
            "R-2-94 Villas Otoch (Eje Kabah - ZH)",
            TransportType::Bus,
            15.0,
            "05:00 - 22:30 (Guardia 03:00-05:00)",
            "10 min",
            vec![
                "OXXO Villas Otoch Paraíso",
                "Chedraui Lakin",
                "Av. Kabah",
                "Plaza Las Américas",
                "Entrada Zona Hotelera",
                "Zona Hotelera",
            ],
            "",
        ),
        (
            "CR_PTO_JUAREZ_001",
            "Combi Roja Puerto Juárez (Ultramar)",
            TransportType::Combi,
            13.0,
            "05:30 - 00:30",
            "15 min",
            vec![
                "La Rehoyada",
                "El Crucero",
                "Av. Tulum Norte",
                "Playa del Niño",
                "Muelle Ultramar",
            ],
            "Autocar",
        ),
        (
            "R1_ZONA_HOTELERA_001",
            "R-1 Centro - Zona Hotelera",
            TransportType::Bus,
            15.0,
            "06:00 - 22:30",
            "10 min",
            vec![
                "La Rehoyada",
                "El Crucero",
                "Av. Tulum Sur",
                "El Cebiche",
                "Zona Hotelera",
                "Playa Delfines",
            ],
            "SEA / Maya Caribe",
        ),
        (
            "VAN_PLAYA_EXPRESS_001",
            "Playa Express (Cancún - Playa del Carmen)",
            TransportType::Van,
            55.0,
            "05:00 - 00:00",
            "30 min",
            vec![
                "Terminal ADO Centro",
                "Entrada Aeropuerto",
                "Gasolinera López Portillo",
                "Puerto Morelos",
                "Playa Maroma",
                "Playa del Carmen Centro",
            ],
            "",
        ),
        (
            "R28_VILLAS_OTOCH_001",
            "R-28 Villas Otoch - Av. Tulum",
            TransportType::Bus,
            13.0,
            "", // No schedule in JSON
            "", // No frequency in JSON
            vec![
                "Villas Otoch Paraíso",
                "Paseos Kabah",
                "Hospital General",
                "El Crucero",
            ],
            "",
        ),
        (
            "R19_VILLAS_OTOCH_002",
            "R-19 Villas Otoch - Crucero",
            TransportType::Bus,
            13.0,
            "",
            "",
            vec![
                "Villas Otoch",
                "Hospital General",
                "Zona Industrial",
                "Mercado 28",
                "El Crucero",
            ],
            "",
        ),
        (
            "ADO_AEROPUERTO_001",
            "ADO Aeropuerto - Centro",
            TransportType::Bus,
            150.0,
            "",
            "",
            vec![
                "Aeropuerto T2",
                "Aeropuerto T3",
                "Aeropuerto T4",
                "Terminal ADO Centro",
            ],
            "",
        ),
        (
            "R10_AEROPUERTO",
            "R-10 Las Américas - Aeropuerto (Trabajadores)",
            TransportType::Bus,
            15.0,
            "04:00-23:00",
            "",
            vec![
                "Plaza Las Américas",
                "Av. Nichupté",
                "Av. Kabah",
                "Av. La Luna",
                "Av. Las Torres",
                "Av. Huayacán",
                "Carr. Federal 307",
                "UT Cancún",
                "Aeropuerto T3",
                "Aeropuerto T2",
            ],
            "",
        ),
        // --- NEWLY EXTRACTED ROUTES (FACEBOOK GROUP) ---
        (
            "R6_WALMART_001",
            "R-6 Santa Fe - Walmart A.Q. Roo",
            TransportType::Bus,
            12.0,
            "06:00 - 22:30",
            "10 min",
            vec![
                "Santa Fe",
                "Av. Kabah",
                "Multiplaza Kabah",
                "Walmart Andrés Quintana Roo",
                "El Crucero",
            ],
            "Turicun",
        ),
        (
            "R29_OUTLET_001",
            "R-29 ADO - Plaza Outlet",
            TransportType::Bus,
            12.0,
            "06:30 - 23:00",
            "12 min",
            vec![
                "Terminal ADO Centro",
                "Parque Las Palapas",
                "Mercado 28",
                "Plaza Outlet",
                "Av. Andrés Quintana Roo",
                "Comalcalco",
            ],
            "Autocar",
        ),
        (
            "R17_LAKIN_001",
            "R-17 Tierra Maya - Lak'in",
            TransportType::Bus,
            12.0,
            "05:00 - 23:30",
            "8 min",
            vec![
                "Tierra Maya",
                "Aurrera Lakin",
                "Chedraui Lakin",
                "Av. Miguel Hidalgo",
                "El Crucero",
            ],
            "Autocar",
        ),
        (
            "R21_AMERICAS_001",
            "R-21 Las Américas - Kabah",
            TransportType::Bus,
            12.0,
            "06:00 - 22:00",
            "15 min",
            vec![
                "Plaza Las Américas",
                "Av. Tulum Sur",
                "Chedraui Ceviche",
                "Av. Kabah",
                "Villas del Mar",
            ],
            "Maya Caribe",
        ),
        (
            "R44_CENTRO_001",
            "R-44 Centro - Plaza Las Américas",
            TransportType::Bus,
            13.0,
            "05:45 - 23:00",
            "10 min",
            vec![
                "El Crucero",
                "Av. Tulum Norte",
                "Plaza Las Américas",
                "Av. Bonampak",
                "Puerto Cancun",
                "Km 0",
            ],
            "Turicun",
        ),
        (
            "R5_HEROES_001",
            "R-5 Los Héroes - Crucero",
            TransportType::Bus,
            12.0,
            "06:00 - 22:00",
            "12 min",
            vec![
                "Héroes",
                "Av. Chac Mool",
                "Tierra Maya",
                "Av. Kabah",
                "El Crucero",
            ],
            "Autocar",
        ),
        (
            "R27_TIERRA_MAYA_001",
            "R-27 Tierra Maya - Zona Hotelera",
            TransportType::Bus,
            15.0,
            "05:30 - 23:00",
            "10 min",
            vec![
                "Tierra Maya",
                "Av. Kabah",
                "Plaza Las Américas",
                "Entrada Zona Hotelera",
                "Zona Hotelera",
                "Playa Delfines",
            ],
            "Turicun",
        ),
        (
            "R237_RANCHO_001",
            "R-237 Rancho Viejo - Crucero",
            TransportType::Bus,
            12.0,
            "06:00 - 22:00",
            "15 min",
            vec![
                "Rancho Viejo",
                "Arco Norte",
                "Prado Norte",
                "Av. Tulum Norte",
                "El Crucero",
            ],
            "Maya Caribe",
        ),
        (
            "R71_RESIDENCIAL_001",
            "R-71 Polígono Sur - Centro",
            TransportType::Bus,
            13.0,
            "06:00 - 22:00",
            "20 min",
            vec![
                "Polígono Sur",
                "Jardines del Sur",
                "Av. Las Torres",
                "Plaza Las Américas",
                "Terminal ADO Centro",
            ],
            "Turicun",
        ),
        (
            "R31_UNIVERSIDAD_001",
            "R-31 Universidad del Caribe - Centro",
            TransportType::Bus,
            12.0,
            "07:00 - 21:00",
            "30 min",
            vec![
                "Universidad del Caribe",
                "Av. Bonampak",
                "Puerto Cancun",
                "El Crucero",
                "Mercado 28",
            ],
            "Autocar",
        ),
        (
            "R30_REG103_001",
            "R-30 Región 103 - Zona Hotelera",
            TransportType::Bus,
            15.0,
            "05:00 - 23:00",
            "10 min",
            vec![
                "Región 103",
                "Av. Talleres",
                "Av. Tulum Norte",
                "El Crucero",
                "Zona Hotelera",
            ],
            "Turicun",
        ),
        (
            "R33_REG102_001",
            "R-33 Región 102 - Plaza Las Américas",
            TransportType::Bus,
            12.0,
            "06:00 - 22:00",
            "15 min",
            vec![
                "Región 102",
                "Av. Talleres",
                "Av. Kabah",
                "Plaza Las Américas",
            ],
            "Autocar",
        ),
        (
            "ruta_1753802299281",
            "RUTA 81",
            TransportType::Bus,
            12.0,
            "",
            "",
            vec![
                "Parada RUTA 81 #1",
                "Parada RUTA 81 #2",
                "Parada RUTA 81 #3",
                "Parada RUTA 81 #4",
                "Parada RUTA 81 #5",
                "Parada RUTA 81 #6",
                "Parada RUTA 81 #7",
                "Parada RUTA 81 #8",
                "Parada RUTA 81 #9",
                "Parada RUTA 81 #10",
                "Parada RUTA 81 #11",
                "Parada RUTA 81 #12",
                "Parada RUTA 81 #13",
                "Parada RUTA 81 #14",
                "Parada RUTA 81 #15",
                "Parada RUTA 81 #16",
                "Parada RUTA 81 #17",
                "Parada RUTA 81 #18",
                "Parada RUTA 81 #19"
            ],
            "Transporte Público",
        ),
    ];
=======
// --- APP STATE ---
>>>>>>> main

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

    for match_a in &routes_from_origin {
        let route_a = match_a.route;
        let origin_idx_a = match match_a.origin_idx {
            Some(idx) => idx,
            None => continue,
        };

        for match_b in &routes_to_dest {
            let route_b = match_b.route;
            let dest_idx_b = match match_b.dest_idx {
                Some(idx) => idx,
                None => continue,
            };

            if route_a.id == route_b.id {
                continue;
            }

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

        score_b.cmp(&score_a).then_with(|| {
            a.total_price
                .partial_cmp(&b.total_price)
                .unwrap_or(std::cmp::Ordering::Equal)
        })
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
}
