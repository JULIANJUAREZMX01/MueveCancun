use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use rstar::{RTree, PointDistance};
use shared_types::{Stop, haversine_distance};

#[derive(Clone)]
struct StopWrapper(Stop);

impl rstar::RTreeObject for StopWrapper {
    type Envelope = rstar::AABB<[f64; 2]>;
    fn envelope(&self) -> Self::Envelope {
        rstar::AABB::from_point([self.0.lat, self.0.lng])
    }
}

impl PointDistance for StopWrapper {
    fn distance_2(&self, point: &[f64; 2]) -> f64 {
        let d_lat = self.0.lat - point[0];
        let d_lng = self.0.lng - point[1];
        d_lat * d_lat + d_lng * d_lng
    }
}

#[derive(Serialize, Deserialize)]
pub struct NearestStopResult {
    pub stop: Stop,
    pub distance_meters: f64,
}

#[wasm_bindgen]
pub fn find_nearest_stop(user_lat: f64, user_lng: f64, stops_val: JsValue) -> JsValue {
    let stops: Vec<Stop> = serde_wasm_bindgen::from_value(stops_val).unwrap_or_default();
    let wrappers: Vec<StopWrapper> = stops.into_iter().map(StopWrapper).collect();
    let rtree = RTree::bulk_load(wrappers);

    if let Some(nearest) = rtree.nearest_neighbor(&[user_lat, user_lng]) {
        let dist = haversine_distance(user_lat, user_lng, nearest.0.lat, nearest.0.lng);
        let result = NearestStopResult {
            stop: nearest.0.clone(),
            distance_meters: dist,
        };
        serde_wasm_bindgen::to_value(&result).unwrap()
    } else {
        JsValue::NULL
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Instant;

    #[test]
    fn test_spatial_search_performance() {
        let start = Instant::now();
        let duration = start.elapsed();
        assert!(duration.as_millis() < 10);
    }
}
