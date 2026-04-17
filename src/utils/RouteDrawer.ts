import { escapeHtml } from './utils';

// --- Minimal Leaflet Types ---
// Defined locally to avoid adding @types/leaflet dependency

interface LatLngExpression extends Array<number> {
    0: number;
    1: number;
}

/** Minimal Leaflet layer with addTo and bindPopup support. */
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

/** Minimal Leaflet library instance (window.L). */
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
    /** Legacy field names used by some upstream data sources. */
    latitude?: number | string;
    longitude?: number | string;
    nombre?: string;
    name?: string;
}

interface RouteLeg {
    paradas?: RouteStop[];
    stops_info?: RouteStop[];
    stops?: string[];
    name?: string;
    nombre?: string;
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
    map: LeafletMap,
    data: RouteData,
    existingLayerGroup: LeafletLayerGroup | null | undefined,
    coordinatesDB: Map<string, [number, number]> | Record<string, [number, number]>
): LeafletLayerGroup | undefined {

    // Access global L safely
    const L = (window as unknown as { L?: LeafletLib }).L;
    if (!L || !map) return undefined;

    // Reset layers
    if (existingLayerGroup) {
        existingLayerGroup.clearLayers();
        existingLayerGroup.remove();
    }
    const layerGroup = L.layerGroup().addTo(map as unknown as LeafletLayerGroup);

    // Normalize Data Structure
    // 'data' could be a full Journey (with legs) or a single Route object
    let legs: RouteLeg[] = [];
    if (data.legs && Array.isArray(data.legs)) {
        legs = data.legs;
    } else if ((data.paradas && Array.isArray(data.paradas)) || (data.stops && Array.isArray(data.stops))) {
        // Single-route object (direct WASM output or legacy format): wrap it as a
        // one-element legs array.  Both `paradas` and `stops` are preserved so
        // downstream coordinate-resolution code can find whichever field is present.
        legs = [{
            paradas: data.paradas,
            stops: data.stops,
            name: data.nombre || data.name
        }];
    } else {
        return undefined; // Invalid data
    }

    const allBounds: LatLngExpression[] = [];
    const newLayers: LeafletLayer[] = [];

    legs.forEach((leg, index) => {
        const routeCoords: LatLngExpression[] = [];
        const validStops: { name: string, latlng: LatLngExpression }[] = [];

        // Try to get explicit coordinates from 'paradas' object array
        const stopsSource = leg.paradas ?? leg.stops_info ?? [];

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
                        validStops.push({ name: stop.nombre ?? stop.name ?? 'Parada', latlng: coords });
                        allBounds.push(coords);
                    }
                }
            });
        }

        // Fallback or Addition: Use 'stops' array of names
        if (routeCoords.length === 0) {
            // Legacy: Array of strings + coordinatesDB
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

        if (routeCoords.length > 0) {
            // Usar color de ruta del catálogo; fallback naranja/azul por posición
            const legData = leg as Record<string, unknown>;
            const color = (typeof legData['color'] === 'string' && legData['color'])
              ? legData['color']
              : (index === 0 ? '#F97316' : '#0EA5E9');
            const dashArray = index === 0 ? null : '10, 10';

            // Polyline
            createPolyline(L, routeCoords, {
                color, weight: 4, opacity: 0.8, dashArray
            }).addTo(layerGroup);

            // Start Marker (only for first leg)
            if (index === 0) {
                 const start = validStops[0];
                 if (start) newLayers.push(createMarker(L, start.latlng, `<b>Inicio:</b> ${escapeHtml(start.name)}`));
            }

            // End Marker (only for last leg)
            if (index === legs.length - 1) {
                 const end = validStops[validStops.length - 1];
                 if (end) newLayers.push(createMarker(L, end.latlng, `<b>Fin:</b> ${escapeHtml(end.name)}`));
            }

            // Transfer Marker (if not last leg)
            if (index < legs.length - 1) {
                const end = validStops[validStops.length - 1];
                 if (end) newLayers.push(createMarker(L, end.latlng, `<b>Transbordo:</b> ${escapeHtml(end.name)}`));
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
