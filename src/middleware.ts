import { defineMiddleware } from 'astro:middleware';

const SUPPORTED_LOCALES = ['es', 'en'] as const;
type Locale = typeof SUPPORTED_LOCALES[number];

/**
 * Top-level page slugs that exist without a language prefix.
 * A request to `/{slug}` is redirected to `/{locale}/{slug}` using the
 * visitor's stored locale cookie (default: 'es').
 */
const UNLOCALIZED_PATHS = ['home', 'rutas', 'mapa', 'wallet', 'community', 'tracking', 'contribuir', 'about', 'guess'];

export const onRequest = defineMiddleware(({ request, redirect, cookies, url }, next) => {
  const path = url.pathname;
  const parts = path.split('/').filter(p => p);

  // 1. Root redirect
  if (path === '/' || path === '') {
    const saved = cookies.get('locale')?.value as Locale;
    if (saved && SUPPORTED_LOCALES.includes(saved)) {
      return redirect(`/${saved}/home`, 302);
    }
    const lang = request.headers.get('accept-language') ?? '';
    const locale = lang.toLowerCase().startsWith('en') ? 'en' : 'es';
    return redirect(`/${locale}/home`, 302);
  }

  // 2. Unlocalized top-level paths (e.g., /home -> /es/home)
  if (parts.length === 1 && UNLOCALIZED_PATHS.includes(parts[0])) {
    const saved = cookies.get('locale')?.value as Locale;
    if (saved && SUPPORTED_LOCALES.includes(saved)) {
      return redirect(`/${saved}/${parts[0]}`, 302);
    }
    const lang = request.headers.get('accept-language') ?? '';
    const locale: Locale = lang.toLowerCase().startsWith('en') ? 'en' : 'es';
    return redirect(`/${locale}/${parts[0]}`, 302);
  }

  // 3. Handle /ruta/[id] -> /es/ruta/[id]
  if (parts.length === 2 && parts[0] === 'ruta') {
    const saved = cookies.get('locale')?.value as Locale;
    if (saved && SUPPORTED_LOCALES.includes(saved)) {
      return redirect(`/${saved}/ruta/${parts[1]}`, 302);
    }
    const lang = request.headers.get('accept-language') ?? '';
    const locale: Locale = lang.toLowerCase().startsWith('en') ? 'en' : 'es';
    return redirect(`/${locale}/ruta/${parts[1]}`, 302);
  }

  return next();
});
