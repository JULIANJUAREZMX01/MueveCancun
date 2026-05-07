//! Carbon Calculator — Environmental impact of transit choices in Cancún
//! 
//! Compares carbon footprint across transport modes and suggests greener alternatives.
//! All computation is local via WASM.

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use shared_types::TransportType;

#[derive(Serialize, Deserialize, Debug)]
pub struct CarbonResult {
    pub grams_co2: f64,
    pub kg_co2_per_year_if_daily: f64,
    pub trees_to_offset: u32,
    pub label: String,
    pub rating: String,      // "A+" | "A" | "B" | "C" | "D"
    pub vs_car_saved_grams: f64,
    pub savings_label: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CarbonComparison {
    pub chosen: CarbonResult,
    pub alternatives: Vec<(String, CarbonResult)>,
    pub greenest_option: String,
    pub recommendation: String,
}

fn co2_for_mode(mode: &str, distance_km: f64) -> f64 {
    let transport = match mode {
        "Bus" | "Bus_Urban" | "Bus_Urbano" => TransportType::Bus,
        "Bus_HotelZone" | "BusHotelZone" => TransportType::BusHotelZone,
        "Combi" | "Combi_Municipal" => TransportType::Combi,
        "Van" | "Van_Foranea" => TransportType::Van,
        "ADO" => TransportType::ADO,
        "ADO_Airport" => TransportType::AdoAirport,
        "PlayaExpress" => TransportType::PlayaExpress,
        "MotorTaxi" => TransportType::MotorTaxi,
        "Bicicleta" => TransportType::Bicicleta,
        "Caminata" => TransportType::Caminata,
        "Indriver" | "Uber" => TransportType::Uber,
        _ => TransportType::Bus,
    };
    transport.co2_per_km() * distance_km
}

fn build_result(mode: &str, grams: f64, distance_km: f64) -> CarbonResult {
    // Average car emits 150g CO2/km per passenger
    let car_grams = 150.0 * distance_km;
    let saved = (car_grams - grams).max(0.0);

    let rating = match grams as u32 {
        0 => "A+",
        1..=20 => "A",
        21..=50 => "B",
        51..=100 => "C",
        _ => "D",
    };

    let label = if grams == 0.0 {
        "0g CO₂ 🌿".to_string()
    } else if grams < 1000.0 {
        format!("{:.0}g CO₂", grams)
    } else {
        format!("{:.2}kg CO₂", grams / 1000.0)
    };

    let savings_label = if saved > 0.0 {
        format!("Ahorras {:.0}g vs auto", saved)
    } else {
        format!("{}g más que bus", grams - co2_for_mode("Bus", distance_km))
    };

    // 1 tree absorbs ~22kg CO2/year = 60g/day
    let daily_grams = grams;
    let kg_per_year = daily_grams * 365.0 / 1000.0;
    let trees = (kg_per_year / 22.0).ceil() as u32;

    CarbonResult {
        grams_co2: grams,
        kg_co2_per_year_if_daily: kg_per_year,
        trees_to_offset: trees,
        label,
        rating: rating.to_string(),
        vs_car_saved_grams: saved,
        savings_label,
    }
}

/// Calculate carbon footprint for a transit journey
#[wasm_bindgen]
pub fn calculate_carbon(mode: &str, distance_km: f64) -> JsValue {
    let grams = co2_for_mode(mode, distance_km);
    let result = build_result(mode, grams, distance_km);
    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}

/// Compare carbon across all available transport modes for a given distance
#[wasm_bindgen]
pub fn compare_modes(chosen_mode: &str, distance_km: f64) -> JsValue {
    let chosen_grams = co2_for_mode(chosen_mode, distance_km);
    let chosen = build_result(chosen_mode, chosen_grams, distance_km);

    let all_modes = [
        ("Bicicleta", "🚲 Bicicleta"),
        ("Caminata", "🚶 Caminata"),
        ("Bus", "🚌 Autobús"),
        ("Combi", "🚐 Combi"),
        ("ADO", "🚌 ADO"),
        ("MotorTaxi", "🏍️ Moto-taxi"),
        ("Uber", "🚗 Uber/Indriver"),
    ];

    let mut alternatives: Vec<(String, CarbonResult)> = all_modes
        .iter()
        .filter(|(m, _)| *m != chosen_mode)
        .map(|(m, label)| {
            let g = co2_for_mode(m, distance_km);
            (label.to_string(), build_result(m, g, distance_km))
        })
        .collect();

    // Sort by carbon (greenest first)
    alternatives.sort_by(|a, b| a.1.grams_co2.partial_cmp(&b.1.grams_co2).unwrap());

    let greenest = alternatives.first()
        .map(|(l, _)| l.clone())
        .unwrap_or("Bicicleta".to_string());

    let recommendation = if chosen_grams == 0.0 {
        "¡Elección perfecta! Cero emisiones. 🌿".to_string()
    } else if chosen_grams < 30.0 {
        format!("Buena elección. {} salva {:.0}g CO₂ vs auto.", chosen_mode, chosen.vs_car_saved_grams)
    } else {
        format!("Considera {} — ahorra {:.0}g CO₂ en este trayecto.", greenest, chosen_grams - co2_for_mode(
            all_modes.iter().find(|(l, _)| l.contains("Bicicleta")).map(|(l,_)| *l).unwrap_or("Bus"),
            distance_km
        ))
    };

    let comparison = CarbonComparison {
        chosen,
        alternatives,
        greenest_option: greenest,
        recommendation,
    };

    serde_wasm_bindgen::to_value(&comparison).unwrap_or(JsValue::NULL)
}

/// Carbon score for a complete multimodal journey (sum of legs)
#[wasm_bindgen]
pub fn journey_carbon_score(total_grams: f64, distance_km: f64) -> u8 {
    // 0-100 score: 100 = zero carbon, 0 = equivalent to driving alone
    let car_grams = 150.0 * distance_km;
    if car_grams == 0.0 { return 50; }
    let ratio = 1.0 - (total_grams / car_grams).min(1.0);
    (ratio * 100.0) as u8
}
