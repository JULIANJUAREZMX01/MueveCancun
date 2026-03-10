export interface Site {
  TITLE: string
  DESCRIPTION: string
  AUTHOR: string
}

export type Links = {
  TEXT: string
  HREF: string
}[]

export interface Stop {
  nombre: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  lon?: number;
  parada?: string;
  orden?: number;
}

export interface RouteData {
  id: string;
  nombre: string;
  paradas: Stop[];
  horario?: string | { inicio: string; fin: string; inicio_oficial?: string; fin_oficial?: string };
  tarifa?: number;
  tipo?: string;
  [key: string]: unknown;
}

export interface RoutesCatalog {
  rutas: RouteData[];
  [key: string]: unknown;
}
