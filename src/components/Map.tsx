import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'TU_MAPBOX_TOKEN_AQUI';

interface Parada {
  lng: number;
  lat: number;
  nombre: string;
}

interface Ruta {
  id: string;
  polyline: [number, number][];
  color: string;
  tarifa: number;
  paradas: Parada[];
}

interface MapProps {
  center: [number, number];
  userLocation: [number, number] | null;
}

const Map: React.FC<MapProps> = React.memo(({ center, userLocation }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);

  // Initialize map only once on mount
  useEffect(() => {
    if (!mapContainer.current) return;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: 12
    });
    map.current = m;

    // Add controls
    m.addControl(new mapboxgl.NavigationControl());
    m.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true
    }));

    // Load routes data
    m.on('load', async () => {
      try {
        const response = await fetch('/data/routes.json');
        if (!response.ok) throw new Error('Failed to fetch routes');
        const data = await response.json();

        // Draw routes and markers
        data.rutas.forEach((ruta: Ruta) => {
          if (!m || !m.getStyle()) return;

          m.addSource(`route-${ruta.id}`, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: ruta.polyline
              }
            }
          });

          m.addLayer({
            id: `route-${ruta.id}`,
            type: 'line',
            source: `route-${ruta.id}`,
            paint: {
              'line-color': ruta.color,
              'line-width': 4
            }
          });

          // Add bus stop markers
          ruta.paradas.forEach((parada: Parada) => {
            new mapboxgl.Marker({ color: ruta.color })
              .setLngLat([parada.lng, parada.lat])
              .setPopup(new mapboxgl.Popup().setHTML(`
                <div class="p-1">
                  <strong class="text-deep-navy">${parada.nombre}</strong><br>
                  <span class="text-xs text-gray-600">Ruta: ${ruta.id}</span><br>
                  <span class="text-xs font-bold text-caribbean-blue">$${ruta.tarifa} MXN</span>
                </div>
              `))
              .addTo(m);
          });
        });
      } catch (error) {
        console.error('Bolt ⚡ Performance Trace: Error loading routes to map:', error);
      }
    });

    return () => {
      if (userMarker.current) {
        userMarker.current.remove();
        userMarker.current = null;
      }
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initialize only ONCE to prevent heavy destruction/re-creation

  // Performance Optimization: Update center without destroying the map
  useEffect(() => {
    if (map.current) {
      map.current.setCenter(center);
    }
  }, [center]);

  // Performance Optimization: Update user marker position without creating new instances
  useEffect(() => {
    if (userLocation && map.current) {
      if (userMarker.current) {
        userMarker.current.setLngLat(userLocation);
      } else {
        userMarker.current = new mapboxgl.Marker({ color: '#0EA5E9' })
          .setLngLat(userLocation)
          .setPopup(new mapboxgl.Popup().setHTML('Tu ubicación'))
          .addTo(map.current);
      }
    }
  }, [userLocation]);

  return <div ref={mapContainer} className="w-full h-full min-h-[400px]" />;
});

export default Map;
