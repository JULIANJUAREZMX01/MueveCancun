import fs from 'node:fs/promises';
import path from 'node:path';

// Define Route Interface matching the JSON structure
export interface Route {
  id: string;
  nombre: string;
  tarifa: number;
  tipo?: string; // e.g. "Bus_Urbano_Isla"
  tipo_transporte?: string; // e.g. "Bus_HotelZone"
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
  const routesDir = path.resolve('./public/data/routes');
  const allRoutes: Route[] = [];

  try {
    const files = await fs.readdir(routesDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    const routePromises = jsonFiles.map(async (file) => {
      try {
        const filePath = path.join(routesDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const routeData = JSON.parse(content);

        if (routeData.rutas && Array.isArray(routeData.rutas)) {
            return routeData.rutas;
        } else if (Array.isArray(routeData)) {
            return routeData;
        } else {
            return [routeData];
        }
      } catch (e) {
        console.error(`Error parsing route file ${file}:`, e);
        return [];
      }
    });

    const results = await Promise.all(routePromises);
    results.forEach(routes => allRoutes.push(...routes));
  } catch {
    console.warn("Routes directory not accessible or empty, falling back to master_routes.json");
  }

  // Merge master_routes.json — skip any route whose timestamp already appears
  // in individual files (POLYLINE_TIMESTAMP_N and ruta_TIMESTAMP are the same route)
  try {
      const masterPath = path.resolve('./public/data/master_routes.json');
      const masterContent = await fs.readFile(masterPath, 'utf-8');
      const masterData = JSON.parse(masterContent);
      if (masterData.rutas && Array.isArray(masterData.rutas)) {
          // Build a set of both exact IDs and extracted timestamps already loaded
          const existingIds = new Set(allRoutes.map(r => r.id));
          const existingTimestamps = new Set(
            allRoutes.map(r => extractTimestamp(r.id)).filter(Boolean)
          );

          masterData.rutas.forEach((r: Route) => {
              if (existingIds.has(r.id)) return; // exact duplicate
              const ts = extractTimestamp(r.id);
              if (ts && existingTimestamps.has(ts)) return; // same route, different prefix
              existingIds.add(r.id);
              if (ts) existingTimestamps.add(ts);
              allRoutes.push(r);
          });
      }
  } catch {
      // master_routes might not exist
  }

  return allRoutes;
}
