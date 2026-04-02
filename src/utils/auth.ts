/**
 * AUTH & NAVIGATION GUARDS (Nexus v3.3.1)
 * Optimized for static builds and in-app browser compatibility.
 */

export const SUPPORTED_LOCALES = ['es', 'en'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

export function getPreferredLocale(): Locale {
  if (typeof window === 'undefined') return 'es';

  // 1. Check LocalStorage (Most reliable in PWAs)
  const saved = localStorage.getItem('lang') as Locale;
  if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;

  // 2. Check Cookie
  const cookieMatch = document.cookie.match(/locale=([^;]+)/);
  const cookieLang = cookieMatch ? decodeURIComponent(cookieMatch[1]) as Locale : null;
  if (cookieLang && SUPPORTED_LOCALES.includes(cookieLang)) return cookieLang;

  // 3. Browser Detection
  const navLang = navigator.language.split('-')[0] as Locale;
  return SUPPORTED_LOCALES.includes(navLang) ? navLang : 'es';
}

export function isTutorialCompleted(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check Cookie
  if (document.cookie.includes('tutorial_completed=true')) return true;

  // 2. Check LocalStorage (Fallback)
  if (localStorage.getItem('tutorial_completed') === 'true') {
    // Sync back to cookie if missing
    document.cookie = "tutorial_completed=true; path=/; max-age=31536000; SameSite=Lax";
    return true;
  }

  return false;
}

export function setTutorialCompleted(lang: Locale) {
  if (typeof window === 'undefined') return;

  // Persist in both
  document.cookie = "tutorial_completed=true; path=/; max-age=31536000; SameSite=Lax";
  document.cookie = `locale=${encodeURIComponent(lang)}; path=/; max-age=31536000; SameSite=Lax`;
  localStorage.setItem('tutorial_completed', 'true');
  localStorage.setItem('lang', lang);
}

/**
 * Global Navigation Guard
 * Prevents infinite loops by carefully checking current path.
 */
export function enforceGuards() {
  if (typeof window === 'undefined') return;

  const path = window.location.pathname;
  const isRoot = path === '/' || path === '';
  const isStatic = path.includes('.') || path.startsWith('/_astro') || path.startsWith('/data/');

  if (isStatic) return;

  const completed = isTutorialCompleted();
  const lang = getPreferredLocale();

  if (isRoot) {
    if (completed) {
      window.location.replace(`/${lang}/home`);
    }
  } else {
    // If not root, and not completed, force to root for tutorial
    // EXCEPT if it's an offline page or localized tutorial
    const isSpecial = path.includes('/offline') || path === '/';
    if (!completed && !isSpecial) {
      window.location.replace('/');
    }
  }
}
