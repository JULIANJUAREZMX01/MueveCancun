import { defineMiddleware } from 'astro:middleware';

const SUPPORTED_LOCALES = ['es', 'en'] as const;
type Locale = typeof SUPPORTED_LOCALES[number];

export const onRequest = defineMiddleware(({ request, redirect, cookies, url }, next) => {
  const path = url.pathname;

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

  return next();
});
