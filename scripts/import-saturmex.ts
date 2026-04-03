import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INPUT_PATH = path.join(ROOT, 'public/data/saturmex_routes.json');
const OUTPUT_DIR = path.join(ROOT, 'public/data/routes');

if (!fs.existsSync(INPUT_PATH)) {
    console.error('saturmex_routes.json not found');
    process.exit(1);
}

interface SaturmexFeature {
    properties: {
        id?: string;
        name?: string;
    };
    geometry: {
        type: string;
        coordinates: number[][];
    };
}

interface SaturmexCollection {
    features: SaturmexFeature[];
}

const raw = fs.readFileSync(INPUT_PATH, 'utf8');
const collections = JSON.parse(raw) as SaturmexCollection[];

collections.forEach((collection) => {
    collection.features.forEach((feature) => {
        const props = feature.properties;
        const geom = feature.geometry;

        if (geom.type !== 'LineString') return;

        const name = props.name || 'Unknown Route';
        const id = (props.id || name).replace(/\s+/g, '_').toUpperCase();
        const filename = `${id}.json`;
        const filePath = path.join(OUTPUT_DIR, filename);

        if (fs.existsSync(filePath)) {
            return;
        }

        const coords = geom.coordinates;
        // GeoJSON coordinates are [longitude, latitude]; map to application's {lat, lng} order.
        const paradas = coords.map((c, i) => ({
            nombre: `Stop ${i + 1} - ${name}`,
            lat: c[1],
            lng: c[0],
            orden: i + 1
        }));

        const routeData = {
            id: id,
            nombre: name,
            tarifa: 12,
            tipo: 'Bus_Urbano',
            paradas: paradas
        };

        fs.writeFileSync(filePath, JSON.stringify(routeData, null, 2));
    });
});
