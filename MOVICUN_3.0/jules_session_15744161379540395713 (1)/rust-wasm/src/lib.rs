use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn calculate_route(start_lat: f64, start_lng: f64, end_lat: f64, end_lng: f64) -> String {
    format!("Calculando ruta de {},{} a {},{}", start_lat, start_lng, end_lat, end_lng)
}
