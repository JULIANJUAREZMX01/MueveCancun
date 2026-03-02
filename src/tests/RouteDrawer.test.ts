import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { drawRoute, RouteData } from '../utils/RouteDrawer';

// Mock map
const mockMap = {
    fitBounds: vi.fn()
};

// Mock layers
const mockLayerGroupInstance = {
    clearLayers: vi.fn(),
    remove: vi.fn(),
    addTo: vi.fn().mockReturnThis()
};

const mockPolyline = {
    addTo: vi.fn().mockReturnThis()
};

const mockMarker = {
    bindPopup: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis()
};

const mockCircleMarker = {
    bindPopup: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis()
};

// Mock L
const mockL = {
    layerGroup: vi.fn(() => mockLayerGroupInstance),
    polyline: vi.fn(() => mockPolyline),
    marker: vi.fn(() => mockMarker),
    circleMarker: vi.fn(() => mockCircleMarker)
};

describe('RouteDrawer', () => {
    beforeEach(() => {
        vi.stubGlobal('window', { L: mockL });
        vi.clearAllMocks();

        // Setup default mock returns
        mockLayerGroupInstance.addTo.mockReturnValue(mockLayerGroupInstance);
        mockPolyline.addTo.mockReturnValue(mockPolyline);
        mockMarker.bindPopup.mockReturnValue(mockMarker);
        mockCircleMarker.bindPopup.mockReturnValue(mockCircleMarker);
        mockMarker.addTo.mockReturnValue(mockMarker);
        mockCircleMarker.addTo.mockReturnValue(mockCircleMarker);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should return undefined if L is not available', () => {
        vi.stubGlobal('window', {}); // No L
        const result = drawRoute(mockMap as any, {}, null, {});
        expect(result).toBeUndefined();
    });

    it('should return undefined if map is not available', () => {
        const result = drawRoute(null as any, {}, null, {});
        expect(result).toBeUndefined();
    });

    it('should clear and remove existing layer group if provided', () => {
        const existingLayerGroup = {
            clearLayers: vi.fn(),
            remove: vi.fn(),
            addTo: vi.fn()
        };
        drawRoute(mockMap as any, { paradas: [{lat: 1, lng: 1}] }, existingLayerGroup as any, {});
        expect(existingLayerGroup.clearLayers).toHaveBeenCalled();
        expect(existingLayerGroup.remove).toHaveBeenCalled();
    });

    it('should return undefined if data structure is invalid (missing legs, paradas, stops)', () => {
        const result = drawRoute(mockMap as any, {}, null, {});
        expect(result).toBeUndefined();
    });

    it('should draw a route with new format (paradas objects)', () => {
        const routeData: RouteData = {
            paradas: [
                { lat: 21.1619, lng: -86.8515, name: 'Start' },
                { lat: 21.1620, lon: -86.8520, name: 'Middle' }, // using lon
                { lat: '21.1621', lng: '-86.8525', name: 'End' } // string values
            ]
        };

        const result = drawRoute(mockMap as any, routeData, null, {});

        expect(result).toBe(mockLayerGroupInstance);
        expect(mockL.layerGroup).toHaveBeenCalled();
        expect(mockLayerGroupInstance.addTo).toHaveBeenCalledWith(mockMap);

        // Polyline should be created
        expect(mockL.polyline).toHaveBeenCalledWith(
            [
                [21.1619, -86.8515],
                [21.162, -86.852],
                [21.1621, -86.8525]
            ],
            { color: '#F97316', weight: 4, opacity: 0.8, dashArray: null }
        );

        // Map bounds should be fitted
        expect(mockMap.fitBounds).toHaveBeenCalledWith(
            [
                [21.1619, -86.8515],
                [21.162, -86.852],
                [21.1621, -86.8525]
            ],
            { padding: [50, 50] }
        );

        // Start and end markers should be created
        expect(mockL.marker).toHaveBeenCalledTimes(2); // Start and End
        expect(mockMarker.bindPopup).toHaveBeenCalledWith('<b>Inicio:</b> Start');
        expect(mockMarker.bindPopup).toHaveBeenCalledWith('<b>Fin:</b> End');

        // Middle circle marker should be created
        expect(mockL.circleMarker).toHaveBeenCalledTimes(1); // Middle stop
        expect(mockCircleMarker.bindPopup).toHaveBeenCalledWith('Middle');

        // Markers should be added to layer group
        expect(mockMarker.addTo).toHaveBeenCalledWith(mockLayerGroupInstance);
        expect(mockCircleMarker.addTo).toHaveBeenCalledWith(mockLayerGroupInstance);
    });

    it('should draw a route with legacy format (stops array of strings)', () => {
        const routeData: RouteData = {
            stops: ['Stop1', 'Stop2']
        };
        const coordinatesDB = {
            'Stop1': [21.0, -86.0] as [number, number],
            'Stop2': [21.1, -86.1] as [number, number]
        };

        drawRoute(mockMap as any, routeData, null, coordinatesDB);

        expect(mockL.polyline).toHaveBeenCalledWith(
            [[21.0, -86.0], [21.1, -86.1]],
            expect.any(Object)
        );
        expect(mockL.marker).toHaveBeenCalledTimes(2);
    });

    it('should draw a route with multiple legs', () => {
        const routeData: RouteData = {
            legs: [
                {
                    paradas: [
                        { lat: 1, lng: 1, name: 'A' },
                        { lat: 2, lng: 2, name: 'B' }
                    ]
                },
                {
                    stops_info: [
                        { lat: 2, lng: 2, name: 'B' },
                        { lat: 3, lng: 3, name: 'C' }
                    ]
                }
            ]
        };

        drawRoute(mockMap as any, routeData, null, {});

        // 2 Polylines (one for each leg)
        expect(mockL.polyline).toHaveBeenCalledTimes(2);

        // Leg 1 polyline
        expect(mockL.polyline).toHaveBeenNthCalledWith(1,
            [[1, 1], [2, 2]],
            expect.objectContaining({ color: '#F97316', dashArray: null })
        );

        // Leg 2 polyline
        expect(mockL.polyline).toHaveBeenNthCalledWith(2,
            [[2, 2], [3, 3]],
            expect.objectContaining({ color: '#0EA5E9', dashArray: '10, 10' })
        );

        // Markers: Start(A), Transfer(B), End(C)
        expect(mockL.marker).toHaveBeenCalledTimes(3);
        expect(mockMarker.bindPopup).toHaveBeenCalledWith('<b>Inicio:</b> A');
        expect(mockMarker.bindPopup).toHaveBeenCalledWith('<b>Transbordo:</b> B');
        expect(mockMarker.bindPopup).toHaveBeenCalledWith('<b>Fin:</b> C');
    });

    it('should handle missing coordinates gracefully', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const routeData: RouteData = {
            paradas: [
                { name: 'NoCoords' } // Missing lat/lng
            ]
        };

        drawRoute(mockMap as any, routeData, null, {});

        expect(consoleWarnSpy).toHaveBeenCalledWith("No coordinates found for steps in this leg.");
        expect(mockL.polyline).not.toHaveBeenCalled();

        consoleWarnSpy.mockRestore();
    });
});
