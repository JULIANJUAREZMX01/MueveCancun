use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use shared_types::{haversine_distance, TransportType};
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

#[cfg(test)]
mod tests {
    use super::*;

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
