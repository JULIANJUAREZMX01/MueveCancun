#!/usr/bin/env node
/**
 * Add Route Colors to master_routes.json
 * Añade route_id y color_id a cada ruta
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataPath = path.join(rootDir, 'public/data/master_routes.json');

console.log('🎨 Adding route colors to master_routes.json\n');

// Read current data
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// Route ID mapping based on name patterns
const routeIdMap: Record<string, string> = {
  // Rutas principales
  'R-2-94': 'R2',
  'R-1': 'R1',
  'R-27': 'R27',
  'R-15': 'R15',
  'R-13': 'R13',
  'R-3': 'R3',
  'R-4': 'R4',
  'R-5': 'R5',
  'R-6': 'R6',
  'R-7': 'R7',
  'R-8': 'R8',
  'R-9': 'R9',
  'R-10': 'R10',
  'R-11': 'R11',
  'R-12': 'R12',
  'R-14': 'R14',
  'R-16': 'R16',
  'R-17': 'R17',
  'R-18': 'R18',
  'R-19': 'R19',
  'R-20': 'R20',
  'R-21': 'R21',
  'R-22': 'R22',
  'R-23': 'R23',
  'R-24': 'R24',
  'R-25': 'R25',
  'R-26': 'R26',
  'R-28': 'R28',
  'R-29': 'R29',
  'R-30': 'R30',
  'R-31': 'R31',

  // Rutas especiales
  'Playa Express': 'PLAYA_EXPRESS',
  'PLAYA EXPRESS': 'PLAYA_EXPRESS',
  'Expreso': 'EXPRESO',
  'EXPRESO': 'EXPRESO',
  'Nocturno': 'NOCTURNO',
  'NOCTURNO': 'NOCTURNO',
};

function extractRouteId(route: any): string {
  // Check nombre first
  if (route.nombre) {
    // Check exact matches
    for (const [pattern, routeId] of Object.entries(routeIdMap)) {
      if (route.nombre.includes(pattern)) {
        return routeId;
      }
    }

    // Try to extract "RUTA XX" or "R-XX" or "R XX" pattern
    const rutaMatch = route.nombre.match(/(?:RUTA|R)[-\s]?(\d+)/i);
    if (rutaMatch) {
      const num = parseInt(rutaMatch[1]);
      if (num >= 1 && num <= 31) {
        return `R${num}`;
      }
    }
  }

  // Check id
  if (route.id) {
    // Direct R-number prefix
    const idMatch = route.id.match(/^R(\d+)_/);
    if (idMatch) {
      return `R${idMatch[1]}`;
    }

    // Try to extract R-number from anywhere in ID
    const anyMatch = route.id.match(/R[-_]?(\d+)/i);
    if (anyMatch) {
      const num = parseInt(anyMatch[1]);
      if (num >= 1 && num <= 31) {
        return `R${num}`;
      }
    }
  }

  // Check tipo
  if (route.tipo) {
    if (route.tipo.includes('Combi_Roja') || route.tipo.includes('CR_')) return 'R1';
    if (route.tipo.includes('Combi_Azul') || route.tipo.includes('CA_')) return 'R2';
    if (route.tipo.includes('ADO') || route.tipo.includes('ado')) return 'EXPRESO';
  }

  return 'DEFAULT';
}

let updated = 0;
let total = data.rutas.length;

data.rutas = data.rutas.map((route: any) => {
  const routeId = extractRouteId(route);

  if (routeId !== route.route_id) {
    updated++;
  }

  return {
    ...route,
    route_id: routeId,
    color_id: routeId, // Same as route_id for now
  };
});

// Update metadata
data.metadata = {
  ...data.metadata,
  last_updated: new Date().toISOString(),
  version: '3.8.0',
  colors_added: new Date().toISOString(),
};

// Write back
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

console.log(`✅ Updated ${updated} routes out of ${total} total`);
console.log(`📊 Route distribution:`);

// Count by route_id
const distribution: Record<string, number> = {};
data.rutas.forEach((route: any) => {
  distribution[route.route_id] = (distribution[route.route_id] || 0) + 1;
});

Object.entries(distribution)
  .sort((a, b) => b[1] - a[1])
  .forEach(([routeId, count]) => {
    console.log(`  ${routeId}: ${count} route(s)`);
  });

console.log(`\n✨ master_routes.json updated with route colors!`);
console.log(`   Routes now have 'route_id' and 'color_id' fields`);
console.log(`   Maps will show color-coded routes automatically`);
