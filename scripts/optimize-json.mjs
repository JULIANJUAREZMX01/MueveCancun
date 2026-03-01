import fs from 'fs';
import path from 'path';

const inputFile = path.join(process.cwd(), 'public/data/master_routes.json');
const outputFile = path.join(process.cwd(), 'public/data/master_routes.optimized.json');

console.log('⚡ Optimizing Route Data...');
console.log(`Input: ${inputFile}`);

try {
  const raw = fs.readFileSync(inputFile, 'utf-8');
  const data = JSON.parse(raw);

  // Normalize Data for WASM
  const normalized = { ...data };

  // 1. Ensure Root Version
  if (!normalized.version && normalized.metadata?.version) {
    normalized.version = normalized.metadata.version;
  }
  if (!normalized.version) {
    normalized.version = "1.0.0";
  }

  // 2. Normalize Routes
  if (normalized.rutas) {
    normalized.rutas = normalized.rutas.map((r) => {
      const route = { ...r };

      // Convert string horario to Schedule object
      if (typeof route.horario === 'string') {
        const parts = route.horario.split('-');
        route.horario = {
            inicio: parts[0]?.trim() || '',
            fin: parts[1]?.trim() || ''
        };
      } else if (route.horario && typeof route.horario === 'object') {
        // Normalize inicio_oficial/fin_oficial to inicio/fin
        if (!route.horario.inicio && route.horario.inicio_oficial) {
          route.horario = {
              inicio: route.horario.inicio_oficial,
              fin: route.horario.fin_oficial || ''
          };
        }
      }

      // Ensure required 'tipo' field exists
      if (!route.tipo && !route.tipo_transporte) {
        route.tipo = 'Bus_Urbano';
      }

      // Ensure 'id' exists (should already be there)
      if (!route.id) {
          console.warn(`⚠️ Route missing ID: ${route.nombre}`);
      }

      return route;
    });
  }

  const optimized = JSON.stringify(normalized);
  fs.writeFileSync(outputFile, optimized);

  const originalSize = fs.statSync(inputFile).size;
  const optimizedSize = fs.statSync(outputFile).size;
  const saved = originalSize - optimizedSize;

  console.log(`Output: ${outputFile}`);
  console.log(`Original Size: ${(originalSize / 1024).toFixed(2)} KB`);
  console.log(`Optimized Size: ${(optimizedSize / 1024).toFixed(2)} KB`);
  console.log(`Changes: Added version, normalized types/horarios.`);
  console.log('✅ Optimization Complete!');

} catch (err) {
  console.error('❌ Failed to optimize JSON:', err);
  process.exit(1);
}
