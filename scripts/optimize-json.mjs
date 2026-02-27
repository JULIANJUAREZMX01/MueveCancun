import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.resolve(__dirname, '../public/data/master_routes.json');
const outputPath = path.resolve(__dirname, '../public/data/master_routes.optimized.json');

console.log('🔄 Optimizing JSON data...');

try {
    const rawData = fs.readFileSync(inputPath, 'utf-8');
    const data = JSON.parse(rawData);

    // 1. Promote Version
    if (data.metadata && data.metadata.version) {
        data.version = data.metadata.version;
    } else {
        data.version = "1.0.0";
    }

    // 2. Normalize Routes
    if (data.rutas && Array.isArray(data.rutas)) {
        data.rutas = data.rutas.map(route => {
            // Normalize Horario
            if (typeof route.horario === 'string') {
                const parts = route.horario.split('-');
                route.horario = {
                    inicio: parts[0]?.trim() || '',
                    fin: parts[1]?.trim() || ''
                };
            } else if (route.horario && typeof route.horario === 'object') {
                // Normalize legacy fields
                if (!route.horario.inicio && route.horario.inicio_oficial) {
                    route.horario = {
                        inicio: route.horario.inicio_oficial,
                        fin: route.horario.fin_oficial || ''
                    };
                    // Remove old keys to save space
                    delete route.horario.inicio_oficial;
                    delete route.horario.fin_oficial;
                    delete route.horario.guardia_nocturna;
                }
            }

            // Ensure Tipo
            if (!route.tipo && !route.tipo_transporte) {
                route.tipo = 'Bus_Urbano';
            }

            // Remove potentially heavy unused fields if any (optional, but good for optimization)
            // For now, we keep everything else.

            return route;
        });
    }

    // 3. Mark as Optimized
    if (!data.metadata) data.metadata = {};
    data.metadata.optimized = true;
    data.metadata.last_optimized = new Date().toISOString();

    // 4. Write Minified JSON
    fs.writeFileSync(outputPath, JSON.stringify(data)); // No pretty print for optimization

    console.log(`✅ JSON Optimized! Saved to ${outputPath}`);
    console.log(`📉 Size reduced from ${(rawData.length / 1024).toFixed(2)}KB to ${(fs.statSync(outputPath).size / 1024).toFixed(2)}KB`);

} catch (err) {
    console.error('❌ Error optimizing JSON:', err);
    process.exit(1);
}
