const fs = require('fs');
const path = require('path');

const MASTER_PATH = path.join(__dirname, '../src/data/routes.json');
const MINED_PATH = path.join(__dirname, '../src/data/routes_legacy_mined.json');

if (!fs.existsSync(MINED_PATH)) {
    console.log("No mined data found. Run mine_legacy_html.cjs first.");
    process.exit(0);
}

const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
const mined = JSON.parse(fs.readFileSync(MINED_PATH, 'utf8'));

const existingIds = new Set(master.rutas.map(r => r.id));
let addedCount = 0;

mined.rutas.forEach(route => {
    if (!existingIds.has(route.id)) {
        master.rutas.push(route);
        addedCount++;
    }
});

fs.writeFileSync(MASTER_PATH, JSON.stringify(master, null, 2));
console.log(`Merge complete. Added ${addedCount} routes.`);
