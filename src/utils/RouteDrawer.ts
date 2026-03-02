import { escapeHtml } from './utils';

// --- Minimal Leaflet Types ---
// Defined locally to avoid adding @types/leaflet dependency

interface LatLngExpression extends Array<number> {
    0: number;
    1: number;
}

interface Map {
    fitBounds(bounds: any[], options?: any): void;
}

interface LayerGroup {
    clearLayers(): void;
    remove(): void;
    addTo(map: Map): LayerGroup;
}

interface PolylineOptions {
    color: string;
    weight: number;
    opacity: number;
    dashArray?: string | null;
}

interface MarkerOptions {
    icon?: any;
    radius?: number;
    color?: string;
    fillOpacity?: number;
}

// --- Data Types ---

interface RouteStop {
    lat?: number | string;
    lng?: number | string;
    lon?: number | string;
    nombre?: string;
    name?: string;
}

export interface RouteData {
    legs?: {
        paradas?: RouteStop[];
        stops_info?: RouteStop[];
        stops?: string[];
        name?: string;
        nombre?: string;
    }[];
    paradas?: RouteStop[];
    stops?: string[];
    nombre?: string;
    name?: string;
}

// --- Internal Helpers ---

function createPolyline(L: any, coords: LatLngExpression[], options: PolylineOptions): any {
    return L.polyline(coords, options);
}

function createMarker(L: any, coords: LatLngExpression, popupContent: string, options?: MarkerOptions): any {
    const marker = options && options.radius
        ? L.circleMarker(coords, options)
        : L.marker(coords, options);
    return marker.bindPopup(popupContent);
}

// --- Main Export ---

/**
 * Draws a route on the map, handling multiple legs, transfers, and legacy data formats.
 *
 * @param map The Leaflet map instance.
 * @param data The route data to draw.
 * @param existingLayerGroup The existing layer group to clear (if any).
 * @param coordinatesDB The coordinates database for legacy routes (stop names -> coords).
 * @returns The new LayerGroup containing the drawn route.
 */
export function drawRoute(
    map: Map,
    data: RouteData,
    existingLayerGroup: LayerGroup | null | undefined,
    coordinatesDB: Record<string, [number, number]>
): LayerGroup | undefined {

    // Access global L safely
    const L = (window as any).L;
    if (!L || !map) return undefined;

    // Reset layers
    if (existingLayerGroup) {
        existingLayerGroup.clearLayers();
        existingLayerGroup.remove();
    }
    const layerGroup = L.layerGroup().addTo(map);

    // Normalize Data Structure
    // 'data' could be a full Journey (with legs) or a single Route object
    let legs: any[] = [];
    if (data.legs && Array.isArray(data.legs)) {
        legs = data.legs;
    } else if (data.paradas && Array.isArray(data.paradas)) {
        // Single route treated as one leg
        legs = [{ paradas: data.paradas, name: data.nombre || data.name }];
    } else if (data.stops && Array.isArray(data.stops)) {
        // Legacy format
        legs = [{ stops: data.stops, name: data.nombre || data.name }];
    } else {
        return undefined; // Invalid data
    }

    const allBounds: LatLngExpression[] = [];
    const newLayers: any[] = []; // Array to collect all markers before adding to layerGroup

    legs.forEach((leg, index) => {
        const routeCoords: LatLngExpression[] = [];
        const validStops: { name: string, latlng: LatLngExpression }[] = [];

        // Try to get explicit coordinates from 'paradas' object array
        const stopsSource = leg.paradas || leg.stops_info || [];

        if (stopsSource.length > 0 && typeof stopsSource[0] === 'object') {
            // New Format: [{ lat, lng, nombre }, ...]
            stopsSource.forEach((stop: RouteStop) => {
                if (stop.lat && (stop.lng !== undefined || stop.lon !== undefined)) {
                    const lat = parseFloat(String(stop.lat));
                    const lngRaw = stop.lng !== undefined ? stop.lng : stop.lon;
                    const lng = parseFloat(String(lngRaw));

                    // Check logic:
                    // Sometimes JSON has "lon" instead of "lng"

                    if (!isNaN(lat) && !isNaN(lng)) {
                        const coords: LatLngExpression = [lat, lng];
                        routeCoords.push(coords);
                        validStops.push({ name: stop.nombre || stop.name || 'Parada', latlng: coords });
                        allBounds.push(coords);
                    }
                }
            });
        } else {
            // Legacy: Array of strings + coordinatesDB
            const stopNames: string[] = leg.stops || [];
            stopNames.forEach(name => {
                if (coordinatesDB[name]) {
                    const coords = coordinatesDB[name];
                    routeCoords.push(coords);
                    validStops.push({ name: name, latlng: coords });
                    allBounds.push(coords);
                }
            });
        }

        if (routeCoords.length > 0) {
            const color = index === 0 ? '#F97316' : '#0EA5E9'; // Orange -> Blue for transfers
            const dashArray = index === 0 ? null : '10, 10';

            // Polyline
            createPolyline(L, routeCoords, {
                color, weight: 4, opacity: 0.8, dashArray
            }).addTo(layerGroup);

            // Start Marker (only for first leg)
            if (index === 0) {
                 const start = validStops[0];
                 newLayers.push(createMarker(L, start.latlng, `<b>Inicio:</b> ${escapeHtml(start.name)}`));
            }

            // End Marker (only for last leg)
            if (index === legs.length - 1) {
                 const end = validStops[validStops.length - 1];
                 newLayers.push(createMarker(L, end.latlng, `<b>Fin:</b> ${escapeHtml(end.name)}`));
            }

            // Transfer Marker (if not last leg)
            if (index < legs.length - 1) {
                const end = validStops[validStops.length - 1];
                 newLayers.push(createMarker(L, end.latlng, `<b>Transbordo:</b> ${escapeHtml(end.name)}`));
            }

            // Intermediate dots
            validStops.slice(1, -1).forEach(stop => {
                 newLayers.push(
                    createMarker(L, stop.latlng, escapeHtml(stop.name), { radius: 4, color: '#334155', fillOpacity: 1 })
                 );
            });

        } else {
            console.warn("No coordinates found for steps in this leg.");
        }
    });

    // Add all markers to the layer group
    newLayers.forEach(layer => layer.addTo(layerGroup));

    if (allBounds.length > 0) {
        map.fitBounds(allBounds, { padding: [50, 50] });
    }

    return layerGroup;
}
