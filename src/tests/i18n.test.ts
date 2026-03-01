import { describe, it, expect } from 'vitest';
import { getLangFromUrl, useTranslations, ui, defaultLang } from '../utils/i18n';

describe('getLangFromUrl', () => {
    it('should return "en" for an English URL', () => {
        const url = new URL('https://example.com/en/home');
        expect(getLangFromUrl(url)).toBe('en');
    });

    it('should return "es" for a Spanish URL', () => {
        const url = new URL('https://example.com/es/rutas');
        expect(getLangFromUrl(url)).toBe('es');
    });

    it('should return defaultLang for an unsupported language', () => {
        const url = new URL('https://example.com/fr/home');
        expect(getLangFromUrl(url)).toBe(defaultLang);
    });

    it('should return defaultLang for a URL without a language prefix', () => {
        const url = new URL('https://example.com/about');
        expect(getLangFromUrl(url)).toBe(defaultLang);
    });

    it('should return defaultLang for the root URL', () => {
        const url = new URL('https://example.com/');
        expect(getLangFromUrl(url)).toBe(defaultLang);
    });

    it('should handle URLs with query parameters correctly', () => {
        const url = new URL('https://example.com/en/home?search=test');
        expect(getLangFromUrl(url)).toBe('en');
    });

    it('should handle URLs with fragments correctly', () => {
        const url = new URL('https://example.com/es/rutas#map');
        expect(getLangFromUrl(url)).toBe('es');
    });
});

describe('useTranslations', () => {
    it('should return the correct translation for English', () => {
        const t = useTranslations('en');
        expect(t('nav.home')).toBe(ui.en['nav.home']);
        expect(t('nav.home')).toBe('Home');
        expect(t('transport.Bus')).toBe('Bus');
    });

    it('should return the correct translation for Spanish', () => {
        const t = useTranslations('es');
        expect(t('nav.home')).toBe(ui.es['nav.home']);
        expect(t('nav.home')).toBe('Inicio');
        expect(t('transport.Bus')).toBe('Autobús');
    });

    it('should fallback to defaultLang if the translation is missing in the requested language', () => {
        const key = 'nav.home';
        const defaultValue = ui[defaultLang][key];
        const originalEsValue = ui.es[key];

        try {
            // Simulate missing translation in Spanish for this key
            delete (ui.es as Record<string, string>)[key];

            const tEs = useTranslations('es');
            expect(tEs(key)).toBe(defaultValue);
        } finally {
            // Restore original Spanish translation to avoid affecting other tests
            ui.es[key] = originalEsValue;
        }
    });
});
