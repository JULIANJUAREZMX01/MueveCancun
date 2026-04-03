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

export interface RouteLeg {
  name: string;
  transport_type: string;
  operator: string;
  frequency: string;
  badges: string[];
  duration: string;
  duration_minutes?: number;
  origin_hub: string;
  dest_hub: string;
  stops: Array<{ name: string; lat?: number; lng?: number }>;
  paradas?: Stop[];
}

export interface Journey {
  legs: RouteLeg[];
  total_price: number;
  duration_minutes: number;
  transfer_point?: string;
}
