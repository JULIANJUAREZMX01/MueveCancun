import { describe, expect, it, vi } from 'vitest';
import { drawLocalRouteNetwork } from '../utils/localRouteMap';

describe('drawLocalRouteNetwork', () => {
  it('draws a high-contrast casing and route line for every drawable route', () => {
    const addTo = vi.fn();
    const polyline = vi.fn(() => ({ addTo }));
    const extend = vi.fn();
    const L = {
      polyline,
      latLngBounds: () => ({ extend, isValid: () => true }),
    };
    const layer = { clearLayers: vi.fn() };

    const result = drawLocalRouteNetwork(L as never, [{
      id: 'R1', color: '#ff0000', paradas: [
        { nombre: 'A', lat: 21.1, lng: -86.8 },
        { nombre: 'B', lat: 21.2, lng: -86.9 },
      ],
    }], layer as never);

    expect(result).toMatchObject({ routes: 1, points: 2 });
    expect(polyline).toHaveBeenCalledTimes(2);
    expect(polyline.mock.calls[0][1]).toMatchObject({ weight: 8, opacity: 0.62, className: 'local-route-casing' });
    expect(polyline.mock.calls[1][1]).toMatchObject({ color: '#ff0000', weight: 5, opacity: 1, className: 'local-route-line' });
  });
});
