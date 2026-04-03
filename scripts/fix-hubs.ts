import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ROUTES_DIR = path.join(ROOT, 'public/data/routes');

const HUBS: Record<string, { lat: number; lng: number }> = {
    "El Crucero": { lat: 21.1714, lng: -86.8219 },
    "Terminal ADO Cancún Centro": { lat: 21.1594, lng: -86.8271 },
    "Terminal ADO Centro Cancún": { lat: 21.1594, lng: -86.8271 },
    "Terminal ADO Centro": { lat: 21.1594, lng: -86.8271 },
    "Plaza Las Américas": { lat: 21.1472, lng: -86.8234 },
    "Plaza Las Américas (Kabah)": { lat: 21.141, lng: -86.843 },
    "Mercado 28": { lat: 21.1611, lng: -86.8329 },
    "Mercado 23": { lat: 21.1647, lng: -86.8267 },
    "Muelle Ultramar (Puerto Juárez)": { lat: 21.1819, lng: -86.8028 }
};

interface Stop {
    nombre?: string;
    name?: string;
    lat: number;
    lng: number;
}

interface Route {
    paradas?: Stop[];
}

interface Data {
    rutas?: Route[];
}

const routeFiles = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.json'));

for (const file of routeFiles) {
    const filePath = path.join(ROUTES_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf8');
    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch {
        continue;
    }

    let modified = false;

    const processRoute = (route: Route) => {
        if (route.paradas && Array.isArray(route.paradas)) {
            route.paradas.forEach((stop) => {
                const name = stop.nombre || stop.name || "";
                if (HUBS[name]) {
                    const target = HUBS[name];
                    if (stop.lat !== target.lat || stop.lng !== target.lng) {
                        stop.lat = target.lat;
                        stop.lng = target.lng;
                        modified = true;
                    }
                }
            });
        }
    };

    if (Array.isArray(data)) {
        (data as Route[]).forEach(processRoute);
    } else if (data && typeof data === 'object' && 'rutas' in data) {
        const catalog = data as Data;
        if (catalog.rutas && Array.isArray(catalog.rutas)) {
            catalog.rutas.forEach(processRoute);
        }
    } else if (data && typeof data === 'object') {
        processRoute(data as Route);
    }

    if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }
}
