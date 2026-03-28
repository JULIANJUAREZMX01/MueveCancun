export interface JourneyRoute {
  id: string;
  name: string;
  waypoints: Waypoint[];
  transfers: Transfer[];
}
export interface Waypoint {
  lat: number;
  lng: number;
  name: string;
  stopId: string;
}
export interface Transfer {
  fromRouteId: string;
  toRouteId: string;
  stopId: string;
  penaltySeconds: number;
}
export interface SyncEntry {
  id: string;
  payload: unknown;
  timestamp: number;
  retries: number;
}
export interface TrackingPoint {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}
