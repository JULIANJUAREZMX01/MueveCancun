import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.resolve(__dirname, '../public/data/master_routes.json');
const outputPath = path.resolve(__dirname, '../public/data/master_routes.optimized.json');

console.log('🔄 Optimizing JSON data...');

interface Horario {
    inicio?: string;
    fin?: string;
    inicio_oficial?: string;
    fin_oficial?: string;
}

interface RouteRecord {
    horario?: string | Horario;
    tipo?: string;
    tipo_transporte?: string;
    frecuencia_minutos?: unknown;
    [key: string]: unknown;
}

interface CatalogData {
    version?: string;
    metadata?: {
        version?: string;
        optimized?: boolean;
        last_optimized?: string;
        last_merged?: string;
        [key: string]: unknown;
    };
    rutas?: RouteRecord[];
    [key: string]: unknown;
}

function stripVolatileMeta(obj: CatalogData): CatalogData {
    const c = JSON.parse(JSON.stringify(obj)) as CatalogData;
    if (c.metadata) {
        delete c.metadata.last_optimized;
        delete c.metadata.last_merged;
    }
    return c;
}

try {
    const rawData = fs.readFileSync(inputPath, 'utf-8');
    const data = JSON.parse(rawData) as CatalogData;

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
                const h = route.horario as Horario;
                if (!h.inicio && h.inicio_oficial) {
                    route.horario = {
                        inicio: h.inicio_oficial,
                        fin: h.fin_oficial || ''
                    };
                }
            }

            // Ensure Tipo
            if (!route.tipo && !route.tipo_transporte) {
                route.tipo = 'Bus_Urbano';
            }

            // Normalize frecuencia_minutos to Number (WASM expectations u32)
            if (route.frecuencia_minutos !== undefined && route.frecuencia_minutos !== null) {
                const val = parseInt(String(route.frecuencia_minutos));
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

    let needsWrite = true;

    if (fs.existsSync(outputPath)) {
        try {
            const previousRaw = fs.readFileSync(outputPath, 'utf-8');
            const previousData = JSON.parse(previousRaw) as CatalogData;

            if (JSON.stringify(stripVolatileMeta(data)) === JSON.stringify(stripVolatileMeta(previousData)) &&
                previousData.metadata &&
                typeof previousData.metadata.last_optimized === 'string') {
                needsWrite = false;
            }
        } catch { /* fall through: rewrite if output is missing or malformed */ }
    }

    if (!needsWrite) {
        console.log(`✅ JSON Optimized! (content unchanged — not rewritten)`);
    } else {
        data.metadata.last_optimized = new Date().toISOString();
        fs.writeFileSync(outputPath, JSON.stringify(data));
        console.log(`✅ JSON Optimized! Saved to ${outputPath}`);
    }

} catch (err: unknown) {
    console.error('❌ Error optimizing JSON:', err);
    process.exit(1);
}
