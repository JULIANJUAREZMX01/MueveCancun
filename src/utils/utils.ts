import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getDistance as getDistanceKm } from "./geometry";
import type { RouteData } from "../types";

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
  let textOnly = html;
  let prev: string;
  do {
    prev = textOnly;
    textOnly = textOnly.replace(/<[^>]*>/g, "");
  } while (prev !== textOnly);
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
 * Normalizes a string for accent-insensitive, case-insensitive stop-name
 * comparisons.  Uses the same explicit replacement strategy as `normalize_str()`
 * in `rust-wasm/route-calculator/src/lib.rs` so that both sides produce
 * identical keys for any given stop name.
 *
 * **Must stay in sync with `normalize_str()` in lib.rs.**
 *
 * @param str The string to normalize.
 * @returns Trimmed, lowercased string with Spanish diacritics replaced and
 *   internal whitespace collapsed to a single space.
 */
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

/**
 * Finds the nearest transit stop to the given coordinates by scanning the
 * full route catalog.  Uses `getDistance()` from `geometry.ts` for the
 * Haversine calculation (returns km).
 *
 * **Performance note**: the catalog is loaded once and cached in the module
 * scope.  Subsequent calls reuse the cached data.
 *
 * @param lat - User latitude in decimal degrees.
 * @param lng - User longitude in decimal degrees.
 * @returns The nearest stop object (`{ nombre, lat, lng, ... }`) from
 *   `master_routes.json`, or `null` if the catalog is unavailable or empty.
 */
// Module-level cache so repeated calls (e.g., retries) don't re-fetch the catalog.
let _catalogCache: RouteData[] | null = null;

export async function getClosestLandmark(lat: number, lng: number) {
    try {
        if (!_catalogCache) {
            const response = await fetch('/data/master_routes.json');
            if (!response.ok) throw new Error(`Failed to load routes: ${response.statusText}`);
            const data = await response.json();
            _catalogCache = data.rutas || [];
        }

        let closest = null;
        let minDistKm = Infinity;
        for (const ruta of _catalogCache) {
            for (const parada of ruta.paradas || []) {
                const distKm = getDistanceKm(lat, lng, parada.lat, parada.lng);
                if (distKm < minDistKm) {
                    minDistKm = distKm;
                    closest = parada;
                }
            }
        }
        return closest;
    } catch (e) {
        console.error("Error loading catalog for landmark lookup", e);
        return null;
    }
}

/**
 * Generates a localized relative URL for the given path and language.
 * Ensures consistent URL structure (e.g., /es/home) across the application.
 *
 * @param lang The language code (e.g., 'es', 'en').
 * @param path The target path (e.g., 'home', '/rutas').
 * @returns The formatted localized relative URL.
 */
export function getRelativeLocaleUrl(lang: string, path: string): string {
  if (!path) return `/${lang}/`;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `/${lang}/${normalizedPath}`;
}
