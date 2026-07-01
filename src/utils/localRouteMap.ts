import type * as Leaflet from 'leaflet';
import { getRouteColor } from './routeColors';

export interface LocalRouteStop {
  nombre?: string;
  name?: string;
  lat?: number | string;
  lng?: number | string;
  latitude?: number | string;
  longitude?: number | string;
}

export interface LocalRoute {
  id?: string;
  nombre?: string;
  name?: string;
  tipo?: string;
  transport_type?: string;
  color?: string;
  paradas?: LocalRouteStop[];
  stops?: LocalRouteStop[];
}

export interface LocalNetworkResult {
  routes: number;
  points: number;
  bounds: Leaflet.LatLngBounds | null;
}

export async function loadLocalRouteCatalog(): Promise<LocalRoute[]> {
  const sources = ['/data/master_routes.optimized.json', '/data/master_routes.json', '/api/master_routes.json'];
  let lastError: unknown;
  for (const source of sources) {
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`${source}: HTTP ${response.status}`);
      const payload = await response.json() as { rutas?: LocalRoute[] } | LocalRoute[];
      const routes = Array.isArray(payload) ? payload : payload.rutas;
      if (Array.isArray(routes) && routes.length > 0) return routes;
      throw new Error(`${source}: empty route catalog`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Local route catalog unavailable');
}

export function drawLocalRouteNetwork(
  L: typeof Leaflet,
  routes: LocalRoute[],
  layer: Leaflet.LayerGroup,
): LocalNetworkResult {
  layer.clearLayers();
  const bounds = L.latLngBounds([]);
  let drawnRoutes = 0;
  let pointsCount = 0;

  routes.forEach((route) => {
    const points = (route.paradas ?? route.stops ?? [])
      .map((stop) => [Number(stop.lat ?? stop.latitude), Number(stop.lng ?? stop.longitude)] as [number, number])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) > 0.0001 && Math.abs(lng) > 0.0001);
    if (points.length < 2) return;

    const color = route.color || getRouteColor(route.id, route.nombre || route.name, route.tipo || route.transport_type);
    L.polyline(points, { color: '#031b24', weight: 8, opacity: 0.62, interactive: false, className: 'local-route-casing' }).addTo(layer);
    L.polyline(points, { color, weight: 5, opacity: 1, interactive: false, className: 'local-route-line' }).addTo(layer);
    points.forEach(point => bounds.extend(point));
    pointsCount += points.length;
    drawnRoutes += 1;
  });

  return { routes: drawnRoutes, points: pointsCount, bounds: bounds.isValid() ? bounds : null };
}
