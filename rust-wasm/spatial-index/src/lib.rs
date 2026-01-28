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
        let deg_to_rad = std::f64::consts::PI / 180.0;
        let avg_lat = ((self.0.lat + point[0]) / 2.0) * deg_to_rad;
        let d_lat = (self.0.lat - point[0]) * deg_to_rad;
        let d_lng = (self.0.lng - point[1]) * deg_to_rad * avg_lat.cos();
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
    let stops_res: Result<Vec<Stop>, _> = serde_wasm_bindgen::from_value(stops_val);
    
    let stops = match stops_res {
        Ok(s) => s,
        Err(e) => return JsValue::from_str(&format!("Invalid stops data: {}", e)),
    };

    if stops.is_empty() {
        return JsValue::NULL;
    }

    let wrappers: Vec<StopWrapper> = stops.into_iter().map(StopWrapper).collect();
    let rtree = RTree::bulk_load(wrappers);

    if let Some(nearest) = rtree.nearest_neighbor(&[user_lat, user_lng]) {
        let dist = haversine_distance(user_lat, user_lng, nearest.0.lat, nearest.0.lng);
        let result = NearestStopResult {
            stop: nearest.0.clone(),
            distance_meters: dist,
        };
        serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
    } else {
        JsValue::NULL
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_spatial_search() {
        let stop1 = Stop { id: "1".into(), nombre: "A".into(), lat: 21.0, lng: -86.0 };
        let stop2 = Stop { id: "2".into(), nombre: "B".into(), lat: 22.0, lng: -87.0 };
        
        let stops = vec![stop1, stop2];
        let wrappers: Vec<StopWrapper> = stops.into_iter().map(StopWrapper).collect();
        let rtree = RTree::bulk_load(wrappers);

        // Search near stop 2
        let nearest = rtree.nearest_neighbor(&[22.1, -87.1]).unwrap();
        assert_eq!(nearest.0.id, "2");
    }
}
