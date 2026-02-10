import fs from 'node:fs/promises';
import path from 'node:path';

async function sync() {
    console.log("🚀 Syncing routes data...");
    
    // 1. Read source
    const sourcePath = path.resolve('src/data/routes.json');
    let sourceData;
    try {
        const sourceContent = await fs.readFile(sourcePath, 'utf-8');
        sourceData = JSON.parse(sourceContent);
    } catch (e) {
        console.error("❌ Failed to read src/data/routes.json", e);
        process.exit(1);
    }
    
    // 2. Prepare master routes for search/catalog
    const masterRoutes = {
        version: sourceData.version,
        rutas: sourceData.rutas.map(r => ({
            id: r.id,
            nombre: r.nombre,
            tarifa: r.tarifa,
            tipo: r.tipo_transporte,
            empresa: r.empresa || r.empresas?.[0],
            frecuencia_minutos: r.frecuencia_minutos,
            horario: r.horario,
            paradas: r.paradas.map(p => ({
                id: p.id,
                nombre: p.nombre || p.parada,
                lat: p.lat,
                lng: p.lng,
                orden: p.orden,
                landmarks: p.advertencia || p.referencias
            }))
        }))
    };

    // 3. Write public files
    const publicPath = path.resolve('public/data');
    const rootPublicPath = path.resolve('public'); // For coordinates.json at root? Or public/data/coordinates.json?
    // CoordinateStore fetches '/coordinates.json', so it expects it at public root.

    await fs.mkdir(publicPath, { recursive: true });
    
    // Master Registry
    await fs.writeFile(
        path.join(publicPath, 'master_routes.json'), 
        JSON.stringify(masterRoutes, null, 2)
    );
    
    // Individual Route Files
    const routesDir = path.join(publicPath, 'routes');
    await fs.mkdir(routesDir, { recursive: true });
    
    for (const route of masterRoutes.rutas) {
        await fs.writeFile(
            path.join(routesDir, `${route.id}.json`),
            JSON.stringify(route, null, 2)
        );
    }

    // 4. Generate Coordinates DB for Autocomplete & WASM
    const coordinatesDB = {};
    let stopCount = 0;

    for (const route of masterRoutes.rutas) {
        for (const stop of route.paradas) {
            if (stop.nombre && stop.lat && stop.lng) {
                // Use name as key. Handle duplicates?
                // If duplicates exist (same name, diff coords), maybe we should be smarter.
                // But for now, last write wins or we can append ID.
                // The current CoordinateFinder expects { "Name": [lat, lng] }.
                // Let's use name.
                const key = stop.nombre.trim();
                coordinatesDB[key] = [stop.lat, stop.lng];
                stopCount++;
            }
        }
    }

    // Also include known landmarks or hubs if defined elsewhere?
    // For now, just stops.
    
    await fs.writeFile(
        path.join(rootPublicPath, 'coordinates.json'),
        JSON.stringify(coordinatesDB, null, 2)
    );

    console.log(`✅ Synced ${masterRoutes.rutas.length} routes to public/data/`);
    console.log(`✅ Generated public/coordinates.json with ${Object.keys(coordinatesDB).length} unique stops.`);
}

sync().catch(console.error);
