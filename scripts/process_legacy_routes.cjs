const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const RAW_DIR = path.join(__dirname, '../data/raw_routes');
const OUTPUT_FILE = path.join(__dirname, '../rust-wasm/route-calculator/src/rust_data/embedded_routes.json');

function parseSaturmex(html) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const routeDiv = doc.querySelector('#route-info');
    const routeName = routeDiv.getAttribute('data-name');
    const routeId = routeDiv.getAttribute('data-id') || 'SAT_UNKNOWN';

    const stops = [];
    const listItems = doc.querySelectorAll('.stops-list li');
    listItems.forEach(li => {
        const name = li.textContent.trim();
        const lat = parseFloat(li.getAttribute('data-lat'));
        const lng = parseFloat(li.getAttribute('data-lng'));
        if (name && !isNaN(lat) && !isNaN(lng)) {
            stops.push({ name, lat, lng });
        }
    });

    return {
        id: routeId,
        name: routeName,
        operator: 'Saturmex',
        stops
    };
}

function parseTuricun(html) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const container = doc.querySelector('.route-container');
    const routeName = container.querySelector('h1').textContent.trim();
    const routeId = container.getAttribute('data-route-id') || 'TUR_UNKNOWN';

    const stops = [];
    const rows = doc.querySelectorAll('#stops tr.stop-row');
    rows.forEach(tr => {
        const name = tr.getAttribute('data-name');
        const lat = parseFloat(tr.getAttribute('data-lat'));
        const lng = parseFloat(tr.getAttribute('data-lng'));

        if (name && !isNaN(lat) && !isNaN(lng)) {
            stops.push({ name, lat, lng });
        }
    });

    return {
        id: routeId,
        name: routeName,
        operator: 'Turicun',
        stops
    };
}

function main() {
    if (!fs.existsSync(RAW_DIR)) {
        console.error(`Directory not found: ${RAW_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.html'));
    const allRoutes = [];

    files.forEach(file => {
        const filePath = path.join(RAW_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');

        console.log(`Processing ${file}...`);

        let routeData = null;
        if (file.includes('Saturmex')) {
            routeData = parseSaturmex(content);
        } else if (file.includes('TURICUN')) {
            routeData = parseTuricun(content);
        }

        if (routeData) {
            allRoutes.push(routeData);
        }
    });

    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allRoutes, null, 2));
    console.log(`Successfully wrote ${allRoutes.length} routes to ${OUTPUT_FILE}`);
}

main();
