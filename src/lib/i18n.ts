import es from '../i18n/es.json';
import en from '../i18n/en.json';

export const languages = {
    en: 'English',
    es: 'Español'
};

export const defaultLang = 'es';

export const ui = {
    es,
    en
};

export function getLangFromUrl(url: URL) {
    const [, lang] = url.pathname.split('/');
    if (lang in ui) return lang as keyof typeof ui;
    return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
    return function t(key: keyof typeof ui['es']) {
        return ui[lang][key] || ui[defaultLang][key] || key;
    }
}
