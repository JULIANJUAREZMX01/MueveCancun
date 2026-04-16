import { defineMiddleware } from 'astro:middleware';

const SUPPORTED_LOCALES = ['es', 'en'] as const;
type Locale = typeof SUPPORTED_LOCALES[number];

const UNLOCALIZED_PATHS = ['home', 'rutas', 'mapa', 'wallet', 'community', 'tracking', 'contribuir', 'about', 'guess'];

export const onRequest = defineMiddleware(({ redirect, cookies, url }, next) => {
  const path = url.pathname;
  const parts = path.split('/').filter(p => p);

  const getPreferredLocale = (): Locale => {
    const saved = cookies.get('locale')?.value as Locale;
    if (saved && (SUPPORTED_LOCALES as readonly string[]).includes(saved)) return saved;
    return 'es';
  };

  if (path === '/' || path === '') {
    const tutorialCompleted = cookies.get('tutorial_completed')?.value === 'true';
    if (tutorialCompleted) {
      const preferred = getPreferredLocale();
      return redirect(`/${preferred}/home`, 302);
    }
    return next();
  }

  if (parts.length === 1 && UNLOCALIZED_PATHS.includes(parts[0])) {
    return redirect(`/${getPreferredLocale()}/${parts[0]}`, 302);
  }

  if (parts.length === 2 && parts[0] === 'ruta') {
    return redirect(`/${getPreferredLocale()}/ruta/${parts[1]}`, 302);
  }

  return next();
});
