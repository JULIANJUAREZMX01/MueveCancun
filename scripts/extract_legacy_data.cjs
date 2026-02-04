const fs = require('fs');
const path = require('path');

const LEGACY_DIR = path.join(__dirname, '../data/legacy');
const OUTPUT_FILE = path.join(__dirname, '../public/coordinates.json');

// Mock coordinates for extracted stops (since HTML doesn't have coords usually, we simulate geocoding or use a lookup)
// In a real scenario, we might use a geocoder API or have coords in the HTML (hidden fields).
// For this exercise, we will assign random nearby coords to demonstrate the "Extraction" pipeline.
function mockGeocode(name) {
    // Base Cancún Coords
    const baseLat = 21.16;
    const baseLng = -86.85;
    return [
        baseLat + (Math.random() - 0.5) * 0.05,
        baseLng + (Math.random() - 0.5) * 0.05
    ];
}

async function extract() {
    console.log("🚀 Starting Inmortal Data Extraction...");

    if (!fs.existsSync(LEGACY_DIR)) {
        console.error("❌ Legacy directory not found!");
        return;
    }

    const files = fs.readdirSync(LEGACY_DIR).filter(f => f.endsWith('.html'));
    let extractedCount = 0;
    let newStops = {};

    for (const file of files) {
        console.log(`📄 Processing ${file}...`);
        const content = fs.readFileSync(path.join(LEGACY_DIR, file), 'utf-8');

        // Naive Regex to find cell content
        // Looking for <td>Content</td>
        const regex = /<td>(.*?)<\/td>/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const val = match[1].trim();
            // Filter out obvious non-stops (Times, Route names usually short like R-44)
            if (val.length > 4 && !val.includes(':') && !val.startsWith('Ruta')) {
                // It's likely a stop name
                console.log(`   📍 Found Stop: ${val}`);
                newStops[val] = mockGeocode(val);
                extractedCount++;
            }
        }
    }

    console.log(`✅ Extracted ${extractedCount} stops.`);

    // Merge with existing
    let existing = {};
    if (fs.existsSync(OUTPUT_FILE)) {
        existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    }

    const merged = { ...existing, ...newStops };
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(merged, null, 2));
    console.log(`💾 Saved to ${OUTPUT_FILE}. Total Stops: ${Object.keys(merged).length}`);
}

extract();
