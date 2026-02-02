import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'public/data/master_routes.json');
const rawData = fs.readFileSync(filePath, 'utf-8');
const data = JSON.parse(rawData);

console.log('Original Data Version:', data.metadata?.version || 'Unknown');

const normalizedRoutes = data.rutas.map(route => {
  // Map 'recorrido' to 'paradas'
  let paradas = route.recorrido || route.paradas || [];
  
  // Normalize stops
  paradas = paradas.map(stop => {
    return {
      ...stop,
      lng: stop.lon || stop.lng, // Map lon to lng
      lat: stop.lat,
      // Ensure other fields are present if needed
    };
  });

  // Cleanup: Remove 'lon' from stop if we want slightly cleaner object, 
  // but keeping it doesn't hurt unless strict mode. 
  // Let's remove 'lon' and 'recorrido' from the final object to be clean.
  paradas.forEach(p => { delete p.lon; });

  return {
    ...route,
    paradas: paradas,
    tipo_transporte: route.tipo || route.tipo_transporte, // Map tipo to tipo_transporte
    // Cleanup old keys
    recorrido: undefined,
    tipo: undefined
  };
});

// Update the data object
data.rutas = normalizedRoutes;
data.metadata = {
  ...data.metadata,
  version: '2.3.0-normalized',
  normalization_date: new Date().toISOString()
};

// Write back
fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log('✅ Normalized public/data/master_routes.json');
console.log('   - Mapped lon -> lng');
console.log('   - Mapped recorrido -> paradas');
console.log('   - Mapped tipo -> tipo_transporte');
console.log('   - Updated version to 2.3.0-normalized');
