use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use rstar::{RTree, PointDistance, RTreeObject, AABB};
use shared_types::{Stop, haversine_distance};
use once_cell::sync::Lazy;
use std::sync::RwLock;
use std::hash::{Hash, Hasher};
use std::collections::hash_map::DefaultHasher;

// Optimization: Longitude scaling factor for Cancun (~21.1° N)
// This makes Euclidean distance in lat/lng space more accurate.
const LNG_SCALE: f64 = 0.932; // cos(21.1°)

#[derive(Clone)]
struct StopWrapper(Stop);

impl RTreeObject for StopWrapper {
    type Envelope = AABB<[f64; 2]>;
    fn envelope(&self) -> Self::Envelope {
        AABB::from_point([self.0.lat, self.0.lng * LNG_SCALE])
    }
}

impl PointDistance for StopWrapper {
    fn distance_2(&self, point: &[f64; 2]) -> f64 {
        let d_lat = self.0.lat - point[0];
        let d_lng = (self.0.lng * LNG_SCALE) - point[1];
        d_lat * d_lat + d_lng * d_lng
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NearestStopResult {
    pub stop: Stop,
    pub distance_meters: f64,
}

struct CachedIndex {
    hash: u64,
    rtree: RTree<StopWrapper>,
}

// Global static cache for the R-Tree to optimize repetitive queries
static SPATIAL_INDEX: Lazy<RwLock<Option<CachedIndex>>> = Lazy::new(|| RwLock::new(None));

#[wasm_bindgen]
pub fn clear_spatial_index() {
    if let Ok(mut index) = SPATIAL_INDEX.write() {
        *index = None;
    }
}

#[wasm_bindgen]
pub fn find_nearest_stop(user_lat: f64, user_lng: f64, stops_val: JsValue) -> JsValue {
    let stops: Vec<Stop> = serde_wasm_bindgen::from_value(stops_val).unwrap_or_default();

    if let Some(result) = find_nearest_stop_native(user_lat, user_lng, &stops) {
        serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
    } else {
        JsValue::NULL
    }
}

fn calculate_stops_hash(stops: &[Stop]) -> u64 {
    let mut hasher = DefaultHasher::new();
    for stop in stops {
        stop.id.hash(&mut hasher);
    }
    hasher.finish()
}

pub fn find_nearest_stop_native(user_lat: f64, user_lng: f64, stops: &[Stop]) -> Option<NearestStopResult> {
    let scaled_point = [user_lat, user_lng * LNG_SCALE];

    if stops.is_empty() {
        return None;
    }

    let current_hash = calculate_stops_hash(stops);

    // Attempt to use cached index
    if let Ok(index_guard) = SPATIAL_INDEX.read() {
        if let Some(cached) = &*index_guard {
            if cached.hash == current_hash {
                if let Some(nearest) = cached.rtree.nearest_neighbor(&scaled_point) {
                    return Some(create_result(user_lat, user_lng, &nearest.0));
                }
            }
        }
    }

    // Fallback: Build index if not present, provided, or hash mismatched
    let wrappers: Vec<StopWrapper> = stops.iter().cloned().map(StopWrapper).collect();
    let rtree = RTree::bulk_load(wrappers);
    
    let result = if let Some(nearest) = rtree.nearest_neighbor(&scaled_point) {
        Some(create_result(user_lat, user_lng, &nearest.0))
    } else {
        None
    };

    // Cache the built tree for future use
    if let Ok(mut index_guard) = SPATIAL_INDEX.write() {
        *index_guard = Some(CachedIndex {
            hash: current_hash,
            rtree,
        });
    }

    result
}

fn create_result(lat: f64, lng: f64, stop: &Stop) -> NearestStopResult {
    let dist = haversine_distance(lat, lng, stop.lat, stop.lng);
    NearestStopResult {
        stop: stop.clone(),
        distance_meters: dist * 1000.0, // convert km to meters
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Instant;

    #[test]
    fn test_spatial_search_performance() {
        let mut stops = Vec::new();
        for i in 0..1000 {
            stops.push(Stop {
                id: format!("stop_{}", i),
                name: format!("Stop {}", i),
                lat: 21.1 + (i as f64 * 0.0001),
                lng: -86.8 + (i as f64 * 0.0001),
                order: i as u32,
            });
        }

        let start = Instant::now();
        let wrappers: Vec<StopWrapper> = stops.into_iter().map(StopWrapper).collect();
        let rtree = RTree::bulk_load(wrappers);
        let duration = start.elapsed();
        
        println!("R-Tree bulk load time for 1000 stops: {:?}", duration);
        assert!(duration.as_millis() < 5);

        let search_start = Instant::now();
        let nearest = rtree.nearest_neighbor(&[21.105, -86.805 * LNG_SCALE]);
        let search_duration = search_start.elapsed();
        
        println!("Nearest neighbor search time: {:?}", search_duration);
        assert!(nearest.is_some());
        assert!(search_duration.as_micros() < 500);
    }

    #[test]
    fn test_caching_bug_with_different_datasets() {
        // Clear any existing cache before the test
        clear_spatial_index();

        // Dataset A
        let stops_a = vec![
            Stop {
                id: "A1".to_string(),
                name: "Stop A1".to_string(),
                lat: 21.1,
                lng: -86.8,
                order: 1,
            },
        ];

        // Dataset B
        let stops_b = vec![
            Stop {
                id: "B1".to_string(),
                name: "Stop B1".to_string(),
                lat: 21.2,
                lng: -86.9,
                order: 1,
            },
        ];

        // Query with Dataset A
        let res_a = find_nearest_stop_native(21.1, -86.8, &stops_a).expect("Should find a stop");
        assert_eq!(res_a.stop.id, "A1", "First query should return stop from dataset A");

        // Query with Dataset B at the location of Dataset B
        let res_b = find_nearest_stop_native(21.2, -86.9, &stops_b).expect("Should find a stop");

        // This assertion will fail before the bug is fixed, because the cache will return
        // the item from Dataset A, but `find_nearest_stop_native` returns `NearestStopResult`
        // which includes the stop it found, so we can assert on the ID.
        assert_eq!(res_b.stop.id, "B1", "Second query should return stop from dataset B, not use cached A");
    }
}
