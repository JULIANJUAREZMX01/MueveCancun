import re

path = "rust-wasm/route-calculator/src/lib.rs"
with open(path, "r") as f:
    content = f.read()

start_marker = r"#\[derive\(Serialize, Deserialize, Clone, Debug\)\]\s*struct EmbeddedRoute \{"
end_marker = r"RwLock::new\(m\)\s*\n\}\);"

# New content
new_block = """#[derive(Serialize, Deserialize, Clone, Debug)]
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
});"""

# Perform replacement
pattern = f"({start_marker}.*?{end_marker})"
match = re.search(pattern, content, re.DOTALL)

if match:
    new_content = content.replace(match.group(1), new_block)
    with open(path, "w") as f:
        f.write(new_content)
    print("Successfully updated lib.rs")
else:
    print("Could not find the block to replace.")
