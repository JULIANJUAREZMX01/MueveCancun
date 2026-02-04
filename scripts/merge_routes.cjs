const fs = require('fs');
const path = require('path');

const MASTER_PATH = path.join(__dirname, '../src/data/routes.json');
const MINED_PATH = path.join(__dirname, '../src/data/routes_legacy_mined.json');

const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
const mined = JSON.parse(fs.readFileSync(MINED_PATH, 'utf8'));

// Create a map of existing IDs to avoid dupes
const existingIds = new Set(master.rutas.map(r => r.id));

let addedCount = 0;

mined.rutas.forEach(route => {
    if (!existingIds.has(route.id)) {
        // Add coordinates if missing?
        // For now, just add the route. The WASM engine handles missing coords gracefully (skips them).
        // But for them to appear on the map, we need coords.
        // We can leave them as "ghost" routes for search, even if map drawing is partial.
        master.rutas.push(route);
        addedCount++;
        console.log(`Added new route: ${route.nombre} (${route.id})`);
    } else {
        console.log(`Skipping duplicate: ${route.id}`);
    }
});

fs.writeFileSync(MASTER_PATH, JSON.stringify(master, null, 2));
console.log(`Merge complete. Added ${addedCount} routes.`);
