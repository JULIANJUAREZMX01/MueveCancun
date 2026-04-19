import { getDistance } from './geometry';

export function formatDate(date: Date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

export function readingTime(html: string) {
  if (!html) return 0;
  // Acknowledge CodeQL: we are not using this to render, just to count words.
  // Using a very simple loop-based stripper to avoid regex vulnerability concerns.
  let text = '';
  let inTag = false;
  for (let i = 0; i < html.length; i++) {
    if (html[i] === '<') inTag = true;
    else if (html[i] === '>') inTag = false;
    else if (!inTag) text += html[i];
  }
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const wordsPerMinute = 200;
  return Math.ceil(words.length / wordsPerMinute);
}

export function getRelativeLocaleUrl(lang: string, path: string) {
  return `/${lang}${path.startsWith('/') ? path : '/' + path}`;
}

export function escapeHtml(unsafe: unknown): string {
  if (unsafe === null || unsafe === undefined) return '';
  const str = String(unsafe);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function safeUrl(str: string): string {
  if (typeof str !== 'string') return "";
  return encodeURIComponent(str.trim())
    .replace(/'/g, "%27");
}

export function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const sliced = text.slice(0, Math.max(0, maxLength - 1));
  return (sliced.endsWith(" ") ? sliced.trim() : sliced) + "…";
}

export function safeJsonStringify(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/'/g, '\\u0027');
}

export function showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('SHOW_TOAST', { detail: { message, type } }));
    }
}

export function normalizeString(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n");
}

interface Stop {
    lat: number;
    lng: number;
    nombre: string;
}

interface RouteEntry {
    paradas: Stop[];
}

interface CatalogData {
    rutas: RouteEntry[];
}

let stopsCache: Stop[] | null = null;

export async function getClosestLandmark(lat: number, lng: number): Promise<Stop | null> {
    if (!stopsCache) {
        try {
            const res = await fetch('/data/master_routes.optimized.json');
            if (res.ok) {
                const data = await res.json() as CatalogData;
                const stops = new Map<string, Stop>();
                data.rutas.forEach((r) => {
                    r.paradas.forEach((s) => {
                        const key = `${s.lat},${s.lng}`;
                        if (!stops.has(key)) stops.set(key, s);
                    });
                });
                stopsCache = Array.from(stops.values());
            }
        } catch {
            stopsCache = [];
        }
    }

    if (!stopsCache || stopsCache.length === 0) return null;

    let closest: Stop | null = null;
    let minDiff = Infinity;

    for (const stop of stopsCache) {
        const d = getDistance(lat, lng, stop.lat, stop.lng);
        if (d < minDiff) {
            minDiff = d;
            closest = stop;
        }
    }

    return closest;
}
