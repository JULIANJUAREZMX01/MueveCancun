import { getDistance as getDistanceKm } from "./geometry";
import type { RouteData, Stop } from "../types";
import { SpatialHash } from "./SpatialHash";

/**
 * Simplified class name merger.
 */
export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export function formatDate(date: Date) {
  return Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(date)
}

export function readingTime(html: string) {
  let textOnly = ""
  if (typeof window !== "undefined" && typeof window.document !== "undefined") {
    const container = window.document.createElement("div")
    container.innerHTML = html
    textOnly = container.textContent || ""
  } else {
    textOnly = html.replace(/<[^>]+>/g, " ")
  }
  const wordCount = textOnly.trim().split(/\s+/).filter(Boolean).length
  const readingTimeMinutes = ((wordCount / 200) + 1).toFixed()
  return `${readingTimeMinutes} min read`
}

export function truncateText(str: string, maxLength: number): string {
  const ellipsis = '…';
  if (str.length <= maxLength) return str;
  const trimmed = str.trimEnd();
  if (trimmed.length <= maxLength) return trimmed;
  const cutoff = maxLength - ellipsis.length;
  const sliced = str.slice(0, cutoff).trimEnd();
  return sliced + ellipsis;
}

export function safeJsonStringify(obj: unknown): string {
    const json = JSON.stringify(obj);
    const safe = json === undefined ? 'null' : json;
    return safe
        .replace(/</g, '\\u003c')
        .replace(/'/g, "\\u0027");
}

export function escapeHtml(unsafe: unknown): string {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
}

export function safeUrl(name: unknown): string {
    if (typeof name !== 'string') return '';
    return encodeURIComponent(name).replace(/'/g, "%27");
}

export function normalizeString(str: string): string {
    if (!str) return '';
    return str
        .trim()
        .toLowerCase()
        .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
        .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ü/g, 'u')
        .replace(/ñ/g, 'n')
        .replace(/\s+/g, ' ');
}

let _catalogCache: RouteData[] | null = null;
let _spatialIndex: SpatialHash<Stop> | null = null;
let _uniqueStops: Stop[] = [];

export async function getClosestLandmark(lat: number, lng: number) {
    try {
        if (!_catalogCache) {
            const response = await fetch('/data/master_routes.optimized.json');
            if (!response.ok) throw new Error(`Failed to load routes: ${response.statusText}`);
            const data = await response.json();
            _catalogCache = data.rutas || [];
            _spatialIndex = new SpatialHash<Stop>(0.01);
            _uniqueStops = [];
            const seenStops = new Set<string>();
            for (const ruta of _catalogCache) {
                for (const parada of ruta.paradas || []) {
                    const pLat = parada.lat ?? parada.latitude;
                    const pLng = parada.lng ?? parada.longitude ?? parada.lon;
                    if (pLat == null || pLng == null) continue;
                    const stopName = (parada.nombre || 'Unknown').trim();
                    const stopKey = `${stopName}|${pLat}|${pLng}`;
                    if (!seenStops.has(stopKey)) {
                        seenStops.add(stopKey);
                        const normalizedStop = { ...parada, nombre: stopName, lat: pLat, lng: pLng };
                        _spatialIndex.insert(pLat, pLng, normalizedStop);
                        _uniqueStops.push(normalizedStop);
                    }
                }
            }
        }
        let closest = null;
        let minDistKm = Infinity;
        if (_spatialIndex) {
            const candidates = _spatialIndex.query(lat, lng);
            for (const point of candidates) {
                const distKm = getDistanceKm(lat, lng, point.lat, point.lng);
                if (distKm < minDistKm) { minDistKm = distKm; closest = point.data; }
            }
        }
        if (minDistKm > 1.0) {
            for (const parada of _uniqueStops) {
                const distKm = getDistanceKm(lat, lng, parada.lat!, parada.lng!);
                if (distKm < minDistKm) { minDistKm = distKm; closest = parada; }
            }
        }
        return closest;
    } catch (e) {
        console.error("Error loading catalog for landmark lookup", e);
        return null;
    }
}

export function getRelativeLocaleUrl(lang: string, path: string): string {
  if (!path) return `/${lang}/`;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `/${lang}/${normalizedPath}`;
}

export function showToast(message: string, type: 'success' | 'warning' | 'danger' | 'info' = 'info', duration: number = 3000) {
    if (typeof window === 'undefined') return;
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'c-toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `c-toast c-toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('c-toast--fade-out');
        setTimeout(() => toast.remove(), 500);
    }, duration);
}
