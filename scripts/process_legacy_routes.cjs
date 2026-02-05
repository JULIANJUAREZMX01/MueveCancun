const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const LEGACY_DIR = path.join(__dirname, '../public/data/legacy');
const OUTPUT_FILE = path.join(__dirname, '../rust-wasm/route-calculator/src/rust_data/embedded_routes.json');

const FILES = [
    'Saturmex.html',
    'TURICUN _ Transporte Urbano de Cancún.html'
];

function extractDataFromFile(filename) {
    const filePath = path.join(LEGACY_DIR, filename);
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  File not found: ${filename}`);
        return [];
    }

    console.log(`Processing ${filename}...`);
    const html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html);
    const routes = [];

    // Extract from script tags
    $('script').each((i, el) => {
        const scriptContent = $(el).html();
        if (!scriptContent) return;

        // Strategy 1: Look for "markers" or "locations" arrays common in old map exports
        // Example pattern: {lat: 21.123, lng: -86.123, title: "Stop Name"}

        // Regex to find objects with lat, lng, and name/title
        // This is a heuristic.
        const markerRegex = /\{\s*(?:["']?lat["']?|["']?latitud["']?)\s*:\s*(-?\d+\.\d+)\s*,\s*(?:["']?lng["']?|["']?lon["']?|["']?longitud["']?)\s*:\s*(-?\d+\.\d+)\s*,\s*(?:["']?title["']?|["']?name["']?|["']?nombre["']?)\s*:\s*["']([^"']+)["']/gi;

        let match;
        while ((match = markerRegex.exec(scriptContent)) !== null) {
            routes.push({
                lat: parseFloat(match[1]),
                lng: parseFloat(match[2]),
                name: match[3].trim()
            });
        }

        // Strategy 2: Look for Google Maps LatLng and separate titles
        // Often: var marker = new google.maps.Marker({position: new google.maps.LatLng(...), title: "..."})
        const gmRegex = /new\s+google\.maps\.LatLng\((-?\d+\.\d+),\s*(-?\d+\.\d+)\).*?title:\s*["']([^"']+)["']/gs;
        while ((match = gmRegex.exec(scriptContent)) !== null) {
            routes.push({
                lat: parseFloat(match[1]),
                lng: parseFloat(match[2]),
                name: match[3].trim()
            });
        }
    });

    // Strategy 3: HTML Parsing if it's a list
    // Some old files just list points in a <ul> or <table>
    // (Skipping for now unless requested)

    return routes;
}

function processLegacyRoutes() {
    const allStops = {};
    const outputRoutes = [];

    FILES.forEach(filename => {
        const extractedPoints = extractDataFromFile(filename);

        if (extractedPoints.length > 0) {
            // Create a "Route" object for this file
            // We assume the file represents one or more routes, but for now let's treat it as one "Legacy Route"
            // or a collection of stops.

            // Generate a simpler ID based on filename
            const routeId = filename.split('.')[0].replace(/\s+/g, '_').toUpperCase();

            // Add stops to our DB
            const stopNames = [];
            extractedPoints.forEach((pt, idx) => {
                const stopId = `${routeId}_${String(idx + 1).padStart(3, '0')}`;
                // Use the name from the file, or generate one if missing (though our regex requires name)
                const stopName = pt.name;

                allStops[stopName] = [pt.lat, pt.lng];
                stopNames.push(stopName);
            });

            outputRoutes.push({
                id: routeId,
                name: filename.replace('.html', '').trim(),
                transport_type: 'Bus', // Default
                price: 10.0, // Default legacy price
                duration: "Unknown",
                badges: ["Legacy"],
                origin_hub: stopNames[0] || "?",
                dest_hub: stopNames[stopNames.length - 1] || "?",
                stops: stopNames,
                operator: "Legacy Import",
                schedule: "Unknown",
                frequency: "Unknown"
            });

            console.log(`  ✅ Extracted ${extractedPoints.length} points from ${filename}`);
        } else {
             console.log(`  ⚠️ No data extracted from ${filename}`);
        }
    });

    const output = {
        routes: outputRoutes,
        stops: allStops
    };

    // Ensure directory exists
    const outDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`Successfully generated embedded_routes.json with ${outputRoutes.length} routes and ${Object.keys(allStops).length} stops.`);
}

processLegacyRoutes();
