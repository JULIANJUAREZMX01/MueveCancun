export interface Site {
  TITLE: string;
  DESCRIPTION: string;
  AUTHOR: string;
}

export interface Stop {
  nombre: string;
  lat: number;
  lng: number;
  id?: string;
  orden?: number;
}

export interface RouteData {
  id: string;
  nombre: string;
  paradas: Stop[];
  color?: string;
  tarifa?: number;
  tipo?: string;
  horario?: string | { inicio: string; fin: string };
}

export interface RoutesCatalog {
  rutas: RouteData[];
}

export interface JourneyLeg {
  route_id: string;
  route_name: string;
  origin_stop: string;
  dest_stop: string;
  price: number;
  color: string;
  color_id: string;
  transport_type: string;
  paradas: Stop[];
}

export interface Journey {
  id: string;
  type: "Direct" | "Transfer";
  total_price: number;
  duration_minutes: number;
  legs: JourneyLeg[];
}
