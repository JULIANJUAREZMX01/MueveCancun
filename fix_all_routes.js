import fs from 'fs';
import path from 'path';

const routesDir = 'public/data/routes';
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  try {
    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let changed = false;

    // Some routes are arrays, some are objects, some are {rutas: []}
    let routes = [];
    if (Array.isArray(data)) {
        routes = data;
    } else if (data.rutas && Array.isArray(data.rutas)) {
        routes = data.rutas;
    } else if (data.id) {
        routes = [data];
    }

    routes.forEach(route => {
        if (typeof route.frecuencia_minutos === 'string') {
          const parsed = parseInt(route.frecuencia_minutos.replace(/\D/g, ''), 10);
          route.frecuencia_minutos = isNaN(parsed) ? 10 : parsed;
          changed = true;
        }
    });

    if (changed) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log('Fixed', file);
    }
  } catch(e) {
    console.error('Error fixing', file, e);
  }
});
