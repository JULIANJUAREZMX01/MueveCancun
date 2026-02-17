import json
import time
import random
from datetime import datetime
import os

# System 2: Social Intelligence Bridge
# Reads static route data and injects dynamic "social signals"

INPUT_FILE = 'src/data/routes.json'
OUTPUT_FILE = 'public/data/master_routes.json'

ALERTS = [
    "Retraso en Zona Hotelera por obra pública",
    "Tráfico fluido en Av. Tulum",
    "Accidente en Blvd. Kukulcán km 12",
    "Lluvia intensa en el centro, maneje con precaución",
    "Ruta R-1 desviada por manifestación"
]

def load_source_data():
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"CRITICAL: Source file {INPUT_FILE} not found!")
        return None

def generate_social_signals():
    # In a real scenario, this would scrape social media
    return [random.choice(ALERTS)]

def build_master_json(source_data):
    social_alerts = generate_social_signals()

    # We transform the structure to match what the WASM engine and Frontend expect
    # The source has "rutas", we map it to "routes" or keep "rutas" depending on agreement.
    # Previous context suggests 'routes' or 'rutas'. Let's look at the source 'rutas'.

    routes = source_data.get("rutas", [])

    master_data = {
        "metadata": {
            "last_updated": datetime.now().isoformat(),
            "source": "Nexus Listener v1.0",
            "version": "3.2.0"
        },
        "social_alerts": social_alerts,
        "routes": routes,
        # Preserve other keys if necessary
        "airport_restrictions": source_data.get("restricciones_aeropuerto", {}),
        "general_warnings": source_data.get("advertencias_generales", {})
    }
    return master_data

def run():
    print(f"[Listener] Starting Social Intelligence Bridge...")
    data = load_source_data()
    if not data:
        return

    master_json = build_master_json(data)

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(master_json, f, indent=2, ensure_ascii=False)

    print(f"[Listener] SUCCESS: Generated {OUTPUT_FILE} with {len(master_json['routes'])} routes and {len(master_json['social_alerts'])} alerts.")

if __name__ == "__main__":
    run()
