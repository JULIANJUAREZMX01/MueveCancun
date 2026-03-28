import { escapeHtml } from './utils';
import type { RouteLeg } from '../types';

// --- Minimal Leaflet Types ---
// Defined locally to avoid adding @types/leaflet dependency

interface LatLngExpression extends Array<number> {
    0: number;
    1: number;
}

interface Map {
    fitBounds(bounds: LatLngExpression[], options?: unknown): void;
}

interface Layer {
    addTo(map: Map | LayerGroup): this;
    bindPopup(content: string): this;
}

interface LayerGroup extends Layer {
    clearLayers(): void;
    remove(): void;
}

interface PolylineOptions {
    color: string;
    weight: number;
    opacity: number;
    dashArray?: string | null;
}

interface MarkerOptions {
    icon?: unknown;
    radius?: number;
    color?: string;
    fillOpacity?: number;
}

interface LeafletStatic {
    map(el: string | HTMLElement, options?: unknown): Map;
    polyline(latlngs: LatLngExpression[], options?: PolylineOptions): Layer;
    marker(latlng: LatLngExpression, options?: MarkerOptions): Layer;
    circleMarker(latlng: LatLngExpression, options?: MarkerOptions): Layer;
    layerGroup(): LayerGroup;
}

// --- Data Types ---

interface RouteStop {
    lat?: number | string;
    lng?: number | string;
    lon?: number | string;
    nombre?: string;
    name?: string;
    latitude?: number | string;
    longitude?: number | string;
}

interface InternalLeg {
    paradas?: RouteStop[];
    stops_info?: RouteStop[];
    stops?: string[];
    name?: string;
    nombre?: string;
}

export interface RouteData {
    legs?: (Partial<RouteLeg> & InternalLeg)[];
    paradas?: RouteStop[];
    stops?: string[];
    nombre?: string;
    name?: string;
}

// --- Internal Helpers ---

function createPolyline(leaflet: LeafletStatic, coords: LatLngExpression[], options: PolylineOptions): Layer {
    return leaflet.polyline(coords, options);
}

function createMarker(leaflet: LeafletStatic, coords: LatLngExpression, popupContent: string, options?: MarkerOptions): Layer {
    const marker = options && options.radius
        ? leaflet.circleMarker(coords, options)
        : leaflet.marker(coords, options);
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
    coordinatesDB: Map<string, [number, number]> | Record<string, [number, number]>
): LayerGroup | undefined {

    // Access global L safely
    const leaflet = (window as any).L as LeafletStatic;
    if (!leaflet || !map) return undefined;

    // Reset layers
    if (existingLayerGroup) {
        existingLayerGroup.clearLayers();
        existingLayerGroup.remove();
    }
    const layerGroup = leaflet.layerGroup().addTo(map);

    // Normalize Data Structure
    // 'data' could be a full Journey (with legs) or a single Route object
    let legs: InternalLeg[] = [];
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
    const newLayers: Layer[] = []; // Array to collect all markers before adding to layerGroup

    legs.forEach((leg, index) => {
        const routeCoords: LatLngExpression[] = [];
        const validStops: { name: string, latlng: LatLngExpression }[] = [];

        // Try to get explicit coordinates from 'paradas' object array
        const stopsSource = leg.paradas || leg.stops_info || [];

        if (stopsSource.length > 0 && typeof stopsSource[0] === 'object') {
            // New Format: [{ lat, lng, nombre }, ...]
            stopsSource.forEach((stop: RouteStop) => {
                const latVal = stop.lat ?? stop.latitude;
                const lngVal = stop.lng ?? stop.lon ?? stop.longitude;

                if (latVal !== undefined && lngVal !== undefined) {
                    const lat = parseFloat(String(latVal));
                    const lng = parseFloat(String(lngVal));

                    if (!isNaN(lat) && !isNaN(lng)) {
                        const coords: LatLngExpression = [lat, lng];
                        routeCoords.push(coords);
                        validStops.push({ name: stop.nombre || stop.name || 'Parada', latlng: coords });
                        allBounds.push(coords);
                    }
                }
            });
        }

        // Fallback or Addition: Use 'stops' array of names
        if (routeCoords.length === 0) {
            // Legacy: Array of strings + coordinatesDB
            const stopNames: string[] = leg.stops || [];
            stopNames.forEach(name => {
                let coords: [number, number] | undefined;
                if (coordinatesDB instanceof Map) {
                    coords = coordinatesDB.get(name) ?? coordinatesDB.get(name.toLowerCase().trim());
                } else if (coordinatesDB && typeof coordinatesDB === 'object') {
                    coords = (coordinatesDB as Record<string, [number, number]>)[name];
                }

                if (coords) {
                    const latLng: LatLngExpression = [coords[0], coords[1]];
                    routeCoords.push(latLng);
                    validStops.push({ name: name, latlng: latLng });
                    allBounds.push(latLng);
                }
            });
        }

        if (routeCoords.length > 0) {
            const color = index === 0 ? '#F97316' : '#0EA5E9'; // Orange -> Blue for transfers
            const dashArray = index === 0 ? null : '10, 10';

            // Polyline
            createPolyline(leaflet, routeCoords, {
                color, weight: 4, opacity: 0.8, dashArray
            }).addTo(layerGroup);

            // Start Marker (only for first leg)
            if (index === 0) {
                 const start = validStops[0];
                 newLayers.push(createMarker(leaflet, start.latlng, `<b>Inicio:</b> ${escapeHtml(start.name)}`));
            }

            // End Marker (only for last leg)
            if (index === legs.length - 1) {
                 const end = validStops[validStops.length - 1];
                 newLayers.push(createMarker(leaflet, end.latlng, `<b>Fin:</b> ${escapeHtml(end.name)}`));
            }

            // Transfer Marker (if not last leg)
            if (index < legs.length - 1) {
                const end = validStops[validStops.length - 1];
                 newLayers.push(createMarker(leaflet, end.latlng, `<b>Transbordo:</b> ${escapeHtml(end.name)}`));
            }

            // Intermediate dots
            validStops.slice(1, -1).forEach(stop => {
                 newLayers.push(
                    createMarker(leaflet, stop.latlng, escapeHtml(stop.name), { radius: 4, color: '#334155', fillOpacity: 1 })
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
