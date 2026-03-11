import fs from 'fs';

const masterRoutesPath = 'public/data/master_routes.json';
const optimizedPath = 'public/data/master_routes.optimized.json';

try {
  const masterData = JSON.parse(fs.readFileSync(masterRoutesPath, 'utf-8'));
  let changed = false;
  masterData.rutas.forEach(route => {
    if (typeof route.frecuencia_minutos === 'string') {
      const parsed = parseInt(route.frecuencia_minutos.replace(/\D/g, ''), 10);
      route.frecuencia_minutos = isNaN(parsed) ? 10 : parsed;
      changed = true;
    }
  });
  if (changed) {
    fs.writeFileSync(masterRoutesPath, JSON.stringify(masterData, null, 2));
    console.log('Patched master_routes.json');
  }

  const optData = JSON.parse(fs.readFileSync(optimizedPath, 'utf-8'));
  changed = false;
  optData.rutas.forEach(route => {
    if (typeof route.frecuencia_minutos === 'string') {
      const parsed = parseInt(route.frecuencia_minutos.replace(/\D/g, ''), 10);
      route.frecuencia_minutos = isNaN(parsed) ? 10 : parsed;
      changed = true;
    }
  });
  if (changed) {
    fs.writeFileSync(optimizedPath, JSON.stringify(optData));
    console.log('Patched master_routes.optimized.json');
  }
} catch (e) {
  console.error(e);
}
