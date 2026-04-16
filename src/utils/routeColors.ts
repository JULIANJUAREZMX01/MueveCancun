/**
 * Route Colors Configuration
 * Sistema de colores tipo Metro CDMX para las rutas de Cancún
 * Cada ruta tiene un color único y distintivo
 */

export interface RouteColor {
  id: string;
  name: string;
  primary: string;      // Color principal de la ruta
  light: string;        // Color claro para fondos
  dark: string;         // Color oscuro para texto
  contrast: string;     // Color de contraste para texto sobre primary
}

export const ROUTE_COLORS: Record<string, RouteColor> = {
  'R1': {
    id: 'R1',
    name: 'Ruta 1',
    primary: '#FF6B6B',      // Rojo coral
    light: '#FFE5E5',
    dark: '#CC0000',
    contrast: '#FFFFFF'
  },
  'R2': {
    id: 'R2',
    name: 'Ruta 2',
    primary: '#4ECDC4',      // Turquesa
    light: '#E0F7F6',
    dark: '#2A9D8F',
    contrast: '#FFFFFF'
  },
  'R3': {
    id: 'R3',
    name: 'Ruta 3',
    primary: '#FFD93D',      // Amarillo dorado
    light: '#FFF9E5',
    dark: '#F4A900',
    contrast: '#2D3436'
  },
  'R4': {
    id: 'R4',
    name: 'Ruta 4',
    primary: '#6C5CE7',      // Púrpura
    light: '#E8E4FF',
    dark: '#5448C8',
    contrast: '#FFFFFF'
  },
  'R5': {
    id: 'R5',
    name: 'Ruta 5',
    primary: '#00B894',      // Verde esmeralda
    light: '#D5F5ED',
    dark: '#00916E',
    contrast: '#FFFFFF'
  },
  'R6': {
    id: 'R6',
    name: 'Ruta 6',
    primary: '#FD79A8',      // Rosa
    light: '#FFE9F2',
    dark: '#E84393',
    contrast: '#FFFFFF'
  },
  'R7': {
    id: 'R7',
    name: 'Ruta 7',
    primary: '#0984E3',      // Azul brillante
    light: '#E3F2FD',
    dark: '#0652DD',
    contrast: '#FFFFFF'
  },
  'R8': {
    id: 'R8',
    name: 'Ruta 8',
    primary: '#FD7272',      // Coral
    light: '#FFE8E8',
    dark: '#E73C3C',
    contrast: '#FFFFFF'
  },
  'R9': {
    id: 'R9',
    name: 'Ruta 9',
    primary: '#A29BFE',      // Lavanda
    light: '#F0EDFF',
    dark: '#6C5CE7',
    contrast: '#FFFFFF'
  },
  'R10': {
    id: 'R10',
    name: 'Ruta 10',
    primary: '#00CEC9',      // Cian
    light: '#E0FFFE',
    dark: '#00B5B1',
    contrast: '#FFFFFF'
  },
  'R11': {
    id: 'R11',
    name: 'Ruta 11',
    primary: '#FDCB6E',      // Naranja suave
    light: '#FFF4E0',
    dark: '#E8A428',
    contrast: '#2D3436'
  },
  'R12': {
    id: 'R12',
    name: 'Ruta 12',
    primary: '#E17055',      // Terracota
    light: '#FFEAE4',
    dark: '#D63031',
    contrast: '#FFFFFF'
  },
  'R13': {
    id: 'R13',
    name: 'Ruta 13',
    primary: '#74B9FF',      // Azul cielo
    light: '#E8F4FF',
    dark: '#0984E3',
    contrast: '#2D3436'
  },
  'R14': {
    id: 'R14',
    name: 'Ruta 14',
    primary: '#A8E6CF',      // Verde menta
    light: '#E9F9F3',
    dark: '#55EFC4',
    contrast: '#2D3436'
  },
  'R15': {
    id: 'R15',
    name: 'Ruta 15',
    primary: '#FF7675',      // Rojo pastel
    light: '#FFE9E9',
    dark: '#D63031',
    contrast: '#FFFFFF'
  },
  'R16': {
    id: 'R16',
    name: 'Ruta 16',
    primary: '#636E72',      // Gris acero
    light: '#EEF0F1',
    dark: '#2D3436',
    contrast: '#FFFFFF'
  },
  'R17': {
    id: 'R17',
    name: 'Ruta 17',
    primary: '#FEB2B2',      // Rosa claro
    light: '#FFF0F0',
    dark: '#E84393',
    contrast: '#2D3436'
  },
  'R18': {
    id: 'R18',
    name: 'Ruta 18',
    primary: '#81ECEC',      // Turquesa claro
    light: '#E8FCFC',
    dark: '#00CEC9',
    contrast: '#2D3436'
  },
  'R19': {
    id: 'R19',
    name: 'Ruta 19',
    primary: '#FAB1A0',      // Melocotón
    light: '#FFF0EC',
    dark: '#E17055',
    contrast: '#2D3436'
  },
  'R20': {
    id: 'R20',
    name: 'Ruta 20',
    primary: '#DFE6E9',      // Gris claro
    light: '#F8F9FA',
    dark: '#636E72',
    contrast: '#2D3436'
  },
  'R21': {
    id: 'R21',
    name: 'Ruta 21',
    primary: '#FF6348',      // Rojo tomate
    light: '#FFE5E2',
    dark: '#E74C3C',
    contrast: '#FFFFFF'
  },
  'R22': {
    id: 'R22',
    name: 'Ruta 22',
    primary: '#26C281',      // Verde jade
    light: '#DAFBE9',
    dark: '#1E8E6B',
    contrast: '#FFFFFF'
  },
  'R23': {
    id: 'R23',
    name: 'Ruta 23',
    primary: '#F39C12',      // Naranja
    light: '#FEF0DB',
    dark: '#D68910',
    contrast: '#FFFFFF'
  },
  'R24': {
    id: 'R24',
    name: 'Ruta 24',
    primary: '#9B59B6',      // Morado
    light: '#F4ECF7',
    dark: '#8E44AD',
    contrast: '#FFFFFF'
  },
  'R25': {
    id: 'R25',
    name: 'Ruta 25',
    primary: '#3498DB',      // Azul
    light: '#EBF5FB',
    dark: '#2980B9',
    contrast: '#FFFFFF'
  },
  'R26': {
    id: 'R26',
    name: 'Ruta 26',
    primary: '#1ABC9C',      // Verde agua
    light: '#D5F4EC',
    dark: '#16A085',
    contrast: '#FFFFFF'
  },
  'R27': {
    id: 'R27',
    name: 'Ruta 27',
    primary: '#E74C3C',      // Rojo carmín
    light: '#FADBD8',
    dark: '#C0392B',
    contrast: '#FFFFFF'
  },
  'R28': {
    id: 'R28',
    name: 'Ruta 28',
    primary: '#F1C40F',      // Amarillo
    light: '#FCF3CF',
    dark: '#D4AC0D',
    contrast: '#2D3436'
  },
  'R29': {
    id: 'R29',
    name: 'Ruta 29',
    primary: '#2ECC71',      // Verde césped
    light: '#D5F4E6',
    dark: '#27AE60',
    contrast: '#FFFFFF'
  },
  'R30': {
    id: 'R30',
    name: 'Ruta 30',
    primary: '#E67E22',      // Naranja oscuro
    light: '#FDEBD0',
    dark: '#CA6F1E',
    contrast: '#FFFFFF'
  },
  'R31': {
    id: 'R31',
    name: 'Ruta 31',
    primary: '#95A5A6',      // Gris plateado
    light: '#F2F4F4',
    dark: '#7F8C8D',
    contrast: '#FFFFFF'
  },
  // Rutas especiales
  'PLAYA_EXPRESS': {
    id: 'PLAYA_EXPRESS',
    name: 'Playa Express',
    primary: '#00D2D3',      // Turquesa brillante
    light: '#CCFBF1',
    dark: '#0891B2',
    contrast: '#FFFFFF'
  },
  'EXPRESO': {
    id: 'EXPRESO',
    name: 'Expreso',
    primary: '#10B981',      // Verde brillante
    light: '#D1FAE5',
    dark: '#059669',
    contrast: '#FFFFFF'
  },
  'NOCTURNO': {
    id: 'NOCTURNO',
    name: 'Nocturno',
    primary: '#3730A3',      // Índigo oscuro
    light: '#E0E7FF',
    dark: '#1E1B4B',
    contrast: '#FFFFFF'
  },
  // Default para rutas desconocidas
  'DEFAULT': {
    id: 'DEFAULT',
    name: 'Sin asignar',
    primary: '#6B7280',      // Gris neutral
    light: '#F3F4F6',
    dark: '#374151',
    contrast: '#FFFFFF'
  }
};

/**
 * Obtiene el color de una ruta por su ID
 */
export function getRouteColor(routeId: string): RouteColor {
  return ROUTE_COLORS[routeId] || ROUTE_COLORS.DEFAULT;
}

/**
 * Genera un estilo CSS para una ruta
 */
export function getRouteStyle(routeId: string): {
  backgroundColor: string;
  color: string;
  borderColor: string;
} {
  const color = getRouteColor(routeId);
  return {
    backgroundColor: color.primary,
    color: color.contrast,
    borderColor: color.dark
  };
}

/**
 * Obtiene todos los colores para el mapa
 */
export function getAllRouteColors(): RouteColor[] {
  return Object.values(ROUTE_COLORS).filter(c => c.id !== 'DEFAULT');
}

/**
 * Genera una leyenda de colores para el mapa
 */
export function getRouteLegend(): Array<{ id: string; name: string; color: string }> {
  return getAllRouteColors()
    .filter(c => c.id.startsWith('R') || c.id.includes('EXPRESS') || c.id.includes('EXPRESO'))
    .map(c => ({
      id: c.id,
      name: c.name,
      color: c.primary
    }));
}
