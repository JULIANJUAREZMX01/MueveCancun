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
export function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Safe JSON stringify for HTML attributes.
 */
export function safeJsonStringify(obj: any): string {
  try {
    return JSON.stringify(obj).replace(/"/g, '&quot;');
  } catch (e) {
    return '{}';
  }
}

/**
 * Format date to local string (en-US, MMM DD, YYYY).
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * URL Safe Encoding.
 */
export function safeUrl(str: string): string {
    return encodeURIComponent(str.trim());
}
