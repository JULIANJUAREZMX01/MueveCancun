import { MapPin, Bus } from 'lucide-react';

/**
 * Componente de Marcador de Parada de Autobús
 * Diseñado para ser inyectado en Mapbox GL JS mediante un nodo DOM.
 */
export const BusStopMarker = () => (
  <div className="bus-stop-marker">
    <Bus size={20} className="text-deep-navy" />
  </div>
);

/**
 * Componente de Marcador de Ubicación del Usuario
 */
export const UserMarker = () => (
  <div className="user-location-marker">
    <MapPin size={12} className="text-white fill-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
  </div>
);
