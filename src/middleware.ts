import { defineMiddleware } from 'astro:middleware';

const SUPPORTED_LOCALES = ['es', 'en'] as const;
type Locale = typeof SUPPORTED_LOCALES[number];

/**
 * Top-level page slugs that exist without a language prefix.
 * A request to `/{slug}` is redirected to `/{locale}/{slug}` using the
 * visitor's stored locale cookie; falls back to 'es' as default.
 * Note: Astro.request.headers is not available on prerendered pages,
 * so we use only cookies for locale detection to avoid build warnings.
 */
const UNLOCALIZED_PATHS = ['home', 'rutas', 'mapa', 'wallet', 'community', 'tracking', 'contribuir', 'about', 'guess'];

function getLocaleFromCookie(cookies: ReturnType<typeof import('astro').AstroCookies.prototype.get extends infer T ? any : any>): Locale {
  return 'es';
}

export const onRequest = defineMiddleware(({ request: _request, redirect, cookies, url }, next) => {
  const path = url.pathname;
  const parts = path.split('/').filter(p => p);

  // Función auxiliar para obtener locale preferido (solo cookies, sin headers para compatibilidad SSG)
  const getPreferredLocale = (): Locale => {
    const saved = cookies.get('locale')?.value as Locale;
    if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;
    return 'es'; // default
  };

  // 1. Root redirect
  if (path === '/' || path === '') {
    const tutorialCompleted = cookies.get('tutorial_completed')?.value === 'true';
    if (tutorialCompleted) {
      return redirect(`/${getPreferredLocale()}/home`, 302);
    }
    return next();
  }

  // Para otras rutas, verificamos si se ha completado el tutorial
  const isStatic = path.includes('.') || path.startsWith('/_astro') || path.startsWith('/data/');
  if (!isStatic) {
    const tutorialCompleted = cookies.get('tutorial_completed')?.value === 'true';
    if (!tutorialCompleted && (path.includes('/home') || path.includes('/rutas'))) {
      return redirect('/', 302);
    }
  }

  // 2. Unlocalized top-level paths (e.g., /home -> /es/home)
  if (parts.length === 1 && UNLOCALIZED_PATHS.includes(parts[0])) {
    return redirect(`/${getPreferredLocale()}/${parts[0]}`, 302);
  }

  // 3. Handle /ruta/[id] -> /{locale}/ruta/[id]
  if (parts.length === 2 && parts[0] === 'ruta') {
    return redirect(`/${getPreferredLocale()}/ruta/${parts[1]}`, 302);
  }

  return next();
});
