import fs from 'node:fs/promises';
import path from 'node:path';

// Haversine distance helper
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

async function merge() {
    console.log("🚀 Merging Saturmex routes...");

    const saturmexPath = path.resolve('public/data/saturmex_routes.json');
    const routesPath = path.resolve('src/data/routes.json');

    // Load data
    const saturmexContent = await fs.readFile(saturmexPath, 'utf-8');
    const saturmexData = JSON.parse(saturmexContent);

    let routesData;
    try {
        const content = await fs.readFile(routesPath, 'utf-8');
        routesData = JSON.parse(content);
    } catch (e) {
        console.warn("⚠️ Could not read routes.json, creating new structure.");
        routesData = { version: "1.1", rutas: [] };
    }

    const existingIds = new Set(routesData.rutas.map(r => r.id));
    let addedCount = 0;

    // Handle array of FeatureCollections or single FeatureCollection
    const collections = Array.isArray(saturmexData) ? saturmexData : [saturmexData];

    for (const collection of collections) {
        if (!collection.features) continue;

        for (const feature of collection.features) {
            if (!feature.geometry || feature.geometry.type !== 'LineString') continue;

            const props = feature.properties || {};
            // Extract numbers from name for ID if no explicit ID
            const nameId = props.name ? props.name.replace(/[^0-9]/g, '') : '';
            const routeIdRaw = props.route_id || props.id || nameId || 'unknown_' + Math.floor(Math.random() * 1000);

            // Clean up ID (e.g., remove "polyline_" prefix if present)
            const cleanId = routeIdRaw.replace('polyline_', '').replace(/_[0-9]+$/, '');
            const routeId = `ruta_${cleanId}`;

            if (existingIds.has(routeId)) {
                console.log(`⚠️ Route ${routeId} (${props.name}) already exists. Skipping.`);
                continue;
            }

            const routeName = props.name || `Ruta ${cleanId}`;
            const coords = feature.geometry.coordinates; // [lat, lng] based on file inspection

            // Generate stops every ~500m
            const paradas = [];
            let lastStopCoord = null;
            let stopIndex = 0;

            for (let i = 0; i < coords.length; i++) {
                const [lat, lng] = coords[i]; // lat, lng

                // Always add first and last point
                const isFirst = i === 0;
                const isLast = i === coords.length - 1;

                let shouldAdd = isFirst || isLast;

                if (!shouldAdd && lastStopCoord) {
                    const dist = getDistance(lastStopCoord[0], lastStopCoord[1], lat, lng);
                    if (dist >= 500) { // 500 meters threshold
                        shouldAdd = true;
                    }
                }

                if (shouldAdd) {
                    stopIndex++;
                    paradas.push({
                        id: `${routeId}_s_${stopIndex}`,
                        nombre: `Parada ${routeName} #${stopIndex}`,
                        lat: lat,
                        lng: lng,
                        orden: stopIndex,
                        // Add generic keywords for search if needed
                        referencias: ""
                    });
                    lastStopCoord = [lat, lng];
                }
            }

            const newRoute = {
                id: routeId,
                nombre: routeName,
                tarifa: 12, // Default
                tipo_transporte: "Autobús",
                empresa: "Transporte Público", // Default
                paradas: paradas,
                // Optional: Store original path for detailed drawing if different from stops
                // path: coords
            };

            routesData.rutas.push(newRoute);
            existingIds.add(routeId); // Prevent duplicate adds in same run
            addedCount++;
            console.log(`✅ Added ${routeId} (${routeName}) with ${paradas.length} generated stops.`);
        }
    }

    if (addedCount > 0) {
        await fs.writeFile(routesPath, JSON.stringify(routesData, null, 2));
        console.log(`🎉 Merged ${addedCount} new routes into src/data/routes.json`);
    } else {
        console.log("No new routes to merge.");
    }
}

merge().catch(console.error);
