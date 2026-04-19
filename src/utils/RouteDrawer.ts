import { escapeHtml } from './utils';
import { getRouteColor } from './routeColors';

// --- Minimal Leaflet Types ---
interface LatLngExpression extends Array<number> {
    0: number;
    1: number;
}

interface LeafletLayer {
    addTo(group: LeafletLayerGroup): LeafletLayer;
    bindPopup(content: string): LeafletLayer;
}

interface LeafletLayerGroup extends LeafletLayer {
    clearLayers(): void;
    remove(): void;
}

interface LeafletMap {
    fitBounds(bounds: LatLngExpression[], options?: object): void;
}

interface LeafletLib {
    polyline(coords: LatLngExpression[], options: PolylineOptions): LeafletLayer;
    marker(coords: LatLngExpression, options?: MarkerOptions): LeafletLayer;
    circleMarker(coords: LatLngExpression, options?: MarkerOptions): LeafletLayer;
    layerGroup(): LeafletLayerGroup;
}

interface PolylineOptions {
    color: string;
    weight: number;
    opacity: number;
    dashArray?: string | null;
}

interface MarkerOptions {
    icon?: object;
    radius?: number;
    color?: string;
    fillOpacity?: number;
}

// --- Data Types ---

interface RouteStop {
    lat?: number | string;
    lng?: number | string;
    lon?: number | string;
    latitude?: number | string;
    longitude?: number | string;
    nombre?: string;
    name?: string;
}

interface RouteLeg {
    route_id?: string;
    route_name?: string;
    transport_type?: string;
    paradas?: RouteStop[];
    stops_info?: RouteStop[];
    stops?: string[];
    name?: string;
    nombre?: string;
    color?: string;
}

export interface RouteData {
    legs?: RouteLeg[];
    paradas?: RouteStop[];
    stops?: string[];
    nombre?: string;
    name?: string;
}

// --- Internal Helpers ---

function createPolyline(L: LeafletLib, coords: LatLngExpression[], options: PolylineOptions): LeafletLayer {
    return L.polyline(coords, options);
}

function createMarker(L: LeafletLib, coords: LatLngExpression, popupContent: string, options?: MarkerOptions): LeafletLayer {
    const marker = options && options.radius
        ? L.circleMarker(coords, options)
        : L.marker(coords, options);
    return marker.bindPopup(popupContent);
}

// --- Main Export ---

export function drawRoute(
    map: LeafletMap,
    data: RouteData,
    existingLayerGroup: LeafletLayerGroup | null | undefined,
    coordinatesDB: Map<string, [number, number]> | Record<string, [number, number]>
): LeafletLayerGroup | undefined {

    const L = (window as unknown as { L?: LeafletLib }).L;
    if (!L || !map) return undefined;

    if (existingLayerGroup) {
        existingLayerGroup.clearLayers();
        existingLayerGroup.remove();
    }
    const layerGroup = L.layerGroup().addTo(map as unknown as LeafletLayerGroup);

    let legs: RouteLeg[] = [];
    if (data.legs && Array.isArray(data.legs)) {
        legs = data.legs;
    } else if ((data.paradas && Array.isArray(data.paradas)) || (data.stops && Array.isArray(data.stops))) {
        legs = [{
            paradas: data.paradas,
            stops: data.stops,
            name: data.nombre || data.name
        }];
    } else {
        return undefined;
    }

    const allBounds: LatLngExpression[] = [];
    const newLayers: LeafletLayer[] = [];

    legs.forEach((leg, index) => {
        const routeCoords: LatLngExpression[] = [];
        const validStops: { name: string, latlng: LatLngExpression }[] = [];

        const stopsSource = leg.paradas ?? leg.stops_info ?? [];

        if (stopsSource.length > 0 && typeof stopsSource[0] === 'object') {
            stopsSource.forEach((stop: RouteStop) => {
                const latVal = stop.lat ?? stop.latitude;
                const lngVal = stop.lng ?? stop.lon ?? stop.longitude;

                if (latVal !== undefined && lngVal !== undefined) {
                    const lat = parseFloat(String(latVal));
                    const lng = parseFloat(String(lngVal));

                    if (!isNaN(lat) && !isNaN(lng)) {
                        const coords: LatLngExpression = [lat, lng];
                        routeCoords.push(coords);
                        validStops.push({ name: stop.nombre ?? stop.name ?? 'Parada', latlng: coords });
                        allBounds.push(coords);
                    }
                }
            });
        }

        if (routeCoords.length === 0) {
            const stopNames: string[] = leg.stops ?? [];
            stopNames.forEach(name => {
                let coords: [number, number] | undefined;
                if (coordinatesDB instanceof Map) {
                    coords = coordinatesDB.get(name) ?? coordinatesDB.get(name.toLowerCase().trim());
                } else if (coordinatesDB && typeof coordinatesDB === 'object') {
                    coords = (coordinatesDB as Record<string, [number, number]>)[name];
                }

                if (coords) {
                    routeCoords.push(coords);
                    validStops.push({ name: name, latlng: coords });
                    allBounds.push(coords);
                }
            });
        }

        if (routeCoords.length === 0) {
            console.warn("No coordinates found for steps in this leg.");
        } else {
            // Determine color with fallback logic:
            // 1. Use explicit color if available
            // 2. Use route metadata (route_id, route_name, transport_type) if available
            // 3. Fall back to index-based colors (first leg = orange, other legs = blue)
            let color: string;
            if (leg.color) {
                color = leg.color;
            } else {
                const routeColor = getRouteColor(leg.route_id, leg.route_name || leg.nombre || leg.name, leg.transport_type);
                // Check if we got a non-default color
                if (routeColor !== '#94A3B8') {
                    // We have route metadata and got a meaningful color
                    color = routeColor;
                } else if (leg.route_id || leg.route_name || leg.nombre || leg.name || leg.transport_type) {
                    // We have some metadata but getRouteColor returned default
                    color = routeColor;
                } else {
                    // No metadata available, use index-based fallback
                    color = index === 0 ? '#F97316' : '#0EA5E9';
                }
            }
            const dashArray = index === 0 ? null : '10, 10';

            createPolyline(L, routeCoords, {
                color, weight: 4, opacity: 0.8, dashArray
            }).addTo(layerGroup);

            if (index === 0) {
                 const start = validStops[0];
                 if (start) newLayers.push(createMarker(L, start.latlng, `<b>Inicio:</b> ${escapeHtml(start.name)}`));
            }

            if (index === legs.length - 1) {
                 const end = validStops[validStops.length - 1];
                 if (end) newLayers.push(createMarker(L, end.latlng, `<b>Fin:</b> ${escapeHtml(end.name)}`));
            }

            if (index < legs.length - 1) {
                const end = validStops[validStops.length - 1];
                 if (end) newLayers.push(createMarker(L, end.latlng, `<b>Transbordo:</b> ${escapeHtml(end.name)}`));
            }

            validStops.slice(1, -1).forEach(stop => {
                 newLayers.push(
                    createMarker(L, stop.latlng, escapeHtml(stop.name), { radius: 4, color: '#334155', fillOpacity: 1 })
                 );
            });

        }
    });

    newLayers.forEach(layer => layer.addTo(layerGroup));

    if (allBounds.length > 0) {
        map.fitBounds(allBounds, { padding: [50, 50] });
    }

    return layerGroup;
}
