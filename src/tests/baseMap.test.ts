import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addBaseMap } from '../utils/baseMap';

describe('addBaseMap', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  it('removes the failed tile layer and preserves non-tile overlays', () => {
    const container = document.createElement('div');
    const tilePane = document.createElement('div');
    tilePane.className = 'leaflet-tile-pane';
    const tileContainer = document.createElement('div');
    tileContainer.className = 'remote-base-tiles';
    const failedTile = document.createElement('img');
    failedTile.src = 'https://a.basemaps.cartocdn.com/rastertiles/voyager/13/1/1.png';
    tileContainer.appendChild(failedTile);
    tilePane.appendChild(tileContainer);
    const overlay = document.createElement('svg');
    overlay.dataset.routeOverlay = 'active';
    container.append(tilePane, overlay);
    document.body.appendChild(container);

    let tileErrorHandler: ((event: { tile: HTMLImageElement }) => void) | undefined;
    const layer = {
      once: vi.fn((_event: string, handler: typeof tileErrorHandler) => { tileErrorHandler = handler; }),
      addTo: vi.fn(),
    };
    const removeLayer = vi.fn();
    const map = {
      getContainer: () => container,
      hasLayer: () => true,
      removeLayer,
    };
    const L = { tileLayer: vi.fn(() => layer) };

    addBaseMap(L as never, map as never, { locale: 'es' });
    tileErrorHandler?.({ tile: failedTile });

    expect(removeLayer).toHaveBeenCalledWith(layer);
    expect(container.querySelectorAll('.leaflet-tile-pane img')).toHaveLength(0);
    expect(container.querySelector('[data-route-overlay="active"]')).toBe(overlay);
    expect(container.querySelector('[data-base-map-status="unavailable"]')?.textContent)
      .toContain('Mapa base no disponible');
  });
});
