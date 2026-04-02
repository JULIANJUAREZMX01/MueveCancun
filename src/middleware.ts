import { defineMiddleware } from 'astro:middleware';

const SUPPORTED_LOCALES = ['es', 'en'] as const;
type Locale = typeof SUPPORTED_LOCALES[number];

/**
 * Top-level page slugs that exist without a language prefix.
 * A request to `/{slug}` is redirected to `/{locale}/{slug}` using the
 * visitor's stored locale cookie; falls back to the Accept-Language header
 * (same strategy as the root redirect), then defaults to 'es'.
 */
const UNLOCALIZED_PATHS = ['home', 'rutas', 'mapa', 'wallet', 'community', 'tracking', 'contribuir', 'about', 'guess'];

export const onRequest = defineMiddleware(({ request, redirect, cookies, url }, next) => {
  const path = url.pathname;
  const parts = path.split('/').filter(p => p);

  // Si la ruta es la raíz (/), permitimos el acceso a index.astro (nuestro tutorial)
  // PERO solo si no se ha completado ya el tutorial.
  if (path === '/' || path === '') {
    const tutorialCompleted = cookies.get('tutorial_completed')?.value === 'true';
    if (tutorialCompleted) {
      const savedLocale = (cookies.get('locale')?.value as Locale) || 'es';
      return redirect(`/${savedLocale}/home`, 302);
    }
    // Permitir cargar el tutorial (index.astro)
    return next();
  }

  // Para otras rutas, verificamos si se ha completado el tutorial
  // (Omitir esta validación para assets y archivos estáticos)
  const isStatic = path.includes('.') || path.startsWith('/_astro') || path.startsWith('/data/');
  if (!isStatic) {
     const tutorialCompleted = cookies.get('tutorial_completed')?.value === 'true';
     // Si intentan ir a /es/home sin haber pasado por el tutorial, los mandamos a la raíz
     if (!tutorialCompleted && (path.includes('/home') || path.includes('/rutas'))) {
        return redirect('/', 302);
     }
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

  // 3. Handle /ruta/[id] -> /{locale}/ruta/[id]
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
