import { defineMiddleware } from 'astro:middleware';

const SUPPORTED_LOCALES = ['es', 'en'] as const;
type Locale = typeof SUPPORTED_LOCALES[number];

export const onRequest = defineMiddleware(({ request, redirect, cookies, url }, next) => {
  const path = url.pathname;

  // Handle root redirect
  if (path === '/' || path === '') {
    // 1. Cookie preference
    const saved = cookies.get('locale')?.value as Locale;
    if (saved && SUPPORTED_LOCALES.includes(saved)) {
      return redirect(`/${saved}/home`, 302);
    }

    // 2. Browser preference
    const lang = request.headers.get('accept-language') ?? '';
    const locale = lang.toLowerCase().startsWith('en') ? 'en' : 'es';
    return redirect(`/${locale}/home`, 302);
  }

  return next();
});
