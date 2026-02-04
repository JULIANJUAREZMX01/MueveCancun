const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const missing = ['route-calculator/route_calculator_bg.wasm', 'spatial-index/spatial_index_bg.wasm']
    .filter(f => !fs.existsSync(path.join(rootDir, 'public/wasm', f)));

if (missing.length) {
    console.error('❌ Missing WASM binaries: ' + missing.join(', ') + '. Run build:wasm first.');
    process.exit(1);
} else {
    console.log('✅ WASM binaries found.');
}
