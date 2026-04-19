export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date)
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

export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function safeUrl(str: string): string {
  return encodeURIComponent(str.toLowerCase().trim());
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
