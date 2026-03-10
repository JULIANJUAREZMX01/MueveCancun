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

export async function getAllRoutes(): Promise<Route[]> {
  const routesDir = path.resolve('./public/data/routes');
  const allRoutes: Route[] = [];

  try {
    // Try reading individual files first
    const files = await fs.readdir(routesDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    const readPromises = jsonFiles.map(async (file) => {
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

    const parsedRoutesArray = await Promise.all(readPromises);
    for (const parsedRoutes of parsedRoutesArray) {
      allRoutes.push(...parsedRoutes);
    }
  } catch {
    console.warn("Routes directory not accessible or empty, falling back to master_routes.json");
  }

  // Also try master_routes.json and merge unique IDs
  try {
      const masterPath = path.resolve('./public/data/master_routes.json');
      const masterContent = await fs.readFile(masterPath, 'utf-8');
      const masterData = JSON.parse(masterContent);
      if (masterData.rutas && Array.isArray(masterData.rutas)) {
          const existingIds = new Set(allRoutes.map(r => r.id));
          masterData.rutas.forEach((r: Route) => {
              // Only add if ID doesn't exist already (prefer individual files as they might be newer/more granular)
              // OR if individual files were empty.
              if (!existingIds.has(r.id)) {
                  existingIds.add(r.id);
                  allRoutes.push(r);
              }
          });
      }
  } catch {
      // master_routes might not exist
  }

  return allRoutes;
}
