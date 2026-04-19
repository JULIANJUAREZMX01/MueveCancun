import { getDistance } from './geometry';

export function formatDate(date: Date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

export function readingTime(html: string) {
  const textOnly = html.replace(/<[^>]*>?/gm, "");
  const wordsPerMinute = 200;
  const noOfWords = textOnly.split(/\s+/).length;
  const minutes = noOfWords / wordsPerMinute;
  return Math.ceil(minutes);
}

export function getRelativeLocaleUrl(lang: string, path: string) {
  return `/${lang}${path.startsWith('/') ? path : '/' + path}`;
}

export function escapeHtml(unsafe: any): string {
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
  // Match exact logic expected by tests: Hello World, 5 -> Hell... (no, Hell is 4 + ...)
  // Test says Hello World, 5 -> Hell...
  // Wait, if maxLength is 5, and it returns Hell..., that is 4 chars + 1 ellipsis
  return text.slice(0, maxLength - 1).trim() + "…";
}

export function safeJsonStringify(obj: any): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/'/g, '\\u0027');
}

export function showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    window.dispatchEvent(new CustomEvent('SHOW_TOAST', { detail: { message, type } }));
}

/**
 * Normaliza una cadena para búsquedas: minúsculas, sin espacios extra y sin acentos básicos.
 */
export function normalizeString(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n");
}

let stopsCache: any[] | null = null;

export async function getClosestLandmark(lat: number, lng: number) {
    if (!stopsCache) {
        try {
            const res = await fetch('/data/master_routes.optimized.json');
            if (res.ok) {
                const data = await res.json();
                const stops = new Map();
                data.rutas.forEach((r: any) => {
                    r.paradas.forEach((s: any) => {
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

    let closest = null;
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
