use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MasterRoutes {
    pub rutas: Vec<Route>,
    pub destinos: Vec<Destination>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Route {
    pub id: String,
    pub nombre: String,
    pub color: String,
    pub tarifa: f64,
    pub horario: String,
    pub frecuencia_minutos: u32,
    pub paradas: Vec<RouteStop>,
    pub polyline: Vec<[f64; 2]>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct RouteStop {
    pub id: String,
    #[serde(rename = "nombre")]
    pub name: String,
    pub lat: f64,
    pub lng: f64,
    pub orden: u32,
    pub referencias: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Destination {
    #[serde(rename = "nombre")]
    pub name: String,
    pub categoria: String,
    pub lat: f64,
    pub lng: f64,
    pub parada_cercana: String,
}
