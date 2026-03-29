import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitizes and normalizes a string for robust comparisons (e.g., stop names).
 * Removes accents, extra spaces, and converts to lowercase.
 */
export function normalizeString(str: string): string {
    if (!str) return '';
    return str
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/\s+/g, ' '); // Collapse spaces
}

/**
 * Escapes HTML characters to prevent XSS.
 */
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

/**
 * Safe JSON stringify for HTML attributes.
 * Escapes < and ' to prevent XSS in attribute context.
 * Note: we don't escape > to match the existing test expectations.
 */
export function safeJsonStringify(obj: any): string {
  if (obj === undefined) return 'null';
  try {
    const json = JSON.stringify(obj);
    return (json ?? 'null')
      .replace(/</g, '\\u003c')
      .replace(/'/g, '\\u0027');
  } catch (e) {
    return '{}';
  }
}

/**
 * Format date to local string (en-US, MMM DD, YYYY).
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

/**
 * URL Safe Encoding.
 */
export function safeUrl(str: any): string {
    if (typeof str !== 'string') return '';
    return encodeURIComponent(str.trim())
        .replace(/'/g, '%27');
}

/**
 * Truncates text and adds ellipsis if it exceeds maxLength.
 */
export function truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    const trimmed = text.trim();
    if (trimmed.length <= maxLength) return trimmed;

    if (maxLength <= 1) return '…';

    return trimmed.slice(0, maxLength - 1).trim() + '…';
}
