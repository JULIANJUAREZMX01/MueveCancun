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
    } else if (!data.version) {
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
                if (!route.horario.inicio && route.horario.inicio_oficial) {
                    route.horario = {
                        inicio: route.horario.inicio_oficial,
                        fin: route.horario.fin_oficial || ''
                    };
                }
            }

            // Ensure Tipo
            if (!route.tipo && !route.tipo_transporte) {
                route.tipo = 'Bus_Urbano';
            }

            // Normalize frecuencia_minutos to Number (WASM expectations u32)
            if (route.frecuencia_minutos !== undefined && route.frecuencia_minutos !== null) {
                const val = parseInt(route.frecuencia_minutos);
                if (!isNaN(val)) {
                    route.frecuencia_minutos = val;
                } else {
                    delete route.frecuencia_minutos;
                }
            }

            return route;
        });
    }

    // 3. Mark as Optimized
    if (!data.metadata) data.metadata = {};
    data.metadata.optimized = true;

    function stripVolatileMeta(obj) {
        const c = JSON.parse(JSON.stringify(obj));
        if (c.metadata) {
            delete c.metadata.last_optimized;
            delete c.metadata.last_merged;
        }
        return c;
    }

    let needsWrite = true;

    if (fs.existsSync(outputPath)) {
        try {
            const previousRaw = fs.readFileSync(outputPath, 'utf-8');
            const previousData = JSON.parse(previousRaw);

            if (JSON.stringify(stripVolatileMeta(data)) === JSON.stringify(stripVolatileMeta(previousData)) &&
                previousData.metadata &&
                typeof previousData.metadata.last_optimized === 'string') {
                needsWrite = false;
            }
        } catch (e) { }
    }

    if (!needsWrite) {
        console.log(`✅ JSON Optimized! (content unchanged — not rewritten)`);
    } else {
        data.metadata.last_optimized = new Date().toISOString();
        fs.writeFileSync(outputPath, JSON.stringify(data));
        console.log(`✅ JSON Optimized! Saved to ${outputPath}`);
    }

} catch (err) {
    console.error('❌ Error optimizing JSON:', err);
    process.exit(1);
}
