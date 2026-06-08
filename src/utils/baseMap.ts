import type * as Leaflet from 'leaflet';

const CARTO_VOYAGER_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const CARTO_DARK_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png';
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
        linear-gradient(32deg, transparent 46%, rgba(255,255,255,.78) 47%, rgba(255,255,255,.78) 50%, transparent 51%),
        linear-gradient(122deg, transparent 45%, rgba(160,181,178,.48) 46%, rgba(160,181,178,.48) 49%, transparent 50%);
      background-size: 112px 112px, 168px 168px;
    }
    .dark .leaflet-container.${FALLBACK_CLASS},
    .leaflet-container.${FALLBACK_CLASS}.base-map-dark {
      background-color: #142827;
      background-image:
        linear-gradient(32deg, transparent 46%, rgba(255,255,255,.10) 47%, rgba(255,255,255,.10) 50%, transparent 51%),
        linear-gradient(122deg, transparent 45%, rgba(94,234,212,.10) 46%, rgba(94,234,212,.10) 49%, transparent 50%);
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
        ? 'Base map unavailable · routes and markers remain active'
        : 'Mapa base no disponible · rutas y marcadores siguen activos';
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
    subdomains: 'abcd',
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
