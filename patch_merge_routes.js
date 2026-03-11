import fs from 'fs';

const filePath = 'scripts/merge-routes.mjs';
let content = fs.readFileSync(filePath, 'utf8');

const target = `    // Normalize field names (paradas is canonical)
    if (!route.paradas && route.stops) {
      route.paradas = route.stops;
      delete route.stops;
    }`;

const replacement = `    // Normalize field names (paradas is canonical)
    if (!route.paradas && route.stops) {
      route.paradas = route.stops;
      delete route.stops;
    }

    // Normalize frecuencia_minutos to an integer
    if (typeof route.frecuencia_minutos === 'string') {
      const parsed = parseInt(route.frecuencia_minutos.replace(/\\D/g, ''), 10);
      route.frecuencia_minutos = isNaN(parsed) ? 10 : parsed;
    }`;

content = content.replace(target, replacement);
fs.writeFileSync(filePath, content);
console.log('Patched merge-routes.mjs');
