import fs from 'node:fs/promises';
import path from 'node:path';

// Define Route Interface matching the JSON structure
export interface Route {
  id: string;
  nombre: string;
  tarifa: number;
  tipo?: string;
  tipo_transporte?: string;
  frecuencia_minutos?: number | string;
  horario?: string | {
    inicio?: string;
    fin?: string;
    inicio_oficial?: string;
    fin_oficial?: string;
    guardia_nocturna?: string;
  };
  paradas: Array<{
    nombre: string;
    lat: number;
    lng: number;
    orden: number;
    landmarks?: string;
    amenities?: string[];
  }>;
  social_alerts?: string[];
  tags?: string[];
  operador?: string;
  empresa?: string;
  color?: string;
}

/**
 * Extracts the canonical numeric timestamp from any route ID format.
 * Handles: POLYLINE_1753801260218_0, ruta_1753801260218, R2_94_001, etc.
 */
function extractTimestamp(id: string): string | null {
  const match = id.match(/(\d{10,})/);
  return match ? match[1] : null;
}

export async function getAllRoutes(): Promise<Route[]> {
  // Strategy: master_routes.json is the source of truth (has colors + full data).
  // Individual route files only supplement with routes NOT in master.

  let masterRoutes: Route[] = [];

  try {
    const masterPath = path.resolve('./public/data/master_routes.json');
    const masterContent = await fs.readFile(masterPath, 'utf-8');
    const masterData = JSON.parse(masterContent);

    if (Array.isArray(masterData)) {
      masterRoutes = masterData;
    } else if (masterData.rutas && Array.isArray(masterData.rutas)) {
      masterRoutes = masterData.rutas;
    } else if (masterData.routes && Array.isArray(masterData.routes)) {
      masterRoutes = masterData.routes;
    }
  } catch {
    console.warn('[getAllRoutes] master_routes.json not accessible');
  }

  // Build lookup by ID and timestamp for fast dedup
  const masterById = new Map(masterRoutes.map(r => [r.id, r]));
  const masterByTs = new Map(
    masterRoutes
      .map(r => [extractTimestamp(r.id), r] as [string | null, Route])
      .filter((entry): entry is [string, Route] => entry[0] !== null)
  );

  // Load individual route files — only pick up routes NOT already in master
  const extraRoutes: Route[] = [];
  try {
    const routesDir = path.resolve('./public/data/routes');
    const files = await fs.readdir(routesDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(routesDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const routeData = JSON.parse(content);

        const list: Route[] = Array.isArray(routeData)
          ? routeData
          : routeData.rutas && Array.isArray(routeData.rutas)
            ? routeData.rutas
            : [routeData];

        for (const r of list) {
          if (masterById.has(r.id)) continue;
          const ts = extractTimestamp(r.id);
          if (ts && masterByTs.has(ts)) continue;
          extraRoutes.push(r);
        }
      } catch (e) {
        console.error(`[getAllRoutes] Error parsing ${file}:`, e);
      }
    }
  } catch {
    // No individual routes dir — fine
  }

  return [...masterRoutes, ...extraRoutes];
}
