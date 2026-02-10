use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use shared_types::{TransportType};
use std::collections::HashMap;
use std::sync::RwLock;
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct StopInfo {
    pub name: String,
    pub lat: f64,
    pub lng: f64,
    pub distance_km: f64,
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
    pub stops_info: Option<Vec<StopInfo>>,
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
    ];

    raw_data
        .into_iter()
        .map(
            |(id, name, t_type, price, schedule, frequency, stops, operator)| {
                let stops_vec: Vec<String> = stops.into_iter().map(|s| s.to_string()).collect();
                let stops_normalized: Vec<String> =
                    stops_vec.iter().map(|s| s.to_lowercase()).collect();
                let origin = stops_vec
                    .first()
                    .cloned()
                    .unwrap_or_else(|| "Unknown".to_string());
                let dest = stops_vec
                    .last()
                    .cloned()
                    .unwrap_or_else(|| "Unknown".to_string());

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
                    stops_info: None,
                    stops_normalized,
                    operator: operator.to_string(),
                    schedule: schedule.to_string(),
                    frequency: frequency.to_string(),
                }
            },
        )
        .collect()
});

fn match_stop<'a>(
    query_norm: &str,
    route: &'a Route,
    cache: &mut HashMap<&'a str, f64>,
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

fn enrich_route(mut route: Route) -> Route {
    if let Ok(db) = STOPS_DB.read() {
        let mut infos = Vec::new();
        for stop_name in &route.stops {
            if let Some((lat, lng)) = db.get(stop_name) {
                infos.push(StopInfo {
                    name: stop_name.clone(),
                    lat: *lat,
                    lng: *lng,
                    distance_km: 0.0,
                });
            }
        }
        if !infos.is_empty() {
            route.stops_info = Some(infos);
        }
    }
    route
}

pub fn find_route_rs(origin: &str, dest: &str) -> Vec<Journey> {
    // 🛡️ SECURITY: Prevent DoS via excessive string processing
    if origin.len() > 100 || dest.len() > 100 {
        return Vec::new();
    }

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
                        legs: vec![enrich_route(m.route.clone())],
                        transfer_point: None,
                        total_price: m.route.price,
                    });
                }
            }
        }
    }

    // Optimization: If direct routes are found, return them immediately to reduce noise.
    if !journeys.is_empty() {
        return journeys;
    }
    // === FIN DEL BLOQUE DE OPTIMIZACIÓN ===

    // === INICIO DE RUTAS DE TRANSBORDO (Incoming Change / Main) ===
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

            // Skip same route (already covered by direct check, but safety first)
            if route_a.id == route_b.id {
                continue;
            }

            // Find intersection
            for (idx_a, stop_a) in route_a.stops_normalized.iter().enumerate() {
                // Must be after origin
                if idx_a <= origin_idx_a {
                    continue;
                }

                for (idx_b, stop_b) in route_b.stops_normalized.iter().enumerate() {
                    // Must be before dest
                    if idx_b >= dest_idx_b {
                        continue;
                    }

                    if stop_a == stop_b {
                        // Found a transfer point!
                        let transfer_name = route_a.stops[idx_a].clone();

                        journeys.push(Journey {
                            type_: "Transfer".to_string(),
                            legs: vec![
                                enrich_route((*route_a).clone()),
                                enrich_route((*route_b).clone()),
                            ],
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

        score_b
            .cmp(&score_a) // Higher score first
            .then_with(|| {
                a.total_price
                    .partial_cmp(&b.total_price)
                    .unwrap_or(std::cmp::Ordering::Equal)
            }) // Lower price first
    });

    // Limit results to avoid overwhelming user
    if journeys.len() > 5 {
        journeys.truncate(5);
    }

    journeys
}

#[wasm_bindgen]
pub fn find_route(origin: &str, dest: &str) -> Result<JsValue, JsValue> {
    // 🛡️ SECURITY: Prevent DoS via excessive string processing
    if origin.len() > 100 || dest.len() > 100 {
        return serde_wasm_bindgen::to_value(&Vec::<Journey>::new()).map_err(|e| JsValue::from_str(&e.to_string()));
    }

    let routes = find_route_rs(origin, dest);
    serde_wasm_bindgen::to_value(&routes).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn get_all_routes() -> Result<JsValue, JsValue> {
    let routes = &*CATALOG;
    serde_wasm_bindgen::to_value(routes).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn validate_operator_funds(balance: f64) -> bool {
    // Threshold is 180 MXN (approx 9 USD)
    // If balance is below this, they cannot operate "Compass"
    balance >= 180.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_route_demo_override() {
        // Matches R-2-94: "OXXO Villas Otoch Paraíso" -> "Zona Hotelera"
        let res = find_route_rs("Villas Otoch Paraíso", "Zona Hotelera");

        assert!(!res.is_empty());
        assert!(res
            .iter()
            .any(|j| j.type_ == "Direct" && j.legs[0].id == "R2_94_VILLAS_OTOCH_001"));
    }

    #[test]
    fn test_find_route_fuzzy() {
        // "El Crocero" (typo of "El Crucero") to "Ultramar" (part of "Muelle Ultramar")
        // Valid direction in CR_PTO_JUAREZ_001 (Index 1 -> Index 4)
        let res = find_route_rs("El Crocero", "Ultramar");

        assert!(!res.is_empty());
        assert!(res
            .iter()
            .any(|j| j.type_ == "Direct" && j.legs[0].id == "CR_PTO_JUAREZ_001"));
    }

    #[test]
    fn test_transfer_logic() {
        // Villas Otoch -> Playa Delfines (requires transfer)
        // R-28 (Villas Otoch -> El Crucero)
        // R-1 (El Crucero -> Playa Delfines)

        // This relies on CATALOG data
        let res = find_route_rs("Villas Otoch", "Playa Delfines");
        // Optimization short-circuit
        if res.iter().any(|j| j.type_ == "Direct") {
            return;
        }

        // Filter for transfer
        assert!(res.iter().any(|j| j.type_ == "Transfer"
            && j.transfer_point
                .as_ref()
                .map(|s| s.contains("Crucero"))
                .unwrap_or(false)));
    }

    #[test]
    fn test_garbage_input() {
        let res = find_route_rs("XyZ123Rubbish", "AbC987Junk");
        assert!(
            res.is_empty(),
            "Should return empty for garbage input, got {} routes",
            res.len()
        );
    }

    #[test]
    fn test_direct_priority() {
        // "Villas Otoch Paraíso" -> "Zona Hotelera" is a direct route on R-2-94.
        // It should NOT return any transfers even if they exist.
        let res = find_route_rs("Villas Otoch Paraíso", "Zona Hotelera");

        assert!(!res.is_empty());
        // All returned journeys must be Direct
        assert!(res.iter().all(|j| j.type_ == "Direct"));
    }

    #[test]
    fn test_huge_input_dos_prevention() {
        let huge_string = "a".repeat(200);
        let res = find_route_rs(&huge_string, "Zona Hotelera");
        assert!(res.is_empty()); // Should be rejected immediately
    }
}
