import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'public/data/master_routes.json');
const content = fs.readFileSync(filePath, 'utf8');

try {
    const data = JSON.parse(content);
    console.log(`Version: ${data.version}`);
    console.log(`Routes: ${data.rutas.length}`);
    
    data.rutas.forEach((r, i) => {
        if (!r.id) {
            console.error(`❌ Route at index ${i} matches no ID! Name: ${r.nombre}`);
        }
        if (!r.nombre) console.error(`❌ Route at index ${i} missing name!`);
        if (r.tarifa === undefined) console.error(`❌ Route at index ${i} missing tarifa!`);
        if (!r.tipo) console.error(`❌ Route at index ${i} missing tipo!`);
        if (!r.paradas) console.error(`❌ Route at index ${i} missing paradas!`);
    });
    
    console.log("JSON structure check complete.");

    // Simulate minified string
    const minified = JSON.stringify(data);
    console.log(`Minified length: ${minified.length}`);
    // Check char at 1862
    if (minified.length > 1862) {
        console.log(`Context at 1862: ${minified.substring(1850, 1880)}`);
    }

} catch (e) {
    console.error("JSON Parse Error:", e.message);
}
