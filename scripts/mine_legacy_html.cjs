const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const SATURMEX_PATH = path.join(__dirname, '../data/legacy/Saturmex.html');
const TURICUN_PATH = path.join(__dirname, '../data/legacy/TURICUN.html');
const OUTPUT_PATH = path.join(__dirname, '../src/data/routes_legacy_mined.json');

function parseSaturmex() {
    console.log("Parsing Saturmex...");
    if (!fs.existsSync(SATURMEX_PATH)) { console.log("Saturmex file not found"); return []; }
    const content = fs.readFileSync(SATURMEX_PATH, 'utf8');
    const dom = new JSDOM(content);
    const document = dom.window.document;

    const routes = {};

    const rows = document.querySelectorAll('table tbody tr');
    rows.forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length >= 2) {
            const routeName = cols[0].textContent.trim();
            const stopName = cols[1].textContent.trim();
            const time = cols[2] ? cols[2].textContent.trim() : "";

            const id = routeName.replace(/\s+/g, '_').toUpperCase();

            if (!routes[id]) {
                routes[id] = {
                    id: id,
                    nombre: routeName,
                    tipo_transporte: "Bus_Urban",
                    paradas: [],
                    empresa: "Saturmex",
                    tarifa: 12.0
                };
            }
            routes[id].paradas.push({
                nombre: stopName,
                orden: routes[id].paradas.length,
                horario: time
            });
        }
    });
    return Object.values(routes);
}

function parseTuricun() {
    console.log("Parsing Turicun...");
    if (!fs.existsSync(TURICUN_PATH)) { console.log("Turicun file not found"); return []; }
    const content = fs.readFileSync(TURICUN_PATH, 'utf8');
    const dom = new JSDOM(content);
    const document = dom.window.document;

    const routes = {};

    const rows = document.querySelectorAll('table tr');
    rows.forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length >= 2) {
            const routeName = cols[0].textContent.trim();
            const stopName = cols[1].textContent.trim();

            const id = routeName.replace(/\s+/g, '_').toUpperCase();

            if (!routes[id]) {
                routes[id] = {
                    id: id,
                    nombre: routeName,
                    tipo_transporte: "Bus_Urban",
                    paradas: [],
                    empresa: "Turicun",
                    tarifa: 12.0
                };
            }
            routes[id].paradas.push({
                nombre: stopName,
                orden: routes[id].paradas.length
            });
        }
    });
    return Object.values(routes);
}

function main() {
    const r1 = parseSaturmex();
    const r2 = parseTuricun();
    const all = [...r1, ...r2];

    const output = {
        metadata: {
            source: "Legacy HTML Mining",
            date: new Date().toISOString()
        },
        rutas: all
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    console.log(`Done! Mined ${all.length} routes. Saved to ${OUTPUT_PATH}`);
}

main();
