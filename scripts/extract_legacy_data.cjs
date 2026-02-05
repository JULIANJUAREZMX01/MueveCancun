const fs = require('fs');
const path = require('path');

const LEGACY_DIR = path.join(__dirname, '../data/legacy');
const OUTPUT_FILE = path.join(__dirname, '../public/coordinates.json');

// Mock coordinates for extracted stops
function mockGeocode(name) {
    const baseLat = 21.16;
    const baseLng = -86.85;
    return [
        baseLat + (Math.random() - 0.5) * 0.05,
        baseLng + (Math.random() - 0.5) * 0.05
    ];
}

async function extract() {
    console.log("🚀 Starting Inmortal Data Extraction (Improved v2)...");

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

        // Pattern 1: Saturmex (Div with title and description)
        // <div class="text-sm font-semibold text-gray-900 truncate">RUTA 31</div>
        const saturmexRegex = /truncate">(RUTA\s\d+.*?)</g;
        let match;
        while ((match = saturmexRegex.exec(content)) !== null) {
            const val = match[1].trim();
            console.log(`   📍 Found Saturmex Route: ${val}`);
            newStops[val] = mockGeocode(val);
            extractedCount++;
        }

        // Pattern 2: Turicun (H3 with title)
        // <h3 class="text-2xl font-bold text-gray-900">Ruta 1</h3>
        const turicunRegex = /text-gray-900">(Ruta\s\d+.*?)</g;
        while ((match = turicunRegex.exec(content)) !== null) {
            const val = match[1].trim();
            console.log(`   📍 Found Turicun Route: ${val}`);
            newStops[val] = mockGeocode(val);
            extractedCount++;
        }

        // Pattern 3: Generic table cells (for old backups)
        const tableRegex = /<td>(.*?)<\/td>/g;
        while ((match = tableRegex.exec(content)) !== null) {
            const val = match[1].trim().replace(/<[^>]*>?/gm, ''); // Remove inner tags
            if (val.length > 4 && !val.includes(':') && !val.includes('{') && val.length < 50) {
                console.log(`   📍 Found Cell Data: ${val}`);
                newStops[val] = mockGeocode(val);
                extractedCount++;
            }
        }
    }

    console.log(`✅ Extracted ${extractedCount} items.`);

    // Merge with existing
    let existing = {};
    if (fs.existsSync(OUTPUT_FILE)) {
        try {
            existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
        } catch (e) {
            console.warn("⚠️ Could not parse existing coordinates.json, starting fresh.");
        }
    }

    const merged = { ...existing, ...newStops };
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(merged, null, 2));
    console.log(`💾 Saved to ${OUTPUT_FILE}. Total Database items: ${Object.keys(merged).length}`);
}

extract();
