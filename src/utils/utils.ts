import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date) {
  return Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(date)
}

export function readingTime(html: string) {
  const textOnly = html.replace(/<[^>]+>/g, "")
  const wordCount = textOnly.split(/\s+/).length
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

/**
 * Serializes an object to a JSON string that is safe to use in HTML attributes.
 * Escapes < to prevent tag injection and ' to prevent attribute breakout.
 * @param obj The object to serialize.
 * @returns The escaped JSON string.
 */
export function safeJsonStringify(obj: unknown): string {
    const json = JSON.stringify(obj);
    const safe = json === undefined ? 'null' : json;
    return safe
        .replace(/</g, '\\u003c')
        .replace(/'/g, "\\u0027");
}

/**
 * Escapes HTML characters to prevent XSS attacks when rendering user-provided content.
 * @param unsafe The string to escape.
 * @returns The escaped string.
 */
export function escapeHtml(unsafe: unknown): string {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
}

/**
 * Validates and sanitizes a URL component, specifically for query parameters.
 * @param name The URL component to sanitize.
 * @returns The sanitized URL component.
 */
export function safeUrl(name: unknown): string {
    if (typeof name !== 'string') return '';
    return encodeURIComponent(name).replace(/'/g, "%27");
}

/**
 * Normalizes a string for robust, accent-insensitive comparisons (e.g., stop names).
 * Removes accents, trims, and converts to lowercase.
 * @param str The string to normalize.
 * @returns The normalized string.
 */
export function normalizeString(str: string): string {
    if (!str) return '';
    return str
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, ' ');
}

/**
 * Returns the Haversine great-circle distance in **meters** between two
 * geographic coordinates.
 *
 * @param lat1 - Latitude of the first point in decimal degrees.
 * @param lon1 - Longitude of the first point in decimal degrees.
 * @param lat2 - Latitude of the second point in decimal degrees.
 * @param lon2 - Longitude of the second point in decimal degrees.
 * @returns Distance in meters (R = 6 371 km).
 *
 * @example
 * // Distance between two Cancún landmarks (~7.5 km)
 * haversineDistance(21.1619, -86.8515, 21.0821, -86.8770);
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth mean radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Finds the nearest transit stop to the given coordinates by scanning the
 * full route catalog.  Uses `haversineDistance` for accuracy.
 *
 * @param lat - User latitude in decimal degrees.
 * @param lng - User longitude in decimal degrees.
 * @returns The nearest stop object (`{ nombre, lat, lng, ... }`) from
 *   `master_routes.json`, or `null` if the catalog is unavailable or empty.
 */
export async function getClosestLandmark(lat: number, lng: number) {
    try {
        const response = await fetch('/data/master_routes.json');
        if (!response.ok) throw new Error(`Failed to load routes: ${response.statusText}`);
        const data = await response.json();
        const rutas = data.rutas || [];
        let closest = null;
        let minDist = Infinity;
        for (const ruta of rutas) {
            for (const parada of ruta.paradas) {
                const dist = haversineDistance(lat, lng, parada.lat, parada.lng);
                if (dist < minDist) {
                    minDist = dist;
                    closest = parada;
                }
            }
        }
        return closest;
    } catch (e) {
        console.error("Error fetching master_routes.json", e);
        return null;
    }
}
