import type * as Leaflet from 'leaflet';

const CARTO_VOYAGER_URL = '/api/map-tile/{z}/{x}/{y}.png';
const CARTO_DARK_URL = '/api/map-tile/{z}/{x}/{y}.png';
const REMOTE_TILE_CLASS = 'remote-base-tiles';
const FALLBACK_CLASS = 'map-base-unavailable';
const STYLE_ID = 'base-map-fallback-styles';

export interface BaseMapOptions {
  locale?: 'es' | 'en';
  style?: 'voyager' | 'dark';
  maxZoom?: number;
}

export interface BaseMapController {
  showFallback: () => void;
}

function installFallbackStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .leaflet-container.${FALLBACK_CLASS} {
      background-color: #dce9e7;
      background-image:
        linear-gradient(rgba(15,118,110,.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(15,118,110,.08) 1px, transparent 1px),
        radial-gradient(circle at 50% 50%, rgba(255,255,255,.72), transparent 65%);
      background-size: 48px 48px, 48px 48px, 100% 100%;
    }
    .dark .leaflet-container.${FALLBACK_CLASS},
    .leaflet-container.${FALLBACK_CLASS}.base-map-dark {
      background-color: #102b2d;
      background-image:
        linear-gradient(rgba(94,234,212,.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(94,234,212,.07) 1px, transparent 1px),
        radial-gradient(circle at 50% 50%, rgba(13,148,136,.12), transparent 65%);
      background-size: 48px 48px, 48px 48px, 100% 100%;
    }
    .base-map-status {
      position: absolute;
      z-index: 500;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      max-width: calc(100% - 32px);
      padding: 7px 11px;
      border: 1px solid rgba(15, 118, 110, .25);
      border-radius: 999px;
      background: rgba(255, 255, 255, .94);
      box-shadow: 0 2px 10px rgba(15, 23, 42, .14);
      color: #334155;
      font: 700 11px/1.25 system-ui, sans-serif;
      text-align: center;
      pointer-events: none;
    }
    .dark .base-map-status, .base-map-dark .base-map-status {
      border-color: rgba(94, 234, 212, .22);
      background: rgba(15, 23, 42, .92);
      color: #e2e8f0;
    }
  `;
  document.head.appendChild(style);
}

function removeRemoteTileImages(container: HTMLElement): void {
  container.querySelectorAll<HTMLImageElement>(`.${REMOTE_TILE_CLASS} img, .leaflet-tile-pane img[src*="basemaps.cartocdn.com"]`)
    .forEach((image) => image.remove());
}

/**
 * Adds the shared remote base layer and switches atomically to a clean local
 * reference surface if Carto is unavailable. Leaflet overlays remain intact.
 */
export function addBaseMap(
  L: typeof Leaflet,
  map: Leaflet.Map,
  options: BaseMapOptions = {},
): BaseMapController {
  installFallbackStyles();

  const container = map.getContainer();
  const locale = options.locale ?? 'es';
  const style = options.style ?? 'voyager';
  let tileLayer: Leaflet.TileLayer | null = null;
  let fallbackActive = false;

  const showFallback = (): void => {
    if (fallbackActive) return;
    fallbackActive = true;

    if (tileLayer && map.hasLayer(tileLayer)) map.removeLayer(tileLayer);
    tileLayer = null;
    removeRemoteTileImages(container);
    requestAnimationFrame(() => removeRemoteTileImages(container));

    container.classList.add(FALLBACK_CLASS);
    if (style === 'dark') container.classList.add('base-map-dark');

    if (!container.querySelector('[data-base-map-status]')) {
      const status = document.createElement('div');
      status.className = 'base-map-status';
      status.dataset.baseMapStatus = 'unavailable';
      status.setAttribute('role', 'status');
      status.textContent = locale === 'en'
        ? 'Local route map · street tiles unavailable'
        : 'Mapa local de rutas · calles no disponibles';
      container.appendChild(status);
    }
  };

  if (navigator.onLine === false) {
    showFallback();
    return { showFallback };
  }

  const url = style === 'dark' ? CARTO_DARK_URL : CARTO_VOYAGER_URL;
  tileLayer = L.tileLayer(url, {
    maxZoom: options.maxZoom ?? 19,
    className: REMOTE_TILE_CLASS,
  });
  tileLayer.once('tileerror', (event: Leaflet.TileErrorEvent) => {
    event.tile.remove();
    showFallback();
  });
  tileLayer.addTo(map);

  window.addEventListener('offline', showFallback, { once: true });
  return { showFallback };
}
