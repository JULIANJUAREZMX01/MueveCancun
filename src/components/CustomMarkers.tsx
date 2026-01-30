/**
 * Componente de Marcador de Parada de Autobús
 * Diseñado para ser inyectado en Mapbox GL JS mediante un nodo DOM.
 */
export const BusStopMarker = () => (
  <div className="bus-stop-marker">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-deep-navy">
      <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.1 19.1 5 18 5H4c-1.1 0-2.1 1.1-2.4 2.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2C.5 16.3 1 18 1 18h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
    </svg>
  </div>
);

/**
 * Componente de Marcador de Ubicación del Usuario
 */
export const UserMarker = () => (
  <div className="user-location-marker">
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white fill-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>
    </svg>
  </div>
);
