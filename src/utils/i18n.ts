import es from '../i18n/es.json';
import en from '../i18n/en.json';

export const languages = {
    en: 'English',
    es: 'Español',
    fr: 'Français',
    pt: 'Português',
    my: 'Maya'
};

export const defaultLang = 'es';

export const ui = {
    en: {
        'nav.home': 'Home',
        'nav.routes': 'Routes',
        'nav.map': 'Map',
        'nav.wallet': 'Wallet',
        'nav.community': 'Forum',
        'nav.about': 'About Us',
        'nav.subscription': 'Subscriptions',
        'pwa.update': 'Update Available',
        'pwa.new_version': 'New version ready.',
        'pwa.refresh': 'UPDATE',
        'calc.question.origin': 'Which route takes me to?',
        'calc.question.dest': 'Where are we going?',
        'calc.title': 'Which Route Takes Me?',
        'calc.origin': 'Origin',
        'calc.dest': 'Destination',
        'calc.placeholder.origin': 'Where are you?',
        'calc.placeholder.dest': 'Where to?',
        'calc.quick': 'Quick Actions',
        'calc.home': 'Home',
        'calc.work': 'Work',
        'calc.airport': 'Airport',
        'calc.beach': 'Beach',
        'calc.passengers': 'Passengers',
        'calc.mode': 'Mode',
        'calc.tourist': 'Tourist',
        'calc.btn': 'CALCULATE ROUTE',
        'calc.balance.warning': 'Insufficient Balance',
        'calc.balance.msg': 'Requires $180 MXN to operate.',
        'calc.gps': 'Use my location',
        'calc.map': 'Select on map',
        'calc.reset': 'EDIT',
        'calc.loading': 'Loading...',
        'calc.options': 'OPTIONS',
        'calc.fastest': 'FASTEST',
        'calc.error.system': 'System not ready (WASM offline).',
        'calc.error.restricted': 'Restricted route to Airport from Walmart (Taxi/ADO only).',
        'calc.error.origin': 'Origin not found',
        'calc.best': 'Best Route',
        'calc.transfer': 'Transfer',
        'calc.view_map': 'View Map',
        'calc.view_route': 'View Route',
        'calc.no_route': 'No exact route found',
        'calc.no_route_msg': 'Try using keywords like "Centro", "Hotel Zone" or "Crucero".',
        'calc.view_all': 'View all routes',
        'calc.offline': 'Offline Mode',
        'calc.offline_msg': 'Could not load search engine. Check connection.',
        'calc.num_options': 'OPTION FOUND',
        'calc.num_options_plural': 'OPTIONS FOUND',
        'calc.fastest_label': 'FASTEST: ',
        'calc.toggle.hide': 'Hide',
        'calc.toggle.show': 'Show',
        'calc.export_gmaps': 'Open in Google Maps',
        'transport.Bus': 'Bus',
        'transport.Combi': 'Combi',
        'transport.Van': 'Van',
        'transport.ADO': 'ADO',
        'transport.PlayaExpress': 'Playa Express',
        'calc.max_passengers': 'Maximum 10 passengers'
    },
    es: {
        'nav.home': 'Inicio',
        'nav.routes': 'Rutas',
        'nav.map': 'Mapa',
        'nav.wallet': 'Tarjeta',
        'nav.community': 'Foro',
        'nav.about': 'Nosotros',
        'nav.subscription': 'Suscripciones',
        'pwa.update': 'Actualización disponible',
        'pwa.new_version': 'Nueva versión lista.',
        'pwa.refresh': 'ACTUALIZAR',
        'calc.question.origin': '¿Qué ruta me lleva a?',
        'calc.question.dest': '¿A dónde nos vamos?',
        'calc.title': '¿Qué Ruta Me Lleva?',
        'calc.origin': 'Origen',
        'calc.dest': 'Destino',
        'calc.placeholder.origin': '¿Dónde estás?',
        'calc.placeholder.dest': '¿A dónde vas?',
        'calc.quick': 'Accesos Rápidos',
        'calc.home': 'Casa',
        'calc.work': 'Trabajo',
        'calc.airport': 'Aeropuerto',
        'calc.beach': 'Playa',
        'calc.passengers': 'Pasajeros',
        'calc.mode': 'Modo',
        'calc.tourist': 'Turista',
        'calc.btn': 'TRAZAR RUTA',
        'calc.balance.warning': 'Saldo Insuficiente',
        'calc.balance.msg': 'Requiere $180 MXN para operar.',
        'calc.gps': 'Usar mi ubicación',
        'calc.map': 'Seleccionar en mapa',
        'calc.reset': 'EDITAR',
        'calc.loading': 'Cargando...',
        'calc.options': 'OPCIONES',
        'calc.fastest': 'MÁS RÁPIDA',
        'calc.error.system': 'El sistema no está listo (WASM offline).',
        'calc.error.restricted': 'Ruta restringida hacia el Aeropuerto desde Walmart (Solo Taxis/ADO).',
        'calc.error.origin': 'Origen no encontrado',
        'calc.best': 'Mejor Ruta',
        'calc.transfer': 'Transbordo',
        'calc.view_map': 'Ver Mapa',
        'calc.view_route': 'Ver Ruta',
        'calc.no_route': 'No encontramos una ruta exacta',
        'calc.no_route_msg': 'Intenta usar palabras clave como "Centro", "Zona Hotelera" o "Crucero".',
        'calc.view_all': 'Ver todas las rutas',
        'calc.offline': 'Modo Offline',
        'calc.offline_msg': 'No se pudo cargar el motor de búsqueda. Verifica tu conexión.',
        'calc.num_options': 'OPCIÓN ENCONTRADA',
        'calc.num_options_plural': 'OPCIONES ENCONTRADAS',
        'calc.fastest_label': 'MÁS RÁPIDA: ',
        'calc.toggle.hide': 'Ocultar',
        'calc.toggle.show': 'Mostrar',
        'calc.export_gmaps': 'Ver en Google Maps',
        'transport.Bus': 'Autobús',
        'transport.Combi': 'Combi',
        'transport.Van': 'Van / Colectivo',
        'transport.ADO': 'ADO',
        'transport.PlayaExpress': 'Playa Express',
        'calc.max_passengers': 'Máximo 10 pasajeros'
    },
    fr: {
        'nav.home': 'Accueil',
        'nav.routes': 'Itinéraires',
        'nav.map': 'Carte',
        'nav.wallet': 'Portefeuille',
        'nav.community': 'Forum',
        'nav.about': 'À propos',
        'calc.question.origin': "Quel itinéraire m'emmène à?",
        'calc.question.dest': 'Où allons-nous?',
        'calc.btn': "CALCULER L'ITINÉRAIRE",
        'calc.export_gmaps': 'Ouvrir dans Google Maps'
    },
    pt: {
        'nav.home': 'Início',
        'nav.routes': 'Rotas',
        'nav.map': 'Mapa',
        'nav.wallet': 'Carteira',
        'nav.community': 'Fórum',
        'nav.about': 'Sobre nós',
        'calc.question.origin': 'Qual rota me leva para?',
        'calc.question.dest': 'Para onde vamos?',
        'calc.btn': 'CALCULAR ROTA',
        'calc.export_gmaps': 'Abrir no Google Maps'
    },
    my: {
        'nav.home': 'U kúuchil',
        'nav.routes': "Bejo'ob",
        'nav.map': 'Mapa',
        'calc.question.origin': 'Báax bej ku bisiken?',
        'calc.question.dest': "Tu'ux k-bin?",
        'calc.btn': 'KAXAN BEJ',
        'calc.export_gmaps': 'Il ichil Google Maps'
    }
};

export function getLangFromUrl(url: URL) {
    const [, lang] = url.pathname.split('/');
    if (lang in ui) return lang as keyof typeof ui;
    return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
    return function t(key: keyof typeof ui['en']) {
        return ui[lang]?.[key] || ui[defaultLang]?.[key] || ui['en']?.[key];
    }
}

// Wallet-specific translations that are not yet in the main ui object
const walletKeys: Record<string, Record<string, string>> = {
    'wallet.title': { es: 'Mi Tarjeta', en: 'My Wallet' },
    'wallet.current_balance': { es: 'Saldo Actual', en: 'Current Balance' },
    'wallet.operator_section': { es: 'Sección Operador', en: 'Operator Section' },
    'wallet.pilot_registration': { es: 'Registro de Piloto', en: 'Pilot Registration' },
    'wallet.pilot_benefit': { es: 'Obtén beneficios exclusivos', en: 'Get exclusive benefits' },
    'wallet.register_cta': { es: 'Registrar', en: 'Register' },
    'wallet.promo_title': { es: 'Código Promocional', en: 'Promo Code' },
    'wallet.apply_promo': { es: 'Aplicar', en: 'Apply' },
};

export function getI18N(lang: string | undefined) {
    const l = (lang && lang in ui) ? lang as keyof typeof ui : defaultLang;
    const t = (key: string) => {
        return walletKeys[key]?.[l] || key;
    };
    return { t, isEs: l === 'es' };
}
