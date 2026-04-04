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

try {
    const rawData = fs.readFileSync(inputPath, 'utf-8');
    // JSON.parse in JS handles duplicate keys by keeping the last one.
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

            // --- STRICT DUPLICATE PREVENTION ---
            const newRoute: any = { ...route };

            // Map tipo_transporte to tipo if tipo is missing
            if (newRoute.tipo_transporte && !newRoute.tipo) {
                newRoute.tipo = newRoute.tipo_transporte;
            }
            // Always remove tipo_transporte to avoid confusion/duplicates
            delete newRoute.tipo_transporte;

            // Default tipo
            if (!newRoute.tipo) {
                newRoute.tipo = 'Bus_Urbano';
            }

            // Normalize frecuencia_minutos to Number (WASM expectations u32)
            if (newRoute.frecuencia_minutos !== undefined && newRoute.frecuencia_minutos !== null) {
                const val = parseInt(String(newRoute.frecuencia_minutos));
                if (!isNaN(val)) {
                    newRoute.frecuencia_minutos = val;
                } else {
                    delete newRoute.frecuencia_minutos;
                }
            }

            return newRoute;
        });
    }

    // 3. Mark as Optimized
    if (!data.metadata) data.metadata = {};
    data.metadata.optimized = true;
    data.metadata.last_optimized = new Date().toISOString();

    // Serialize with NO indentation to minimize size and ensure clean output
    fs.writeFileSync(outputPath, JSON.stringify(data));
    console.log(`✅ JSON Optimized! Saved to ${outputPath}`);

} catch (err: unknown) {
    console.error('❌ Error optimizing JSON:', err);
    process.exit(1);
}
