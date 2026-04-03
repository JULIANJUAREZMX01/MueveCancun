const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const modules = [
    { name: 'route-calculator', file: 'route_calculator_bg.wasm' },
    { name: 'spatial-index', file: 'spatial_index_bg.wasm' }
];

const missing = modules
    .filter(m => !fs.existsSync(path.join(rootDir, 'public/wasm', m.name, m.file)));

if (missing.length) {
    console.error('[ERROR] Missing WASM binaries: ' + missing.map(m => m.name).join(', ') + '. Run build:wasm first.');
    process.exit(1);
} else {
    console.log('[SUCCESS] All WASM binaries found.');
}
