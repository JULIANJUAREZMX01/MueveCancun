const fs = require('fs');
const path = require('path');

const ROUTES_FILE = path.join(__dirname, '../src/data/routes.json');
const OUTPUT_FILE = path.join(__dirname, '../rust-wasm/route-calculator/src/rust_data/embedded_routes.json');

function mapTransportType(type) {
    const mapping = {
        'Bus_Urbano_Isla': 'Bus',
        'Bus_Urban': 'Bus',
        'Bus_HotelZone': 'Bus_HotelZone',
        'Combi_Municipal': 'Combi',
        'Playa_Express': 'Playa_Express',
        'Van_Foranea': 'Van',
        'Bus_Foraneo': 'ADO',
        'ADO_Airport': 'ADO_Airport'
    };
    return mapping[type] || 'Bus';
}

function processRoutes() {
    try {
        const rawData = fs.readFileSync(ROUTES_FILE, 'utf8');
        const data = JSON.parse(rawData);
        const routes = data.rutas || [];

        const outputRoutes = [];
        const stopsDB = {};

        routes.forEach(route => {
            // Extract Stops
            const stops = (route.paradas || []).sort((a, b) => a.orden - b.orden);
            const stopNames = stops.map(s => {
                // Populate Stops DB
                const name = s.parada || s.nombre; // Handle inconsistencies
                if (name && s.lat && s.lng) {
                    stopsDB[name] = [s.lat, s.lng];
                }
                return name;
            }).filter(Boolean);

            // Origin/Dest Hubs
            const originHub = stopNames[0] || "Unknown";
            const destHub = stopNames[stopNames.length - 1] || "Unknown";

            // Schedule/Freq
            let schedule = "";
            if (typeof route.horario === 'object') {
                schedule = `${route.horario.inicio || route.horario.inicio_oficial || '?'} - ${route.horario.fin || route.horario.fin_oficial || '?'}`;
            } else {
                schedule = route.horario || "";
            }

            const frequency = route.frecuencia_minutos ? `${route.frecuencia_minutos} min` : "";

            outputRoutes.push({
                id: route.id,
                name: route.nombre,
                transport_type: mapTransportType(route.tipo_transporte),
                price: parseFloat(route.tarifa) || 0.0,
                duration: route.duracion_minutos ? `${route.duracion_minutos} min` : (frequency ? `Freq: ${frequency}` : "Unknown"),
                badges: [], // Could infer badges from notes
                origin_hub: originHub,
                dest_hub: destHub,
                stops: stopNames,
                operator: route.empresa || (Array.isArray(route.empresas) ? route.empresas.join(", ") : "") || "",
                schedule: schedule,
                frequency: frequency
            });
        });

        const output = {
            routes: outputRoutes,
            stops: stopsDB
        };

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
        console.log(`Successfully generated embedded_routes.json with ${outputRoutes.length} routes and ${Object.keys(stopsDB).length} stops.`);

    } catch (e) {
        console.error("Error processing routes:", e);
        process.exit(1);
    }
}

processRoutes();
