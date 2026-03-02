export type ToastType = 'success' | 'error' | 'warning' | 'info';

declare global {
  interface Window {
    showToast?: (message: string, type?: ToastType, duration?: number) => void;
  }
}

/**
 * Safely displays a toast notification if the global showToast function is available.
 *
 * @param message The message to display.
 * @param type The type of toast (success, error, warning, info). Defaults to 'info'.
 * @param duration The duration in milliseconds. Defaults to 3000.
 */
export function showToast(message: string, type: ToastType = 'info', duration: number = 3000): void {
  if (typeof window !== 'undefined' && window.showToast) {
    window.showToast(message, type, duration);
  } else {
    // Fallback if the toast component is not loaded yet or in SSR context
    console.warn(`[Toast ${type}]: ${message}`);
  }
}
