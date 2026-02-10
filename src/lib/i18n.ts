export const languages = {
    en: 'English',
    es: 'Español'
};

export const defaultLang = 'en';

export const ui = {
    en: {
        'nav.home': 'Home',
        'nav.routes': 'Routes',
        'nav.map': 'Map',
        'nav.card': 'Card',
        'calc.title': 'Where are we going?',
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
        'transport.Bus': 'Bus',
        'transport.Combi': 'Combi',
        'transport.Van': 'Van',
        'transport.ADO': 'ADO',
        'transport.PlayaExpress': 'Playa Express'
    },
    es: {
        'nav.home': 'Inicio',
        'nav.routes': 'Rutas',
        'nav.map': 'Mapa',
        'nav.card': 'Tarjeta',
        'calc.title': '¿A dónde vamos hoy?',
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
        'transport.Bus': 'Autobús',
        'transport.Combi': 'Combi',
        'transport.Van': 'Van / Colectivo',
        'transport.ADO': 'ADO',
        'transport.PlayaExpress': 'Playa Express'
    }
};

export function getLangFromUrl(url: URL) {
    const [, lang] = url.pathname.split('/');
    if (lang in ui) return lang as keyof typeof ui;
    return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
    return function t(key: keyof typeof ui['en']) {
        return ui[lang][key] || ui[defaultLang][key];
    }
}
